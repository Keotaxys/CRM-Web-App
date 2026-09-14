import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';

let env;
const actor = (uid, role, branchId, accountStatus = 'approved') => env.authenticatedContext(uid, { role, branchId, accountStatus }).firestore();

beforeAll(async () => { env = await initializeTestEnvironment({ projectId: 'demo-crm-rules', firestore: { rules: readFileSync('firestore.rules', 'utf8') } }); });
beforeEach(async () => { await env.clearFirestore(); await env.withSecurityRulesDisabled(async (context) => {
  await setDoc(doc(context.firestore(), 'customers/a'), { branchId: '010', recordState: 'active', createdBy: 'seed', createdAt: new Date(), name: 'A', status: 'ໃໝ່' });
  await setDoc(doc(context.firestore(), 'customers/b'), { branchId: '019', recordState: 'active', createdBy: 'seed', createdAt: new Date(), name: 'B', status: 'ໃໝ່' });
  await setDoc(doc(context.firestore(), 'activities/a'), { branchId: '010', recordState: 'active', createdBy: 'staff-a', assignedStaffIds: ['staff-a'], type: 'appointment' });
  await setDoc(doc(context.firestore(), 'users/staff-a'), { branchId: '010', role: 'staff', accountStatus: 'approved', name: 'A' });
  await setDoc(doc(context.firestore(), 'users/staff-b'), { branchId: '019', role: 'staff', accountStatus: 'approved' });
  await setDoc(doc(context.firestore(), 'users/manager-a'), { branchId: '010', role: 'branch_manager', accountStatus: 'approved' });
  await setDoc(doc(context.firestore(), 'users/manager-b'), { branchId: '019', role: 'branch_manager', accountStatus: 'approved' });
  await setDoc(doc(context.firestore(), 'users/admin'), { branchId: null, role: 'admin', accountStatus: 'approved' });
  await setDoc(doc(context.firestore(), 'users/pending'), { branchId: '010', role: 'staff', accountStatus: 'pending' });
  await setDoc(doc(context.firestore(), 'users/disabled'), { branchId: '010', role: 'staff', accountStatus: 'disabled' });
  await setDoc(doc(context.firestore(), 'salesProducts/bcel'), { name: 'BCEL One', active: true, sortOrder: 10 });
  await setDoc(doc(context.firestore(), 'dailySales/2026-09-11_staff-a'), { dateKey: '2026-09-11', staffUid: 'staff-a', branchId: '010', items: [], totalQuantity: 0 });
  await setDoc(doc(context.firestore(), 'dailySales/2026-09-11_staff-b'), { dateKey: '2026-09-11', staffUid: 'staff-b', branchId: '019', items: [], totalQuantity: 0 });
  await setDoc(doc(context.firestore(), 'dailySales/2026-09-11_staff-a/revisions/change-1'), { changedBy: 'manager-a', changedAt: new Date() });
}); });
afterAll(async () => env?.cleanup());

