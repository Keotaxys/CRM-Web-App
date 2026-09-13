import { createHash } from 'node:crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { assertAdmin, profileMatchesActor } from './authz.js';
import {
  dailySalesDocumentId,
  laosSalesDateKey,
  normalizeSalesProductName,
  SalesOperationError,
  validateSalesItems,
} from './salesDomain.js';

const PRODUCT_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
const DAILY_SALES_ID_PATTERN = /^\d{4}-\d{2}-\d{2}_[A-Za-z0-9_-]{1,128}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SALES_IDENTITY_FIELDS = [
  'branchId', 'createdAt', 'createdBy', 'dateKey', 'staffNameSnapshot', 'staffUid', 'updatedAt', 'updatedBy',
];

function productValues(data, { requireActive = false } = {}) {
  const name = String(data?.name ?? '').trim().replace(/\s+/g, ' ');
  const normalizedName = normalizeSalesProductName(name);
  const sortOrder = Number(data?.sortOrder ?? 0);
  if (!Number.isInteger(sortOrder)) {
    throw new SalesOperationError('invalid-argument', 'Product sort order must be an integer');
  }
  if (requireActive && typeof data?.active !== 'boolean') {
    throw new SalesOperationError('invalid-argument', 'Product active state must be a boolean');
  }
  return { name, normalizedName, sortOrder };
}

