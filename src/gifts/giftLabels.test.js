import { describe, expect, it } from 'vitest';
import { giftLabel, giftMovementLabel } from './giftLabels';

describe('gift UI labels', () => {
  it('provides Lao labels for every catalog and stock control', () => {
    expect(giftLabel('campaign')).toBe('ແຄມເປນ');
    expect(giftLabel('name')).toBe('ຊື່ລາຍການ');
    expect(giftLabel('unitLabel')).toBe('ຫົວໜ່ວຍ');
    expect(giftLabel('packLabel')).toBe('ຫົວໜ່ວຍຫໍ່');
    expect(giftLabel('unitsPerPack')).toBe('ຈຳນວນຊິ້ນຕໍ່ຫໍ່');
    expect(giftLabel('sortOrder')).toBe('ລຳດັບສະແດງ');
    expect(giftLabel('adjustmentItem')).toBe('ລາຍການປັບສະຕັອກ');
    expect(giftLabel('adjustmentUnits')).toBe('ຈຳນວນປັບ');
    expect(giftLabel('adjustmentReason')).toBe('ເຫດຜົນການປັບ');
    expect(giftLabel('adjustStock')).toBe('ບັນທຶກການປັບສະຕັອກ');
  });

  it('localizes movement types without changing stored enum values', () => {
    expect(giftMovementLabel('receive')).toBe('ຮັບເຂົ້າ');
    expect(giftMovementLabel('allocation_receive')).toBe('ຮັບຈາກການໂອນ');
    expect(giftMovementLabel('distribute')).toBe('ແຈກ');
    expect(giftMovementLabel('distribution_amend')).toBe('ແກ້ໄຂການແຈກ');
    expect(giftMovementLabel('distribution_cancel')).toBe('ຍົກເລີກການແຈກ');
    expect(giftMovementLabel('adjust')).toBe('ປັບສະຕັອກ');
    expect(giftMovementLabel('unknown_value')).toBe('unknown_value');
  });
});