describe('Firestore gift inventory actor matrix', () => {
  const giftDocuments = {
    'giftItems/umbrella': { name: 'Umbrella', active: true, sortOrder: 10, unitsPerPack: 10 },
    'giftItems/retired-mug': { name: 'Retired mug', active: false, sortOrder: 20, unitsPerPack: 6 },
    'branchGiftStocks/010_umbrella': { branchId: '010', giftId: 'umbrella', currentUnits: 20 },
    'branchGiftStocks/019_umbrella': { branchId: '019', giftId: 'umbrella', currentUnits: 30 },
    'giftCampaigns/campaign-a': { branchId: '010', active: true, startDate: '2026-09-01' },
    'giftCampaigns/campaign-b': { branchId: '019', active: true, startDate: '2026-09-01' },
    'giftCampaigns/retired-a': { branchId: '010', active: false, startDate: '2026-08-01' },
    'giftCampaigns/retired-b': { branchId: '019', active: false, startDate: '2026-08-01' },
    'giftReceipts/receipt-a': { branchId: '010', receivedDateKey: '2026-09-13', createdBy: 'manager-a' },
    'giftReceipts/receipt-b': { branchId: '019', receivedDateKey: '2026-09-13', createdBy: 'manager-b' },
    'giftAllocations/allocation-a': { targetBranchId: '010', status: 'pending', createdAt: new Date('2026-09-13T00:00:00Z') },
    'giftAllocations/allocation-b': { targetBranchId: '019', status: 'pending', createdAt: new Date('2026-09-13T00:00:00Z') },
    'giftDistributions/distribution-a': { branchId: '010', createdBy: 'staff-a', dateKey: '2026-09-13' },
    'giftDistributions/distribution-team': { branchId: '010', createdBy: 'manager-a', dateKey: '2026-09-13' },
    'giftDistributions/distribution-b': { branchId: '019', createdBy: 'staff-b', dateKey: '2026-09-13' },
    'giftDistributions/distribution-a/revisions/change-1': { distributionOwnerUid: 'staff-a', actorUid: 'manager-a', changedBy: 'manager-a' },
    'giftDistributions/distribution-team/revisions/change-1': { distributionOwnerUid: 'manager-a', actorUid: 'staff-a' },
    'giftDistributions/distribution-b/revisions/change-1': { distributionOwnerUid: 'staff-b', actorUid: 'manager-b' },
    'giftStockMovements/movement-a': { branchId: '010', giftId: 'umbrella', dateKey: '2026-09-13', actorUid: 'staff-a', distributionOwnerUid: 'staff-a', movementType: 'distribute' },
    'giftStockMovements/correction-a': { branchId: '010', giftId: 'umbrella', dateKey: '2026-09-14', actorUid: 'manager-a', distributionOwnerUid: 'staff-a', movementType: 'distribution_amend' },
    'giftStockMovements/movement-team': { branchId: '010', giftId: 'umbrella', dateKey: '2026-09-13', actorUid: 'staff-a', distributionOwnerUid: 'manager-a', movementType: 'distribution_amend' },
    'giftStockMovements/movement-b': { branchId: '019', giftId: 'umbrella', dateKey: '2026-09-13', actorUid: 'staff-b', distributionOwnerUid: 'staff-b', movementType: 'distribute' },
    'giftStockMovements/inbound-a': { branchId: '010', giftId: 'umbrella', dateKey: '2026-09-13', actorUid: 'manager-a', distributionOwnerUid: null, movementType: 'receive' },
    'giftItemNameKeys/umbrella-key': { giftId: 'umbrella', normalizedName: 'umbrella' },
    'giftCampaignNameKeys/campaign-key': { campaignId: 'campaign-a', branchId: '010' },
  };
  const collectionPaths = [
    ['giftItems', 'umbrella'], ['branchGiftStocks', '010_umbrella'],
    ['giftCampaigns', 'campaign-a'], ['giftReceipts', 'receipt-a'],
    ['giftAllocations', 'allocation-a'], ['giftDistributions', 'distribution-a'],
    ['giftDistributions/distribution-a/revisions', 'change-1'],
    ['giftStockMovements', 'movement-a'], ['giftItemNameKeys', 'umbrella-key'],
    ['giftCampaignNameKeys', 'campaign-key'],
  ];
  const dateRange = () => [where('dateKey', '>=', '2026-09-01'), where('dateKey', '<=', '2026-09-30'), orderBy('dateKey', 'desc')];
  const ids = async (request) => (await assertSucceeds(getDocs(request))).docs.map((entry) => entry.id).sort();

  beforeEach(async () => env.withSecurityRulesDisabled(async (context) => {
    await Promise.all(Object.entries(giftDocuments).map(([path, data]) => setDoc(doc(context.firestore(), path), data)));
  }));

  it('denies anonymous, pending, disabled and stale-profile gift reads', async () => {
    const denied = [env.unauthenticatedContext().firestore(), actor('pending', 'staff', '010', 'pending'),
      actor('disabled', 'staff', '010', 'disabled'), actor('pending', 'staff', '010'),
      actor('disabled', 'staff', '010'), actor('staff-a', 'staff', '019'), actor('staff-a', 'admin', '010')];
    for (const db of denied) {
      for (const [path, id] of collectionPaths) {
        await assertFails(getDoc(doc(db, path, id)));
        await assertFails(getDocs(collection(db, path)));
      }
    }
  });

  it.each([['staff-a', 'staff', '010'], ['manager-a', 'branch_manager', '010'], ['admin', 'admin', null]])(
    'allows %s to read the approved gift catalog query', async (uid, role, branchId) => {
      const db = actor(uid, role, branchId);
      await assertSucceeds(getDoc(doc(db, 'giftItems/umbrella')));
      expect(await ids(query(collection(db, 'giftItems'), where('active', '==', true), orderBy('sortOrder', 'asc')))).toEqual(['umbrella']);
    },
  );

  it('denies Staff direct reads of inactive gift catalog items', async () => {
    await assertFails(getDoc(doc(actor('staff-a', 'staff', '010'), 'giftItems/retired-mug')));
  });

  it('denies Staff unfiltered gift catalog lists', async () => {
    await assertFails(getDocs(collection(actor('staff-a', 'staff', '010'), 'giftItems')));
  });

  it('denies Staff gift catalog queries for inactive items', async () => {
    const db = actor('staff-a', 'staff', '010');
    await assertFails(getDocs(query(collection(db, 'giftItems'), where('active', '==', false), orderBy('sortOrder', 'asc'))));
  });

  it.each([['manager-a', 'branch_manager', '010'], ['admin', 'admin', null]])(
    'retains %s access to inactive and unfiltered gift catalog history', async (uid, role, branchId) => {
      const db = actor(uid, role, branchId);
      await assertSucceeds(getDoc(doc(db, 'giftItems/retired-mug')));
      expect(await ids(query(collection(db, 'giftItems'), where('active', '==', false), orderBy('sortOrder', 'asc')))).toEqual(['retired-mug']);
      expect(await ids(collection(db, 'giftItems'))).toEqual(['retired-mug', 'umbrella']);
    },
  );

  it.each([['staff-a', 'staff'], ['manager-a', 'branch_manager']])(
    'scopes %s stock and Campaign documents and queries to its branch', async (uid, role) => {
      const db = actor(uid, role, '010');
      for (const [path, ownId, otherId, filters] of [
        ['branchGiftStocks', '010_umbrella', '019_umbrella', [orderBy('giftId', 'asc')]],
        ['giftCampaigns', 'campaign-a', 'campaign-b', [where('active', '==', true), orderBy('startDate', 'desc')]],
      ]) {
        await assertSucceeds(getDoc(doc(db, path, ownId)));
        await assertFails(getDoc(doc(db, path, otherId)));
        expect(await ids(query(collection(db, path), where('branchId', '==', '010'), ...filters))).toEqual([ownId]);
        await assertFails(getDocs(query(collection(db, path), where('branchId', '==', '019'), ...filters)));
        await assertFails(getDocs(collection(db, path)));
      }
    },
  );

  it('denies Staff direct reads of inactive own-branch Campaigns', async () => {
    await assertFails(getDoc(doc(actor('staff-a', 'staff', '010'), 'giftCampaigns/retired-a')));
  });

  it('denies Staff own-branch Campaign lists without an active filter', async () => {
    const db = actor('staff-a', 'staff', '010');
    await assertFails(getDocs(query(collection(db, 'giftCampaigns'), where('branchId', '==', '010'))));
  });

  it('denies Staff own-branch Campaign queries for inactive records', async () => {
    const db = actor('staff-a', 'staff', '010');
    await assertFails(getDocs(query(collection(db, 'giftCampaigns'), where('branchId', '==', '010'), where('active', '==', false), orderBy('startDate', 'desc'))));
  });

  it('retains Manager own-branch inactive Campaign history but denies other branches', async () => {
    const db = actor('manager-a', 'branch_manager', '010');
    await assertSucceeds(getDoc(doc(db, 'giftCampaigns/retired-a')));
    await assertFails(getDoc(doc(db, 'giftCampaigns/retired-b')));
    expect(await ids(query(collection(db, 'giftCampaigns'), where('branchId', '==', '010'), where('active', '==', false), orderBy('startDate', 'desc')))).toEqual(['retired-a']);
    expect(await ids(query(collection(db, 'giftCampaigns'), where('branchId', '==', '010')))).toEqual(['campaign-a', 'retired-a']);
    await assertFails(getDocs(query(collection(db, 'giftCampaigns'), where('branchId', '==', '019'), where('active', '==', false), orderBy('startDate', 'desc'))));
    await assertFails(getDocs(collection(db, 'giftCampaigns')));
  });

  it('retains Admin inactive Campaign history across branches', async () => {
    const db = actor('admin', 'admin', null);
    await assertSucceeds(getDoc(doc(db, 'giftCampaigns/retired-a')));
    await assertSucceeds(getDoc(doc(db, 'giftCampaigns/retired-b')));
    expect(await ids(query(collection(db, 'giftCampaigns'), where('active', '==', false)))).toEqual(['retired-a', 'retired-b']);
    expect(await ids(collection(db, 'giftCampaigns'))).toEqual(['campaign-a', 'campaign-b', 'retired-a', 'retired-b']);
  });

  it('limits Staff distribution and movement reads to the original owner, not the correction actor', async () => {
    const db = actor('staff-a', 'staff', '010');
    for (const path of ['giftDistributions/distribution-a', 'giftStockMovements/movement-a', 'giftStockMovements/correction-a']) {
      await assertSucceeds(getDoc(doc(db, path)));
    }
    for (const path of ['giftDistributions/distribution-team', 'giftDistributions/distribution-b',
      'giftStockMovements/movement-team', 'giftStockMovements/movement-b', 'giftStockMovements/inbound-a']) {
      await assertFails(getDoc(doc(db, path)));
    }
    expect(await ids(query(collection(db, 'giftDistributions'), where('createdBy', '==', 'staff-a'), ...dateRange()))).toEqual(['distribution-a']);
    expect(await ids(query(collection(db, 'giftStockMovements'), where('distributionOwnerUid', '==', 'staff-a'), ...dateRange()))).toEqual(['correction-a', 'movement-a']);
    for (const [path, ownerField] of [['giftDistributions', 'createdBy'], ['giftStockMovements', 'distributionOwnerUid']]) {
      await assertFails(getDocs(query(collection(db, path), where('branchId', '==', '010'), ...dateRange())));
      await assertFails(getDocs(query(collection(db, path), where(ownerField, '==', 'staff-b'), ...dateRange())));
      await assertFails(getDocs(query(collection(db, path), ...dateRange())));
    }
    await assertFails(getDocs(query(collection(db, 'giftStockMovements'), where('actorUid', '==', 'staff-a'), ...dateRange())));
  });

  it('allows Manager branch date queries and rejects cross-branch or unscoped reads', async () => {
    const db = actor('manager-a', 'branch_manager', '010');
    for (const [path, ownId, otherId, expected] of [
      ['giftDistributions', 'distribution-a', 'distribution-b', ['distribution-a', 'distribution-team']],
      ['giftStockMovements', 'correction-a', 'movement-b', ['correction-a', 'inbound-a', 'movement-a', 'movement-team']],
    ]) {
      await assertSucceeds(getDoc(doc(db, path, ownId)));
      await assertFails(getDoc(doc(db, path, otherId)));
      await assertFails(getDoc(doc(actor('manager-b', 'branch_manager', '019'), path, ownId)));
      expect(await ids(query(collection(db, path), where('branchId', '==', '010'), ...dateRange()))).toEqual(expected);
      await assertFails(getDocs(query(collection(db, path), where('branchId', '==', '019'), ...dateRange())));
      await assertFails(getDocs(query(collection(db, path), ...dateRange())));
    }
  });

  it('reserves receipts and allocations for the target Manager or Admin', async () => {
    for (const [path, ownId, otherId, branchField, filters] of [
      ['giftReceipts', 'receipt-a', 'receipt-b', 'branchId', []],
      ['giftAllocations', 'allocation-a', 'allocation-b', 'targetBranchId', [where('status', '==', 'pending'), orderBy('createdAt', 'desc')]],
    ]) {
      const managerDb = actor('manager-a', 'branch_manager', '010');
      await assertSucceeds(getDoc(doc(managerDb, path, ownId)));
      await assertFails(getDoc(doc(managerDb, path, otherId)));
      expect(await ids(query(collection(managerDb, path), where(branchField, '==', '010'), ...filters))).toEqual([ownId]);
      await assertFails(getDocs(query(collection(managerDb, path), where(branchField, '==', '019'), ...filters)));
      await assertFails(getDocs(collection(managerDb, path)));
      const staffDb = actor('staff-a', 'staff', '010');
      await assertFails(getDoc(doc(staffDb, path, ownId)));
      await assertFails(getDocs(query(collection(staffDb, path), where(branchField, '==', '010'), ...filters)));
    }
  });

  it('applies parent distribution ownership and branch scope to revision get and list', async () => {
    const ownPath = 'giftDistributions/distribution-a/revisions';
    for (const db of [actor('staff-a', 'staff', '010'), actor('manager-a', 'branch_manager', '010'), actor('admin', 'admin', null)]) {
      await assertSucceeds(getDoc(doc(db, ownPath, 'change-1')));
      expect(await ids(collection(db, ownPath))).toEqual(['change-1']);
    }
    for (const [db, path] of [
      [actor('staff-b', 'staff', '019'), ownPath], [actor('manager-b', 'branch_manager', '019'), ownPath],
      [actor('staff-a', 'staff', '010'), 'giftDistributions/distribution-team/revisions'],
    ]) {
      await assertFails(getDoc(doc(db, path, 'change-1')));
      await assertFails(getDocs(collection(db, path)));
    }
  });

  it('allows Admin all branches and date-only report queries', async () => {
    const db = actor('admin', 'admin', null);
    for (const path of Object.keys(giftDocuments).filter((path) => !path.includes('NameKeys/'))) {
      await assertSucceeds(getDoc(doc(db, path)));
    }
    expect(await ids(query(collection(db, 'giftDistributions'), ...dateRange()))).toEqual(['distribution-a', 'distribution-b', 'distribution-team']);
    expect(await ids(query(collection(db, 'giftStockMovements'), ...dateRange()))).toEqual(['correction-a', 'inbound-a', 'movement-a', 'movement-b', 'movement-team']);
    expect(await ids(query(collection(db, 'giftDistributions'), where('branchId', '==', '019'), ...dateRange()))).toEqual(['distribution-b']);
    for (const [path, count] of [['branchGiftStocks', 2], ['giftCampaigns', 4], ['giftReceipts', 2], ['giftAllocations', 2]]) {
      expect((await ids(collection(db, path))).length).toBe(count);
    }
  });

  it.each([['staff-a', 'staff', '010'], ['manager-a', 'branch_manager', '010'], ['admin', 'admin', null]])(
    'denies %s all name-reservation reads and direct gift creates, updates and deletes', async (uid, role, branchId) => {
      const db = actor(uid, role, branchId);
      for (const [path, id] of collectionPaths) {
        const data = giftDocuments[`${path}/${id}`];
        await assertFails(setDoc(doc(db, path, 'client-create'), data));
        await assertFails(updateDoc(doc(db, path, id), data));
        await assertFails(deleteDoc(doc(db, path, id)));
        if (path.includes('NameKeys')) {
          await assertFails(getDoc(doc(db, path, id)));
          await assertFails(getDocs(collection(db, path)));
        }
      }
    },
  );
});

