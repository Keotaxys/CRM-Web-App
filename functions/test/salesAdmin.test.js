import test from 'node:test';
import assert from 'node:assert/strict';
import { amendDailySalesOperation, saveDailySalesOperation } from '../src/salesAdmin.js';

const now = new Date('2026-09-10T17:30:00Z');
const staffA = { uid: 'staff-a', role: 'staff', branchId: '010', accountStatus: 'approved' };
const managerA = { uid: 'manager-a', role: 'branch_manager', branchId: '010', accountStatus: 'approved' };
const managerB = { uid: 'manager-b', role: 'branch_manager', branchId: '019', accountStatus: 'approved' };
const admin = { uid: 'admin-a', role: 'admin', branchId: null, accountStatus: 'approved' };
const pending = { uid: 'pending-a', role: 'staff', branchId: '010', accountStatus: 'pending' };
const disabled = { uid: 'disabled-a', role: 'staff', branchId: '010', accountStatus: 'disabled' };

test('rename then amendment preserves existing snapshots and names only new items from catalog', async () => {
  const { services, documents, revisions } = salesServices({ dailyBranch: '010' });
  documents.set('salesProducts/bcel', { name: 'Renamed BCEL', active: true });
  documents.set('salesProducts/atm', { name: 'New ATM', active: true });
  await amendDailySalesOperation(services, managerA, {
    dailySalesId: '2026-09-01_staff-a', mutationId: '550e8400-e29b-41d4-a716-446655440000', reason: 'Add ATM',
    items: [{ productId: 'bcel', quantity: 2 }, { productId: 'atm', quantity: 1, productNameSnapshot: 'Forged' }],
  });
  const expected = [{ productId: 'bcel', quantity: 2, productNameSnapshot: 'BCEL One' },
    { productId: 'atm', quantity: 1, productNameSnapshot: 'New ATM' }];
  assert.deepEqual(documents.get('dailySales/2026-09-01_staff-a').items, expected);
  assert.deepEqual([...revisions.values()][0].nextItems, expected);
});

test('rejects an expected draft day that crossed Laos midnight without writing', async () => {
  const { services, writes } = salesServices();
  await assert.rejects(() => saveDailySalesOperation(services, staffA, {
    expectedDateKey: '2026-09-11', items: [{ productId: 'bcel', quantity: 5 }],
  }, new Date('2026-09-11T17:00:00Z')), (error) => error.code === 'failed-precondition');
  assert.equal(writes.length, 0);
});

function snapshot(ref, value) {
  return { id: ref.id, ref, exists: value !== undefined, data: () => value && ({ ...value }) };
}

function salesServices({ dailyBranch = null, failRevisionCreate = false } = {}) {
  const documents = new Map([
    ['users/staff-a', { name: 'Staff A', role: 'staff', branchId: '010', accountStatus: 'approved' }],
    ['users/manager-a', { name: 'Manager A', role: 'branch_manager', branchId: '010', accountStatus: 'approved' }],
    ['users/manager-b', { name: 'Manager B', role: 'branch_manager', branchId: '019', accountStatus: 'approved' }],
    ['users/admin-a', { name: 'Admin A', role: 'admin', branchId: null, accountStatus: 'approved' }],
    ['users/pending-a', { name: 'Pending A', role: 'staff', branchId: '010', accountStatus: 'pending' }],
    ['users/disabled-a', { name: 'Disabled A', role: 'staff', branchId: '010', accountStatus: 'disabled' }],
    ['salesProducts/bcel', { name: 'BCEL One', normalizedName: 'bcel one', active: true, sortOrder: 10 }],
  ]);
  if (dailyBranch) {
    documents.set('dailySales/2026-09-01_staff-a', {
      schemaVersion: 1,
      dateKey: '2026-09-01',
      staffUid: 'staff-a',
      staffNameSnapshot: 'Original Staff A',
      branchId: dailyBranch,
      items: [{ productId: 'bcel', productNameSnapshot: 'BCEL One', quantity: 2 }],
      totalQuantity: 2,
      createdBy: 'staff-a',
      createdAt: 'original-created-at',
      updatedBy: 'staff-a',
      updatedAt: 'original-updated-at',
    });
  }

  const writes = [];
  const refFor = (path) => ({
    id: path.split('/').at(-1),
    path,
    kind: 'document',
    collection(name) {
      return collectionFor(`${path}/${name}`);
    },
  });
  const collectionFor = (path) => ({
    id: path.split('/').at(-1),
    path,
    kind: 'collection',
    doc(id) {
      return refFor(`${path}/${id}`);
    },
  });
  const db = {
    doc: refFor,
    collection: collectionFor,
    async runTransaction(callback) {
      const staged = [];
      const transaction = {
        async get(target) {
          if (target.kind === 'collection') {
            const prefix = `${target.path}/`;
            const docs = [...documents.entries()]
              .filter(([path]) => path.startsWith(prefix) && !path.slice(prefix.length).includes('/'))
              .map(([path, value]) => snapshot(refFor(path), value));
            return { empty: docs.length === 0, docs };
          }
          return snapshot(target, documents.get(target.path));
        },
        set(ref, value, options) {
          staged.push({ type: 'set', path: ref.path, value, options });
        },
        update(ref, value) {
          staged.push({ type: 'update', path: ref.path, value });
        },
        create(ref, value) {
          if (failRevisionCreate && ref.path.includes('/revisions/')) throw new Error('revision create failed');
          if (documents.has(ref.path) || staged.some((write) => write.path === ref.path)) {
            throw new Error('document already exists');
          }
          staged.push({ type: 'create', path: ref.path, value });
        },
      };
      const result = await callback(transaction);
      for (const write of staged) {
        const existing = documents.get(write.path) ?? {};
        const value = write.type === 'set' && write.options?.merge
          ? { ...existing, ...write.value }
          : write.type === 'update'
            ? { ...existing, ...write.value }
            : { ...write.value };
        documents.set(write.path, value);
        writes.push(write);
      }
      return result;
    },
  };
  const revisions = {
    get size() {
      return [...documents.keys()].filter((path) => path.includes('/revisions/')).length;
    },
    values() {
      return [...documents.entries()]
        .filter(([path]) => path.includes('/revisions/'))
        .map(([, value]) => value).values();
    },
  };
  return { services: { db }, documents, revisions, writes };
}

