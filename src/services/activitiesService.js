import { collection, doc, getDoc, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../firebase/config';
import { normalizeActivity } from '../activities/activityModel';
import { activityQueryScope } from './queryScope';

const call = (name) => httpsCallable(functions, name);

function actor(identity) {
  return { role: identity.claims.role, branchId: identity.claims.branchId };
}

export function subscribeActivities(identity, onData, onError, options = {}) {
  const scope = activityQueryScope(actor(identity));
  const constraints = [];
  if (!scope.allBranches) constraints.push(where('branchId', '==', scope.branchId));
  if (options.customerId) constraints.push(where('customerId', '==', options.customerId));
  constraints.push(orderBy('startAt', 'desc'));
  return onSnapshot(query(collection(db, 'activities'), ...constraints), (snapshot) => {
    onData(snapshot.docs.map((item) => normalizeActivity({ id: item.id, ...item.data() })).filter((item) => item.recordState !== 'trashed'));
  }, onError);
}

export async function getActivity(id) {
  const snapshot = await getDoc(doc(db, 'activities', id));
  return snapshot.exists() ? normalizeActivity({ id: snapshot.id, ...snapshot.data() }) : null;
}

export async function saveActivity(values, id = null) {
  const result = await call('upsertActivity')({ id, values });
  return result.data;
}
export async function cancelActivity(id) { return (await call('upsertActivity')({ id, values: { status: 'cancelled' } })).data; }
export async function trashActivity(id) { return (await call('trashActivity')({ id })).data; }
export async function completeFollowUp(id, next = null) { return (await call('completeFollowUp')({ id, next })).data; }
