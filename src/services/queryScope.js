function scopeFor(actor) {
  if (!actor || !['admin', 'branch_manager', 'staff'].includes(actor.role)) {
    throw new Error('An approved actor is required');
  }
  if (actor.role === 'admin') return { allBranches: true };
  if (!actor.branchId) throw new Error('An approved actor must have a branch');
  return { branchId: actor.branchId };
}

export const customerQueryScope = scopeFor;
export const activityQueryScope = scopeFor;