function servicesWithCatalog() {
  const state = salesServices();
  Object.assign(state.services, state);
  return state.services;
}

function servicesWithExistingDaily(branchId) {
  const state = salesServices({ dailyBranch: branchId });
  Object.assign(state.services, state);
  return state.services;
}

test('staff saves exactly one Laos-today document for self and claim branch', async () => {
  const services = servicesWithCatalog();
  const result = await saveDailySalesOperation(services, staffA, {
    items: [{ productId: 'bcel', quantity: 2 }],
  }, now);
  const write = services.db ? servicesWithWrite(services) : null;
  assert.equal(result.id, '2026-09-11_staff-a');
  assert.equal(result.totalQuantity, 2);
  assert.equal(write.path, 'dailySales/2026-09-11_staff-a');
  assert.equal(write.value.staffUid, 'staff-a');
  assert.equal(write.value.branchId, '010');
});

function servicesWithWrite(services) {
  return services.writes.at(-1);
}

test('retry updates the deterministic document without creating a duplicate', async () => {
  const { services, documents } = salesServices();
  await saveDailySalesOperation(services, staffA, { items: [{ productId: 'bcel', quantity: 2 }] }, now);
  await saveDailySalesOperation(services, staffA, { items: [{ productId: 'bcel', quantity: 3 }] }, now);
  assert.deepEqual([...documents.keys()].filter((path) => path.startsWith('dailySales/')), ['dailySales/2026-09-11_staff-a']);
  assert.equal(documents.get('dailySales/2026-09-11_staff-a').totalQuantity, 3);
});

test('admin pending disabled and forged identity fields fail closed', async () => {
  const services = servicesWithCatalog();
  await assert.rejects(() => saveDailySalesOperation(services, admin, { items: [] }, now), /branch account/i);
  await assert.rejects(() => saveDailySalesOperation(services, pending, { items: [] }, now), /approved/i);
  await assert.rejects(() => saveDailySalesOperation(services, disabled, { items: [] }, now), /approved/i);
  await assert.rejects(() => saveDailySalesOperation(services, staffA, { staffUid: 'staff-b', branchId: '019', items: [] }, now), /identity/i);
});

test('daily save rejects disagreement between the access claims and approved profile', async () => {
  const { services, documents } = salesServices();
  documents.set('users/staff-a', { name: 'Staff A', role: 'staff', branchId: '019', accountStatus: 'approved' });
  await assert.rejects(() => saveDailySalesOperation(services, staffA, { items: [] }, now), /profile/i);
});

