import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { assertAdmin, assertBranchAccess, canEditActivity, canManageAssignees, canTrashRecord } from './authz.js';
import { assertValidAssignees, isTrashExpired, trashExpiresAt, validateActivityInput } from './validators.js';

const EDITABLE = new Set(['type','title','status','startAt','endAt','location','purpose','note','customerId','assignedStaffIds','visitPurpose','productServices','preVisitNotes','visitNotes','result','followUpRequired','followUpDate','nextAction']);
const pick = (values = {}) => Object.fromEntries(Object.entries(values).filter(([key]) => EDITABLE.has(key)));
const persistedValues = (values) => Object.fromEntries(Object.entries(values).map(([key, value]) => [key, ['startAt','endAt','followUpDate'].includes(key) && value ? Timestamp.fromDate(value?.toDate ? value.toDate() : new Date(value)) : value]));

async function loadAssignees(db, ids) {
  const snapshots = await db.getAll(...ids.map((uid) => db.doc(`users/${uid}`)));
  return snapshots.map((snapshot) => ({ uid: snapshot.id, ...(snapshot.exists ? snapshot.data() : {}) }));
}

export async function upsertActivityOperation({ db }, actor, data) {
  const activityRef = data?.id ? db.doc(`activities/${data.id}`) : db.collection('activities').doc();
  const snapshot = data?.id ? await activityRef.get() : null;
  if (data?.id && !snapshot.exists) throw new Error('Activity not found');
  const existing = snapshot?.data() ?? null;
  const values = pick(data?.values);
  const branchId = existing?.branchId ?? (actor.role === 'admin' ? data?.values?.branchId : actor.branchId);
  const candidate = {
    ...(existing ?? {}), ...values, branchId,
    type: values.type ?? existing?.type ?? 'appointment',
    status: values.status ?? existing?.status ?? 'planned',
    assignedStaffIds: values.assignedStaffIds ?? existing?.assignedStaffIds ?? [actor.uid],
    recordState: existing?.recordState ?? 'active',
    createdBy: existing?.createdBy ?? actor.uid,
  };
  assertBranchAccess(actor, branchId);
  if (existing && !canEditActivity(actor, existing)) throw new Error('Activity edit denied');
  if (existing && values.assignedStaffIds && !canManageAssignees(actor, existing)) throw new Error('Assignee change denied');
  validateActivityInput(candidate);
  const assignees = await loadAssignees(db, candidate.assignedStaffIds);
  assertValidAssignees(candidate.assignedStaffIds, assignees, branchId, actor.role === 'admin');
  if (candidate.customerId) {
    const customer = await db.doc(`customers/${candidate.customerId}`).get();
    if (!customer.exists || customer.data().branchId !== branchId) throw new Error('Customer must belong to activity branch');
  }
  const now = FieldValue.serverTimestamp();
  await activityRef.set({ ...persistedValues(values), branchId, type: candidate.type, status: candidate.status, assignedStaffIds: candidate.assignedStaffIds, recordState: candidate.recordState, updatedBy: actor.uid, updatedAt: now, ...(existing ? {} : { createdBy: actor.uid, createdAt: now, deletedBy: null, deletedAt: null }) }, { merge: true });
  return { id: activityRef.id };
}

export async function trashActivityOperation({ db }, actor, data) {
  const ref = db.doc(`activities/${data?.id}`); const snapshot = await ref.get();
  if (!snapshot.exists) throw new Error('Activity not found');
  if (!canTrashRecord(actor, snapshot.data())) throw new Error('Activity trash denied');
  const deletedAt=Timestamp.now();
  await ref.update({ recordState: 'trashed', deletedBy: actor.uid, deletedAt, purgeAfter: Timestamp.fromDate(trashExpiresAt(deletedAt)), updatedBy: actor.uid, updatedAt: FieldValue.serverTimestamp() });
  return { id: ref.id, recordState: 'trashed' };
}

export async function completeFollowUpOperation({ db }, actor, data) {
  const ref = db.doc(`activities/${data?.id}`); const snapshot = await ref.get(); if (!snapshot.exists) throw new Error('Activity not found'); const activity = snapshot.data();
  if (!canEditActivity(actor, activity)) throw new Error('Follow-up update denied');
  if (data?.next && (!data.next.nextAction?.trim() || Number.isNaN(new Date(data.next.followUpDate).getTime()))) throw new Error('Valid next action and follow-up date required');
  const update = data?.next ? { followUpRequired: true, followUpDate: Timestamp.fromDate(new Date(data.next.followUpDate)), nextAction: data.next.nextAction.trim(), followUpCompletedAt: null, followUpCompletedBy: null } : { followUpCompletedAt: FieldValue.serverTimestamp(), followUpCompletedBy: actor.uid };
  await ref.update({ ...update, updatedBy: actor.uid, updatedAt: FieldValue.serverTimestamp() }); return { id: ref.id };
}

export async function restoreActivityOperation({ db }, actor, data) { assertAdmin(actor); await db.doc(`activities/${data?.id}`).update({ recordState: 'active', deletedBy: null, deletedAt: null, purgeAfter: null, updatedBy: actor.uid, updatedAt: FieldValue.serverTimestamp() }); return { id: data.id }; }
export async function permanentlyDeleteActivityOperation({ db }, actor, data) { assertAdmin(actor); const ref = db.doc(`activities/${data?.id}`); const snap = await ref.get(); if (!snap.exists) return { id: data.id, deleted: false }; if (snap.data().recordState !== 'trashed') throw new Error('Only trashed activity can be permanently deleted'); await ref.delete(); return { id: data.id, deleted: true }; }
export async function cleanupExpiredActivities(db, now) { const snapshots = await db.collection('activities').where('recordState','==','trashed').get(); const expired = snapshots.docs.filter((item) => isTrashExpired(item.data().deletedAt, now)); const batch = db.batch(); expired.forEach((item) => batch.delete(item.ref)); if (expired.length) await batch.commit(); return expired.length; }
