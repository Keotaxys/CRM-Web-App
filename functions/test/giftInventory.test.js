import assert from 'node:assert/strict';
import test from 'node:test';
import {
  adjustGiftStockOperation,
  cancelGiftAllocationOperation,
  confirmGiftAllocationOperation,
  createGiftAllocationOperation,
  receiveGiftStockOperation,
  setGiftLowStockThresholdOperation,
} from '../src/giftInventory.js';
import { fakeGiftFirestore } from './helpers/fakeGiftFirestore.js';

const managerA = {
  uid: 'manager-a', role: 'branch_manager', branchId: '010', accountStatus: 'approved',
};
const managerB = {
  uid: 'manager-b', role: 'branch_manager', branchId: '019', accountStatus: 'approved',
};
const admin = { uid: 'admin-a', role: 'admin', branchId: null, accountStatus: 'approved' };
const operationId = '550e8400-e29b-41d4-a716-446655440000';
const confirmationId = '550e8400-e29b-41d4-a716-446655440001';
const cancellationId = '550e8400-e29b-41d4-a716-446655440002';
const secondOperationId = '550e8400-e29b-41d4-a716-446655440003';
const now = new Date('2026-09-13T17:30:00Z');
const allocationPayload = {
  allocationId: operationId,
  targetBranchId: '010',
  source: 'Marketing warehouse',
  reference: 'A-001',
  items: [{ giftId: 'umbrella', packs: 2, looseUnits: 5 }],
};

function inventoryState({ currentUnits = 5 } = {}) {
  return fakeGiftFirestore({
    'users/manager-a': {
      role: 'branch_manager', branchId: '010', accountStatus: 'approved',
    },
    'users/manager-b': {
      role: 'branch_manager', branchId: '019', accountStatus: 'approved',
    },
    'users/admin-a': { role: 'admin', branchId: null, accountStatus: 'approved' },
    'giftItems/umbrella': {
      name: 'ຄັນຮົ່ມ', active: true, unitsPerPack: 10,
    },
    'giftItems/shirt': { name: 'ເສື້ອ', active: true, unitsPerPack: 4 },
    'giftItems/inactive': { name: 'Inactive', active: false, unitsPerPack: 1 },
    'branchGiftStocks/010_umbrella': {
      branchId: '010', giftId: 'umbrella', currentUnits,
      lowStockThresholdUnits: 5, version: 1,
    },
    'branchGiftStocks/010_shirt': {
      branchId: '010', giftId: 'shirt', currentUnits: 2,
      lowStockThresholdUnits: 1, version: 3,
    },
    'branchGiftStocks/019_umbrella': {
      branchId: '019', giftId: 'umbrella', currentUnits: 7,
      lowStockThresholdUnits: 2, version: 4,
    },
  });
}

test('Manager direct receipt atomically adds normalized units to own branch', async () => {
  const state = inventoryState({ currentUnits: 5 });
  const result = await receiveGiftStockOperation(state.services, managerA, {
    receiptId: operationId,
    branchId: '010',
    source: '  Marketing   warehouse ',
    reference: ' R-001 ',
    items: [{ giftId: 'umbrella', packs: 2, looseUnits: 5 }],
  }, now);

  assert.deepEqual(result, { receiptId: operationId, totalUnits: 25, status: 'confirmed' });
  const receipt = state.documents.get(`giftReceipts/${operationId}`);
  assert.equal(receipt.source, 'Marketing warehouse');
  assert.equal(receipt.reference, 'R-001');
  assert.equal(receipt.receivedDateKey, '2026-09-14');
  assert.equal(receipt.createdBy, 'manager-a');
  assert.equal(receipt.createdByRole, 'branch_manager');
  const stock = state.documents.get('branchGiftStocks/010_umbrella');
  assert.equal(stock.currentUnits, 30);
  assert.equal(stock.lowStockThresholdUnits, 5);
  assert.equal(stock.version, 2);
  const movement = state.documents.get(`giftStockMovements/${operationId}_umbrella`);
  assert.equal(movement.deltaUnits, 25);
  assert.equal(movement.balanceBeforeUnits, 5);
  assert.equal(movement.balanceAfterUnits, 30);
  assert.equal(movement.distributionOwnerUid, null);
});

