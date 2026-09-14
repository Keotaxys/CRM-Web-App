import { describe, expect, it } from 'vitest';
import {
  giftLineTotal,
  giftStockDisplay,
  isLowGiftStock,
  normalizeGiftCampaign,
  normalizeGiftDistribution,
  normalizeGiftItem,
  normalizeGiftMovement,
  normalizeGiftStock,
} from './giftModel';

describe('gift quantity helpers', () => {
  it('converts packs and units without translating stored values', () => {
    expect(giftLineTotal({ packs: '2', looseUnits: '5' }, { unitsPerPack: 10 })).toBe(25);
    expect(giftStockDisplay(25, {
      unitsPerPack: 10,
      packLabel: 'ແພັກ',
      unitLabel: 'ອັນ',
    })).toBe('2 ແພັກ 5 ອັນ');
  });

  it.each([
    [{ packs: '1.5', looseUnits: 0 }, { unitsPerPack: 10 }],
    [{ packs: -1, looseUnits: 0 }, { unitsPerPack: 10 }],
    [{ packs: 1, looseUnits: 'nope' }, { unitsPerPack: 10 }],
    [{ packs: 1, looseUnits: 0 }, { unitsPerPack: 0 }],
  ])('rejects invalid form integers before quantity conversion', (line, gift) => {
    expect(() => giftLineTotal(line, gift)).toThrow(/integer/i);
  });

  it('treats equal threshold as low stock', () => {
    expect(isLowGiftStock({ currentUnits: 5, lowStockThresholdUnits: 5 })).toBe(true);
    expect(isLowGiftStock({ currentUnits: 6, lowStockThresholdUnits: 5 })).toBe(false);
  });
});

describe('gift document normalization', () => {
  const createdAt = new Date('2026-09-10T01:00:00Z');
  const updatedAt = new Date('2026-09-11T01:00:00Z');

  it('normalizes catalog, stock, and Campaign timestamps without mutating inputs', () => {
    const item = { id: 'umbrella', active: true, createdAt: { toDate: () => createdAt } };
    const stock = { id: '010_umbrella', currentUnits: 25, updatedAt: { toDate: () => updatedAt } };
    const campaign = { id: 'campaign-a', active: false, updatedAt: { toDate: () => updatedAt } };

    expect(normalizeGiftItem(item)).toMatchObject({ id: 'umbrella', active: true, createdAt });
    expect(normalizeGiftStock(stock)).toMatchObject({ currentUnits: 25, updatedAt });
    expect(normalizeGiftCampaign(campaign)).toMatchObject({ active: false, updatedAt });
    expect(item.createdAt).not.toBe(createdAt);
  });

  it('normalizes distribution items, derives their total, and preserves internal enums', () => {
    const record = normalizeGiftDistribution({
      id: 'distribution-a',
      status: 'cancelled',
      recipientType: 'campaign',
      items: [
        { giftId: 'umbrella', packs: '2', looseUnits: '5', totalUnits: '25' },
        { giftId: 'shirt', packs: 0, looseUnits: 2, totalUnits: 2 },
      ],
      totalUnits: 999,
      createdAt: { toDate: () => createdAt },
      cancelledAt: { toDate: () => updatedAt },
    });

    expect(record).toMatchObject({
      status: 'cancelled',
      recipientType: 'campaign',
      totalUnits: 27,
      createdAt,
      cancelledAt: updatedAt,
    });
    expect(record.items[0]).toMatchObject({ packs: 2, looseUnits: 5, totalUnits: 25 });
  });

  it('normalizes movement timestamps and numeric balances', () => {
    expect(normalizeGiftMovement({
      id: 'move-a',
      movementType: 'distribution_amend',
      deltaUnits: '-3',
      balanceBeforeUnits: '10',
      balanceAfterUnits: '7',
      occurredAt: { toDate: () => updatedAt },
    })).toMatchObject({
      movementType: 'distribution_amend',
      deltaUnits: -3,
      balanceBeforeUnits: 10,
      balanceAfterUnits: 7,
      occurredAt: updatedAt,
    });
  });
});
