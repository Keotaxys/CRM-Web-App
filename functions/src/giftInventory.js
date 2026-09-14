import { FieldValue } from 'firebase-admin/firestore';
import { assertAdmin, assertBranchAccess, profileMatchesActor } from './authz.js';
import {
  GiftOperationError,
  assertDocumentId,
  assertUuid,
  giftMovementId,
  giftRequestDigest,
  giftStockId,
  laosGiftDateKey,
  normalizeGiftLines,
} from './giftDomain.js';

const INVENTORY_ROLES = new Set(['admin', 'branch_manager']);
const SERVER_FIELDS = new Set([
  'schemaVersion', 'payloadDigest', 'status', 'receivedDateKey', 'dateKey',
  'createdBy', 'createdByRole', 'createdAt', 'updatedBy', 'updatedAt',
  'confirmedBy', 'confirmedByRole', 'confirmedAt', 'cancelledBy', 'cancelledAt',
  'confirmationDigest', 'confirmationResult', 'cancellationDigest', 'cancellationResult',
  'actorUid', 'actorRole', 'occurredAt', 'balanceBeforeUnits', 'balanceAfterUnits',
]);

function operationError(code, message) {
  return new GiftOperationError(code, message);
}

function assertInventoryActor(actor) {
  if (!INVENTORY_ROLES.has(actor?.role)) {
    throw operationError('permission-denied', 'Branch Manager or Admin permission required');
  }
  if (actor?.accountStatus !== 'approved') {
    throw operationError('permission-denied', 'Approved account required');
  }
}

function assertMatchingProfile(actor, snapshot) {
  const profile = snapshot.exists ? snapshot.data() : null;
  if (!profileMatchesActor(actor, profile)) {
    throw operationError(
      'permission-denied', 'Approved account profile does not match access claims',
    );
  }
}

function assertNoServerFields(data) {
  for (const field of Object.keys(data ?? {})) {
    if (SERVER_FIELDS.has(field)) {
      throw operationError('invalid-argument', 'Server-controlled inventory fields are not allowed');
    }
  }
}

function branchRequest(actor, value) {
  const branchId = assertDocumentId(value, 'Branch');
  assertBranchAccess(actor, branchId);
  return branchId;
}

function normalizedText(value, label, { optional = false } = {}) {
  if (typeof value !== 'string') {
    throw operationError('invalid-argument', `${label} must be a string`);
  }
  const normalized = value.trim().replace(/\s+/g, ' ');
  if (!optional && !normalized) {
    throw operationError('invalid-argument', `${label} is required`);
  }
  return normalized;
}

function quantityLineRequests(lines) {
  if (!Array.isArray(lines) || lines.length < 1 || lines.length > 25) {
    throw operationError('invalid-argument', 'Gift items must contain 1 to 25 rows');
  }
  const seen = new Set();
  return lines.map((line) => {
    const giftId = assertDocumentId(line?.giftId, 'Gift');
    if (seen.has(giftId)) throw operationError('invalid-argument', 'Duplicate gift id');
    seen.add(giftId);
    const packs = Number(line?.packs ?? 0);
    const looseUnits = Number(line?.looseUnits ?? 0);
    if (!Number.isSafeInteger(packs) || packs < 0
      || !Number.isSafeInteger(looseUnits) || looseUnits < 0) {
      throw operationError(
        'invalid-argument', 'Gift quantities must be nonnegative safe integers',
      );
    }
    if (packs === 0 && looseUnits === 0) {
      throw operationError('invalid-argument', 'Gift row quantity required');
    }
    return { giftId, packs, looseUnits };
  });
}

function catalogFromSnapshot(snapshot) {
  return new Map(snapshot.docs.map((document) => [document.id, {
    id: document.id,
    ...document.data(),
  }]));
}

