import { ACTIVITY_STATUSES, ACTIVITY_TYPES, RECORD_STATES } from './constants';
import { isKnownBranch } from '../branches/branches';

function asDate(value) {
  if (value?.toDate) return value.toDate();
  return value instanceof Date ? value : new Date(value);
}

export function validateActivity(activity) {
  const errors = {};
  const types = Object.values(ACTIVITY_TYPES);
  if (!types.includes(activity?.type)) errors.type = 'Invalid activity type';
  if (!activity?.title?.trim()) errors.title = 'Title is required';
  if (!isKnownBranch(activity?.branchId)) errors.branchId = 'A known branch is required';
  if (!ACTIVITY_STATUSES.includes(activity?.status)) errors.status = 'Invalid activity status';
  if (!Object.values(RECORD_STATES).includes(activity?.recordState)) errors.recordState = 'Invalid record state';

  const startAt = asDate(activity?.startAt);
  const endAt = asDate(activity?.endAt);
  if (Number.isNaN(startAt.getTime())) errors.startAt = 'Start time is required';
  if (Number.isNaN(endAt.getTime()) || (!errors.startAt && endAt < startAt)) errors.endAt = 'End time must be after start time';

  const assignees = activity?.assignedStaffIds;
  if (!Array.isArray(assignees) || assignees.length === 0 || assignees.length > 25 || new Set(assignees).size !== assignees?.length || assignees.some((id) => typeof id !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(id))) {
    errors.assignedStaffIds = 'Assignees must be unique user IDs';
  }

  if (activity?.type === ACTIVITY_TYPES.CUSTOMER_VISIT && !activity?.customerId) {
    errors.customerId = 'Customer Visit requires a customer';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateAssignees(assignedStaffIds, users, branchId) {
  if (!Array.isArray(assignedStaffIds) || new Set(assignedStaffIds).size !== assignedStaffIds.length) {
    return { valid: false, invalidIds: assignedStaffIds ?? [] };
  }
  const userById = new Map(users.map((user) => [user.uid, user]));
  const invalidIds = assignedStaffIds.filter((uid) => {
    const user = userById.get(uid);
    return !user || user.accountStatus !== 'approved' || user.branchId !== branchId;
  });
  return { valid: invalidIds.length === 0, invalidIds };
}
