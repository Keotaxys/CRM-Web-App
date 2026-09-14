import { createHash } from 'node:crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { assertAdmin, assertBranchAccess, profileMatchesActor } from './authz.js';
import { GiftOperationError, giftRequestDigest, normalizeGiftName } from './giftDomain.js';

const DOCUMENT_ID = /^[A-Za-z0-9_-]{1,128}$/;
const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;
const SERVER_FIELDS = [
  'schemaVersion', 'normalizedName', 'createdBy', 'createdAt', 'updatedBy', 'updatedAt',
];

function giftNameKey(db, normalizedName) {
  return db.doc(`giftItemNameKeys/${createHash('sha256').update(normalizedName).digest('hex')}`);
}

function campaignNameKey(db, branchId, normalizedName) {
  const value = `${branchId}\u0000${normalizedName}`;
  return db.doc(`giftCampaignNameKeys/${createHash('sha256').update(value).digest('hex')}`);
}

function operationError(code, message) {
  return new GiftOperationError(code, message);
}

function assertDocumentId(value, label) {
  if (typeof value !== 'string' || !DOCUMENT_ID.test(value)) {
    throw operationError('invalid-argument', `${label} id is invalid`);
  }
  return value;
}

function assertNoServerFields(data) {
  if (SERVER_FIELDS.some((field) => Object.hasOwn(data ?? {}, field))) {
    throw operationError('invalid-argument', 'Server-controlled catalog fields are not allowed');
  }
}

function normalizedLabel(value, label) {
  if (typeof value !== 'string') {
    throw operationError('invalid-argument', `${label} label is required`);
  }
  const normalized = value.trim().replace(/\s+/g, ' ');
  if (!normalized) throw operationError('invalid-argument', `${label} label is required`);
  return normalized;
}

function giftValues(data, { update = false } = {}) {
  assertNoServerFields(data);
  const { name, normalizedName } = normalizeGiftName(data?.name);
  const unitLabel = normalizedLabel(data?.unitLabel, 'Unit');
  const packLabel = normalizedLabel(data?.packLabel, 'Pack');
  if (!Number.isSafeInteger(data?.unitsPerPack) || data.unitsPerPack < 1) {
    throw operationError('invalid-argument', 'Gift units per pack must be a positive safe integer');
  }
  if (!Number.isSafeInteger(data?.sortOrder)) {
    throw operationError('invalid-argument', 'Gift sort order must be a safe integer');
  }
  const hasActive = Object.hasOwn(data ?? {}, 'active');
  if ((update || hasActive) && typeof data?.active !== 'boolean') {
    throw operationError('invalid-argument', 'Gift active state must be a boolean');
  }
  return {
    name,
    normalizedName,
    unitLabel,
    packLabel,
    unitsPerPack: data.unitsPerPack,
    sortOrder: data.sortOrder,
    active: hasActive ? data.active : true,
  };
}

