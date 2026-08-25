import { describe, expect, it } from 'vitest';
import {
  canAccessCrm,
  canEditActivity,
  canEditCustomer,
  canManageAssignees,
  canPermanentlyDelete,
  canTrashActivity,
  canTrashCustomer,
  canViewBranch,
} from './permissions';

const actor = (role, branchId = '010', accountStatus = 'approved', uid = 'user-a') => ({
  uid, role, branchId, accountStatus,
});

describe('account and branch permissions', () => {
  it('denies anonymous, pending, and disabled actors CRM access', () => {
    expect(canAccessCrm(null)).toBe(false);
    expect(canAccessCrm(actor('staff', '010', 'pending'))).toBe(false);
    expect(canAccessCrm(actor('staff', '010', 'disabled'))).toBe(false);
  });

  it('isolates staff and managers by branch while Admin spans branches', () => {
    expect(canViewBranch(actor('staff'), '010')).toBe(true);
    expect(canViewBranch(actor('staff'), '020')).toBe(false);
    expect(canViewBranch(actor('branch_manager'), '020')).toBe(false);
    expect(canViewBranch(actor('admin'), '020')).toBe(true);
  });

  it('allows own-branch customer edits but reserves trash and permanent delete', () => {
    expect(canEditCustomer(actor('staff'), { branchId: '010' })).toBe(true);
    expect(canEditCustomer(actor('staff'), { branchId: '020' })).toBe(false);
    expect(canTrashCustomer(actor('staff'), { branchId: '010' })).toBe(false);
    expect(canTrashCustomer(actor('branch_manager'), { branchId: '010' })).toBe(true);
    expect(canPermanentlyDelete(actor('branch_manager'))).toBe(false);
    expect(canPermanentlyDelete(actor('admin'))).toBe(true);
  });
});

describe('activity permissions', () => {
  const appointment = {
    type: 'appointment', branchId: '010', createdBy: 'creator', assignedStaffIds: ['assigned'],
  };
  const visit = { type: 'customer_visit', branchId: '010', createdBy: 'creator', assignedStaffIds: [] };

  it('allows shared own-branch customer visit editing', () => {
    expect(canEditActivity(actor('staff', '010', 'approved', 'unrelated'), visit)).toBe(true);
    expect(canEditActivity(actor('staff', '020', 'approved', 'unrelated'), visit)).toBe(false);
  });

  it('limits appointment/event staff edits to creator or assignee', () => {
    expect(canEditActivity(actor('staff', '010', 'approved', 'creator'), appointment)).toBe(true);
    expect(canEditActivity(actor('staff', '010', 'approved', 'assigned'), appointment)).toBe(true);
    expect(canEditActivity(actor('staff', '010', 'approved', 'other'), appointment)).toBe(false);
    expect(canEditActivity(actor('branch_manager'), appointment)).toBe(true);
  });

  it('separates cancel, trash, assignee management, and permanent delete authority', () => {
    expect(canTrashActivity(actor('staff'), visit)).toBe(false);
    expect(canTrashActivity(actor('branch_manager'), visit)).toBe(true);
    expect(canManageAssignees(actor('staff', '010', 'approved', 'creator'), appointment)).toBe(true);
    expect(canManageAssignees(actor('staff', '010', 'approved', 'assigned'), appointment)).toBe(false);
    expect(canManageAssignees(actor('admin'), appointment)).toBe(true);
  });
});
