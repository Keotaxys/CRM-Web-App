import test from 'node:test';
import assert from 'node:assert/strict';
import {
  recordGiftDistributionOperation as record,
  amendGiftDistributionOperation as amend,
  cancelGiftDistributionOperation as cancel,
} from '../src/giftDistribution.js';
import { fakeGiftFirestore } from './helpers/fakeGiftFirestore.js';

const staff = { uid: 'staff-a', role: 'staff', branchId: '010', accountStatus: 'approved' };
const manager = { uid: 'manager-a', role: 'branch_manager', branchId: '010', accountStatus: 'approved' };
const admin = { uid: 'admin-a', role: 'admin', branchId: null, accountStatus: 'approved' };
const id = '550e8400-e29b-41d4-a716-446655440000';
const mutationId = '550e8400-e29b-41d4-a716-446655440001';
const cancellationId = '550e8400-e29b-41d4-a716-446655440002';
const now = new Date('2026-09-13T17:30:00Z');
const tomorrow = new Date('2026-09-14T17:00:00Z');
const input = {
  distributionId: id, expectedDateKey: '2026-09-14', branchId: '010',
  recipientType: 'customer', customerId: 'customer-a', note: 'VIP visit',
  items: [{ giftId: 'umbrella', packs: 0, looseUnits: 3 },
    { giftId: 'shirt', packs: 1, looseUnits: 0 }],
};
const change = {
  distributionId: id, mutationId, expectedVersion: 1, reason: 'Correct quantities',
  recipientType: 'campaign', campaignId: 'campaign-a', note: 'Event',
  items: [{ giftId: 'umbrella', packs: 0, looseUnits: 5 }],
};
const cancellation = {
  distributionId: id, mutationId: cancellationId, expectedVersion: 1, reason: 'Returned',
};

function fixture() {
  return fakeGiftFirestore({
    'users/staff-a': { ...staff, name: 'Staff A' },
    'users/staff-b': { ...staff, uid: 'staff-b' },
    'users/manager-a': manager, 'users/admin-a': admin,
    'giftItems/umbrella': { name: 'Umbrella', active: true, unitsPerPack: 10 },
    'giftItems/shirt': { name: 'Shirt', active: true, unitsPerPack: 10 },
    'giftItems/inactive': { name: 'Inactive', active: false, unitsPerPack: 10 },
    'branchGiftStocks/010_umbrella': { branchId: '010', giftId: 'umbrella', currentUnits: 20, version: 1 },
    'branchGiftStocks/010_shirt': { branchId: '010', giftId: 'shirt', currentUnits: 20, version: 1 },
    'customers/customer-a': { name: 'Customer A', branchId: '010', recordState: 'active' },
    'customers/customer-b': { name: 'Customer B', branchId: '019', recordState: 'active' },
    'customers/trashed': { name: 'Trashed', branchId: '010', recordState: 'trashed' },
    'giftCampaigns/campaign-a': { name: 'Campaign A', branchId: '010', active: true },
    'giftCampaigns/campaign-b': { name: 'Campaign B', branchId: '019', active: true },
    'giftCampaigns/inactive': { name: 'Inactive', branchId: '010', active: false },
  });
}

async function unchanged(state, action, code) {
  const before = structuredClone([...state.documents]);
  const count = state.writes.length;
  await assert.rejects(action, code ? (error) => error.code === code : undefined);
  assert.deepEqual([...state.documents], before);
  assert.equal(state.writes.length, count);
}

test('Staff distributes multiple gifts to own Customer with snapshots and owner audit', async () => {
  const state = fixture();
  const result = await record(state.services, staff, input, now);
  assert.equal(result.totalUnits, 13);
  assert.equal(result.version, 1);
  assert.equal(state.documents.get('branchGiftStocks/010_umbrella').currentUnits, 17);
  assert.equal(state.documents.get('branchGiftStocks/010_shirt').currentUnits, 10);
  const distribution = state.documents.get(`giftDistributions/${id}`);
  assert.equal(distribution.createdBy, 'staff-a');
  assert.equal(distribution.distributionOwnerUid, 'staff-a');
  assert.equal(distribution.dateKey, '2026-09-14');
  assert.equal(distribution.customerNameSnapshot, 'Customer A');
  assert.equal(distribution.campaignId, null);
  const movement = state.documents.get(`giftStockMovements/${id}_shirt`);
  assert.equal(movement.deltaUnits, -10);
  assert.equal(movement.actorUid, 'staff-a');
  assert.equal(movement.distributionOwnerUid, 'staff-a');
  assert.equal(movement.movementType, 'distribute');
  assert.equal(movement.customerNameSnapshot, 'Customer A');
  assert.equal(movement.campaignNameSnapshot, null);
});