test('receipt retry returns the original result and a conflicting retry is denied', async () => {
  const state = inventoryState();
  const input = {
    receiptId: operationId, branchId: '010', source: 'Warehouse', reference: '',
    items: [{ giftId: 'umbrella', packs: 0, looseUnits: 1 }],
  };
  const first = await receiveGiftStockOperation(state.services, managerA, input, now);
  const writeCount = state.writes.length;
  const retry = await receiveGiftStockOperation(state.services, managerA, input,
    new Date('2026-09-14T17:30:00Z'));

  assert.deepEqual(retry, first);
  assert.equal(state.writes.length, writeCount);
  assert.equal(state.documents.get('branchGiftStocks/010_umbrella').currentUnits, 6);
  await assert.rejects(() => receiveGiftStockOperation(state.services, managerA, {
    ...input, reference: 'different',
  }, now), (error) => error.code === 'already-exists');
});

test('Manager cannot receive or set a threshold across branches', async () => {
  const state = inventoryState({ currentUnits: 5 });
  await assert.rejects(() => receiveGiftStockOperation(state.services, managerA, {
    receiptId: operationId, branchId: '019', source: 'Warehouse', reference: '',
    items: [{ giftId: 'umbrella', packs: 0, looseUnits: 1 }],
  }, now), /branch/i);
  await assert.rejects(() => setGiftLowStockThresholdOperation(state.services, managerA, {
    branchId: '019', giftId: 'umbrella', lowStockThresholdUnits: 5,
  }), /branch/i);
  await assert.rejects(() => adjustGiftStockOperation(state.services, managerA, {
    adjustmentId: operationId,
    branchId: '019',
    reason: 'Cross-branch count',
    items: [{ giftId: 'umbrella', deltaUnits: 1 }],
  }, now), /branch/i);
  assert.equal(state.writes.length, 0);
});

test('threshold update preserves balance and records the real Manager or Admin identity', async () => {
  const state = inventoryState();
  const managerResult = await setGiftLowStockThresholdOperation(state.services, managerA, {
    branchId: '010', giftId: 'umbrella', lowStockThresholdUnits: 8,
  });
  assert.deepEqual(managerResult, {
    branchId: '010', giftId: 'umbrella', lowStockThresholdUnits: 8,
  });
  let stock = state.documents.get('branchGiftStocks/010_umbrella');
  assert.equal(stock.currentUnits, 5);
  assert.equal(stock.version, 2);
  assert.equal(stock.updatedBy, 'manager-a');

  await setGiftLowStockThresholdOperation(state.services, admin, {
    branchId: '019', giftId: 'umbrella', lowStockThresholdUnits: 9,
  });
  stock = state.documents.get('branchGiftStocks/019_umbrella');
  assert.equal(stock.currentUnits, 7);
  assert.equal(stock.updatedBy, 'admin-a');
  await assert.rejects(() => setGiftLowStockThresholdOperation(state.services, admin, {
    branchId: '019', giftId: 'umbrella', lowStockThresholdUnits: -1,
  }), /nonnegative/i);
});

test('unchanged threshold retry does not churn the stock version', async () => {
  const state = inventoryState();
  await setGiftLowStockThresholdOperation(state.services, managerA, {
    branchId: '010', giftId: 'umbrella', lowStockThresholdUnits: 5,
  });

  assert.equal(state.writes.length, 0);
  assert.equal(state.documents.get('branchGiftStocks/010_umbrella').version, 1);
});

test('only Admin creates an idempotent pending allocation without changing stock', async () => {
  const state = inventoryState();
  await assert.rejects(() => createGiftAllocationOperation(
    state.services, managerA, allocationPayload, now,
  ), /Admin/i);
  const result = await createGiftAllocationOperation(state.services, admin, allocationPayload, now);
  const writeCount = state.writes.length;
  const retry = await createGiftAllocationOperation(state.services, admin, allocationPayload, now);

  assert.deepEqual(result, { allocationId: operationId, totalUnits: 25, status: 'pending' });
  assert.deepEqual(retry, result);
  assert.equal(state.writes.length, writeCount);
  assert.equal(state.documents.get('branchGiftStocks/010_umbrella').currentUnits, 5);
  const allocation = state.documents.get(`giftAllocations/${operationId}`);
  assert.equal(allocation.status, 'pending');
  assert.equal(allocation.createdBy, 'admin-a');
  assert.equal(allocation.confirmedBy, null);
  await assert.rejects(() => createGiftAllocationOperation(state.services, admin, {
    ...allocationPayload, reference: 'changed',
  }, now), (error) => error.code === 'already-exists');
});

