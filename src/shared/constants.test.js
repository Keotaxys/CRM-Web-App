import { describe, expect, it } from 'vitest';
import * as constants from './constants';

describe('Lao UI labels for internal CRM values', () => {
  it('translates activity types and statuses without changing stored values', () => {
    expect(constants.activityTypeLabel?.('appointment')).toBe('ນັດໝາຍ');
    expect(constants.activityTypeLabel?.('event')).toBe('ກິດຈະກຳ');
    expect(constants.activityTypeLabel?.('customer_visit')).toBe('ການຢ້ຽມລູກຄ້າ');
    expect(constants.activityStatusLabel?.('planned')).toBe('ວາງແຜນ');
    expect(constants.activityStatusLabel?.('completed')).toBe('ສຳເລັດແລ້ວ');
    expect(constants.ACTIVITY_TYPES.CUSTOMER_VISIT).toBe('customer_visit');
    expect(constants.ACTIVITY_STATUSES).toContain('planned');
  });

  it('translates access and follow-up states for display', () => {
    expect(constants.roleLabel?.('branch_manager')).toBe('ຫົວໜ້າສາຂາ');
    expect(constants.accountStatusLabel?.('pending')).toBe('ລໍຖ້າອະນຸມັດ');
    expect(constants.followUpBucketLabel?.('overdue')).toBe('ເກີນກຳນົດ');
  });
});
