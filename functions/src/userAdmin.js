import { FieldValue } from 'firebase-admin/firestore';
import { assertAdmin } from './authz.js';
import { assertKnownRoleAndBranch } from './validators.js';

async function setAccess({ db, auth }, actor, data, approving) {
  assertAdmin(actor);
  if (!data?.uid || data.uid === actor.uid && data.role !== 'admin') throw new Error('Invalid target user');
  assertKnownRoleAndBranch(data.role, data.branchId);
  const target = await auth.getUser(data.uid);
  const claims = { ...(target.customClaims ?? {}), role: data.role, branchId: data.role === 'admin' ? null : data.branchId, accountStatus: 'approved' };
  // Write the profile first. Until claims are refreshed, the deliberate mismatch
  // makes both Rules engines fail closed.
  await db.doc(`users/${data.uid}`).set({
    role: data.role,
    branchId: data.role === 'admin' ? null : data.branchId,
    accountStatus: 'approved',
    updatedAt: FieldValue.serverTimestamp(),
    ...(approving ? { approvedAt: FieldValue.serverTimestamp(), approvedBy: actor.uid } : {}),
  }, { merge: true });
  await auth.setCustomUserClaims(data.uid, claims);
  return { uid: data.uid, accountStatus: 'approved' };
}

export const approveUserOperation = (services, actor, data) => setAccess(services, actor, data, true);
export const updateUserAccessOperation = (services, actor, data) => setAccess(services, actor, data, false);

export async function disableUserOperation({ db, auth }, actor, data) {
  assertAdmin(actor);
  if (!data?.uid || data.uid === actor.uid) throw new Error('Admin cannot disable this account');
  const target = await auth.getUser(data.uid);
  await db.doc(`users/${data.uid}`).set({ accountStatus: 'disabled', updatedAt: FieldValue.serverTimestamp(), disabledAt: FieldValue.serverTimestamp(), disabledBy: actor.uid }, { merge: true });
  await auth.setCustomUserClaims(data.uid, { ...(target.customClaims ?? {}), accountStatus: 'disabled' });
  await auth.revokeRefreshTokens(data.uid);
  return { uid: data.uid, accountStatus: 'disabled' };
}

export async function reactivateUserOperation({ db, auth }, actor, data) {
  assertAdmin(actor);
  if (!data?.uid || data.uid === actor.uid) throw new Error('Admin cannot reactivate this account');
  assertKnownRoleAndBranch(data.role, data.branchId);

  const target = await auth.getUser(data.uid);
  const profileRef = db.doc(`users/${data.uid}`);
  const profile = await profileRef.get();
  if (!profile.exists || profile.data().accountStatus !== 'disabled') throw new Error('Target account must be disabled');

  const branchId = data.role === 'admin' ? null : data.branchId;
  const claims = { ...(target.customClaims ?? {}), role: data.role, branchId, accountStatus: 'approved' };
  // Keep access fail-closed and the transition retryable: until the final
  // profile write, Rules deny both old and newly refreshed sessions.
  await auth.setCustomUserClaims(data.uid, claims);
  await auth.updateUser(data.uid, { disabled: false });
  await profileRef.set({
    role: data.role,
    branchId,
    accountStatus: 'approved',
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: actor.uid,
    reactivatedAt: FieldValue.serverTimestamp(),
    reactivatedBy: actor.uid,
  }, { merge: true });
  return { uid: data.uid, accountStatus: 'approved' };
}
