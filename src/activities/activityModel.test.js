import { describe, expect, it } from 'vitest';
import { activityCreatePayload, activityUpdatePayload, normalizeActivity } from './activityModel';

const actor = { uid: 'staff-a', branchId: '010' };
const form = {
  type: 'customer_visit', title: 'Visit', branchId: '010', status: 'completed',
  startAt: new Date('2026-08-25T09:00:00+07:00'), endAt: new Date('2026-08-25T10:00:00+07:00'),
  customerId: 'customer-1', assignedStaffIds: ['staff-a', 'staff-b'],
  visitPurpose: 'Review', productServices: ['Loan'], preVisitNotes: 'Prepare',
  visitNotes: 'Met', result: 'Interested', followUpRequired: true,
  followUpDate: new Date('2026-08-26T09:00:00+07:00'), nextAction: 'Call',
};

describe('activity payloads', () => {
  it('creates auditable active records with multiple assignees and visit fields', () => {
    expect(activityCreatePayload(form, actor, 'NOW')).toEqual(expect.objectContaining({
      ...form, recordState: 'active', createdBy: 'staff-a', createdAt: 'NOW', updatedBy: 'staff-a', updatedAt: 'NOW',
    }));
  });

  it('preserves follow-up independently from completed lifecycle status', () => {
    const normalized = normalizeActivity({ id: 'a1', ...form });
    expect(normalized.status).toBe('completed');
    expect(normalized.followUpRequired).toBe(true);
    expect(normalized.followUpDate).toEqual(form.followUpDate);
  });

  it('prevents client updates from changing immutable audit and branch fields', () => {
    expect(activityUpdatePayload({ title: 'New', branchId: '020', createdBy: 'bad', createdAt: 'bad' }, actor, 'NOW')).toEqual({
      title: 'New', updatedBy: 'staff-a', updatedAt: 'NOW',
    });
  });
});
