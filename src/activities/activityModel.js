import { ACTIVITY_STATUSES, ACTIVITY_TYPES, RECORD_STATES } from '../shared/constants';

const editableFields = new Set([
  'type', 'title', 'status', 'startAt', 'endAt', 'location', 'purpose', 'note', 'customerId',
  'assignedStaffIds', 'visitPurpose', 'productServices', 'preVisitNotes', 'visitNotes', 'result',
  'followUpRequired', 'followUpDate', 'followUpCompletedAt', 'followUpCompletedBy', 'nextAction',
]);

export function normalizeActivity(activity) {
  if (!activity) return null;
  return {
    ...activity,
    assignedStaffIds: Array.isArray(activity.assignedStaffIds) ? activity.assignedStaffIds : [],
    productServices: Array.isArray(activity.productServices) ? activity.productServices : [],
    recordState: activity.recordState || RECORD_STATES.ACTIVE,
    status: ACTIVITY_STATUSES.includes(activity.status) ? activity.status : ACTIVITY_STATUSES[0],
    followUpRequired: activity.followUpRequired === true,
  };
}

export function activityCreatePayload(values, actor, timestamp) {
  const payload = {};
  for (const [key, value] of Object.entries(values)) {
    if (editableFields.has(key)) payload[key] = value;
  }
  payload.type = Object.values(ACTIVITY_TYPES).includes(values.type) ? values.type : ACTIVITY_TYPES.APPOINTMENT;
  payload.status = ACTIVITY_STATUSES.includes(values.status) ? values.status : ACTIVITY_STATUSES[0];
  payload.branchId = actor.branchId;
  payload.assignedStaffIds = [...new Set(values.assignedStaffIds ?? [actor.uid])];
  payload.recordState = RECORD_STATES.ACTIVE;
  payload.createdBy = actor.uid;
  payload.createdAt = timestamp;
  payload.updatedBy = actor.uid;
  payload.updatedAt = timestamp;
  payload.deletedBy = null;
  payload.deletedAt = null;
  return payload;
}

export function activityUpdatePayload(values, actor, timestamp) {
  const payload = {};
  for (const [key, value] of Object.entries(values)) {
    if (editableFields.has(key)) payload[key] = value;
  }
  payload.updatedBy = actor.uid;
  payload.updatedAt = timestamp;
  return payload;
}
