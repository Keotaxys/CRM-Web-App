import { collection, doc, getDoc, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db } from '../firebase/config';
import { functions } from '../firebase/config';
import { customerCreatePayload, customerUpdatePayload, normalizeCustomer } from '../customers/customerModel';
import { customerQueryScope } from './queryScope';

function actorFromIdentity(identity) {
  return {
    uid: identity.user.uid,
    role: identity.claims.role,
    branchId: identity.claims.branchId,
    accountStatus: identity.claims.accountStatus,
  };
}

export function subscribeCustomers(identity, onData, onError, options = {}) {
  const actor = actorFromIdentity(identity);
  const scope = customerQueryScope(actor);
  const constraints = [];
  if (!scope.allBranches) constraints.push(where('branchId', '==', scope.branchId));
  return onSnapshot(query(collection(db, 'customers'), ...constraints), (snapshot) => {
    const customers = snapshot.docs
      .map((item) => normalizeCustomer({ id: item.id, ...item.data() }))
      .filter((item) => options.includeArchived ? item.recordState !== 'trashed' : item.recordState === 'active')
      .sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
    onData(customers);
  }, onError);
}

export async function getCustomer(id) {
  const snapshot = await getDoc(doc(db, 'customers', id));
  return snapshot.exists() ? normalizeCustomer({ id: snapshot.id, ...snapshot.data() }) : null;
}

export async function createCustomer(values, identity) {
  const actor = actorFromIdentity(identity);
  if (actor.role === 'admin') actor.branchId = values.branchId;
  const customerRef = doc(collection(db, 'customers'));
  await setDoc(customerRef, customerCreatePayload(values, actor, serverTimestamp()));
  return customerRef.id;
}

export function updateCustomer(id, values, identity) {
  return updateDoc(doc(db, 'customers', id), customerUpdatePayload(values, actorFromIdentity(identity), serverTimestamp()));
}

export function archiveCustomer(id) {
  return httpsCallable(functions, 'archiveCustomer')({ id });
}

export function abortCustomerUploads(id) {
  return httpsCallable(functions, 'abortCustomerUploads')({ id });
}

export function changeCustomerStatus(id, status, identity) {
  const actor = actorFromIdentity(identity);
  return updateDoc(doc(db, 'customers', id), {
    status,
    [`statusTimestamps.${status}`]: serverTimestamp(),
    updatedBy: actor.uid,
    updatedAt: serverTimestamp(),
  });
}
