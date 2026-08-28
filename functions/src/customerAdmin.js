import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { assertAdmin, assertBranchAccess, canTrashRecord } from './authz.js';
import { branchLabel, isTrashExpired, trashExpiresAt } from './validators.js';

async function hasRelatedActivities(db, customerId) {
  const snapshot = await db.collection('activities').where('customerId', '==', customerId).limit(1).get();
  return !snapshot.empty;
}

async function deleteAbandonedManagedImages(bucket, id, customer) {
  const slots = [
    ['imageStoragePath', `customers/${id}/customer-photo`],
    ['placeImageStoragePath', `customers/${id}/place-photo`],
  ];
  const paths = slots.filter(([field, path]) => customer[field] !== path).map(([, path]) => path);
  await Promise.all(paths.map((path) => bucket.file(path).delete({ ignoreNotFound:true })));
  return paths.length;
}

export async function archiveCustomerOperation({ db }, actor, data) {
  const ref = db.doc(`customers/${data?.id}`); const snapshot = await ref.get();
  if (!snapshot.exists) throw new Error('Customer not found');
  const customer = snapshot.data(); assertBranchAccess(actor, customer.branchId);
  if (customer.recordState !== 'active') throw new Error('Only active customer can be archived');
  await ref.update({ recordState:'archived',archivedBy:actor.uid,archivedAt:FieldValue.serverTimestamp(),updatedBy:actor.uid,updatedAt:FieldValue.serverTimestamp() });
  return { id:ref.id,recordState:'archived' };
}

export async function trashCustomerOperation({ db }, actor, data) { const ref = db.doc(`customers/${data?.id}`); const snapshot = await ref.get(); if (!snapshot.exists) throw new Error('Customer not found'); if (!canTrashRecord(actor, snapshot.data())) throw new Error('Customer trash denied'); const deletedAt=Timestamp.now(); await ref.update({ recordState:'trashed',deletedBy:actor.uid,deletedAt,purgeAfter:Timestamp.fromDate(trashExpiresAt(deletedAt)),updatedBy:actor.uid,updatedAt:FieldValue.serverTimestamp() }); return { id: ref.id, recordState:'trashed' }; }
export async function transferCustomerOperation({ db }, actor, data) { assertAdmin(actor); if (!data?.branchId) throw new Error('Target branch required'); const ref=db.doc(`customers/${data.id}`); await db.runTransaction(async(transaction)=>{const snapshot=await transaction.get(ref);if(!snapshot.exists)throw new Error('Customer not found');const related=await transaction.get(db.collection('activities').where('customerId','==',data.id).limit(1));if(!related.empty)throw new Error('Resolve related activities before transferring this customer');transaction.update(ref,{branchId:data.branchId,branch:branchLabel(data.branchId),updatedBy:actor.uid,updatedAt:FieldValue.serverTimestamp()});}); return { id:data.id,branchId:data.branchId }; }
export async function restoreCustomerOperation({ db }, actor, data) { assertAdmin(actor); await db.doc(`customers/${data?.id}`).update({ recordState:'active',deletedBy:null,deletedAt:null,purgeAfter:null,updatedBy:actor.uid,updatedAt:FieldValue.serverTimestamp() }); return { id:data.id }; }

async function deleteManagedImages(bucket, id, customer) { const prefix=`customers/${id}/`; const paths=new Set([`customers/${id}/customer-photo`,`customers/${id}/place-photo`,customer.imageStoragePath,customer.placeImageStoragePath].filter((path)=>typeof path==='string'&&path.startsWith(prefix))); await Promise.all([...paths].map((path)=>bucket.file(path).delete({ ignoreNotFound:true }))); }
export async function permanentlyDeleteCustomerOperation({ db, bucket }, actor, data) { assertAdmin(actor); const ref=db.doc(`customers/${data?.id}`); const snapshot=await ref.get(); if(!snapshot.exists) return { id:data.id,deleted:false }; const customer=snapshot.data(); if(customer.recordState!=='trashed') throw new Error('Only trashed customer can be permanently deleted'); if(await hasRelatedActivities(db,ref.id)) throw new Error('Resolve related activities before permanently deleting this customer'); await deleteManagedImages(bucket,ref.id,customer); await ref.delete(); return { id:ref.id,deleted:true }; }
export async function cleanupExpiredCustomers({ db, bucket }, actor, now) { assertAdmin(actor); const snapshots=await db.collection('customers').where('recordState','==','trashed').get(); const expired=snapshots.docs.filter((item)=>isTrashExpired(item.data().deletedAt,now)); let deleted=0; for (const item of expired) { assertBranchAccess(actor,item.data().branchId); if(await hasRelatedActivities(db,item.id)) continue; await deleteManagedImages(bucket,item.id,item.data()); await item.ref.delete(); deleted+=1; } return deleted; }

