import { FieldValue } from 'firebase-admin/firestore';
import { assertAdmin } from './authz.js';
import { assertKnownRoleAndBranch } from './validators.js';

async function setAccess({ db, auth }, actor, data, approving) {
  assertAdmin(actor);
  if (!data?.uid || data.uid === actor.uid && data.role !== 'admin') throw new Error('Invalid target user');
  assertKnownRoleAndBranch(data.role, data.branchId);
  const target = await auth.getUser(data.uid);
  const claims = { ...(target.customClaims ?? {}), role: data.role, branchId: data.role === 'admin' ? null : data.branchId, accountStatus: 'approved' };
  await auth.setCustomUserClaims(data.uid, claims);
  await db.doc(`users/${data.uid}`).set({
    role: data.role,
    branchId: data.role === 'admin' ? null : data.branchId,
    accountStatus: 'approved',
    updatedAt: FieldValue.serverTimestamp(),
    ...(approving ? { approvedAt: FieldValue.serverTimestamp(), approvedBy: actor.uid } : {}),
  }, { merge: true });
  return { uid: data.uid, accountStatus: 'approved' };
}

export const approveUserOperation = (services, actor, data) => setAccess(services, actor, data, true);
export const updateUserAccessOperation = (services, actor, data) => setAccess(services, actor, data, false);

export async function disableUserOperation({ db, auth }, actor, data) {
  assertAdmin(actor);
  if (!data?.uid || data.uid === actor.uid) throw new Error('Admin cannot disable this account');
  const target = await auth.getUser(data.uid);
  await auth.setCustomUserClaims(data.uid, { ...(target.customClaims ?? {}), accountStatus: 'disabled' });
  await auth.revokeRefreshTokens(data.uid);
  await db.doc(`users/${data.uid}`).set({ accountStatus: 'disabled', updatedAt: FieldValue.serverTimestamp(), disabledAt: FieldValue.serverTimestamp(), disabledBy: actor.uid }, { merge: true });
  return { uid: data.uid, accountStatus: 'disabled' };
}