test('Campaign distribution and Admin explicit branch distribution succeed', async () => {
  for (const actor of [staff, manager, admin]) {
    const state = fixture();
    const result = await record(state.services, actor, {
      ...input, customerId: null, recipientType: 'campaign', campaignId: 'campaign-a',
    }, now);
    assert.equal(result.totalUnits, 13);
    const distribution = state.documents.get(`giftDistributions/${id}`);
    assert.equal(distribution.customerId, null);
    assert.equal(distribution.campaignNameSnapshot, 'Campaign A');
    assert.equal(distribution.createdBy, actor.uid);
    const movement = state.documents.get(`giftStockMovements/${id}_umbrella`);
    assert.equal(movement.customerNameSnapshot, null);
    assert.equal(movement.campaignNameSnapshot, 'Campaign A');
  }
});

test('invalid recipients, quantities, dates and server fields fail without writes', async () => {
  const cases = [
    { campaignId: 'campaign-a' }, { customerId: undefined }, { recipientType: 'other' },
    { customerId: 'missing' }, { customerId: 'customer-b' }, { customerId: 'trashed' },
    { recipientType: 'campaign', customerId: null, campaignId: 'campaign-b' },
    { recipientType: 'campaign', customerId: null, campaignId: 'inactive' },
    { recipientType: 'campaign', customerId: 'customer-a', campaignId: 'campaign-a' },
    { recipientType: 'campaign', customerId: null },
    { expectedDateKey: '2026-09-13' }, { expectedDateKey: undefined }, { branchId: '019' },
    { items: [] }, { items: [{ giftId: 'inactive', looseUnits: 1 }] },
    { items: [{ giftId: 'missing', looseUnits: 1 }] },
    { items: [{ giftId: 'umbrella', looseUnits: 1 }, { giftId: 'umbrella', looseUnits: 2 }] },
    { items: [{ giftId: 'umbrella', looseUnits: 1 }, { giftId: 'shirt', looseUnits: 21 }] },
    { items: [{ giftId: 'umbrella', looseUnits: -1 }] },
    { items: [{ giftId: 'umbrella', looseUnits: 1.5 }] },
    { items: [{ giftId: 'umbrella', packs: Number.MAX_SAFE_INTEGER }] },
    ...['actorUid', 'createdBy', 'createdAt', 'dateKey', 'occurredAt', 'version',
      'distributionOwnerUid', 'updatedBy', 'status', 'totalUnits'].map((key) => ({ [key]: 'forged' })),
    { customerNameSnapshot: 'Forged customer' },
    { campaignNameSnapshot: 'Forged Campaign' },
    { items: [{ giftId: 'umbrella', looseUnits: 1, totalUnits: 1 }] },
  ];
  for (const patch of cases) {
    const state = fixture();
    await unchanged(state, () => record(state.services, staff, { ...input, ...patch }, now));
  }
  const state = fixture();
  await unchanged(state, () => record(state.services, admin, { ...input, branchId: undefined }, now));
});

test('all operations reject anonymous, pending, disabled and mismatched canonical profiles', async () => {
  for (const actor of [null, { ...staff, accountStatus: 'pending' },
    { ...staff, accountStatus: 'disabled' }, { ...staff, role: 'admin' },
    { ...staff, uid: 'missing' }, { ...staff, branchId: '019' }]) {
    const state = fixture();
    await record(state.services, staff, input, now);
    await unchanged(state, () => record(state.services, actor, input, now));
    await unchanged(state, () => amend(state.services, actor, change, now));
    await unchanged(state, () => cancel(state.services, actor, cancellation, now));
  }
  for (const operation of [amend, cancel]) {
    const state = fixture();
    await record(state.services, staff, input, now);
    state.documents.set('users/staff-a', { ...staff, accountStatus: 'disabled' });
    await unchanged(state, () => operation(state.services, staff,
      operation === amend ? change : cancellation, now), 'permission-denied');
  }
});