function isRealDateKey(value) {
  if (typeof value !== 'string' || !DATE_KEY.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

function campaignValues(data, { update = false } = {}) {
  assertNoServerFields(data);
  const { name, normalizedName } = normalizeGiftName(data?.name);
  const branchId = assertDocumentId(data?.branchId, 'Branch');
  if (!isRealDateKey(data?.startDate) || !isRealDateKey(data?.endDate)) {
    throw operationError('invalid-argument', 'Campaign dates must use valid YYYY-MM-DD date keys');
  }
  if (data.endDate < data.startDate) {
    throw operationError('invalid-argument', 'Campaign date range is invalid');
  }
  if (typeof data?.note !== 'string') {
    throw operationError('invalid-argument', 'Campaign note must be a string');
  }
  const hasActive = Object.hasOwn(data ?? {}, 'active');
  if ((update || hasActive) && typeof data?.active !== 'boolean') {
    throw operationError('invalid-argument', 'Campaign active state must be a boolean');
  }
  return {
    name,
    normalizedName,
    branchId,
    startDate: data.startDate,
    endDate: data.endDate,
    note: data.note.trim(),
    active: hasActive ? data.active : true,
  };
}

function assertCatalogActor(actor) {
  if (actor?.accountStatus !== 'approved') {
    throw operationError('permission-denied', 'Approved account required');
  }
}

function assertMatchingProfile(actor, snapshot) {
  const profile = snapshot.exists ? snapshot.data() : null;
  if (!profileMatchesActor(actor, profile)) {
    throw operationError('permission-denied', 'Approved account profile does not match access claims');
  }
}

function assertCampaignRole(actor) {
  if (!['admin', 'branch_manager'].includes(actor?.role)) {
    throw operationError('permission-denied', 'Branch Manager or Admin permission required');
  }
  assertCatalogActor(actor);
}

function reservation(ownerField, ownerId, normalizedName, branchId = null) {
  const identity = branchId === null ? { normalizedName } : { branchId, normalizedName };
  return {
    schemaVersion: 1,
    [ownerField]: ownerId,
    ...identity,
    requestDigest: giftRequestDigest({ [ownerField]: ownerId, ...identity }),
  };
}

export async function createGiftItemOperation({ db }, actor, data) {
  assertAdmin(actor);
  assertCatalogActor(actor);
  const values = giftValues(data);
  const itemRef = db.collection('giftItems').doc();
  const keyRef = giftNameKey(db, values.normalizedName);

  await db.runTransaction(async (transaction) => {
    const [profile, existingKey] = await Promise.all([
      transaction.get(db.doc(`users/${actor.uid}`)),
      transaction.get(keyRef),
    ]);
    assertMatchingProfile(actor, profile);
    if (existingKey.exists) throw operationError('already-exists', 'Gift name already exists');
    const timestamp = FieldValue.serverTimestamp();
    transaction.create(keyRef, reservation('giftId', itemRef.id, values.normalizedName));
    transaction.create(itemRef, {
      schemaVersion: 1,
      ...values,
      createdBy: actor.uid,
      createdAt: timestamp,
      updatedBy: actor.uid,
      updatedAt: timestamp,
    });
  });

  return { id: itemRef.id, ...values };
}

export async function updateGiftItemOperation({ db }, actor, data) {
  assertAdmin(actor);
  assertCatalogActor(actor);
  const giftId = assertDocumentId(data?.giftId, 'Gift');
  const values = giftValues(data, { update: true });
  const itemRef = db.doc(`giftItems/${giftId}`);

  await db.runTransaction(async (transaction) => {
    const [profile, existingItem] = await Promise.all([
      transaction.get(db.doc(`users/${actor.uid}`)),
      transaction.get(itemRef),
    ]);
    assertMatchingProfile(actor, profile);
    if (!existingItem.exists) throw operationError('not-found', 'Gift item not found');
    const previous = existingItem.data();
    const renamed = previous.normalizedName !== values.normalizedName;
    let nextKey = null;
    if (renamed) {
      nextKey = giftNameKey(db, values.normalizedName);
      const existingKey = await transaction.get(nextKey);
      if (existingKey.exists) throw operationError('already-exists', 'Gift name already exists');
      transaction.create(nextKey, reservation('giftId', giftId, values.normalizedName));
    }
    transaction.update(itemRef, {
      ...values,
      updatedBy: actor.uid,
      updatedAt: FieldValue.serverTimestamp(),
    });
    if (renamed) transaction.delete(giftNameKey(db, previous.normalizedName));
  });

  return { id: giftId, ...values };
}

export async function createGiftCampaignOperation({ db }, actor, data) {
  assertCampaignRole(actor);
  const values = campaignValues(data);
  assertBranchAccess(actor, values.branchId);
  const campaignRef = db.collection('giftCampaigns').doc();
  const keyRef = campaignNameKey(db, values.branchId, values.normalizedName);

  await db.runTransaction(async (transaction) => {
    const [profile, existingKey] = await Promise.all([
      transaction.get(db.doc(`users/${actor.uid}`)),
      transaction.get(keyRef),
    ]);
    assertMatchingProfile(actor, profile);
    if (existingKey.exists) throw operationError('already-exists', 'Campaign name already exists in branch');
    const timestamp = FieldValue.serverTimestamp();
    transaction.create(keyRef, reservation(
      'campaignId', campaignRef.id, values.normalizedName, values.branchId,
    ));
    transaction.create(campaignRef, {
      schemaVersion: 1,
      ...values,
      createdBy: actor.uid,
      createdAt: timestamp,
      updatedBy: actor.uid,
      updatedAt: timestamp,
    });
  });

  return { id: campaignRef.id, ...values };
}

export async function updateGiftCampaignOperation({ db }, actor, data) {
  assertCampaignRole(actor);
  const campaignId = assertDocumentId(data?.campaignId, 'Campaign');
  const values = campaignValues(data, { update: true });
  assertBranchAccess(actor, values.branchId);
  const campaignRef = db.doc(`giftCampaigns/${campaignId}`);

  await db.runTransaction(async (transaction) => {
    const [profile, existingCampaign] = await Promise.all([
      transaction.get(db.doc(`users/${actor.uid}`)),
      transaction.get(campaignRef),
    ]);
    assertMatchingProfile(actor, profile);
    if (!existingCampaign.exists) throw operationError('not-found', 'Gift Campaign not found');
    const previous = existingCampaign.data();
    assertBranchAccess(actor, previous.branchId);
    const renamed = previous.branchId !== values.branchId
      || previous.normalizedName !== values.normalizedName;
    if (renamed) {
      const nextKey = campaignNameKey(db, values.branchId, values.normalizedName);
      const existingKey = await transaction.get(nextKey);
      if (existingKey.exists) {
        throw operationError('already-exists', 'Campaign name already exists in branch');
      }
      transaction.create(nextKey, reservation(
        'campaignId', campaignId, values.normalizedName, values.branchId,
      ));
    }
    transaction.update(campaignRef, {
      ...values,
      updatedBy: actor.uid,
      updatedAt: FieldValue.serverTimestamp(),
    });
    if (renamed) {
      transaction.delete(campaignNameKey(db, previous.branchId, previous.normalizedName));
    }
  });

  return { id: campaignId, ...values };
}
