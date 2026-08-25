import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { personalProfilePayload } from '../auth/authModel';

export function updatePersonalProfile(uid, values) {
  return updateDoc(doc(db, 'users', uid), personalProfilePayload(values, serverTimestamp()));
}
