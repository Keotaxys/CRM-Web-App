import test from 'node:test';
import assert from 'node:assert/strict';
import { reactivateUserOperation } from '../src/userAdmin.js';

test('reactivation restores a disabled branch user with audit fields while access stays fail-closed until Auth is enabled', async () => {
  const events = [];
  const profile = { accountStatus: 'disabled', role: 'staff', branchId: '019' };
  const profileRef = {
    async get() { return { exists: true, data: () => profile }; },
    async set(value, options) {
      events.push({ type: 'profile', value, options });
      Object.assign(profile, value);
    },
  };
  const authUser = { disabled: true, customClaims: { retainedClaim: 'kept', accountStatus: 'disabled', role: 'staff', branchId: '019' } };
  const services = {
    db: { doc: (path) => { assert.equal(path, 'users/target'); return profileRef; } },
    auth: {
      async getUser(uid) { assert.equal(uid, 'target'); return authUser; },
      async setCustomUserClaims(uid, claims) {
        assert.equal(uid, 'target');
        events.push({ type: 'claims', claims, profileStatus: profile.accountStatus, authDisabled: authUser.disabled });
        authUser.customClaims = claims;
      },
      async updateUser(uid, changes) {
        assert.equal(uid, 'target');
        events.push({ type: 'auth', changes, profileStatus: profile.accountStatus, claimStatus: authUser.customClaims.accountStatus });
        Object.assign(authUser, changes);
      },
    },
  };

  const result = await reactivateUserOperation(services, { uid: 'admin', role: 'admin' }, { uid: 'target', role: 'branch_manager', branchId: '020' });

  assert.deepEqual(result, { uid: 'target', accountStatus: 'approved' });
  assert.equal(events[0].type, 'claims');
  assert.equal(events[0].profileStatus, 'disabled');
  assert.equal(events[0].authDisabled, true);
  assert.deepEqual(events[0].claims, { retainedClaim: 'kept', role: 'branch_manager', branchId: '020', accountStatus: 'approved' });
  assert.deepEqual(events[1], { type: 'auth', changes: { disabled: false }, profileStatus: 'disabled', claimStatus: 'approved' });
  assert.equal(events[2].type, 'profile');
  assert.deepEqual(events[2].options, { merge: true });
  assert.deepEqual(events[2].value, {
    role: 'branch_manager',
    branchId: '020',
    accountStatus: 'approved',
    updatedAt: events[2].value.updatedAt,
    updatedBy: 'admin',
    reactivatedAt: events[2].value.reactivatedAt,
    reactivatedBy: 'admin',
  });
});

test('reactivation maps an Admin target to a null branch', async () => {
  let profileWrite;
  let claimsWrite;
  const services = {
    db: { doc: () => ({
      get: async () => ({ exists: true, data: () => ({ accountStatus: 'disabled' }) }),
      set: async (value) => { profileWrite = value; },
    }) },
    auth: {
      getUser: async () => ({ disabled: true, customClaims: {} }),
      setCustomUserClaims: async (_uid, claims) => { claimsWrite = claims; },
      updateUser: async () => {},
    },
  };

  await reactivateUserOperation(services, { uid: 'admin', role: 'admin' }, { uid: 'target', role: 'admin', branchId: '020' });

  assert.equal(profileWrite.branchId, null);
  assert.equal(claimsWrite.branchId, null);
});

test('reactivation rejects non-Admin, self, invalid access, and non-disabled targets before enabling Auth', async () => {
  let enableCalls = 0;
  const services = {
    db: { doc: () => ({ get: async () => ({ exists: true, data: () => ({ accountStatus: 'approved' }) }), set: async () => {} }) },
    auth: {
      getUser: async () => ({ disabled: true, customClaims: {} }),
      setCustomUserClaims: async () => {},
      updateUser: async () => { enableCalls += 1; },
    },
  };

  await assert.rejects(() => reactivateUserOperation(services, { uid: 'staff', role: 'staff' }, { uid: 'target', role: 'staff', branchId: '010' }), /admin/i);
  await assert.rejects(() => reactivateUserOperation(services, { uid: 'admin', role: 'admin' }, { uid: 'admin', role: 'admin', branchId: null }), /reactivate/i);
  await assert.rejects(() => reactivateUserOperation(services, { uid: 'admin', role: 'admin' }, { uid: 'target', role: 'staff', branchId: '999' }), /branch/i);
  await assert.rejects(() => reactivateUserOperation(services, { uid: 'admin', role: 'admin' }, { uid: 'target', role: 'staff', branchId: '010' }), /disabled/i);
  assert.equal(enableCalls, 0);
});

test('reactivation remains disabled and retryable when the claim update fails partway through', async () => {
  const profile = { accountStatus: 'disabled', role: 'staff', branchId: '019' };
  let failClaimUpdate = true;
  const services = {
    db: { doc: () => ({
      get: async () => ({ exists: true, data: () => profile }),
      set: async (value) => { Object.assign(profile, value); },
    }) },
    auth: {
      getUser: async () => ({ disabled: true, customClaims: { accountStatus: 'disabled' } }),
      setCustomUserClaims: async () => {
        if (failClaimUpdate) {
          failClaimUpdate = false;
          throw new Error('temporary claim failure');
        }
      },
      updateUser: async () => {},
    },
  };
  const actor = { uid: 'admin', role: 'admin' };
  const data = { uid: 'target', role: 'staff', branchId: '020' };

  await assert.rejects(() => reactivateUserOperation(services, actor, data), /temporary claim failure/i);
  assert.equal(profile.accountStatus, 'disabled');
  await assert.doesNotReject(() => reactivateUserOperation(services, actor, data));
  assert.equal(profile.accountStatus, 'approved');
});