test('same-day amendment applies net deltas and records one complete revision', async () => {
  const state = fixture();
  await record(state.services, staff, input, now);
  const result = await amend(state.services, staff, change, now);
  assert.equal(result.totalUnits, 5);
  assert.equal(result.version, 2);
  assert.equal(state.documents.get('branchGiftStocks/010_umbrella').currentUnits, 15);
  assert.equal(state.documents.get('branchGiftStocks/010_shirt').currentUnits, 20);
  const revision = state.documents.get(`giftDistributions/${id}/revisions/${mutationId}`);
  assert.equal(revision.previousVersion, 1);
  assert.equal(revision.nextVersion, 2);
  assert.equal(revision.previousRecipient.customerId, 'customer-a');
  assert.equal(revision.nextRecipient.campaignId, 'campaign-a');
  assert.equal(revision.previousItems.length, 2);
  assert.equal(revision.nextItems.length, 1);
  assert.equal(revision.previousNote, 'VIP visit');
  assert.equal(revision.nextNote, 'Event');
  assert.equal(revision.changedBy, 'staff-a');
  assert.equal(state.documents.get(`giftStockMovements/${mutationId}_umbrella`).deltaUnits, -2);
  assert.equal(state.documents.get(`giftStockMovements/${mutationId}_shirt`).deltaUnits, 10);
  assert.equal(state.documents.get(`giftStockMovements/${mutationId}_umbrella`).customerNameSnapshot, null);
  assert.equal(state.documents.get(`giftStockMovements/${mutationId}_umbrella`).campaignNameSnapshot, 'Campaign A');
});

test('Staff cannot amend or cancel another owner or after the Laos midnight boundary', async () => {
  for (const operation of [amend, cancel]) {
    const state = fixture();
    await record(state.services, staff, input, now);
    const payload = operation === amend ? change : cancellation;
    await unchanged(state, () => operation(state.services, { ...staff, uid: 'staff-b' }, payload, now), 'permission-denied');
    await unchanged(state, () => operation(state.services, staff, payload, tomorrow), 'permission-denied');
    await operation(state.services, staff, payload, new Date('2026-09-14T16:59:59Z'));
  }
});

test('Manager and Admin later corrections retain original ownership and actual modifier', async () => {
  for (const actor of [manager, admin]) {
    const state = fixture();
    await record(state.services, staff, input, now);
    await amend(state.services, actor, change, tomorrow);
    await cancel(state.services, actor, { ...cancellation, expectedVersion: 2 }, tomorrow);
    const distribution = state.documents.get(`giftDistributions/${id}`);
    assert.equal(distribution.createdBy, 'staff-a');
    assert.equal(distribution.distributionOwnerUid, 'staff-a');
    assert.equal(distribution.updatedBy, actor.uid);
    assert.equal(distribution.dateKey, '2026-09-14');
    for (const operationId of [mutationId, cancellationId]) {
      const movement = state.documents.get(`giftStockMovements/${operationId}_umbrella`);
      assert.equal(movement.actorUid, actor.uid);
      assert.equal(movement.distributionOwnerUid, 'staff-a');
      assert.equal(movement.dateKey, '2026-09-15');
      assert.equal(movement.customerNameSnapshot, null);
      assert.equal(movement.campaignNameSnapshot, 'Campaign A');
    }
    assert.equal(state.documents.get('branchGiftStocks/010_umbrella').currentUnits, 20);
  }
});