export async function abortCustomerUploadsOperation({ db, bucket }, actor, data) {
  const ref=db.doc(`customers/${data?.id}`);const snapshot=await ref.get();if(!snapshot.exists)throw new Error('Customer not found');assertBranchAccess(actor,snapshot.data().branchId);
  return { id:ref.id,deletedObjects:await deleteAbandonedManagedImages(bucket,ref.id,snapshot.data()) };
}

const CUSTOMER_STATUS_VALUES = new Set([
  'ໃໝ່',
  'ຕິດຕາມຕໍ່',
  'ດຳເນີນການແລ້ວ',
  'ຈັດສົ່ງແລ້ວ',
]);

const CUSTOMER_PROGRESS_STATUS = 'ດຳເນີນການແລ້ວ';
const SYNCABLE_ACTIVITY_STATUSES = new Set(['planned', 'confirmed']);

function activityDate(value) {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate();
  if (value instanceof Date) return value;

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isCurrentCustomerVisit(activity, customer, now) {
  if (!activity) return false;
  if (activity.customerId !== customer.id) return false;
  if (activity.type !== 'customer_visit') return false;
  if (activity.branchId !== customer.branchId) return false;
  if (activity.recordState !== 'active') return false;

  const startAt = activityDate(activity.startAt);
  const endAt = activityDate(activity.endAt);

  if (!startAt || !endAt) return false;

  return startAt.getTime() <= now.getTime()
    && now.getTime() <= endAt.getTime();
}

export async function changeCustomerStatusOperation({ db }, actor, data) {
  if (!data?.id) throw new Error('Customer id required');
  if (!CUSTOMER_STATUS_VALUES.has(data?.status)) {
    throw new Error('Invalid customer status');
  }

  const customerRef = db.doc(`customers/${data.id}`);

  return db.runTransaction(async (transaction) => {
    const customerSnapshot = await transaction.get(customerRef);

    if (!customerSnapshot.exists) {
      throw new Error('Customer not found');
    }

    const customer = {
      id: customerSnapshot.id ?? data.id,
      ...customerSnapshot.data(),
    };

    assertBranchAccess(actor, customer.branchId);

    if (customer.recordState !== 'active') {
      throw new Error('Only active customer status can be changed');
    }

    let syncedActivityId = null;

    if (data.status === CUSTOMER_PROGRESS_STATUS) {
      const relatedActivities = await transaction.get(
        db.collection('activities')
          .where('customerId', '==', data.id),
      );

      const now = new Date();

      const currentVisits = relatedActivities.docs
        .map((snapshot) => ({
          id: snapshot.id,
          ref: snapshot.ref,
          ...snapshot.data(),
        }))
        .filter((activity) => isCurrentCustomerVisit(activity, customer, now));

      const hasCurrentInProgress = currentVisits
        .some((activity) => activity.status === 'in_progress');

      const syncCandidates = currentVisits
        .filter((activity) => SYNCABLE_ACTIVITY_STATUSES.has(activity.status));

      if (!hasCurrentInProgress && syncCandidates.length === 1) {
        const activity = syncCandidates[0];

        transaction.update(activity.ref, {
          status: 'in_progress',
          updatedBy: actor.uid,
          updatedAt: FieldValue.serverTimestamp(),
        });

        syncedActivityId = activity.id;
      }
    }

    transaction.update(customerRef, {
      status: data.status,
      [`statusTimestamps.${data.status}`]: FieldValue.serverTimestamp(),
      updatedBy: actor.uid,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return {
      id: data.id,
      status: data.status,
      syncedActivityId,
    };
  });
}