function inboundRequest(actor, data, idField, branchField) {
  assertNoServerFields(data);
  const operationId = assertUuid(data?.[idField], idField === 'receiptId' ? 'Receipt' : 'Allocation');
  const branchId = branchRequest(actor, data?.[branchField]);
  const source = normalizedText(data?.source, 'Source');
  const reference = normalizedText(data?.reference ?? '', 'Reference', { optional: true });
  const lines = quantityLineRequests(data?.items);
  const digestInput = {
    [idField]: operationId,
    [branchField]: branchId,
    source,
    reference,
    items: lines,
  };
  return {
    operationId,
    branchId,
    source,
    reference,
    lines,
    payloadDigest: giftRequestDigest(digestInput),
  };
}

function normalizedInboundItems(lines, catalog) {
  return normalizeGiftLines(lines, catalog);
}

function inboundResult(idField, operationId, items, status) {
  const totalUnits = items.reduce((sum, item) => sum + item.totalUnits, 0);
  if (!Number.isSafeInteger(totalUnits)) {
    throw operationError('failed-precondition', 'Stored gift items are invalid');
  }
  return { [idField]: operationId, totalUnits, status };
}

function assertStoredItemsActive(items, catalog) {
  if (!Array.isArray(items) || items.length < 1 || items.length > 25) {
    throw operationError('failed-precondition', 'Stored gift items are invalid');
  }
  const seen = new Set();
  return items.map((item) => {
    const giftId = assertDocumentId(item?.giftId, 'Gift');
    if (seen.has(giftId)) throw operationError('failed-precondition', 'Stored gift items are invalid');
    seen.add(giftId);
    const gift = catalog.get(giftId);
    if (!gift?.active || !Number.isSafeInteger(gift.unitsPerPack) || gift.unitsPerPack < 1) {
      throw operationError('failed-precondition', 'Active gift with valid safe pack size required');
    }
    if (!Number.isSafeInteger(item?.totalUnits) || item.totalUnits < 1
      || typeof item?.giftNameSnapshot !== 'string') {
      throw operationError('failed-precondition', 'Stored gift items are invalid');
    }
    return { ...item };
  });
}

function stockWrite(change, actor, branchId) {
  return {
    schemaVersion: 1,
    branchId,
    giftId: change.item.giftId,
    giftNameSnapshot: change.item.giftNameSnapshot,
    currentUnits: change.after,
    lowStockThresholdUnits: change.lowStockThresholdUnits,
    version: change.version + 1,
    updatedBy: actor.uid,
    updatedAt: FieldValue.serverTimestamp(),
  };
}

function movementWrite(change, actor, context) {
  return {
    schemaVersion: 1,
    movementType: context.movementType,
    operationId: context.operationId,
    operationType: context.operationType,
    branchId: context.branchId,
    giftId: change.item.giftId,
    giftNameSnapshot: change.item.giftNameSnapshot,
    deltaUnits: change.item.deltaUnits,
    balanceBeforeUnits: change.before,
    balanceAfterUnits: change.after,
    dateKey: context.dateKey,
    actorUid: actor.uid,
    actorRole: actor.role,
    distributionOwnerUid: context.distributionOwnerUid ?? null,
    occurredAt: FieldValue.serverTimestamp(),
    customerId: context.customerId ?? null,
    campaignId: context.campaignId ?? null,
    reason: context.reason ?? '',
    ...(context.payloadDigest ? { payloadDigest: context.payloadDigest } : {}),
    ...(context.operationResult ? { operationResult: context.operationResult } : {}),
  };
}

