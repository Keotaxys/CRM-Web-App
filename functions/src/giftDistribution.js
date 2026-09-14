import { FieldValue } from 'firebase-admin/firestore';
import { canAccessBranch, profileMatchesActor } from './authz.js';
import {
  GiftOperationError, assertDocumentId, assertUuid, giftRequestDigest,
  laosGiftDateKey, normalizeGiftLines,
} from './giftDomain.js';
import { applyGiftDeltas } from './giftInventory.js';

const CONTENT_FIELDS = ['recipientType', 'customerId', 'campaignId', 'items', 'note'];

function fail(code, message) {
  throw new GiftOperationError(code, message);
}

function allowedFields(data, fields) {
  if (!data || typeof data !== 'object' || Array.isArray(data)
    || Object.keys(data).some((field) => !fields.includes(field))) {
    fail('invalid-argument', 'Unknown or server-controlled distribution fields are not allowed');
  }
}

function assertActor(actor) {
  if (!actor?.uid || !['staff', 'branch_manager', 'admin'].includes(actor.role)
    || actor.accountStatus !== 'approved') {
    fail('permission-denied', 'Approved authenticated account required');
  }
}

function assertProfile(actor, snapshot) {
  if (!profileMatchesActor(actor, snapshot.exists ? snapshot.data() : null)) {
    fail('permission-denied', 'Approved account profile does not match access claims');
  }
}

function assertBranch(actor, branchId) {
  if (!canAccessBranch(actor, branchId)) fail('permission-denied', 'Cross-branch access denied');
}

function textRequest(value, label, required = false) {
  if (typeof value !== 'string') fail('invalid-argument', `${label} must be a string`);
  const result = value.trim().replace(/\s+/g, ' ');
  if (required && !result) fail('invalid-argument', `${label} required`);
  return result;
}

function recipientRequest(data) {
  const { recipientType } = data;
  if (!['customer', 'campaign'].includes(recipientType)) {
    fail('invalid-argument', 'Gift recipient type required');
  }
  if ((recipientType === 'customer' && data.campaignId != null)
    || (recipientType === 'campaign' && data.customerId != null)) {
    fail('invalid-argument', 'Choose Customer or Campaign, not both');
  }
  return {
    recipientType,
    customerId: recipientType === 'customer' ? assertDocumentId(data.customerId, 'Customer') : null,
    campaignId: recipientType === 'campaign' ? assertDocumentId(data.campaignId, 'Campaign') : null,
  };
}

function contentRequest(data) {
  const recipient = recipientRequest(data);
  if (!Array.isArray(data.items) || data.items.length < 1 || data.items.length > 25) {
    fail('invalid-argument', 'Gift items must contain 1 to 25 rows');
  }
  const seen = new Set();
  const items = data.items.map((line) => {
    allowedFields(line, ['giftId', 'packs', 'looseUnits']);
    const giftId = assertDocumentId(line.giftId, 'Gift');
    if (seen.has(giftId)) fail('invalid-argument', 'Duplicate gift id');
    seen.add(giftId);
    const packs = Number(line.packs ?? 0);
    const looseUnits = Number(line.looseUnits ?? 0);
    if (!Number.isSafeInteger(packs) || packs < 0
      || !Number.isSafeInteger(looseUnits) || looseUnits < 0
      || (packs === 0 && looseUnits === 0)) {
      fail('invalid-argument', 'Positive gift quantities with nonnegative safe integers required');
    }
    return { giftId, packs, looseUnits };
  });
  return { ...recipient, items, note: textRequest(data.note ?? '', 'Note') };
}

async function loadContent(transaction, db, request, branchId) {
  const customer = request.recipientType === 'customer';
  const [recipientSnapshot, ...gifts] = await Promise.all([
    transaction.get(db.doc(customer ? `customers/${request.customerId}`
      : `giftCampaigns/${request.campaignId}`)),
    ...request.items.map((item) => transaction.get(db.doc(`giftItems/${item.giftId}`))),
  ]);
  const recipient = recipientSnapshot.exists ? recipientSnapshot.data() : null;
  if (!recipient || recipient.branchId !== branchId
    || (customer ? recipient.recordState !== 'active' : recipient.active !== true)) {
    fail('failed-precondition', 'Active recipient in the distribution branch required');
  }
  const normalized = normalizeGiftLines(request.items,
    new Map(gifts.map((snapshot) => [snapshot.id, snapshot.exists ? snapshot.data() : null])));
  return {
    ...normalized,
    ...recipientRequest(request),
    customerNameSnapshot: customer ? recipient.name : null,
    campaignNameSnapshot: customer ? null : recipient.name,
    note: request.note,
  };
}

