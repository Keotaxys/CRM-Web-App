import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase/config';

export async function syncLegacyCustomer(customerId, reason) {
  return (await httpsCallable(functions, 'syncLegacyCustomer')({ customerId, reason })).data;
}
