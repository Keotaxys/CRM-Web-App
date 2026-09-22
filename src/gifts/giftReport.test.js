import { describe, expect, it } from 'vitest';
import { buildGiftReport, giftDateRange } from './giftReport';

const gifts = [{ id: 'umbrella', name: 'ຄັນຮົ່ມ', sortOrder: 10, active: true, unitsPerPack: 10 }];
const stocks = [{ branchId: '010', giftId: 'umbrella', currentUnits: 20, lowStockThresholdUnits: 5 }];

function movement(movementType, deltaUnits, overrides = {}) {
  return {
    id: `${movementType}-${deltaUnits}-${Object.keys(overrides).length}`,
    movementType,
    branchId: '010',
    giftId: 'umbrella',
    giftNameSnapshot: 'ຄັນຮົ່ມ',
    deltaUnits,
    dateKey: '2026-09-13',
    actorUid: 'staff-a',
    actorRole: 'staff',
    distributionOwnerUid: null,
    customerId: null,
    customerNameSnapshot: null,
    campaignId: null,
    campaignNameSnapshot: null,
    ...overrides,
  };
}

describe('giftDateRange', () => {
  it('uses Laos Monday-Sunday and custom ranges', () => {
    expect(giftDateRange('week', '2026-09-13')).toEqual({
      startKey: '2026-09-07', endKey: '2026-09-13',
    });
    expect(giftDateRange('custom', '2026-09-13', {
      startKey: '2026-01-01', endKey: '2026-01-31',
    })).toEqual({ startKey: '2026-01-01', endKey: '2026-01-31' });
  });

  it.each([
    ['today', '2026-02-28', { startKey: '2026-02-28', endKey: '2026-02-28' }],
    ['month', '2024-02-29', { startKey: '2024-02-01', endKey: '2024-02-29' }],
    ['year', '2024-02-29', { startKey: '2024-01-01', endKey: '2024-12-31' }],
  ])('builds the %s range including leap-day boundaries', (preset, anchor, expected) => {
    expect(giftDateRange(preset, anchor)).toEqual(expected);
  });

  it.each([
    ['today', '2026-02-29', {}],
    ['week', '2026-9-13', {}],
    ['custom', '2026-09-13', { startKey: '2026-01-31', endKey: '2026-01-01' }],
    ['custom', '2026-09-13', { startKey: '2026-01-01', endKey: '2026-02-30' }],
  ])('rejects invalid strict dates for %s', (preset, anchor, custom) => {
    expect(() => giftDateRange(preset, anchor, custom)).toThrow(/date|range/i);
  });
});