function retryResult(snapshot, digest, field) {
  const existing = snapshot.data();
  if (existing[field] !== digest) fail('already-exists', 'Operation id already used with another payload or actor');
  if (!existing.result) fail('failed-precondition', 'Operation retry result unavailable');
  return existing.result;
}

export async function recordGiftDistributionOperation({ db }, actor, data, now = () => new Date()) {
  assertActor(actor);
  allowedFields(data, ['distributionId', 'branchId', 'expectedDateKey', ...CONTENT_FIELDS]);
  const distributionId = assertUuid(data.distributionId, 'Distribution');
  const branchId = assertDocumentId(data.branchId, 'Branch');
  assertBranch(actor, branchId);
  if (typeof data.expectedDateKey !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(data.expectedDateKey)) {
    fail('invalid-argument', 'Expected Laos date required');
  }
  const request = contentRequest(data);
  const payloadDigest = giftRequestDigest({
    distributionId, branchId, expectedDateKey: data.expectedDateKey,
    ...request, actorUid: actor.uid,
  });
  const distributionRef = db.doc(`giftDistributions/${distributionId}`);
  return db.runTransaction(async (transaction) => {
    const [profile, existing] = await Promise.all([
      transaction.get(db.doc(`users/${actor.uid}`)), transaction.get(distributionRef),
    ]);
    assertProfile(actor, profile);
    if (existing.exists) return retryResult(existing, payloadDigest, 'payloadDigest');
    const dateKey = laosGiftDateKey(typeof now === 'function' ? now() : now);
    if (dateKey !== data.expectedDateKey) fail('failed-precondition', 'Laos date changed; refresh before saving');
    const content = await loadContent(transaction, db, request, branchId);
    const result = { distributionId, dateKey, totalUnits: content.totalUnits, version: 1, status: 'active' };
    await applyGiftDeltas(transaction, db, {
      actor, operationId: distributionId, operationType: 'distribution', movementType: 'distribute',
      branchId, dateKey, distributionOwnerUid: actor.uid,
      customerId: content.customerId, campaignId: content.campaignId,
      deltas: content.items.map((item) => ({ ...item, deltaUnits: -item.totalUnits })),
      payloadDigest,
    });
    transaction.create(distributionRef, {
      schemaVersion: 1, distributionId, payloadDigest, result, version: 1, dateKey, branchId,
      ...content, status: 'active', distributionOwnerUid: actor.uid,
      createdBy: actor.uid, createdByRole: actor.role, createdAt: FieldValue.serverTimestamp(),
      updatedBy: actor.uid, updatedAt: FieldValue.serverTimestamp(),
      cancelledBy: null, cancelledAt: null, cancelReason: null,
    });
    return result;
  });
}

function mutationRequest(actor, data, operation) {
  assertActor(actor);
  allowedFields(data, ['distributionId', 'mutationId', 'expectedVersion', 'reason', 'branchId',
    ...(operation === 'amend' ? CONTENT_FIELDS : [])]);
  const distributionId = assertUuid(data.distributionId, 'Distribution');
  const mutationId = assertUuid(data.mutationId, 'Mutation');
  if (!Number.isSafeInteger(data.expectedVersion) || data.expectedVersion < 1
    || data.expectedVersion === Number.MAX_SAFE_INTEGER) {
    fail('invalid-argument', 'Expected distribution version must be a positive safe integer');
  }
  const request = {
    distributionId, mutationId, expectedVersion: data.expectedVersion,
    branchId: data.branchId == null ? null : assertDocumentId(data.branchId, 'Branch'),
    reason: textRequest(data.reason, 'Correction reason', true),
    ...(operation === 'amend' ? contentRequest(data) : {}),
  };
  return { ...request, requestDigest: giftRequestDigest({ ...request, actorUid: actor.uid, operation }) };
}

function storedItems(distribution) {
  const seen = new Set();
  if (!Array.isArray(distribution.items) || distribution.items.length < 1 || distribution.items.length > 25) {
    fail('failed-precondition', 'Stored gift items invalid');
  }
  for (const item of distribution.items) {
    assertDocumentId(item.giftId, 'Gift');
    if (seen.has(item.giftId) || !Number.isSafeInteger(item.totalUnits) || item.totalUnits < 1
      || typeof item.giftNameSnapshot !== 'string') {
      fail('failed-precondition', 'Stored gift items invalid');
    }
    seen.add(item.giftId);
  }
  const total = distribution.items.reduce((sum, item) => sum + item.totalUnits, 0);
  if (!Number.isSafeInteger(total)) fail('failed-precondition', 'Stored gift total invalid');
  return distribution.items;
}

