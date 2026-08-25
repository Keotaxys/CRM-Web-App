import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase/config';

export function subscribeAssignableUsers(identity, onData, onError) {
  const constraints = [where('accountStatus', '==', 'approved')];
  if (identity.claims.role !== 'admin') constraints.push(where('branchId', '==', identity.claims.branchId));
  return onSnapshot(query(collection(db, 'users'), ...constraints), (snapshot) => onData(snapshot.docs.map((item) => ({ uid: item.id, ...item.data() }))), onError);
}