test('allocation changes stock only on the first valid confirmation', async () => {
  const state = inventoryState({ currentUnits: 5 });
  await createGiftAllocationOperation(state.services, admin, allocationPayload, now);
  assert.equal(state.documents.get('branchGiftStocks/010_umbrella').currentUnits, 5);
  const input = { allocationId: operationId, mutationId: confirmationId };
  const result = await confirmGiftAllocationOperation(state.services, managerA, input, now);
  const writeCount = state.writes.length;
  const retry = await confirmGiftAllocationOperation(state.services, managerA, input, now);

  assert.deepEqual(result, {
    allocationId: operationId, mutationId: confirmationId, totalUnits: 25, status: 'confirmed',
  });
  assert.deepEqual(retry, result);
  assert.equal(state.writes.length, writeCount);
  assert.equal(state.documents.get('branchGiftStocks/010_umbrella').currentUnits, 30);
  const allocation = state.documents.get(`giftAllocations/${operationId}`);
  assert.equal(allocation.confirmedBy, 'manager-a');
  assert.equal(allocation.confirmedByRole, 'branch_manager');
  const movement = state.documents.get(`giftStockMovements/${confirmationId}_umbrella`);
  assert.equal(movement.movementType, 'allocation_receive');
  assert.equal(movement.operationType, 'allocation');
  assert.equal(movement.actorUid, 'manager-a');
});

test('allocation confirmation enforces target branch and terminal state', async () => {
  const state = inventoryState();
  await createGiftAllocationOperation(state.services, admin, allocationPayload, now);
  await assert.rejects(() => confirmGiftAllocationOperation(state.services, managerB, {
    allocationId: operationId, mutationId: confirmationId,
  }, now), /branch/i);
  await confirmGiftAllocationOperation(state.services, managerA, {
    allocationId: operationId, mutationId: confirmationId,
  }, now);
  await assert.rejects(() => confirmGiftAllocationOperation(state.services, managerA, {
    allocationId: operationId, mutationId: secondOperationId,
  }, now), /pending|confirmed/i);
  await assert.rejects(() => cancelGiftAllocationOperation(state.services, admin, {
    allocationId: operationId, mutationId: cancellationId, reason: 'Wrong quantity',
  }, now), /pending|confirmed/i);
});

test('Admin confirms an allocation for an explicitly selected branch as Admin', async () => {
  const state = inventoryState();
  await createGiftAllocationOperation(state.services, admin, {
    ...allocationPayload,
    targetBranchId: '019',
  }, now);
  await confirmGiftAllocationOperation(state.services, admin, {
    allocationId: operationId, mutationId: confirmationId,
  }, now);

  assert.equal(state.documents.get('branchGiftStocks/019_umbrella').currentUnits, 32);
  const movement = state.documents.get(`giftStockMovements/${confirmationId}_umbrella`);
  assert.equal(movement.branchId, '019');
  assert.equal(movement.actorUid, 'admin-a');
  assert.equal(movement.actorRole, 'admin');
});

test('Admin cancellation requires a reason and is idempotent without changing stock', async () => {
  const state = inventoryState();
  await createGiftAllocationOperation(state.services, admin, allocationPayload, now);
  await assert.rejects(() => cancelGiftAllocationOperation(state.services, managerA, {
    allocationId: operationId, mutationId: cancellationId, reason: 'Incorrect allocation',
  }, now), /Admin/i);
  await assert.rejects(() => cancelGiftAllocationOperation(state.services, admin, {
    allocationId: operationId, mutationId: cancellationId, reason: '   ',
  }, now), /reason/i);
  const result = await cancelGiftAllocationOperation(state.services, admin, {
    allocationId: operationId, mutationId: cancellationId, reason: '  Incorrect   allocation ',
  }, now);
  const writeCount = state.writes.length;
  const retry = await cancelGiftAllocationOperation(state.services, admin, {
    allocationId: operationId, mutationId: cancellationId, reason: 'Incorrect allocation',
  }, now);

  assert.deepEqual(result, {
    allocationId: operationId, mutationId: cancellationId, status: 'cancelled',
  });
  assert.deepEqual(retry, result);
  assert.equal(state.writes.length, writeCount);
  assert.equal(state.documents.get('branchGiftStocks/010_umbrella').currentUnits, 5);
  const allocation = state.documents.get(`giftAllocations/${operationId}`);
  assert.equal(allocation.cancelReason, 'Incorrect allocation');
  assert.equal(allocation.cancelledBy, 'admin-a');
  await assert.rejects(() => confirmGiftAllocationOperation(state.services, managerA, {
    allocationId: operationId, mutationId: confirmationId,
  }, now), /pending|cancelled/i);
});

