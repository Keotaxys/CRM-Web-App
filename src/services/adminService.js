import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../firebase/config';

const invoke = async (name, payload) => (await httpsCallable(functions, name)(payload)).data;

export const approveUser = (uid, role, branchId) => invoke('approveUser', { uid, role, branchId });
export const updateUserAccess = (uid, role, branchId) => invoke('updateUserAccess', { uid, role, branchId });
export const disableUser = (uid) => invoke('disableUser', { uid });
export const transferCustomer = (id, branchId) => invoke('transferCustomer', { id, branchId });
export const trashCustomer = (id) => invoke('trashCustomer', { id });
export const restoreCustomer = (id) => invoke('restoreCustomer', { id });
export const permanentlyDeleteCustomer = (id) => invoke('permanentlyDeleteCustomer', { id });
export const restoreActivity = (id) => invoke('restoreActivity', { id });
export const permanentlyDeleteActivity = (id) => invoke('permanentlyDeleteActivity', { id });

export function subscribeUsers(onData, onError, accountStatus = null) {
  const constraints = accountStatus ? [where('accountStatus', '==', accountStatus)] : [];
  return onSnapshot(query(collection(db, 'users'), ...constraints), (snapshot) => onData(snapshot.docs.map((item) => ({ uid: item.id, ...item.data() }))), onError);
}

export function subscribeTrash(collectionName, onData, onError) {
  return onSnapshot(query(collection(db, collectionName), where('recordState', '==', 'trashed'), orderBy('deletedAt', 'desc')), (snapshot) => {
    onData(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
  }, onError);
}