test('corrections require reason, matching versions and branch access, with atomic rollback', async () => {
  for (const operation of [amend, cancel]) {
    const state = fixture();
    await record(state.services, staff, input, now);
    const payload = operation === amend ? change : cancellation;
    for (const patch of [{ reason: '' }, { reason: '  ' }, { expectedVersion: 0 },
      { expectedVersion: 2 }, { expectedVersion: 1.5 }, { expectedVersion: undefined },
      { createdBy: 'forged' }, { branchId: '019' },
      { customerNameSnapshot: 'Forged customer' }, { campaignNameSnapshot: 'Forged Campaign' }]) {
      await unchanged(state, () => operation(state.services, manager, { ...payload, ...patch }, tomorrow));
    }
    state.documents.set('users/manager-a', { ...manager, branchId: '019' });
    await unchanged(state, () => operation(state.services, { ...manager, branchId: '019' }, payload, tomorrow));
  }
  const state = fixture();
  await record(state.services, staff, input, now);
  for (const patch of [{ campaignId: 'campaign-b' }, { campaignId: 'inactive' },
    { items: [{ giftId: 'shirt', looseUnits: 21 }] }]) {
    await unchanged(state, () => amend(state.services, staff, { ...change, ...patch }, now));
  }
});

test('cancellation restores exactly once and immutable retry results survive later changes', async () => {
  const state = fixture();
  const created = await record(state.services, staff, input, now);
  const amended = await amend(state.services, staff, change, now);
  const cancelled = await cancel(state.services, staff, { ...cancellation, expectedVersion: 2 }, now);
  assert.equal(cancelled.status, 'cancelled');
  assert.equal(cancelled.version, 3);
  assert.equal(state.documents.get('branchGiftStocks/010_umbrella').currentUnits, 20);
  assert.equal(state.documents.get('branchGiftStocks/010_shirt').currentUnits, 20);
  const count = state.writes.length;
  assert.deepEqual(await record(state.services, staff, input, tomorrow), created);
  assert.deepEqual(await amend(state.services, staff, change, tomorrow), amended);
  assert.deepEqual(await cancel(state.services, staff,
    { ...cancellation, expectedVersion: 2 }, tomorrow), cancelled);
  assert.equal(state.writes.length, count);
  await unchanged(state, () => cancel(state.services, manager, {
    ...cancellation, mutationId: '550e8400-e29b-41d4-a716-446655440003', expectedVersion: 3,
  }, tomorrow));
  await unchanged(state, () => amend(state.services, manager, {
    ...change, mutationId: '550e8400-e29b-41d4-a716-446655440003', expectedVersion: 3,
  }, tomorrow));
});

test('retry IDs reject changed payload, actor, version or operation type without writes', async () => {
  const state = fixture();
  await record(state.services, staff, input, now);
  await unchanged(state, () => record(state.services, staff, { ...input, note: 'changed' }, now), 'already-exists');
  await unchanged(state, () => record(state.services, manager, input, now), 'already-exists');
  await amend(state.services, staff, change, now);
  for (const patch of [{ note: 'changed' }, { expectedVersion: 2 }]) {
    await unchanged(state, () => amend(state.services, staff, { ...change, ...patch }, now), 'already-exists');
  }
  await unchanged(state, () => amend(state.services, manager, change, now), 'already-exists');
  await unchanged(state, () => cancel(state.services, staff,
    { ...cancellation, mutationId }, now), 'already-exists');
});

test('note-only amendments create an audited version without changing stock', async () => {
  const state = fixture();
  await record(state.services, staff, input, now);
  const stocks = structuredClone([state.documents.get('branchGiftStocks/010_umbrella'),
    state.documents.get('branchGiftStocks/010_shirt')]);
  await amend(state.services, staff, {
    ...change, recipientType: 'customer', customerId: 'customer-a', campaignId: null,
    items: input.items, note: 'Updated note',
  }, now);
  assert.deepEqual([state.documents.get('branchGiftStocks/010_umbrella'),
    state.documents.get('branchGiftStocks/010_shirt')], stocks);
  assert.equal(state.documents.get(`giftDistributions/${id}`).version, 2);
  assert.equal(state.documents.get(`giftDistributions/${id}/revisions/${mutationId}`).nextNote, 'Updated note');
});