export async function applyGiftDeltas(transaction, db, {
  actor,
  operationId,
  operationType,
  movementType,
  branchId,
  dateKey,
  deltas,
  reason = '',
  distributionOwnerUid = null,
  customerId = null,
  campaignId = null,
  payloadDigest = null,
  operationResult = null,
}) {
  const stockRefs = deltas.map((item) => db.doc(
    `branchGiftStocks/${giftStockId(branchId, item.giftId)}`,
  ));
  const snapshots = await Promise.all(stockRefs.map((ref) => transaction.get(ref)));
  const changes = deltas.map((item, index) => {
    if (!Number.isSafeInteger(item?.deltaUnits) || item.deltaUnits === 0) {
      throw operationError('invalid-argument', 'Gift delta must be a nonzero safe integer');
    }
    const previous = snapshots[index].exists ? snapshots[index].data() : {};
    const before = previous.currentUnits ?? 0;
    const version = previous.version ?? 0;
    const lowStockThresholdUnits = previous.lowStockThresholdUnits ?? 0;
    if (!Number.isSafeInteger(before) || before < 0
      || !Number.isSafeInteger(version) || version < 0
      || !Number.isSafeInteger(lowStockThresholdUnits) || lowStockThresholdUnits < 0) {
      throw operationError('failed-precondition', 'Gift stock record is invalid');
    }
    const after = before + item.deltaUnits;
    if (!Number.isSafeInteger(after) || after < 0) {
      throw operationError('failed-precondition', 'Insufficient gift stock');
    }
    return {
      item,
      ref: stockRefs[index],
      before,
      after,
      version,
      lowStockThresholdUnits,
    };
  });
  const context = {
    operationId,
    operationType,
    movementType,
    branchId,
    dateKey,
    reason,
    distributionOwnerUid,
    customerId,
    campaignId,
    payloadDigest,
    operationResult,
  };
  for (const change of changes) {
    transaction.set(change.ref, stockWrite(change, actor, branchId), { merge: true });
    transaction.create(
      db.doc(`giftStockMovements/${giftMovementId(operationId, change.item.giftId)}`),
      movementWrite(change, actor, context),
    );
  }
}

