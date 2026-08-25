import { describe, expect, it } from 'vitest';
import { validateActivity, validateAssignees } from './validation';

const base = {
  type: 'appointment', title: 'Planning', branchId: '010', status: 'planned',
  startAt: new Date('2026-08-25T09:00:00+07:00'),
  endAt: new Date('2026-08-25T10:00:00+07:00'),
  assignedStaffIds: ['staff-a'], recordState: 'active',
};

describe('activity validation', () => {
  it('requires a customer for Customer Visit but not Appointment or Event', () => {
    expect(validateActivity({ ...base, type: 'customer_visit', customerId: '' }).errors.customerId).toBeTruthy();
    expect(validateActivity({ ...base, type: 'appointment', customerId: '' }).valid).toBe(true);
    expect(validateActivity({ ...base, type: 'event', customerId: '' }).valid).toBe(true);
  });

  it('rejects invalid type, lifecycle status, reverse dates, and duplicate assignees', () => {
    const result = validateActivity({
      ...base,
      type: 'visit',
      status: 'done',
      startAt: new Date('2026-08-25T11:00:00+07:00'),
      endAt: new Date('2026-08-25T10:00:00+07:00'),
      assignedStaffIds: ['staff-a', 'staff-a'],
    });
    expect(result.valid).toBe(false);
    expect(Object.keys(result.errors).sort()).toEqual(['assignedStaffIds', 'endAt', 'status', 'type']);
  });
});

describe('trusted assignee validation', () => {
  it('accepts only approved users in the record branch', () => {
    const users = [
      { uid: 'a', branchId: '010', accountStatus: 'approved' },
      { uid: 'b', branchId: '020', accountStatus: 'approved' },
      { uid: 'c', branchId: '010', accountStatus: 'disabled' },
    ];
    expect(validateAssignees(['a'], users, '010').valid).toBe(true);
    expect(validateAssignees(['b'], users, '010').valid).toBe(false);
    expect(validateAssignees(['c'], users, '010').valid).toBe(false);
  });
});
