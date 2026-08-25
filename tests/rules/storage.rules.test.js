import { afterAll, beforeAll, describe, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, setDoc } from 'firebase/firestore';
import { deleteObject, getBytes, ref, uploadBytes } from 'firebase/storage';

let env;
const authStorage = (uid, role, branchId, accountStatus = 'approved') => env.authenticatedContext(uid, { role, branchId, accountStatus }).storage();
const anonymousStorage = () => env.unauthenticatedContext().storage();
beforeAll(async () => { env = await initializeTestEnvironment({ projectId: 'demo-crm-rules', firestore: { rules: readFileSync('firestore.rules', 'utf8') }, storage: { rules: readFileSync('storage.rules', 'utf8') } }); await env.withSecurityRulesDisabled(async (context) => {
  await setDoc(doc(context.firestore(), 'customers/a'), { branchId: '010' });
  await setDoc(doc(context.firestore(), 'users/a'), { branchId: '010', role: 'staff', accountStatus: 'approved' });
  await setDoc(doc(context.firestore(), 'users/b'), { branchId: '019', role: 'staff', accountStatus: 'approved' });
  await setDoc(doc(context.firestore(), 'users/p'), { branchId: '010', role: 'staff', accountStatus: 'pending' });
  await setDoc(doc(context.firestore(), 'users/d'), { branchId: '010', role: 'staff', accountStatus: 'disabled' });
  await uploadBytes(ref(context.storage(), 'customers/a/customer-photo'), new Uint8Array([1,2,3]), { contentType: 'image/jpeg' });
  await uploadBytes(ref(context.storage(), 'customers/legacy.jpg'), new Uint8Array([1,2,3]), { contentType: 'image/jpeg' });
}); });
afterAll(async () => env?.cleanup());

describe('Storage branch and file policy', () => {
  it('denies anonymous managed-image access', async () => {
    await assertFails(getBytes(ref(anonymousStorage(), 'customers/a/customer-photo')));
  });
  it('denies disabled-user managed-image access', async () => {
    await assertFails(getBytes(ref(authStorage('d','staff','010','disabled'), 'customers/a/customer-photo')));
  });
  it('isolates customer images by account and branch', async () => {
    await assertSucceeds(getBytes(ref(authStorage('a','staff','010'), 'customers/a/customer-photo')));
    await assertFails(getBytes(ref(authStorage('b','staff','019'), 'customers/a/customer-photo')));
    await assertFails(getBytes(ref(authStorage('p','staff','010','pending'), 'customers/a/customer-photo')));
    await assertFails(getBytes(ref(authStorage('a','staff','019'), 'customers/a/customer-photo')));
  });
  it('accepts only two managed image slots, image MIME, and <=1MB', async () => {
    const storage = authStorage('a','staff','010');
    await assertSucceeds(uploadBytes(ref(storage, 'customers/a/place-photo'), new Uint8Array([1]), { contentType: 'image/webp' }));
    await assertFails(uploadBytes(ref(storage, 'customers/a/gallery-photo'), new Uint8Array([1]), { contentType: 'image/jpeg' }));
    await assertFails(uploadBytes(ref(storage, 'customers/a/place-photo'), new Uint8Array([1]), { contentType: 'text/plain' }));
    await assertFails(uploadBytes(ref(storage, 'customers/a/place-photo'), new Uint8Array(1_000_001), { contentType: 'image/jpeg' }));
  });
  it('allows avatar writes only to the owner', async () => {
    await assertSucceeds(uploadBytes(ref(authStorage('a','staff','010'), 'profiles/a/avatar'), new Uint8Array([1]), { contentType: 'image/png' }));
    await assertFails(uploadBytes(ref(authStorage('b','staff','010'), 'profiles/a/avatar'), new Uint8Array([1]), { contentType: 'image/png' }));
    await assertFails(deleteObject(ref(authStorage('b','staff','019'), 'profiles/a/avatar')));
    await assertSucceeds(deleteObject(ref(authStorage('a','staff','010'), 'profiles/a/avatar')));
  });
  it('keeps managed customer deletion trusted-only', async () => {
    await assertFails(deleteObject(ref(authStorage('a','staff','010'), 'customers/a/customer-photo')));
  });
  it('retains the documented approved-user legacy compatibility read only', async () => {
    await assertSucceeds(getBytes(ref(authStorage('b','staff','019'), 'customers/legacy.jpg')));
    await assertFails(getBytes(ref(authStorage('p','staff','010','pending'), 'customers/legacy.jpg')));
    await assertFails(uploadBytes(ref(authStorage('a','staff','010'), 'customers/new-legacy.jpg'), new Uint8Array([1]), { contentType: 'image/jpeg' }));
  });
});
