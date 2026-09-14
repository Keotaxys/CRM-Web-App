import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createGiftCampaignOperation,
  createGiftItemOperation,
  updateGiftCampaignOperation,
  updateGiftItemOperation,
} from '../src/giftCatalog.js';
import { fakeGiftFirestore } from './helpers/fakeGiftFirestore.js';

const admin = { uid: 'admin-a', role: 'admin', branchId: null, accountStatus: 'approved' };
const managerA = { uid: 'manager-a', role: 'branch_manager', branchId: '010', accountStatus: 'approved' };
const staffA = { uid: 'staff-a', role: 'staff', branchId: '010', accountStatus: 'approved' };

const giftInput = {
  name: '  ຄັນຮົ່ມ  ', unitLabel: 'ອັນ', packLabel: 'ແພັກ', unitsPerPack: 10, sortOrder: 20,
};
const campaignInput = {
  name: 'ປີໃໝ່', branchId: '010', startDate: '2026-12-01', endDate: '2026-12-31', note: '',
};

test('fake Firestore stages all transaction writes and discards them when the callback fails', async () => {
  const state = fakeGiftFirestore({ 'things/existing': { branchId: '010', value: 1 } });
  await assert.rejects(() => state.services.db.runTransaction(async (transaction) => {
    const match = await transaction.get(
      state.services.db.collection('things').where('branchId', '==', '010').limit(1),
    );
    assert.equal(match.size, 1);
    transaction.update(state.services.db.doc('things/existing'), { value: 2 });
    transaction.create(state.services.db.doc('things/new'), { branchId: '010' });
    transaction.set(state.services.db.doc('things/set'), { branchId: '010' });
    transaction.delete(state.services.db.doc('things/existing'));
    throw new Error('abort transaction');
  }), /abort transaction/);
  assert.deepEqual([...state.documents.entries()], [['things/existing', { branchId: '010', value: 1 }]]);
  assert.deepEqual(state.writes, []);
});

test('fake Firestore isolates nested input snapshots committed documents and write history', async () => {
  const initial = { 'things/existing': { nested: { value: 1 } } };
  const state = fakeGiftFirestore(initial);
  initial['things/existing'].nested.value = 99;
  assert.equal(state.documents.get('things/existing').nested.value, 1);

  const stagedValue = { nested: { value: 2 }, rows: [{ count: 3 }] };
  await state.services.db.runTransaction(async (transaction) => {
    const existing = await transaction.get(state.services.db.doc('things/existing'));
    existing.data().nested.value = 98;
    transaction.create(state.services.db.doc('things/new'), stagedValue);
    stagedValue.nested.value = 97;
    stagedValue.rows[0].count = 96;
  });

  stagedValue.nested.value = 95;
  assert.equal(state.documents.get('things/existing').nested.value, 1);
  assert.deepEqual(state.documents.get('things/new'), { nested: { value: 2 }, rows: [{ count: 3 }] });
  assert.deepEqual(state.writes[0].value, { nested: { value: 2 }, rows: [{ count: 3 }] });
  state.writes[0].value.nested.value = 94;
  assert.equal(state.documents.get('things/new').nested.value, 2);
  state.documents.get('things/new').rows[0].count = 93;
  assert.equal(state.writes[0].value.rows[0].count, 3);
});

test('Admin creates one normalized active gift and reserves its name', async () => {
  const state = fakeGiftFirestore({
    'users/admin-a': { role: 'admin', branchId: null, accountStatus: 'approved' },
  });
  const result = await createGiftItemOperation(state.services, admin, giftInput);
  assert.equal(result.name, 'ຄັນຮົ່ມ');
  assert.equal(state.documents.get(`giftItems/${result.id}`).active, true);
  assert.equal([...state.documents.keys()].filter((path) => path.startsWith('giftItemNameKeys/')).length, 1);
  assert.deepEqual(state.writes.slice(0, 2).map(({ type, path }) => [type, path.split('/')[0]]), [
    ['create', 'giftItemNameKeys'], ['create', 'giftItems'],
  ]);
});

test('gift administration denies Anonymous Pending Disabled Staff and duplicate names', async () => {
  const actors = [
    [undefined, {}],
    [{ ...admin, uid: 'pending-a', accountStatus: 'pending' },
      { 'users/pending-a': { role: 'admin', branchId: null, accountStatus: 'pending' } }],
    [{ ...admin, uid: 'disabled-a', accountStatus: 'disabled' },
      { 'users/disabled-a': { role: 'admin', branchId: null, accountStatus: 'disabled' } }],
    [staffA, { 'users/staff-a': { role: 'staff', branchId: '010', accountStatus: 'approved' } }],
  ];
  for (const [actor, documents] of actors) {
    await assert.rejects(() => createGiftItemOperation(fakeGiftFirestore(documents).services, actor, giftInput),
      /Admin|approved|profile/i);
  }

  const state = fakeGiftFirestore({
    'users/admin-a': { role: 'admin', branchId: null, accountStatus: 'approved' },
  });
  await createGiftItemOperation(state.services, admin, giftInput);
  await assert.rejects(() => createGiftItemOperation(state.services, admin, { ...giftInput, name: 'ຄັນຮົ່ມ' }),
    /exists/i);
});