test('adjustment applies positive and negative deltas with reason and exact retry safety', async () => {
  const state = inventoryState({ currentUnits: 5 });
  const input = {
    adjustmentId: operationId,
    branchId: '010',
    reason: '  Physical   count ',
    items: [
      { giftId: 'umbrella', deltaUnits: 4 },
      { giftId: 'shirt', deltaUnits: -1 },
    ],
  };
  const result = await adjustGiftStockOperation(state.services, managerA, input, now);
  const writeCount = state.writes.length;
  const retry = await adjustGiftStockOperation(state.services, managerA, {
    ...input, reason: 'Physical count',
  }, now);

  assert.deepEqual(result, { adjustmentId: operationId, totalDeltaUnits: 3, status: 'adjusted' });
  assert.deepEqual(retry, result);
  assert.equal(state.writes.length, writeCount);
  assert.equal(state.documents.get('branchGiftStocks/010_umbrella').currentUnits, 9);
  assert.equal(state.documents.get('branchGiftStocks/010_shirt').currentUnits, 1);
  const movement = state.documents.get(`giftStockMovements/${operationId}_shirt`);
  assert.equal(movement.reason, 'Physical count');
  assert.equal(movement.deltaUnits, -1);
  assert.equal(movement.distributionOwnerUid, null);
});

test('adjustment totals mixed-sign safe deltas without intermediate Number overflow', async () => {
  const state = fakeGiftFirestore({
    'users/manager-a': {
      role: 'branch_manager', branchId: '010', accountStatus: 'approved',
    },
    'giftItems/large-in': { name: 'Large in', active: true, unitsPerPack: 1 },
    'giftItems/small-in': { name: 'Small in', active: true, unitsPerPack: 1 },
    'giftItems/large-out': { name: 'Large out', active: true, unitsPerPack: 1 },
    'branchGiftStocks/010_large-in': {
      branchId: '010', giftId: 'large-in', currentUnits: 0, version: 1,
    },
    'branchGiftStocks/010_small-in': {
      branchId: '010', giftId: 'small-in', currentUnits: 0, version: 1,
    },
    'branchGiftStocks/010_large-out': {
      branchId: '010', giftId: 'large-out',
      currentUnits: Number.MAX_SAFE_INTEGER, version: 1,
    },
  });
  const input = {
    adjustmentId: operationId,
    branchId: '010',
    reason: 'Exact mixed-sign count',
    items: [
      { giftId: 'large-in', deltaUnits: Number.MAX_SAFE_INTEGER },
      { giftId: 'small-in', deltaUnits: 2 },
      { giftId: 'large-out', deltaUnits: -Number.MAX_SAFE_INTEGER },
    ],
  };

  const result = await adjustGiftStockOperation(state.services, managerA, input, now);
  const retry = await adjustGiftStockOperation(state.services, managerA, input, now);

  assert.equal(result.totalDeltaUnits, 2);
  assert.equal(retry.totalDeltaUnits, 2);
  for (const giftId of ['large-in', 'small-in', 'large-out']) {
    assert.equal(state.documents.get(`giftStockMovements/${operationId}_${giftId}`)
      .operationResult.totalDeltaUnits, 2);
  }
});

test('adjustment UUID cannot be reused with a different gift set', async () => {
  const state = inventoryState();
  await adjustGiftStockOperation(state.services, managerA, {
    adjustmentId: operationId,
    branchId: '010',
    reason: 'Count one',
    items: [{ giftId: 'umbrella', deltaUnits: 1 }],
  }, now);
  const stockBeforeConflict = structuredClone(state.documents.get('branchGiftStocks/010_shirt'));
  const writeCount = state.writes.length;

  await assert.rejects(() => adjustGiftStockOperation(state.services, managerA, {
    adjustmentId: operationId,
    branchId: '010',
    reason: 'Count two',
    items: [{ giftId: 'shirt', deltaUnits: 1 }],
  }, now), (error) => error.code === 'already-exists');
  assert.deepEqual(state.documents.get('branchGiftStocks/010_shirt'), stockBeforeConflict);
  assert.equal(state.writes.length, writeCount);
});