describe('buildGiftReport', () => {
  it('reports net distribution after amendment and cancellation', () => {
    const report = buildGiftReport({
      gifts, stocks, filters: {},
      movements: [
        movement('receive', 20),
        movement('distribute', -5, { distributionOwnerUid: 'staff-a' }),
        movement('distribution_amend', 2, { distributionOwnerUid: 'staff-a' }),
        movement('distribution_cancel', 3, { distributionOwnerUid: 'staff-a' }),
      ],
    });
    expect(report.receivedUnits).toBe(20);
    expect(report.distributedUnits).toBe(0);
    expect(report.currentUnits).toBe(20);
  });

  it('filters by range, gift, branch, owner staff, customer, Campaign, and movement type', () => {
    const movements = [
      movement('distribute', -3, {
        id: 'wanted', dateKey: '2026-09-12', distributionOwnerUid: 'staff-a',
        customerId: 'customer-a', customerNameSnapshot: 'Customer A',
        campaignId: 'campaign-a', campaignNameSnapshot: 'Campaign A',
      }),
      movement('distribution_amend', 1, {
        id: 'manager-correction', dateKey: '2026-09-12', actorUid: 'manager-a',
        actorRole: 'branch_manager', distributionOwnerUid: 'staff-a',
        customerId: 'customer-a', campaignId: 'campaign-a',
      }),
      movement('distribute', -50, { id: 'wrong-staff', distributionOwnerUid: 'staff-b' }),
      movement('distribute', -50, { id: 'wrong-branch', branchId: '019', distributionOwnerUid: 'staff-a' }),
      movement('distribute', -50, { id: 'wrong-gift', giftId: 'bag', distributionOwnerUid: 'staff-a' }),
      movement('distribute', -50, { id: 'wrong-customer', customerId: 'customer-b', distributionOwnerUid: 'staff-a' }),
      movement('distribute', -50, { id: 'wrong-campaign', campaignId: 'campaign-b', distributionOwnerUid: 'staff-a' }),
      movement('distribute', -50, { id: 'wrong-date', dateKey: '2026-09-01', distributionOwnerUid: 'staff-a' }),
    ];
    const baseFilters = {
      startKey: '2026-09-10', endKey: '2026-09-13', giftId: 'umbrella', branchId: '010',
      staffUid: 'staff-a', customerId: 'customer-a', campaignId: 'campaign-a',
    };
    const report = buildGiftReport({ movements, stocks, gifts, filters: baseFilters });
    expect(report.distributedUnits).toBe(2);
    expect(report.movements.map((row) => row.id)).toEqual(['manager-correction', 'wanted']);
    expect(report.staff[0]).toMatchObject({ staffUid: 'staff-a', distributedUnits: 2 });

    const distributeOnly = buildGiftReport({
      movements, stocks, gifts, filters: { ...baseFilters, movementType: 'distribute' },
    });
    expect(distributeOnly.distributedUnits).toBe(3);
    expect(distributeOnly.movements.map((row) => row.id)).toEqual(['wanted']);
  });

  it('excludes adjustments from KPIs while retaining them in authorized history', () => {
    const report = buildGiftReport({
      gifts, stocks, filters: {}, movements: [
        movement('receive', 10), movement('allocation_receive', 5),
        movement('adjust', 7, { reason: 'counted' }),
        movement('distribute', -4, { distributionOwnerUid: 'staff-a' }),
      ],
    });
    expect(report).toMatchObject({ receivedUnits: 15, distributedUnits: 4, adjustmentUnits: 7 });
    expect(report.movements.map((row) => row.movementType)).toContain('adjust');
  });

  it('omits inbound and adjustment data for Staff reports', () => {
    const report = buildGiftReport({
      gifts, stocks, filters: { canViewInbound: false }, movements: [
        movement('receive', 10), movement('adjust', -2),
        movement('distribute', -4, { distributionOwnerUid: 'staff-a' }),
      ],
    });
    expect(report.canViewInbound).toBe(false);
    expect(report).not.toHaveProperty('receivedUnits');
    expect(report).not.toHaveProperty('adjustmentUnits');
    expect(report.movements).toHaveLength(1);
    expect(report.movements[0].movementType).toBe('distribute');
  });

  it('groups by snapshot identifiers, attributes corrections to the owner, and sorts ties stably', () => {
    const report = buildGiftReport({
      gifts: [...gifts, { id: 'bag', name: 'Bag', sortOrder: 20, active: true }],
      stocks: [
        ...stocks,
        { branchId: '019', giftId: 'bag', currentUnits: 2, lowStockThresholdUnits: 2 },
      ],
      filters: {},
      movements: [
        movement('distribute', -2, {
          id: 'a', giftId: 'umbrella', distributionOwnerUid: 'staff-b',
          distributionOwnerNameSnapshot: 'Staff B', customerId: 'customer-b',
          customerNameSnapshot: 'Customer B',
        }),
        movement('distribute', -2, {
          id: 'b', giftId: 'bag', branchId: '019', distributionOwnerUid: 'staff-a',
          distributionOwnerNameSnapshot: 'Staff A', campaignId: 'campaign-a',
          campaignNameSnapshot: 'Campaign A',
        }),
        movement('distribution_amend', 1, {
          id: 'c', giftId: 'bag', branchId: '019', actorUid: 'manager-a',
          actorNameSnapshot: 'Manager A', distributionOwnerUid: 'staff-a',
          distributionOwnerNameSnapshot: 'Staff A', campaignId: 'campaign-a',
          campaignNameSnapshot: 'Campaign A',
        }),
      ],
    });
    expect(report.gifts.map((row) => row.giftId)).toEqual(['umbrella', 'bag']);
    expect(report.staff.map((row) => [row.staffUid, row.distributedUnits])).toEqual([
      ['staff-b', 2], ['staff-a', 1],
    ]);
    expect(report.customers[0]).toMatchObject({ customerId: 'customer-b', customerName: 'Customer B', distributedUnits: 2 });
    expect(report.campaigns[0]).toMatchObject({ campaignId: 'campaign-a', campaignName: 'Campaign A', distributedUnits: 1 });
    expect(report.movements.find((row) => row.id === 'c')).toMatchObject({
      distributionOwnerUid: 'staff-a', actorUid: 'manager-a',
    });
    expect(report.lowStockCount).toBe(1);
  });

  it('distinguishes successful empty arrays from failed or malformed inputs', () => {
    expect(buildGiftReport({ movements: [], stocks: [], gifts: [], filters: {} })).toEqual({
      receivedUnits: 0,
      distributedUnits: 0,
      adjustmentUnits: 0,
      currentUnits: 0,
      lowStockCount: 0,
      gifts: [],
      branches: [],
      staff: [],
      customers: [],
      campaigns: [],
      movements: [],
      canViewInbound: true,
    });
    expect(() => buildGiftReport({ movements: null, stocks: [], gifts: [], filters: {} }))
      .toThrow(/movements/i);
    expect(() => buildGiftReport({ movements: [movement('receive', 1, { dateKey: '2026-02-30' })], stocks, gifts, filters: {} }))
      .toThrow(/date/i);
  });

  it('retains inactive gift history and balances without counting low stock', () => {
    const report = buildGiftReport({
      gifts: [...gifts, { id: 'retired', name: 'Retired gift', active: false }],
      stocks: [...stocks, { branchId: '010', giftId: 'retired', currentUnits: 0, lowStockThresholdUnits: 5 }],
      movements: [movement('distribute', -3, { giftId: 'retired', giftNameSnapshot: 'Historical gift' })],
    });
    expect(report.lowStockCount).toBe(0);
    expect(report.branches[0].lowStockCount).toBe(0);
    expect(report.gifts.find((gift) => gift.giftId === 'retired')).toMatchObject({
      giftName: 'Historical gift', currentUnits: 0, distributedUnits: 3, lowStockCount: 0,
    });
    expect(report.stocks.find((stock) => stock.giftId === 'retired').lowStock).toBe(false);
    expect(report.movements[0].giftName).toBe('Historical gift');
  });

  it('fails closed when any normalized total exceeds the safe-integer range', () => {
    expect(() => buildGiftReport({
      gifts, stocks: [], filters: {}, movements: [
        movement('receive', Number.MAX_SAFE_INTEGER),
        movement('receive', 1, { id: 'overflow' }),
      ],
    })).toThrow(/safe integer/i);
    expect(() => buildGiftReport({
      gifts,
      stocks: [
        { branchId: '010', giftId: 'umbrella', currentUnits: Number.MAX_SAFE_INTEGER, lowStockThresholdUnits: 0 },
        { branchId: '019', giftId: 'umbrella', currentUnits: 1, lowStockThresholdUnits: 0 },
      ],
      filters: {}, movements: [],
    })).toThrow(/safe integer/i);
  });
});