test('gift validation rejects incomplete labels and unsafe catalog numbers', async () => {
  const documents = { 'users/admin-a': { role: 'admin', branchId: null, accountStatus: 'approved' } };
  for (const input of [
    { ...giftInput, unitLabel: ' ' },
    { ...giftInput, packLabel: null },
    { ...giftInput, unitsPerPack: 0 },
    { ...giftInput, unitsPerPack: Number.MAX_SAFE_INTEGER + 1 },
    { ...giftInput, sortOrder: 1.5 },
  ]) {
    await assert.rejects(() => createGiftItemOperation(fakeGiftFirestore(documents).services, admin, input),
      /label|pack|integer|safe|sort/i);
  }
});

test('gift rename reserves the new name releases the old name and deactivation preserves the item', async () => {
  const state = fakeGiftFirestore({
    'users/admin-a': { role: 'admin', branchId: null, accountStatus: 'approved' },
  });
  const created = await createGiftItemOperation(state.services, admin, giftInput);
  const oldKey = [...state.documents.keys()].find((path) => path.startsWith('giftItemNameKeys/'));
  await updateGiftItemOperation(state.services, admin, {
    giftId: created.id, ...giftInput, name: ' ເສື້ອ ', active: false,
  });
  assert.equal(state.documents.has(oldKey), false);
  assert.equal([...state.documents.keys()].filter((path) => path.startsWith('giftItemNameKeys/')).length, 1);
  assert.equal(state.documents.get(`giftItems/${created.id}`).name, 'ເສື້ອ');
  assert.equal(state.documents.get(`giftItems/${created.id}`).active, false);
});

test('Manager creates Campaign only for own branch and duplicate branch name fails', async () => {
  const state = fakeGiftFirestore({
    'users/manager-a': { role: 'branch_manager', branchId: '010', accountStatus: 'approved' },
  });
  await assert.doesNotReject(() => createGiftCampaignOperation(state.services, managerA, campaignInput));
  await assert.rejects(() => createGiftCampaignOperation(state.services, managerA, {
    ...campaignInput, name: 'ຂ້າມສາຂາ', branchId: '019',
  }), /branch/i);
  await assert.rejects(() => createGiftCampaignOperation(state.services, managerA, {
    ...campaignInput, name: '  ປີໃໝ່  ',
  }), /exists/i);
});

test('Campaign administration denies Anonymous Pending Disabled and Staff while Admin may use any branch', async () => {
  const denied = [
    [undefined, {}],
    [{ ...managerA, uid: 'pending-a', accountStatus: 'pending' },
      { 'users/pending-a': { role: 'branch_manager', branchId: '010', accountStatus: 'pending' } }],
    [{ ...managerA, uid: 'disabled-a', accountStatus: 'disabled' },
      { 'users/disabled-a': { role: 'branch_manager', branchId: '010', accountStatus: 'disabled' } }],
    [staffA, { 'users/staff-a': { role: 'staff', branchId: '010', accountStatus: 'approved' } }],
  ];
  for (const [actor, documents] of denied) {
    await assert.rejects(() => createGiftCampaignOperation(fakeGiftFirestore(documents).services, actor, campaignInput),
      /Manager|Admin|approved|profile/i);
  }
  const state = fakeGiftFirestore({
    'users/admin-a': { role: 'admin', branchId: null, accountStatus: 'approved' },
  });
  await assert.doesNotReject(() => createGiftCampaignOperation(state.services, admin, {
    ...campaignInput, branchId: '019',
  }));
});

test('Campaign dates must be real ordered date keys', async () => {
  const documents = {
    'users/manager-a': { role: 'branch_manager', branchId: '010', accountStatus: 'approved' },
  };
  for (const dates of [
    { startDate: '2026-12-31', endDate: '2026-12-01' },
    { startDate: '2026-02-30', endDate: '2026-12-01' },
    { startDate: '12/01/2026', endDate: '2026-12-01' },
  ]) {
    await assert.rejects(() => createGiftCampaignOperation(fakeGiftFirestore(documents).services, managerA, {
      ...campaignInput, ...dates,
    }), /date|range/i);
  }
});

test('Campaign names are unique per branch and rename releases the old reservation without hard deletion', async () => {
  const state = fakeGiftFirestore({
    'users/admin-a': { role: 'admin', branchId: null, accountStatus: 'approved' },
  });
  const first = await createGiftCampaignOperation(state.services, admin, campaignInput);
  await assert.doesNotReject(() => createGiftCampaignOperation(state.services, admin, {
    ...campaignInput, branchId: '019',
  }));
  const oldKey = [...state.documents.keys()].find((path) => path.startsWith('giftCampaignNameKeys/')
    && state.documents.get(path).campaignId === first.id);
  await updateGiftCampaignOperation(state.services, admin, {
    campaignId: first.id, ...campaignInput, name: 'ບຸນປີໃໝ່', active: false,
  });
  assert.equal(state.documents.has(oldKey), false);
  assert.equal(state.documents.get(`giftCampaigns/${first.id}`).active, false);
  assert.equal(state.documents.get(`giftCampaigns/${first.id}`).name, 'ບຸນປີໃໝ່');
});