function amendmentDeltas(previousItems, nextItems) {
  const previous = new Map(previousItems.map((item) => [item.giftId, item]));
  const next = new Map(nextItems.map((item) => [item.giftId, item]));
  return [...new Set([...previous.keys(), ...next.keys()])].map((giftId) => ({
    ...(next.get(giftId) ?? previous.get(giftId)),
    deltaUnits: (previous.get(giftId)?.totalUnits ?? 0) - (next.get(giftId)?.totalUnits ?? 0),
  })).filter((item) => item.deltaUnits !== 0);
}

function recipientSnapshot(distribution) {
  return {
    recipientType: distribution.recipientType,
    customerId: distribution.customerId,
    customerNameSnapshot: distribution.customerNameSnapshot,
    campaignId: distribution.campaignId,
    campaignNameSnapshot: distribution.campaignNameSnapshot,
  };
}

async function mutateDistribution({ db }, actor, data, now, operation) {
  const request = mutationRequest(actor, data, operation);
  const distributionRef = db.doc(`giftDistributions/${request.distributionId}`);
  const revisionRef = distributionRef.collection('revisions').doc(request.mutationId);
  return db.runTransaction(async (transaction) => {
    const [profile, existing, revision] = await Promise.all([
      transaction.get(db.doc(`users/${actor.uid}`)),
      transaction.get(distributionRef), transaction.get(revisionRef),
    ]);
    assertProfile(actor, profile);
    if (!existing.exists) fail('not-found', 'Gift distribution not found');
    const previous = existing.data();
    assertBranch(actor, previous.branchId);
    if (request.branchId !== null && request.branchId !== previous.branchId) {
      fail('permission-denied', 'Target branch does not match distribution');
    }
    if (actor.role === 'staff' && previous.createdBy !== actor.uid) {
      fail('permission-denied', 'Staff may correct only their own distributions');
    }
    // Completed retries remain valid after midnight or a subsequent revision.
    if (revision.exists) return retryResult(revision, request.requestDigest, 'requestDigest');
    const dateKey = laosGiftDateKey(typeof now === 'function' ? now() : now);
    if (actor.role === 'staff' && previous.dateKey !== dateKey) {
      fail('permission-denied', 'Staff corrections must be on the original Laos day');
    }
    if (previous.status !== 'active') fail('failed-precondition', 'Distribution is not active');
    if (previous.version !== request.expectedVersion) {
      fail('failed-precondition', 'Distribution version changed; refresh before saving');
    }
    const previousItems = storedItems(previous);
    const cancelling = operation === 'cancel';
    const next = cancelling ? previous : await loadContent(transaction, db, request, previous.branchId);
    const deltas = amendmentDeltas(previousItems, cancelling ? [] : next.items);
    const status = cancelling ? 'cancelled' : 'active';
    const nextVersion = previous.version + 1;
    const ownerUid = previous.distributionOwnerUid ?? previous.createdBy;
    const result = {
      distributionId: request.distributionId, mutationId: request.mutationId,
      totalUnits: next.items.reduce((sum, item) => sum + item.totalUnits, 0),
      version: nextVersion, status,
    };
    await applyGiftDeltas(transaction, db, {
      actor, operationId: request.mutationId, operationType: 'distribution',
      movementType: cancelling ? 'distribution_cancel' : 'distribution_amend',
      branchId: previous.branchId, dateKey, deltas, reason: request.reason,
      distributionOwnerUid: ownerUid, customerId: next.customerId, campaignId: next.campaignId,
      payloadDigest: request.requestDigest,
    });
    transaction.update(distributionRef, {
      ...(cancelling ? {
        cancelledBy: actor.uid, cancelledAt: FieldValue.serverTimestamp(), cancelReason: request.reason,
      } : next),
      version: nextVersion, status, distributionOwnerUid: ownerUid,
      updatedBy: actor.uid, updatedAt: FieldValue.serverTimestamp(),
    });
    transaction.create(revisionRef, {
      schemaVersion: 1, mutationId: request.mutationId, operationType: operation,
      requestDigest: request.requestDigest, result, reason: request.reason,
      previousVersion: previous.version, nextVersion,
      previousRecipient: recipientSnapshot(previous), nextRecipient: recipientSnapshot(next),
      previousItems, nextItems: cancelling ? [] : next.items,
      previousNote: previous.note, nextNote: next.note,
      previousStatus: previous.status, nextStatus: status,
      distributionOwnerUid: ownerUid, actorUid: actor.uid,
      changedBy: actor.uid, changedByRole: actor.role, changedAt: FieldValue.serverTimestamp(),
    });
    return result;
  });
}

export async function amendGiftDistributionOperation(services, actor, data, now = () => new Date()) {
  return mutateDistribution(services, actor, data, now, 'amend');
}

export async function cancelGiftDistributionOperation(services, actor, data, now = () => new Date()) {
  return mutateDistribution(services, actor, data, now, 'cancel');
}