test('manager amendment atomically updates own-branch daily sales and creates one immutable revision', async () => {
  const services = servicesWithExistingDaily('010');
  const result = await amendDailySalesOperation(services, managerA, {
    dailySalesId: '2026-09-01_staff-a',
    mutationId: '550e8400-e29b-41d4-a716-446655440000',
    reason: 'ແກ້ຕາມໃບສະຫຼຸບທີມ',
    items: [{ productId: 'bcel', quantity: 4 }],
  });
  assert.equal(result.totalQuantity, 4);
  assert.equal(services.revisions.size, 1);
  assert.equal([...services.revisions.values()][0].previousTotalQuantity, 2);
  assert.equal([...services.revisions.values()][0].nextTotalQuantity, 4);
});

test('amendment retry with one mutation id is idempotent and conflicting reuse fails', async () => {
  const { services, revisions } = salesServices({ dailyBranch: '010' });
  const payload = {
    dailySalesId: '2026-09-01_staff-a',
    mutationId: '550e8400-e29b-41d4-a716-446655440000',
    reason: 'Correct team total',
    items: [{ productId: 'bcel', quantity: 4 }],
  };
  const first = await amendDailySalesOperation(services, managerA, payload);
  const retry = await amendDailySalesOperation(services, managerA, payload);
  assert.deepEqual(retry, first);
  assert.equal(revisions.size, 1);
  await assert.rejects(() => amendDailySalesOperation(services, managerA, { ...payload, items: [{ productId: 'bcel', quantity: 99 }] }), /mutation/i);
});

test('amendment requires manager same-branch or Admin access and a reason', async () => {
  const payload = {
    dailySalesId: '2026-09-01_staff-a',
    mutationId: '550e8400-e29b-41d4-a716-446655440000',
    reason: 'Correct team total',
    items: [{ productId: 'bcel', quantity: 4 }],
  };
  await assert.rejects(() => amendDailySalesOperation(salesServices({ dailyBranch: '010' }).services, managerB, payload), /branch/i);
  await assert.rejects(() => amendDailySalesOperation(salesServices({ dailyBranch: '010' }).services, staffA, payload), /manager|Admin/i);
  await assert.rejects(() => amendDailySalesOperation(salesServices({ dailyBranch: '010' }).services, managerA, { ...payload, reason: '   ' }), /reason/i);
  await assert.doesNotReject(() => amendDailySalesOperation(salesServices({ dailyBranch: '019' }).services, admin, payload));
});

test('amendment preserves protected identity and creation fields', async () => {
  const { services, documents } = salesServices({ dailyBranch: '010' });
  await amendDailySalesOperation(services, managerA, {
    dailySalesId: '2026-09-01_staff-a',
    mutationId: '550e8400-e29b-41d4-a716-446655440000',
    reason: 'Correct team total',
    items: [{ productId: 'bcel', quantity: 4 }],
  });
  const saved = documents.get('dailySales/2026-09-01_staff-a');
  assert.deepEqual({
    dateKey: saved.dateKey,
    staffUid: saved.staffUid,
    staffNameSnapshot: saved.staffNameSnapshot,
    branchId: saved.branchId,
    createdBy: saved.createdBy,
    createdAt: saved.createdAt,
  }, {
    dateKey: '2026-09-01',
    staffUid: 'staff-a',
    staffNameSnapshot: 'Original Staff A',
    branchId: '010',
    createdBy: 'staff-a',
    createdAt: 'original-created-at',
  });
});

test('amendment rejects forged identity fields, malformed mutation ids, and missing targets', async () => {
  const base = {
    dailySalesId: '2026-09-01_staff-a',
    mutationId: '550e8400-e29b-41d4-a716-446655440000',
    reason: 'Correct team total',
    items: [{ productId: 'bcel', quantity: 4 }],
  };
  await assert.rejects(() => amendDailySalesOperation(salesServices({ dailyBranch: '010' }).services, managerA, {
    ...base, branchId: '019',
  }), /identity/i);
  await assert.rejects(() => amendDailySalesOperation(salesServices({ dailyBranch: '010' }).services, managerA, {
    ...base, mutationId: 'not-a-uuid',
  }), /mutation/i);
  await assert.rejects(() => amendDailySalesOperation(salesServices().services, managerA, base), /not found/i);
});

test('revision creation failure leaves the daily document unchanged', async () => {
  const { services, documents, revisions } = salesServices({ dailyBranch: '010', failRevisionCreate: true });
  await assert.rejects(() => amendDailySalesOperation(services, managerA, {
    dailySalesId: '2026-09-01_staff-a',
    mutationId: '550e8400-e29b-41d4-a716-446655440000',
    reason: 'Correct team total',
    items: [{ productId: 'bcel', quantity: 4 }],
  }), /revision create failed/i);
  assert.equal(documents.get('dailySales/2026-09-01_staff-a').totalQuantity, 2);
  assert.equal(revisions.size, 0);
});
