import test from 'node:test';
import assert from 'node:assert/strict';
import {
  dailySalesDocumentId,
  laosSalesDateKey,
  normalizeSalesProductName,
  validateSalesItems,
} from '../src/salesDomain.js';

test('uses the Laos day at the UTC boundary', () => {
  assert.equal(laosSalesDateKey(new Date('2026-09-10T17:00:00Z')), '2026-09-11');
});

test('builds one stable document id per day and uid', () => {
  assert.equal(dailySalesDocumentId('2026-09-11', 'staff_A-1'), '2026-09-11_staff_A-1');
  assert.throws(() => dailySalesDocumentId('11-09-2026', 'staff_A-1'), /date/i);
  assert.throws(() => dailySalesDocumentId('2026-09-11', '../admin'), /uid/i);
});

test('normalizes product names for uniqueness', () => {
  assert.equal(normalizeSalesProductName('  BCEL   One  '), 'bcel one');
  assert.throws(() => normalizeSalesProductName('   '), /name/i);
});

test('accepts unique positive integer items and computes their total', () => {
  const catalog = new Map([
    ['bcel', { id: 'bcel', name: 'BCEL One', active: true }],
    ['ibank', { id: 'ibank', name: 'iBank', active: true }],
  ]);
  assert.deepEqual(validateSalesItems([
    { productId: 'bcel', quantity: 2 },
    { productId: 'ibank', quantity: 3 },
  ], catalog, []), {
    items: [
      { productId: 'bcel', productNameSnapshot: 'BCEL One', quantity: 2 },
      { productId: 'ibank', productNameSnapshot: 'iBank', quantity: 3 },
    ],
    totalQuantity: 5,
  });
});

test('fails closed for duplicate, decimal, negative, unknown, or newly increased inactive items', () => {
  const catalog = new Map([
    ['active', { id: 'active', name: 'Active', active: true }],
    ['closed', { id: 'closed', name: 'Closed', active: false }],
  ]);
  assert.throws(() => validateSalesItems([{ productId: 'active', quantity: 1 }, { productId: 'active', quantity: 2 }], catalog, []), /duplicate/i);
  assert.throws(() => validateSalesItems([{ productId: 'active', quantity: 1.5 }], catalog, []), /integer/i);
  assert.throws(() => validateSalesItems([{ productId: 'active', quantity: -1 }], catalog, []), /integer/i);
  assert.throws(() => validateSalesItems([{ productId: 'missing', quantity: 1 }], catalog, []), /product/i);
  assert.throws(() => validateSalesItems([{ productId: 'closed', quantity: 2 }], catalog, [{ productId: 'closed', quantity: 1 }]), /inactive/i);
  assert.equal(validateSalesItems([{ productId: 'closed', quantity: 1 }], catalog, [{ productId: 'closed', quantity: 1 }]).totalQuantity, 1);
});

test('omits zero quantities and rejects malformed item collections and unsafe ids', () => {
  const catalog = new Map([
    ['bcel', { id: 'bcel', name: 'BCEL One', active: true }],
  ]);
  assert.deepEqual(validateSalesItems([{ productId: 'bcel', quantity: 0 }], catalog, []), {
    items: [],
    totalQuantity: 0,
  });
  assert.throws(() => validateSalesItems(null, catalog, []), /items/i);
  assert.throws(() => validateSalesItems([{ productId: '../bcel', quantity: 1 }], catalog, []), /product/i);
});
