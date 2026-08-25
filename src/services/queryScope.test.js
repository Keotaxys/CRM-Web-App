import { describe, expect, it } from 'vitest';
import { activityQueryScope, customerQueryScope } from './queryScope';

describe('query scopes', () => {
  it('requires branch constraints for staff and managers', () => {
    expect(customerQueryScope({ role: 'staff', branchId: '010' })).toEqual({ branchId: '010' });
    expect(activityQueryScope({ role: 'branch_manager', branchId: '019' })).toEqual({ branchId: '019' });
  });

  it('permits admin-wide reads but never anonymous reads', () => {
    expect(customerQueryScope({ role: 'admin' })).toEqual({ allBranches: true });
    expect(() => activityQueryScope(null)).toThrow(/approved actor/i);
  });
});