test('cancellation restores historical quantities even when gift and recipient were deactivated', async () => {
  const state = fixture();
  await record(state.services, staff, input, now);
  state.documents.set('giftItems/shirt', { name: 'Changed', active: false, unitsPerPack: 100 });
  state.documents.set('customers/customer-a', { branchId: '010', recordState: 'trashed' });
  await cancel(state.services, staff, cancellation, now);
  assert.equal(state.documents.get('branchGiftStocks/010_shirt').currentUnits, 20);
  assert.equal(state.documents.get(`giftStockMovements/${cancellationId}_shirt`).deltaUnits, 10);
});

test('concurrent distributions cannot overspend the same stock', async () => {
  const state = fixture();
  const payload = { ...input, items: [{ giftId: 'umbrella', looseUnits: 15 }] };
  const results = await Promise.allSettled([
    record(state.services, staff, payload, now),
    record(state.services, staff, { ...payload, distributionId: mutationId }, now),
  ]);
  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
  assert.equal(state.documents.get('branchGiftStocks/010_umbrella').currentUnits, 5);
  assert.equal([...state.documents.keys()].filter((path) => path.startsWith('giftDistributions/')).length, 1);
});

test('concurrent corrections enforce expected version while identical retries return once', async () => {
  const state = fixture();
  await record(state.services, staff, input, now);
  const results = await Promise.allSettled([
    amend(state.services, staff, change, now),
    cancel(state.services, staff, cancellation, now),
  ]);
  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
  assert.equal(state.documents.get(`giftDistributions/${id}`).version, 2);
  const retryState = fixture();
  const retries = await Promise.all([
    record(retryState.services, staff, input, now),
    record(retryState.services, staff, input, now),
  ]);
  assert.deepEqual(retries[0], retries[1]);
  assert.equal(retryState.documents.get('branchGiftStocks/010_umbrella').currentUnits, 17);
});

test('exhausted stock version rejects distribution before any writes', async () => {
  const state = fixture();
  state.documents.set('branchGiftStocks/010_shirt', {
    branchId: '010', giftId: 'shirt', currentUnits: 20, version: Number.MAX_SAFE_INTEGER,
  });
  await unchanged(state, () => record(state.services, staff, input, now), 'failed-precondition');
});

test('default server clock rejects an uncommitted create retried across Laos midnight', async (t) => {
  const state = fixture();
  t.mock.timers.enable({ apis: ['Date'], now: new Date('2026-09-14T16:59:59Z').getTime() });
  state.retryNextTransaction(() => t.mock.timers.setTime(tomorrow.getTime()));
  await unchanged(state, () => record(state.services, staff, input), 'failed-precondition');
});

for (const [label, operation, payload] of [['amendment', amend, change], ['cancellation', cancel, cancellation]]) {
  test(`default server clock rejects an uncommitted Staff ${label} retried across Laos midnight`, async (t) => {
    const state = fixture();
    await record(state.services, staff, input, now);
    t.mock.timers.enable({ apis: ['Date'], now: new Date('2026-09-14T16:59:59Z').getTime() });
    state.retryNextTransaction(() => t.mock.timers.setTime(tomorrow.getTime()));
    await unchanged(state, () => operation(state.services, staff, payload), 'permission-denied');
  });
}

test('injected clock is reread on retry and completed results return before reading it', async () => {
  const state = fixture();
  let currentTime = new Date('2026-09-14T16:59:59Z');
  const clock = () => currentTime;
  state.retryNextTransaction(() => { currentTime = tomorrow; });
  await unchanged(state, () => record(state.services, staff, input, clock), 'failed-precondition');

  const created = await record(state.services, staff, input, now);
  const amended = await amend(state.services, staff, change, now);
  const cancelInput = { ...cancellation, expectedVersion: 2 };
  const cancelled = await cancel(state.services, staff, cancelInput, now);
  const before = structuredClone([...state.documents]);
  const count = state.writes.length;
  const unavailableClock = () => { throw new Error('Completed retries must not read the clock'); };
  assert.deepEqual(await record(state.services, staff, input, unavailableClock), created);
  assert.deepEqual(await amend(state.services, staff, change, unavailableClock), amended);
  assert.deepEqual(await cancel(state.services, staff, cancelInput, unavailableClock), cancelled);
  assert.deepEqual([...state.documents], before);
  assert.equal(state.writes.length, count);
});