export async function setGiftLowStockThresholdOperation({ db }, actor, data) {
  assertInventoryActor(actor);
  assertNoServerFields(data);
  const branchId = branchRequest(actor, data?.branchId);
  const giftId = assertDocumentId(data?.giftId, 'Gift');
  const threshold = data?.lowStockThresholdUnits;
  if (!Number.isSafeInteger(threshold) || threshold < 0) {
    throw operationError('invalid-argument', 'Low-stock threshold must be a nonnegative safe integer');
  }
  const stockRef = db.doc(`branchGiftStocks/${giftStockId(branchId, giftId)}`);
  await db.runTransaction(async (transaction) => {
    const [profile, giftSnapshot, stockSnapshot] = await Promise.all([
      transaction.get(db.doc(`users/${actor.uid}`)),
      transaction.get(db.doc(`giftItems/${giftId}`)),
      transaction.get(stockRef),
    ]);
    assertMatchingProfile(actor, profile);
    const gift = giftSnapshot.exists ? giftSnapshot.data() : null;
    if (!gift?.active) throw operationError('failed-precondition', 'Active gift required');
    const previous = stockSnapshot.exists ? stockSnapshot.data() : {};
    const currentUnits = previous.currentUnits ?? 0;
    const version = previous.version ?? 0;
    if (!Number.isSafeInteger(currentUnits) || currentUnits < 0
      || !Number.isSafeInteger(version) || version < 0) {
      throw operationError('failed-precondition', 'Gift stock record is invalid');
    }
    if (stockSnapshot.exists && previous.lowStockThresholdUnits === threshold) return;
    transaction.set(stockRef, {
      schemaVersion: 1,
      branchId,
      giftId,
      giftNameSnapshot: gift.name,
      currentUnits,
      lowStockThresholdUnits: threshold,
      version: version + 1,
      updatedBy: actor.uid,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  });
  return { branchId, giftId, lowStockThresholdUnits: threshold };
}

export async function receiveGiftStockOperation({ db }, actor, data, now = new Date()) {
  assertInventoryActor(actor);
  const request = inboundRequest(actor, data, 'receiptId', 'branchId');
  const receiptRef = db.doc(`giftReceipts/${request.operationId}`);
  return db.runTransaction(async (transaction) => {
    const [profile, existing, catalogSnapshot] = await Promise.all([
      transaction.get(db.doc(`users/${actor.uid}`)),
      transaction.get(receiptRef),
      transaction.get(db.collection('giftItems')),
    ]);
    assertMatchingProfile(actor, profile);
    if (existing.exists) {
      const receipt = existing.data();
      if (receipt.payloadDigest !== request.payloadDigest) {
        throw operationError('already-exists', 'Receipt id already used with another payload');
      }
      return inboundResult('receiptId', request.operationId, receipt.items, receipt.status);
    }
    const normalized = normalizedInboundItems(
      request.lines, catalogFromSnapshot(catalogSnapshot),
    );
    const result = {
      receiptId: request.operationId,
      totalUnits: normalized.totalUnits,
      status: 'confirmed',
    };
    const dateKey = laosGiftDateKey(now);
    await applyGiftDeltas(transaction, db, {
      actor,
      operationId: request.operationId,
      operationType: 'receipt',
      movementType: 'receive',
      branchId: request.branchId,
      dateKey,
      deltas: normalized.items.map((item) => ({ ...item, deltaUnits: item.totalUnits })),
      reason: '',
      payloadDigest: request.payloadDigest,
    });
    transaction.create(receiptRef, {
      schemaVersion: 1,
      receiptId: request.operationId,
      payloadDigest: request.payloadDigest,
      branchId: request.branchId,
      source: request.source,
      reference: request.reference,
      items: normalized.items,
      status: 'confirmed',
      receivedDateKey: dateKey,
      createdBy: actor.uid,
      createdByRole: actor.role,
      createdAt: FieldValue.serverTimestamp(),
    });
    return result;
  });
}

export async function createGiftAllocationOperation({ db }, actor, data) {
  assertAdmin(actor);
  assertInventoryActor(actor);
  const request = inboundRequest(actor, data, 'allocationId', 'targetBranchId');
  const allocationRef = db.doc(`giftAllocations/${request.operationId}`);
  return db.runTransaction(async (transaction) => {
    const [profile, existing, catalogSnapshot] = await Promise.all([
      transaction.get(db.doc(`users/${actor.uid}`)),
      transaction.get(allocationRef),
      transaction.get(db.collection('giftItems')),
    ]);
    assertMatchingProfile(actor, profile);
    if (existing.exists) {
      const allocation = existing.data();
      if (allocation.payloadDigest !== request.payloadDigest) {
        throw operationError('already-exists', 'Allocation id already used with another payload');
      }
      return inboundResult(
        'allocationId', request.operationId, allocation.items, 'pending',
      );
    }
    const normalized = normalizedInboundItems(
      request.lines, catalogFromSnapshot(catalogSnapshot),
    );
    const result = {
      allocationId: request.operationId,
      totalUnits: normalized.totalUnits,
      status: 'pending',
    };
    transaction.create(allocationRef, {
      schemaVersion: 1,
      allocationId: request.operationId,
      payloadDigest: request.payloadDigest,
      targetBranchId: request.branchId,
      source: request.source,
      reference: request.reference,
      items: normalized.items,
      status: 'pending',
      createdBy: actor.uid,
      createdAt: FieldValue.serverTimestamp(),
      confirmedBy: null,
      confirmedByRole: null,
      confirmedAt: null,
      cancelledBy: null,
      cancelledAt: null,
      cancelReason: null,
    });
    return result;
  });
}

function allocationMutationRequest(data) {
  assertNoServerFields(data);
  const allocationId = assertUuid(data?.allocationId, 'Allocation');
  const mutationId = assertUuid(data?.mutationId, 'Mutation');
  return {
    allocationId,
    mutationId,
    payloadDigest: giftRequestDigest({ allocationId, mutationId }),
  };
}

export async function confirmGiftAllocationOperation({ db }, actor, data, now = new Date()) {
  assertInventoryActor(actor);
  const request = allocationMutationRequest(data);
  const allocationRef = db.doc(`giftAllocations/${request.allocationId}`);
  return db.runTransaction(async (transaction) => {
    const [profile, allocationSnapshot, catalogSnapshot] = await Promise.all([
      transaction.get(db.doc(`users/${actor.uid}`)),
      transaction.get(allocationRef),
      transaction.get(db.collection('giftItems')),
    ]);
    assertMatchingProfile(actor, profile);
    if (!allocationSnapshot.exists) {
      throw operationError('not-found', 'Gift allocation not found');
    }
    const allocation = allocationSnapshot.data();
    assertBranchAccess(actor, allocation.targetBranchId);
    if (allocation.status === 'confirmed'
      && allocation.confirmationDigest === request.payloadDigest) {
      return allocation.confirmationResult;
    }
    if (allocation.status !== 'pending') {
      throw operationError('failed-precondition', `Gift allocation is ${allocation.status}, not pending`);
    }
    const catalog = catalogFromSnapshot(catalogSnapshot);
    const items = assertStoredItemsActive(allocation.items, catalog);
    const totalUnits = items.reduce((sum, item) => sum + item.totalUnits, 0);
    if (!Number.isSafeInteger(totalUnits)) {
      throw operationError('failed-precondition', 'Stored gift items are invalid');
    }
    const result = {
      allocationId: request.allocationId,
      mutationId: request.mutationId,
      totalUnits,
      status: 'confirmed',
    };
    const dateKey = laosGiftDateKey(now);
    await applyGiftDeltas(transaction, db, {
      actor,
      operationId: request.mutationId,
      operationType: 'allocation',
      movementType: 'allocation_receive',
      branchId: allocation.targetBranchId,
      dateKey,
      deltas: items.map((item) => ({ ...item, deltaUnits: item.totalUnits })),
      reason: '',
      payloadDigest: request.payloadDigest,
    });
    transaction.update(allocationRef, {
      status: 'confirmed',
      confirmedBy: actor.uid,
      confirmedByRole: actor.role,
      confirmedAt: FieldValue.serverTimestamp(),
      confirmedDateKey: dateKey,
      confirmationMutationId: request.mutationId,
      confirmationDigest: request.payloadDigest,
      confirmationResult: result,
    });
    return result;
  });
}

function cancellationRequest(data) {
  const request = allocationMutationRequest(data);
  const reason = normalizedText(data?.reason, 'Cancellation reason');
  return {
    ...request,
    reason,
    payloadDigest: giftRequestDigest({
      allocationId: request.allocationId,
      mutationId: request.mutationId,
      reason,
    }),
  };
}

export async function cancelGiftAllocationOperation({ db }, actor, data, now = new Date()) {
  assertAdmin(actor);
  assertInventoryActor(actor);
  const request = cancellationRequest(data);
  const allocationRef = db.doc(`giftAllocations/${request.allocationId}`);
  return db.runTransaction(async (transaction) => {
    const [profile, allocationSnapshot] = await Promise.all([
      transaction.get(db.doc(`users/${actor.uid}`)),
      transaction.get(allocationRef),
    ]);
    assertMatchingProfile(actor, profile);
    if (!allocationSnapshot.exists) {
      throw operationError('not-found', 'Gift allocation not found');
    }
    const allocation = allocationSnapshot.data();
    assertBranchAccess(actor, allocation.targetBranchId);
    if (allocation.status === 'cancelled'
      && allocation.cancellationDigest === request.payloadDigest) {
      return allocation.cancellationResult;
    }
    if (allocation.status !== 'pending') {
      throw operationError('failed-precondition', `Gift allocation is ${allocation.status}, not pending`);
    }
    const result = {
      allocationId: request.allocationId,
      mutationId: request.mutationId,
      status: 'cancelled',
    };
    transaction.update(allocationRef, {
      status: 'cancelled',
      cancelledBy: actor.uid,
      cancelledAt: FieldValue.serverTimestamp(),
      cancelledDateKey: laosGiftDateKey(now),
      cancelReason: request.reason,
      cancellationMutationId: request.mutationId,
      cancellationDigest: request.payloadDigest,
      cancellationResult: result,
    });
    return result;
  });
}

function adjustmentRequest(actor, data) {
  assertNoServerFields(data);
  const adjustmentId = assertUuid(data?.adjustmentId, 'Adjustment');
  const branchId = branchRequest(actor, data?.branchId);
  const reason = normalizedText(data?.reason, 'Adjustment reason');
  if (!Array.isArray(data?.items) || data.items.length < 1 || data.items.length > 25) {
    throw operationError('invalid-argument', 'Gift items must contain 1 to 25 rows');
  }
  const seen = new Set();
  const lines = data.items.map((item) => {
    const giftId = assertDocumentId(item?.giftId, 'Gift');
    if (seen.has(giftId)) throw operationError('invalid-argument', 'Duplicate gift id');
    seen.add(giftId);
    const deltaUnits = item?.deltaUnits;
    if (!Number.isSafeInteger(deltaUnits) || deltaUnits === 0) {
      throw operationError('invalid-argument', 'Gift delta must be a nonzero safe integer');
    }
    return { giftId, deltaUnits };
  });
  return {
    adjustmentId,
    branchId,
    reason,
    lines,
    payloadDigest: giftRequestDigest({ adjustmentId, branchId, reason, items: lines }),
  };
}

export async function adjustGiftStockOperation({ db }, actor, data, now = new Date()) {
  assertInventoryActor(actor);
  const request = adjustmentRequest(actor, data);
  const operationMovements = db.collection('giftStockMovements')
    .where('operationId', '==', request.adjustmentId);
  return db.runTransaction(async (transaction) => {
    const [profile, catalogSnapshot, existingMovements] = await Promise.all([
      transaction.get(db.doc(`users/${actor.uid}`)),
      transaction.get(db.collection('giftItems')),
      transaction.get(operationMovements),
    ]);
    assertMatchingProfile(actor, profile);
    if (!existingMovements.empty) {
      const requestedGiftIds = new Set(request.lines.map((item) => item.giftId));
      const exactRetry = existingMovements.size === request.lines.length
        && existingMovements.docs.every((snapshot) => {
          const movement = snapshot.data();
          return movement.payloadDigest === request.payloadDigest
            && requestedGiftIds.has(movement.giftId);
        });
      if (!exactRetry) {
        throw operationError('already-exists', 'Adjustment id already used with another payload');
      }
      return existingMovements.docs[0].data().operationResult;
    }
    const catalog = catalogFromSnapshot(catalogSnapshot);
    const deltas = request.lines.map((item) => {
      const gift = catalog.get(item.giftId);
      if (!gift?.active || !Number.isSafeInteger(gift.unitsPerPack) || gift.unitsPerPack < 1) {
        throw operationError('failed-precondition', 'Active gift with valid safe pack size required');
      }
      return { ...item, giftNameSnapshot: gift.name };
    });
    const totalDeltaUnits = deltas.reduce((sum, item) => sum + item.deltaUnits, 0);
    if (!Number.isSafeInteger(totalDeltaUnits)) {
      throw operationError('invalid-argument', 'Gift adjustment exceeds safe integer range');
    }
    const result = {
      adjustmentId: request.adjustmentId,
      totalDeltaUnits,
      status: 'adjusted',
    };
    await applyGiftDeltas(transaction, db, {
      actor,
      operationId: request.adjustmentId,
      operationType: 'adjustment',
      movementType: 'adjust',
      branchId: request.branchId,
      dateKey: laosGiftDateKey(now),
      deltas,
      reason: request.reason,
      payloadDigest: request.payloadDigest,
      operationResult: result,
    });
    return result;
  });
}
