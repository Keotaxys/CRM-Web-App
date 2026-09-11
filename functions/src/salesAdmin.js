import { FieldValue } from 'firebase-admin/firestore';
import { assertAdmin } from './authz.js';
import { normalizeSalesProductName, SalesOperationError } from './salesDomain.js';

const PRODUCT_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

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