test('one insufficient adjustment row leaves all stocks and movements unchanged', async () => {
  const state = inventoryState({ currentUnits: 5 });
  const originalUmbrella = structuredClone(state.documents.get('branchGiftStocks/010_umbrella'));
  const originalShirt = structuredClone(state.documents.get('branchGiftStocks/010_shirt'));
  await assert.rejects(() => adjustGiftStockOperation(state.services, managerA, {
    adjustmentId: operationId,
    branchId: '010',
    reason: 'Physical count',
    items: [
      { giftId: 'umbrella', deltaUnits: 3 },
      { giftId: 'shirt', deltaUnits: -3 },
    ],
  }, now), /stock/i);

  assert.deepEqual(state.documents.get('branchGiftStocks/010_umbrella'), originalUmbrella);
  assert.deepEqual(state.documents.get('branchGiftStocks/010_shirt'), originalShirt);
  assert.equal([...state.documents.keys()]
    .filter((path) => path.startsWith('giftStockMovements/')).length, 0);
  assert.equal(state.writes.length, 0);
});

test('inventory rows reject unknown inactive duplicate and invalid gifts without partial writes', async () => {
  const cases = [
    [{ giftId: 'missing', packs: 0, looseUnits: 1 }],
    [{ giftId: 'inactive', packs: 0, looseUnits: 1 }],
    [
      { giftId: 'umbrella', packs: 0, looseUnits: 1 },
      { giftId: 'inactive', packs: 0, looseUnits: 1 },
    ],
    [
      { giftId: 'umbrella', packs: 0, looseUnits: 1 },
      { giftId: 'umbrella', packs: 0, looseUnits: 2 },
    ],
  ];
  for (const items of cases) {
    const state = inventoryState();
    await assert.rejects(() => receiveGiftStockOperation(state.services, managerA, {
      receiptId: operationId, branchId: '010', source: 'Warehouse', reference: '', items,
    }, now));
    assert.equal(state.documents.has(`giftReceipts/${operationId}`), false);
    assert.equal(state.writes.length, 0);

    const adjustmentState = inventoryState();
    await assert.rejects(() => adjustGiftStockOperation(adjustmentState.services, managerA, {
      adjustmentId: operationId,
      branchId: '010',
      reason: 'Physical count',
      items: items.map(({ giftId }, index) => ({ giftId, deltaUnits: index + 1 })),
    }, now));
    assert.equal(adjustmentState.writes.length, 0);
  }
});

test('Admin adjusts an explicit branch while retaining Admin audit identity', async () => {
  const state = inventoryState();
  const result = await adjustGiftStockOperation(state.services, admin, {
    adjustmentId: operationId,
    branchId: '019',
    reason: 'Admin recount',
    items: [{ giftId: 'umbrella', deltaUnits: 2 }],
  }, now);

  assert.deepEqual(result, { adjustmentId: operationId, totalDeltaUnits: 2, status: 'adjusted' });
  const stock = state.documents.get('branchGiftStocks/019_umbrella');
  const movement = state.documents.get(`giftStockMovements/${operationId}_umbrella`);
  assert.equal(stock.currentUnits, 9);
  assert.equal(stock.updatedBy, 'admin-a');
  assert.equal(movement.branchId, '019');
  assert.equal(movement.actorUid, 'admin-a');
  assert.equal(movement.actorRole, 'admin');
});

test('inventory operations require an approved actor whose stored profile matches claims', async () => {
  const pending = { ...managerA, accountStatus: 'pending' };
  const mismatch = inventoryState();
  mismatch.documents.set('users/manager-a', {
    role: 'branch_manager', branchId: '019', accountStatus: 'approved',
  });
  const receipt = {
    receiptId: operationId, branchId: '010', source: 'Warehouse', reference: '',
    items: [{ giftId: 'umbrella', packs: 0, looseUnits: 1 }],
  };

  await assert.rejects(() => receiveGiftStockOperation(
    inventoryState().services, pending, receipt, now,
  ), /approved/i);
  await assert.rejects(() => receiveGiftStockOperation(
    mismatch.services, managerA, receipt, now,
  ), /profile|claims/i);
  assert.equal(mismatch.writes.length, 0);
});

test('fake Firestore rejects transaction reads after writes without committing', async () => {
  const state = inventoryState();
  await assert.rejects(() => state.services.db.runTransaction(async (transaction) => {
    transaction.set(state.services.db.doc('things/new'), { value: 1 });
    await transaction.get(state.services.db.doc('giftItems/umbrella'));
  }), /read.*write/i);
  assert.equal(state.documents.has('things/new'), false);
  assert.equal(state.writes.length, 0);
});