describe('Firestore claim and branch matrix', () => {
  const customerCreate = (uid, branchId = '010') => ({
    name: 'New', phone: '020', address: '', status: 'ໃໝ່', priority: 'ທົ່ວໄປ', branchId,
    branch: branchId, note: '', gps: '', location: null, imageUrl: '', placeImageUrl: '',
    birthDate: null,
    imageStoragePath: null, placeImageStoragePath: null, statusTimestamps: { 'ໃໝ່': serverTimestamp() },
    recordState: 'active', createdBy: uid, createdAt: serverTimestamp(), updatedBy: uid,
    updatedAt: serverTimestamp(), archivedBy: null, archivedAt: null, deletedBy: null, deletedAt: null,
  });
  it('denies logged-out, pending, and disabled CRM reads', async () => {
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'customers/a')));
    await assertFails(getDoc(doc(actor('pending', 'staff', '010', 'pending'), 'customers/a')));
    await assertFails(getDoc(doc(actor('disabled', 'staff', '010', 'disabled'), 'customers/a')));
  });
  it('isolates staff and managers by branch while admin reads all', async () => {
    await assertSucceeds(getDoc(doc(actor('staff-a', 'staff', '010'), 'customers/a')));
    await assertFails(getDoc(doc(actor('staff-a', 'staff', '010'), 'customers/b')));
    await assertFails(getDoc(doc(actor('manager-b', 'branch_manager', '019'), 'customers/a')));
    await assertSucceeds(getDoc(doc(actor('admin', 'admin', null), 'customers/a')));
    await assertSucceeds(getDoc(doc(actor('admin', 'admin', null), 'customers/b')));
  });
  it('fails closed when cached claims differ from the current profile', async () => {
    await assertFails(getDoc(doc(actor('staff-a', 'staff', '019'), 'customers/a')));
    await assertFails(getDoc(doc(actor('admin', 'staff', null), 'customers/a')));
  });
  it('prevents self-promotion and self-branch changes', async () => {
    const db = actor('staff-a', 'staff', '010');
    await assertSucceeds(updateDoc(doc(db, 'users/staff-a'), { name: 'Updated' }));
    await assertFails(updateDoc(doc(db, 'users/staff-a'), { role: 'admin' }));
    await assertFails(updateDoc(doc(db, 'users/staff-a'), { branchId: '019' }));
    await assertFails(updateDoc(doc(db, 'users/staff-a'), { accountStatus: 'disabled' }));
  });
  it('allows audited normal editing but reserves lifecycle changes for Functions', async () => {
    await assertSucceeds(updateDoc(doc(actor('staff-a', 'staff', '010'), 'customers/a'), { note: 'Own branch', updatedBy: 'staff-a', updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(actor('staff-a', 'staff', '010'), 'customers/a'), { recordState: 'trashed' }));
    await assertFails(updateDoc(doc(actor('manager-a', 'branch_manager', '010'), 'customers/a'), { recordState: 'trashed', deletedBy: 'manager-a', deletedAt: new Date(), purgeAfter: new Date(Date.now() + 30 * 86_400_000) }));
    await assertFails(updateDoc(doc(actor('admin', 'admin', null), 'customers/a'), { branchId: '019', updatedBy: 'admin', updatedAt: serverTimestamp() }));
  });
  it('requires canonical customer creation schema and server-owned audit fields', async () => {
    await assertSucceeds(setDoc(doc(actor('staff-a', 'staff', '010'), 'customers/new-a'), customerCreate('staff-a')));
    await assertSucceeds(setDoc(doc(actor('staff-a', 'staff', '010'), 'customers/with-birth-date'), { ...customerCreate('staff-a'), birthDate: '15-09-1990' }));
    const withoutBirthDate = customerCreate('staff-a');
    delete withoutBirthDate.birthDate;
    await assertSucceeds(setDoc(doc(actor('staff-a', 'staff', '010'), 'customers/legacy-client'), withoutBirthDate));
    await assertFails(setDoc(doc(actor('staff-a', 'staff', '010'), 'customers/forged'), { ...customerCreate('staff-a'), createdBy: 'someone-else' }));
    await assertFails(setDoc(doc(actor('admin', 'admin', null), 'customers/unknown-branch'), customerCreate('admin', '999')));
    await assertFails(setDoc(doc(actor('admin', 'admin', null), 'customers/extra-field'), { ...customerCreate('admin'), isAdmin: true }));
    await assertFails(setDoc(doc(actor('staff-a', 'staff', '010'), 'customers/bad-image-path'), { ...customerCreate('staff-a'), imageStoragePath: 'customers/a/customer-photo' }));
    await assertFails(setDoc(doc(actor('staff-a', 'staff', '010'), 'customers/forged-greeting'), { ...customerCreate('staff-a'), birthdayGreeting: { occurrenceYear: 2026 } }));
  });
  it('allows own-branch birth-date edits while rejecting malformed, cross-branch, and greeting writes', async () => {
    await assertSucceeds(updateDoc(doc(actor('staff-a', 'staff', '010'), 'customers/a'), { birthDate: '15-09-1990', updatedBy: 'staff-a', updatedAt: serverTimestamp() }));
    await assertSucceeds(updateDoc(doc(actor('staff-a', 'staff', '010'), 'customers/a'), { birthDate: null, updatedBy: 'staff-a', updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(actor('staff-a', 'staff', '010'), 'customers/a'), { birthDate: '1990-09-15', updatedBy: 'staff-a', updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(actor('staff-a', 'staff', '010'), 'customers/a'), { birthDate: '1-09-1990', updatedBy: 'staff-a', updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(actor('staff-a', 'staff', '010'), 'customers/a'), { birthDate: 'not-a-date', updatedBy: 'staff-a', updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(actor('staff-b', 'staff', '019'), 'customers/a'), { birthDate: '15-09-1990', updatedBy: 'staff-b', updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(actor('staff-a', 'staff', '010'), 'customers/a'), { birthdayGreeting: { occurrenceYear: 2026, acknowledgedBy: 'staff-a' }, updatedBy: 'staff-a', updatedAt: serverTimestamp() }));
  });
  it('makes activities readable by branch and server-write-only', async () => {
    await assertSucceeds(getDoc(doc(actor('staff-a', 'staff', '010'), 'activities/a')));
    await assertFails(getDoc(doc(actor('staff-b', 'staff', '019'), 'activities/a')));
    await assertFails(updateDoc(doc(actor('staff-a', 'staff', '010'), 'activities/a'), { status: 'completed' }));
  });
});

describe('Firestore daily sales actor matrix', () => {
  it('denies anonymous, pending, and disabled sales reads', async () => {
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'salesProducts/bcel')));
    await assertFails(getDoc(doc(actor('pending', 'staff', '010', 'pending'), 'dailySales/2026-09-11_staff-a')));
    await assertFails(getDoc(doc(actor('disabled', 'staff', '010', 'disabled'), 'dailySales/2026-09-11_staff-a')));
  });

  it('lets staff read only their own daily sales', async () => {
    const db = actor('staff-a', 'staff', '010');
    await assertSucceeds(getDoc(doc(db, 'dailySales/2026-09-11_staff-a')));
    await assertFails(getDoc(doc(db, 'dailySales/2026-09-11_staff-b')));
  });

  it('lets branch managers read their branch and their own record only', async () => {
    const managerA = actor('manager-a', 'branch_manager', '010');
    const managerB = actor('manager-b', 'branch_manager', '019');
    await assertSucceeds(getDoc(doc(managerA, 'dailySales/2026-09-11_staff-a')));
    await assertFails(getDoc(doc(managerB, 'dailySales/2026-09-11_staff-a')));
  });

  it('lets admins read daily sales from every branch', async () => {
    const db = actor('admin', 'admin', null);
    await assertSucceeds(getDoc(doc(db, 'dailySales/2026-09-11_staff-a')));
    await assertSucceeds(getDoc(doc(db, 'dailySales/2026-09-11_staff-b')));
  });

  it('applies parent sales scope to revision reads', async () => {
    const revisionPath = 'dailySales/2026-09-11_staff-a/revisions/change-1';
    await assertSucceeds(getDoc(doc(actor('staff-a', 'staff', '010'), revisionPath)));
    await assertSucceeds(getDoc(doc(actor('manager-a', 'branch_manager', '010'), revisionPath)));
    await assertFails(getDoc(doc(actor('staff-b', 'staff', '019'), revisionPath)));
    await assertFails(getDoc(doc(actor('manager-b', 'branch_manager', '019'), revisionPath)));
    await assertSucceeds(getDoc(doc(actor('admin', 'admin', null), revisionPath)));
  });

  it('lets every approved actor read products', async () => {
    await assertSucceeds(getDoc(doc(actor('staff-a', 'staff', '010'), 'salesProducts/bcel')));
    await assertSucceeds(getDoc(doc(actor('manager-a', 'branch_manager', '010'), 'salesProducts/bcel')));
    await assertSucceeds(getDoc(doc(actor('admin', 'admin', null), 'salesProducts/bcel')));
  });

  it('requires staff queries to prove ownership and denies same-branch team queries', async () => {
    const staffDb = actor('staff-a', 'staff', '010');
    const staffQuery = query(collection(staffDb, 'dailySales'), where('staffUid', '==', 'staff-a'), where('dateKey', '>=', '2026-09-01'), where('dateKey', '<=', '2026-09-30'), orderBy('dateKey', 'desc'));
    await assertSucceeds(getDocs(staffQuery));
    await assertFails(getDocs(query(collection(staffDb, 'dailySales'), where('branchId', '==', '010'))));
  });

  it('supports branch-scoped manager queries and unrestricted admin date queries', async () => {
    const managerDb = actor('manager-a', 'branch_manager', '010');
    const managerQuery = query(collection(managerDb, 'dailySales'), where('branchId', '==', '010'), where('dateKey', '>=', '2026-09-01'), where('dateKey', '<=', '2026-09-30'), orderBy('dateKey', 'desc'));
    await assertSucceeds(getDocs(managerQuery));
    await assertFails(getDocs(query(collection(managerDb, 'dailySales'), where('branchId', '==', '019'))));

    const adminDb = actor('admin', 'admin', null);
    const adminQuery = query(collection(adminDb, 'dailySales'), where('dateKey', '>=', '2026-09-01'), where('dateKey', '<=', '2026-09-30'), orderBy('dateKey', 'desc'));
    await assertSucceeds(getDocs(adminQuery));
  });

  it('denies all direct sales catalog, daily record, and revision writes', async () => {
    const db = actor('admin', 'admin', null);
    await assertFails(setDoc(doc(db, 'salesProducts/ibank'), { name: 'iBank', active: true, sortOrder: 20 }));
    await assertFails(updateDoc(doc(db, 'salesProducts/bcel'), { name: 'Renamed' }));
    await assertFails(deleteDoc(doc(db, 'salesProducts/bcel')));

    await assertFails(setDoc(doc(db, 'dailySales/new'), { dateKey: '2026-09-12', staffUid: 'admin', branchId: null, items: [], totalQuantity: 0 }));
    await assertFails(updateDoc(doc(db, 'dailySales/2026-09-11_staff-a'), { totalQuantity: 1 }));
    await assertFails(deleteDoc(doc(db, 'dailySales/2026-09-11_staff-a')));

    await assertFails(setDoc(doc(db, 'dailySales/2026-09-11_staff-a/revisions/change-2'), { changedBy: 'admin', changedAt: new Date() }));
    await assertFails(updateDoc(doc(db, 'dailySales/2026-09-11_staff-a/revisions/change-1'), { changedBy: 'admin' }));
    await assertFails(deleteDoc(doc(db, 'dailySales/2026-09-11_staff-a/revisions/change-1')));
  });
});
