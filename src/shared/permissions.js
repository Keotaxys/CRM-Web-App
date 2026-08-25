import { ACCOUNT_STATUSES, ACTIVITY_TYPES, ROLES } from './constants';

export function canAccessCrm(actor) {
  return Boolean(actor?.uid && actor.accountStatus === ACCOUNT_STATUSES.APPROVED && Object.values(ROLES).includes(actor.role));
}

export function isAdmin(actor) {
  return canAccessCrm(actor) && actor.role === ROLES.ADMIN;
}

export function isBranchManager(actor) {
  return canAccessCrm(actor) && actor.role === ROLES.BRANCH_MANAGER;
}

export function canViewBranch(actor, branchId) {
  return isAdmin(actor) || (canAccessCrm(actor) && Boolean(branchId) && actor.branchId === branchId);
}

export function canEditCustomer(actor, customer) {
  return canViewBranch(actor, customer?.branchId);
}

export function canArchiveCustomer(actor, customer) {
  return canEditCustomer(actor, customer);
}

export function canTrashCustomer(actor, customer) {
  return isAdmin(actor) || (isBranchManager(actor) && actor.branchId === customer?.branchId);
}

export function canPermanentlyDelete(actor) {
  return isAdmin(actor);
}

export function canEditActivity(actor, activity) {
  if (!canViewBranch(actor, activity?.branchId)) return false;
  if (isAdmin(actor) || isBranchManager(actor)) return true;
  if (activity.type === ACTIVITY_TYPES.CUSTOMER_VISIT) return true;
  return activity.createdBy === actor.uid || activity.assignedStaffIds?.includes(actor.uid) === true;
}

export function canManageAssignees(actor, activity) {
  if (!canViewBranch(actor, activity?.branchId)) return false;
  if (activity.type === ACTIVITY_TYPES.CUSTOMER_VISIT) return true;
  return isAdmin(actor) || isBranchManager(actor) || activity.createdBy === actor.uid;
}

export function canTrashActivity(actor, activity) {
  return isAdmin(actor) || (isBranchManager(actor) && actor.branchId === activity?.branchId);
}
