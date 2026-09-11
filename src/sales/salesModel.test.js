import { describe, expect, it } from 'vitest';
import {
  normalizeDailySales,
  normalizeSalesProduct,
  salesItemsFromQuantities,
} from './salesModel';

describe('sales model normalization', () => {
  it('preserves a valid sales product shape', () => {
    expect(normalizeSalesProduct({ id: 'bcel', name: 'BCEL One', active: true, sortOrder: 10 })).toEqual({
      id: 'bcel',
      name: 'BCEL One',
      active: true,
      sortOrder: 10,
    });
  });

  it('normalizes Firestore-like product timestamps without mutating the input', () => {
    const createdAt = new Date('2026-09-10T00:00:00Z');
    const updatedAt = new Date('2026-09-11T00:00:00Z');
    const input = {
      id: 'bcel',
      name: 'BCEL One',
      active: true,
      sortOrder: 10,
      createdAt: { toDate: () => createdAt },
      updatedAt: { toDate: () => updatedAt },
    };

    const normalized = normalizeSalesProduct(input);

    expect(normalized.createdAt).toBe(createdAt);
    expect(normalized.updatedAt).toBe(updatedAt);
    expect(input.createdAt).not.toBe(createdAt);
  });

  it('derives the daily total from normalized item quantities', () => {
    const normalized = normalizeDailySales({
      id: 'd1',
      dateKey: '2026-09-11',
      staffUid: 'u1',
      branchId: '010',
      totalQuantity: 999,
      items: [{ productId: 'bcel', productNameSnapshot: 'BCEL One', quantity: 2 }],
    });

    expect(normalized.totalQuantity).toBe(2);
    expect(normalized.items).toEqual([{ productId: 'bcel', productNameSnapshot: 'BCEL One', quantity: 2 }]);
  });

  it('normalizes Firestore-like daily timestamps and missing items', () => {
    const updatedAt = new Date('2026-09-11T01:00:00Z');
    expect(normalizeDailySales({ id: 'd1', updatedAt: { toDate: () => updatedAt } })).toMatchObject({
      id: 'd1',
      items: [],
      totalQuantity: 0,
      updatedAt,
    });
  });
});

describe('salesItemsFromQuantities', () => {
  it('emits only positive integer quantities in stable object order', () => {
    expect(salesItemsFromQuantities({ bcel: '2', ibank: '', sms: '0' })).toEqual([
      { productId: 'bcel', quantity: 2 },
    ]);
  });

  it.each(['1.5', '-1', 'not-a-number'])('rejects invalid quantity %s', (quantity) => {
    expect(() => salesItemsFromQuantities({ bcel: quantity })).toThrow(/integer/i);
  });
});
