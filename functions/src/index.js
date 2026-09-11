import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { setGlobalOptions } from 'firebase-functions/v2';
import { actorFromRequest, assertAdmin, profileMatchesActor } from './authz.js';
import { approveUserOperation, disableUserOperation, reactivateUserOperation, updateUserAccessOperation } from './userAdmin.js';
import { cleanupExpiredActivities, completeFollowUpOperation, permanentlyDeleteActivityOperation, restoreActivityOperation, trashActivityOperation, upsertActivityOperation } from './activityAdmin.js';
import { abortCustomerUploadsOperation, acknowledgeBirthdayGreetingOperation, archiveCustomerOperation, changeCustomerStatusOperation, cleanupExpiredCustomers, permanentlyDeleteCustomerOperation, restoreCustomerOperation, rollbackCustomerCreateOperation, transferCustomerOperation, trashCustomerOperation } from './customerAdmin.js';
import { syncLegacyCustomerOperation } from './legacyWebhook.js';
import { amendDailySalesOperation, createSalesProductOperation, saveDailySalesOperation, updateSalesProductOperation } from './salesAdmin.js';
import { SalesOperationError } from './salesDomain.js';

initializeApp();
setGlobalOptions({ region: 'asia-southeast1', maxInstances: 10 });
const services = { db: getFirestore(), auth: getAuth(), get bucket() { return getStorage().bucket(); } };
const legacyWebhookUrl = defineSecret('LEGACY_WEBHOOK_URL');
const CALLABLE_ERROR_CODES = new Set([
  'already-exists',
  'failed-precondition',
  'internal',
  'invalid-argument',
  'not-found',
  'permission-denied',
  'unauthenticated',
]);

function callable(operation, options = {}) {
  return onCall(options, async (request) => {
    try {
      const actor = actorFromRequest(request);
      const profile = await services.db.doc(`users/${actor.uid}`).get();
      if (!profile.exists || !profileMatchesActor(actor, profile.data())) throw new Error('Approved account profile does not match access claims');
      return await operation(services, actor, request.data ?? {});
    }
    catch (error) {
      console.error('Callable rejected', { operation: operation.name, message: error.message });
      if (error instanceof SalesOperationError && CALLABLE_ERROR_CODES.has(error.code)) {
        throw new HttpsError(error.code, error.message);
      }
      if (/Authenticated/.test(error.message)) throw new HttpsError('unauthenticated', error.message);
      if (/permission|denied|Admin|Cross-branch|Approved/.test(error.message)) throw new HttpsError('permission-denied', error.message);
      throw new HttpsError('failed-precondition', error.message);
    }
  });
}

export const approveUser = callable(approveUserOperation);
export const updateUserAccess = callable(updateUserAccessOperation);
export const disableUser = callable(disableUserOperation);
export const reactivateUser = callable(reactivateUserOperation);
export const upsertActivity = callable(upsertActivityOperation);
export const trashActivity = callable(trashActivityOperation);
export const completeFollowUp = callable(completeFollowUpOperation);
export const restoreActivity = callable(restoreActivityOperation);
export const permanentlyDeleteActivity = callable(permanentlyDeleteActivityOperation);
export const trashCustomer = callable(trashCustomerOperation);
export const archiveCustomer = callable(archiveCustomerOperation);
export const changeCustomerStatus = callable(changeCustomerStatusOperation);
export const acknowledgeBirthdayGreeting = callable(acknowledgeBirthdayGreetingOperation);
export const abortCustomerUploads = callable(abortCustomerUploadsOperation);
export const rollbackCustomerCreate = callable(rollbackCustomerCreateOperation);
export const transferCustomer = callable(transferCustomerOperation);
export const restoreCustomer = callable(restoreCustomerOperation);
export const permanentlyDeleteCustomer = callable(permanentlyDeleteCustomerOperation);
export const createSalesProduct = callable(createSalesProductOperation);
export const updateSalesProduct = callable(updateSalesProductOperation);
export const saveDailySales = callable(saveDailySalesOperation);
export const amendDailySales = callable(amendDailySalesOperation);

export const cleanupExpiredTrash = callable(async (currentServices, actor) => {
  assertAdmin(actor); const now = new Date();
  const [customers, activities] = await Promise.all([cleanupExpiredCustomers(currentServices, actor, now), cleanupExpiredActivities(currentServices.db, now)]);
  return { customers, activities, retentionDays: 30 };
});

export const syncLegacyCustomer = callable((currentServices, actor, data) => syncLegacyCustomerOperation(currentServices, actor, data, legacyWebhookUrl.value()), { secrets: [legacyWebhookUrl] });
