import test from 'node:test'; import assert from 'node:assert/strict';
import { actorFromRequest, assertAdmin, canEditActivity, profileMatchesActor } from '../src/authz.js';

test('actor requires approved custom claims', () => {
  assert.throws(() => actorFromRequest({ auth: null }), /authenticated/i);
  assert.throws(() => actorFromRequest({ auth: { uid: 'u1', token: { role: 'staff', branchId: '010', accountStatus: 'pending' } } }), /approved/i);
  assert.deepEqual(actorFromRequest({ auth: { uid: 'u1', token: { role: 'staff', branchId: '010', accountStatus: 'approved' } } }), { uid: 'u1', role: 'staff', branchId: '010', accountStatus: 'approved' });
});

test('admin authority is claim-only', () => {
  assert.throws(() => assertAdmin({ uid: 'legacy', role: 'staff', branchId: 'Admin' }), /admin/i);
  assert.doesNotThrow(() => assertAdmin({ uid: 'a', role: 'admin' }));
});

test('activity edit matrix keeps branch boundaries', () => {
  const appointment = { type: 'appointment', branchId: '010', createdBy: 'owner', assignedStaffIds: ['assigned'] };
  assert.equal(canEditActivity({ uid: 'assigned', role: 'staff', branchId: '010' }, appointment), true);
  assert.equal(canEditActivity({ uid: 'other', role: 'staff', branchId: '010' }, appointment), false);
  assert.equal(canEditActivity({ uid: 'manager', role: 'branch_manager', branchId: '010' }, appointment), true);
  assert.equal(canEditActivity({ uid: 'manager-b', role: 'branch_manager', branchId: '019' }, appointment), false);
  assert.equal(canEditActivity({ uid: 'staff', role: 'staff', branchId: '010' }, { ...appointment, type: 'customer_visit' }), true);
});

test('disabled profile invalidates a still-cached approved token', () => {
  const actor={uid:'u1',role:'staff',branchId:'010',accountStatus:'approved'};
  assert.equal(profileMatchesActor(actor,{role:'staff',branchId:'010',accountStatus:'disabled'}),false);
  assert.equal(profileMatchesActor(actor,{role:'staff',branchId:'010',accountStatus:'approved'}),true);
});
