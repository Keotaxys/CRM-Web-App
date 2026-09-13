import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertDocumentId,
  giftMovementId,
  giftRequestDigest,
  giftStockId,
  laosGiftDateKey,
  normalizeGiftName,
  normalizeGiftLines,
} from '../src/giftDomain.js';

const catalog = new Map([['umbrella', {
  id: 'umbrella', name: 'ຄັນຮົ່ມ', active: true, unitsPerPack: 10,
}]]);

test('normalizes packs and loose units into base units', () => {
  assert.deepEqual(normalizeGiftLines([
    { giftId: 'umbrella', packs: 2, looseUnits: 5 },
  ], catalog), {
    items: [{ giftId: 'umbrella', giftNameSnapshot: 'ຄັນຮົ່ມ', packs: 2,
      looseUnits: 5, unitsPerPackSnapshot: 10, totalUnits: 25 }],
    totalUnits: 25,
  });
});

test('rejects duplicate gifts invalid integers inactive gifts and more than 25 rows', () => {
  assert.throws(() => normalizeGiftLines([
    { giftId: 'umbrella', packs: 0, looseUnits: 1 },
    { giftId: 'umbrella', packs: 0, looseUnits: 1 },
  ], catalog), /Duplicate gift/i);
  assert.throws(() => normalizeGiftLines([
    { giftId: 'umbrella', packs: 0.5, looseUnits: 0 },
  ], catalog), /integer/i);
  assert.throws(() => normalizeGiftLines(Array.from({ length: 26 }, (_, index) => ({
    giftId: `gift-${index}`, packs: 0, looseUnits: 1,
  })), new Map(Array.from({ length: 26 }, (_, index) => [`gift-${index}`, {
    id: `gift-${index}`, name: `Gift ${index}`, active: true, unitsPerPack: 1,
  }]))), /25/i);
});

test('date ids and digest are deterministic', () => {
  assert.equal(laosGiftDateKey(new Date('2026-09-13T17:30:00Z')), '2026-09-14');
  assert.equal(giftStockId('020', 'umbrella'), '020_umbrella');
  assert.equal(giftMovementId('550e8400-e29b-41d4-a716-446655440000', 'umbrella'),
    '550e8400-e29b-41d4-a716-446655440000_umbrella');
  assert.equal(giftRequestDigest({ b: 2, a: 1 }), giftRequestDigest({ a: 1, b: 2 }));
});

test('normalizes gift names and rejects blank names or invalid document ids', () => {
  assert.deepEqual(normalizeGiftName('  BCEL   One  '), {
    name: 'BCEL One', normalizedName: 'bcel one',
  });
  assert.throws(() => normalizeGiftName('   '), /required/i);
  assert.throws(() => assertDocumentId('bad/id', 'Gift'), /invalid/i);
});
