const ROLES = new Set(['admin', 'branch_manager', 'staff']);

export function actorFromRequest(request) {
  if (!request?.auth?.uid) throw new Error('Authenticated user required');
  const token = request.auth.token ?? {};
  if (token.accountStatus !== 'approved' || !ROLES.has(token.role)) throw new Error('Approved account required');
  if (token.role !== 'admin' && !token.branchId) throw new Error('Approved branch account required');
  return { uid: request.auth.uid, role: token.role, branchId: token.branchId ?? null, accountStatus: token.accountStatus };
}

export function assertAdmin(actor) {
  if (actor?.role !== 'admin') throw new Error('Admin permission required');
}

export function profileMatchesActor(actor, profile) {
  return profile?.accountStatus === 'approved' && profile.role === actor?.role && (actor.role === 'admin' || profile.branchId === actor.branchId);
}

export function canAccessBranch(actor, branchId) {
  return actor?.role === 'admin' || Boolean(branchId && actor?.branchId === branchId);
}

export function assertBranchAccess(actor, branchId) {
  if (!canAccessBranch(actor, branchId)) throw new Error('Cross-branch access denied');
}

export function canEditActivity(actor, activity) {
  if (!canAccessBranch(actor, activity?.branchId)) return false;
  if (actor.role === 'admin' || actor.role === 'branch_manager') return true;
  if (activity.type === 'customer_visit') return true;
  return activity.createdBy === actor.uid || activity.assignedStaffIds?.includes(actor.uid) === true;
}

export function canManageAssignees(actor, activity) {
  if (!canAccessBranch(actor, activity?.branchId)) return false;
  if (activity.type === 'customer_visit') return true;
  return actor.role === 'admin' || actor.role === 'branch_manager' || activity.createdBy === actor.uid;
}

export function canTrashRecord(actor, record) {
  return actor.role === 'admin' || (actor.role === 'branch_manager' && actor.branchId === record?.branchId);
}
