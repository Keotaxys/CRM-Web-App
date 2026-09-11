import { describe, expect, it } from 'vitest';
import { buildSalesReport, salesDateRange } from './salesReport';

describe('salesDateRange', () => {
  it('builds today, Monday-Sunday week, month, year, and custom ranges', () => {
    expect(salesDateRange('today', '2026-09-09')).toEqual({ startKey: '2026-09-09', endKey: '2026-09-09' });
    expect(salesDateRange('week', '2026-09-09')).toEqual({ startKey: '2026-09-07', endKey: '2026-09-13' });
    expect(salesDateRange('month', '2026-09-09')).toEqual({ startKey: '2026-09-01', endKey: '2026-09-30' });
    expect(salesDateRange('year', '2026-09-09')).toEqual({ startKey: '2026-01-01', endKey: '2026-12-31' });
    expect(salesDateRange('custom', '2026-09-09', { startKey: '2026-08-31', endKey: '2026-09-02' })).toEqual({ startKey: '2026-08-31', endKey: '2026-09-02' });
  });

  it('uses date-only UTC arithmetic at leap-day and month boundaries', () => {
    expect(salesDateRange('week', '2024-02-29')).toEqual({ startKey: '2024-02-26', endKey: '2024-03-03' });
    expect(salesDateRange('month', '2024-02-29')).toEqual({ startKey: '2024-02-01', endKey: '2024-02-29' });
    expect(salesDateRange('week', '2026-08-31')).toEqual({ startKey: '2026-08-31', endKey: '2026-09-06' });
  });

  it('rejects invalid dates, reversed custom ranges, and unknown presets', () => {
    expect(() => salesDateRange('today', '2026-02-29')).toThrow(/valid/i);
    expect(() => salesDateRange('custom', '2026-09-09', { startKey: '2026-09-10', endKey: '2026-09-01' })).toThrow(/range/i);
    expect(() => salesDateRange('quarter', '2026-09-09')).toThrow(/preset/i);
  });
});

describe('buildSalesReport', () => {
  const products = [
    { id: 'bcel', name: 'Current BCEL', sortOrder: 10 },
    { id: 'ibank', name: 'iBank', sortOrder: 20 },
    { id: 'sms', name: 'SMS Banking', sortOrder: 30 },
  ];
  const records = [
    {
      dateKey: '2026-09-08', staffUid: 'staff-b', staffNameSnapshot: 'Bob', branchId: '019',
      items: [
        { productId: 'ibank', productNameSnapshot: 'iBank', quantity: 2 },
        { productId: 'bcel', productNameSnapshot: 'Old BCEL', quantity: 1 },
      ],
    },
    {
      dateKey: '2026-09-09', staffUid: 'staff-a', staffNameSnapshot: 'Alice', branchId: '010',
      items: [
        { productId: 'sms', productNameSnapshot: 'SMS Banking', quantity: 1 },
        { productId: 'bcel', productNameSnapshot: 'BCEL One', quantity: 3 },
      ],
    },
    {
      dateKey: '2026-09-09', staffUid: 'staff-c', staffNameSnapshot: 'Carol', branchId: '010',
      items: [
        { productId: 'sms', productNameSnapshot: 'SMS Banking', quantity: 1 },
        { productId: 'ibank', productNameSnapshot: 'iBank', quantity: 2 },
      ],
    },
  ];

  it('aggregates exact product, staff, branch, and day totals in deterministic order', () => {
    expect(buildSalesReport(records, products)).toEqual({
      totalQuantity: 10,
      products: [
        { productId: 'bcel', name: 'BCEL One', totalQuantity: 4, percentage: 40, rank: 1, sortOrder: 10 },
        { productId: 'ibank', name: 'iBank', totalQuantity: 4, percentage: 40, rank: 1, sortOrder: 20 },
        { productId: 'sms', name: 'SMS Banking', totalQuantity: 2, percentage: 20, rank: 3, sortOrder: 30 },
      ],
      staff: [
        { staffUid: 'staff-a', staffName: 'Alice', branchId: '010', productTotals: { bcel: 3, sms: 1 }, totalQuantity: 4 },
        { staffUid: 'staff-b', staffName: 'Bob', branchId: '019', productTotals: { bcel: 1, ibank: 2 }, totalQuantity: 3 },
        { staffUid: 'staff-c', staffName: 'Carol', branchId: '010', productTotals: { ibank: 2, sms: 1 }, totalQuantity: 3 },
      ],
      branches: [
        { branchId: '010', productTotals: { bcel: 3, ibank: 2, sms: 2 }, totalQuantity: 7 },
        { branchId: '019', productTotals: { bcel: 1, ibank: 2 }, totalQuantity: 3 },
      ],
      days: [
        {
          dateKey: '2026-09-09', totalQuantity: 7,
          rows: [
            {
              staffUid: 'staff-a', staffName: 'Alice', branchId: '010',
              items: [
                { productId: 'bcel', productNameSnapshot: 'BCEL One', quantity: 3 },
                { productId: 'sms', productNameSnapshot: 'SMS Banking', quantity: 1 },
              ],
              totalQuantity: 4,
            },
            {
              staffUid: 'staff-c', staffName: 'Carol', branchId: '010',
              items: [
                { productId: 'ibank', productNameSnapshot: 'iBank', quantity: 2 },
                { productId: 'sms', productNameSnapshot: 'SMS Banking', quantity: 1 },
              ],
              totalQuantity: 3,
            },
          ],
        },
        {
          dateKey: '2026-09-08', totalQuantity: 3,
          rows: [{
            staffUid: 'staff-b', staffName: 'Bob', branchId: '019',
            items: [
              { productId: 'bcel', productNameSnapshot: 'Old BCEL', quantity: 1 },
              { productId: 'ibank', productNameSnapshot: 'iBank', quantity: 2 },
            ],
            totalQuantity: 3,
          }],
        },
      ],
    });
  });

  it('keeps the latest in-range historical product and staff snapshots', () => {
    const report = buildSalesReport([
      { dateKey: '2026-09-01', staffUid: 'u1', staffNameSnapshot: 'Old Staff', branchId: '010', items: [{ productId: 'bcel', productNameSnapshot: 'Old Product', quantity: 1 }] },
      { dateKey: '2026-09-30', staffUid: 'u1', staffNameSnapshot: 'New Staff', branchId: '019', items: [{ productId: 'bcel', productNameSnapshot: 'Renamed Product', quantity: 2 }] },
    ], products);

    expect(report.products[0].name).toBe('Renamed Product');
    expect(report.staff[0]).toMatchObject({ staffName: 'New Staff', branchId: '019' });
  });

  it('returns safe zero percentages for an empty successful result', () => {
    expect(buildSalesReport([], products)).toEqual({
      totalQuantity: 0,
      products: [
        { productId: 'bcel', name: 'Current BCEL', totalQuantity: 0, percentage: 0, rank: 1, sortOrder: 10 },
        { productId: 'ibank', name: 'iBank', totalQuantity: 0, percentage: 0, rank: 1, sortOrder: 20 },
        { productId: 'sms', name: 'SMS Banking', totalQuantity: 0, percentage: 0, rank: 1, sortOrder: 30 },
      ],
      staff: [],
      branches: [],
      days: [],
    });
  });
});