export async function createSalesProductOperation({ db }, actor, data) {
  assertAdmin(actor);
  const { name, normalizedName, sortOrder } = productValues(data);
  const ref = db.collection('salesProducts').doc();
  await db.runTransaction(async (transaction) => {
    const duplicate = await transaction.get(
      db.collection('salesProducts').where('normalizedName', '==', normalizedName).limit(1),
    );
    if (!duplicate.empty) throw new SalesOperationError('already-exists', 'Product name already exists');
    transaction.create(ref, {
      schemaVersion: 1,
      name,
      normalizedName,
      active: true,
      sortOrder,
      createdBy: actor.uid,
      createdAt: FieldValue.serverTimestamp(),
      updatedBy: actor.uid,
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
  return { id: ref.id, name, active: true, sortOrder };
}

export async function updateSalesProductOperation({ db }, actor, data) {
  assertAdmin(actor);
  const productId = data?.productId;
  if (typeof productId !== 'string' || !PRODUCT_ID_PATTERN.test(productId)) {
    throw new SalesOperationError('invalid-argument', 'Invalid sales product id');
  }
  const { name, normalizedName, sortOrder } = productValues(data, { requireActive: true });
  const ref = db.doc(`salesProducts/${productId}`);

  await db.runTransaction(async (transaction) => {
    const existing = await transaction.get(ref);
    if (!existing.exists) throw new SalesOperationError('not-found', 'Sales product not found');
    const duplicate = await transaction.get(
      db.collection('salesProducts').where('normalizedName', '==', normalizedName),
    );
    if (duplicate.docs.some((snapshot) => snapshot.id !== productId)) {
      throw new SalesOperationError('already-exists', 'Product name already exists');
    }
    transaction.update(ref, {
      name,
      normalizedName,
      sortOrder,
      active: data.active,
      updatedBy: actor.uid,
      updatedAt: FieldValue.serverTimestamp(),
    });
  });

  return { id: productId, name, active: data.active, sortOrder };
}

function assertApprovedMatchingProfile(actor, profile) {
  if (actor?.accountStatus !== 'approved') {
    throw new SalesOperationError('permission-denied', 'Approved account required');
  }
  if (!profileMatchesActor(actor, profile)) {
    throw new SalesOperationError('permission-denied', 'Approved account profile does not match access claims');
  }
}

function assertNoServerControlledFields(data) {
  if (SALES_IDENTITY_FIELDS.some((field) => Object.hasOwn(data ?? {}, field))) {
    throw new SalesOperationError('invalid-argument', 'Sales identity fields are server controlled');
  }
}

async function loadSalesCatalog(transaction, db) {
  const snapshot = await transaction.get(db.collection('salesProducts'));
  return new Map(snapshot.docs.map((product) => [product.id, { id: product.id, ...product.data() }]));
}

async function loadSalesContext(transaction, db, uid, dailyRef) {
  const [profileSnapshot, dailySnapshot, catalog] = await Promise.all([
    transaction.get(db.doc(`users/${uid}`)),
    transaction.get(dailyRef),
    loadSalesCatalog(transaction, db),
  ]);
  return [
    profileSnapshot.exists ? profileSnapshot.data() : null,
    dailySnapshot.exists ? dailySnapshot.data() : null,
    catalog,
  ];
}

function dailySalesWrite(actor, profile, dateKey, existing, normalized) {
  const timestamp = FieldValue.serverTimestamp();
  return {
    schemaVersion: 1,
    dateKey: existing?.dateKey ?? dateKey,
    staffUid: existing?.staffUid ?? actor.uid,
    staffNameSnapshot: existing?.staffNameSnapshot ?? (String(profile.name ?? '').trim() || actor.uid),
    branchId: existing?.branchId ?? actor.branchId,
    items: normalized.items,
    totalQuantity: normalized.totalQuantity,
    createdBy: existing?.createdBy ?? actor.uid,
    createdAt: existing?.createdAt ?? timestamp,
    updatedBy: actor.uid,
    updatedAt: timestamp,
  };
}

export async function saveDailySalesOperation({ db }, actor, data, now = new Date()) {
  if (!['staff', 'branch_manager'].includes(actor?.role) || !actor.branchId) {
    throw new SalesOperationError('permission-denied', 'Approved branch account required');
  }
  assertNoServerControlledFields(data);
  const dateKey = laosSalesDateKey(now);
  // A client draft day is a precondition only; the server still chooses the target day.
  if (data?.expectedDateKey !== undefined && data.expectedDateKey !== dateKey) {
    throw new SalesOperationError('failed-precondition', 'Sales draft day has changed');
  }
  const ref = db.doc(`dailySales/${dailySalesDocumentId(dateKey, actor.uid)}`);
  const savedTotalQuantity = await db.runTransaction(async (transaction) => {
    const [profile, existing, catalog] = await loadSalesContext(transaction, db, actor.uid, ref);
    assertApprovedMatchingProfile(actor, profile);
    if (existing && (existing.dateKey !== dateKey || existing.staffUid !== actor.uid)) {
      throw new SalesOperationError('failed-precondition', 'Daily sales identity does not match document');
    }
    const normalized = validateSalesItems(data?.items, catalog, existing?.items ?? []);
    transaction.set(ref, dailySalesWrite(actor, profile, dateKey, existing, normalized), { merge: true });
    return normalized.totalQuantity;
  });
  return { id: ref.id, dateKey, totalQuantity: savedTotalQuantity };
}

function amendmentRequest(data) {
  const dailySalesId = data?.dailySalesId;
  if (typeof dailySalesId !== 'string' || !DAILY_SALES_ID_PATTERN.test(dailySalesId)) {
    throw new SalesOperationError('invalid-argument', 'Invalid daily sales id');
  }
  const mutationId = data?.mutationId;
  if (typeof mutationId !== 'string' || !UUID_PATTERN.test(mutationId)) {
    throw new SalesOperationError('invalid-argument', 'Invalid amendment mutation id');
  }
  const reason = String(data?.reason ?? '').trim();
  if (!reason) throw new SalesOperationError('invalid-argument', 'Amendment reason required');
  if (!Array.isArray(data?.items)) throw new SalesOperationError('invalid-argument', 'Sales items must be an array');
  assertNoServerControlledFields(data);
  const items = data.items.map((item) => ({ productId: item?.productId, quantity: item?.quantity }));
  const requestDigest = createHash('sha256')
    .update(JSON.stringify({ dailySalesId, mutationId, reason, items }))
    .digest('hex');
  return { dailySalesId, mutationId, reason, items, requestDigest };
}

function assertAmendmentAccess(actor, dailySales) {
  if (actor.role === 'admin') return;
  if (actor.role !== 'branch_manager') {
    throw new SalesOperationError('permission-denied', 'Branch Manager or Admin permission required');
  }
  if (!actor.branchId || actor.branchId !== dailySales.branchId) {
    throw new SalesOperationError('permission-denied', 'Cross-branch sales amendment denied');
  }
}

export async function amendDailySalesOperation({ db }, actor, data) {
  if (!['admin', 'branch_manager'].includes(actor?.role)) {
    throw new SalesOperationError('permission-denied', 'Branch Manager or Admin permission required');
  }
  const request = amendmentRequest(data);
  const dailyRef = db.doc(`dailySales/${request.dailySalesId}`);
  const revisionRef = dailyRef.collection('revisions').doc(request.mutationId);

  return db.runTransaction(async (transaction) => {
    const [profileSnapshot, dailySnapshot, revisionSnapshot] = await Promise.all([
      transaction.get(db.doc(`users/${actor.uid}`)),
      transaction.get(dailyRef),
      transaction.get(revisionRef),
    ]);
    const profile = profileSnapshot.exists ? profileSnapshot.data() : null;
    assertApprovedMatchingProfile(actor, profile);
    if (!dailySnapshot.exists) throw new SalesOperationError('not-found', 'Daily sales not found');
    const dailySales = dailySnapshot.data();
    assertAmendmentAccess(actor, dailySales);

    if (dailySalesDocumentId(dailySales.dateKey, dailySales.staffUid) !== request.dailySalesId) {
      throw new SalesOperationError('failed-precondition', 'Daily sales identity does not match document');
    }

    if (revisionSnapshot.exists) {
      const revision = revisionSnapshot.data();
      if (revision.requestDigest !== request.requestDigest) {
        throw new SalesOperationError('failed-precondition', 'Amendment mutation id conflicts with an earlier request');
      }
      if (!revision.result) throw new SalesOperationError('failed-precondition', 'Amendment retry result unavailable');
      return revision.result;
    }

    const catalog = await loadSalesCatalog(transaction, db);
    const normalized = validateSalesItems(request.items, catalog, dailySales.items ?? []);
    const result = {
      id: dailyRef.id,
      dateKey: dailySales.dateKey,
      totalQuantity: normalized.totalQuantity,
    };
    transaction.update(dailyRef, {
      items: normalized.items,
      totalQuantity: normalized.totalQuantity,
      updatedBy: actor.uid,
      updatedAt: FieldValue.serverTimestamp(),
    });
    transaction.create(revisionRef, {
      schemaVersion: 1,
      reason: request.reason,
      previousItems: dailySales.items ?? [],
      nextItems: normalized.items,
      previousTotalQuantity: dailySales.totalQuantity ?? 0,
      nextTotalQuantity: normalized.totalQuantity,
      changedBy: actor.uid,
      changedByRole: actor.role,
      changedAt: FieldValue.serverTimestamp(),
      requestDigest: request.requestDigest,
      result,
    });
    return result;
  });
}
