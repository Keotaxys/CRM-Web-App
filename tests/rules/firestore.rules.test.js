import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';

let env;
const actor = (uid, role, branchId, accountStatus = 'approved') => env.authenticatedContext(uid, { role, branchId, accountStatus }).firestore();

beforeAll(async () => { env = await initializeTestEnvironment({ projectId: 'demo-crm-rules', firestore: { rules: readFileSync('firestore.rules', 'utf8') } }); });
beforeEach(async () => { await env.clearFirestore(); await env.withSecurityRulesDisabled(async (context) => {
  await setDoc(doc(context.firestore(), 'customers/a'), { branchId: '010', recordState: 'active', createdBy: 'seed', createdAt: new Date(), name: 'A', status: 'ໃໝ່' });
  await setDoc(doc(context.firestore(), 'customers/b'), { branchId: '019', recordState: 'active', createdBy: 'seed', createdAt: new Date(), name: 'B', status: 'ໃໝ່' });
  await setDoc(doc(context.firestore(), 'activities/a'), { branchId: '010', recordState: 'active', createdBy: 'staff-a', assignedStaffIds: ['staff-a'], type: 'appointment' });
  await setDoc(doc(context.firestore(), 'users/staff-a'), { branchId: '010', role: 'staff', accountStatus: 'approved', name: 'A' });
  await setDoc(doc(context.firestore(), 'users/staff-b'), { branchId: '019', role: 'staff', accountStatus: 'approved' });
  await setDoc(doc(context.firestore(), 'users/manager-a'), { branchId: '010', role: 'branch_manager', accountStatus: 'approved' });
  await setDoc(doc(context.firestore(), 'users/manager-b'), { branchId: '019', role: 'branch_manager', accountStatus: 'approved' });
  await setDoc(doc(context.firestore(), 'users/admin'), { branchId: null, role: 'admin', accountStatus: 'approved' });
  await setDoc(doc(context.firestore(), 'users/pending'), { branchId: '010', role: 'staff', accountStatus: 'pending' });
  await setDoc(doc(context.firestore(), 'users/disabled'), { branchId: '010', role: 'staff', accountStatus: 'disabled' });
}); });
afterAll(async () => env?.cleanup());

describe('Firestore claim and branch matrix', () => {
  const customerCreate = (uid, branchId = '010') => ({
    name: 'New', phone: '020', address: '', status: 'ໃໝ່', priority: 'ທົ່ວໄປ', branchId,
    branch: branchId, note: '', gps: '', location: null, imageUrl: '', placeImageUrl: '',
    birthDate: null,
    imageStoragePath: null, placeImageStoragePath: null, statusTimestamps: { 'ໃໝ່': serverTimestamp() },
    recordState: 'active', createdBy: uid, createdAt: serverTimestamp(), updatedBy: uid,
    updatedAt: serverTimestamp(), archivedBy: null, archivedAt: null, deletedBy: null, deletedAt: null,
  });
  it('denies logged-out, pending, and disabled CRM reads', async () => {
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'customers/a')));
    await assertFails(getDoc(doc(actor('pending', 'staff', '010', 'pending'), 'customers/a')));
    await assertFails(getDoc(doc(actor('disabled', 'staff', '010', 'disabled'), 'customers/a')));
  });
  it('isolates staff and managers by branch while admin reads all', async () => {
    await assertSucceeds(getDoc(doc(actor('staff-a', 'staff', '010'), 'customers/a')));
    await assertFails(getDoc(doc(actor('staff-a', 'staff', '010'), 'customers/b')));
    await assertFails(getDoc(doc(actor('manager-b', 'branch_manager', '019'), 'customers/a')));
    await assertSucceeds(getDoc(doc(actor('admin', 'admin', null), 'customers/a')));
    await assertSucceeds(getDoc(doc(actor('admin', 'admin', null), 'customers/b')));
  });
  it('fails closed when cached claims differ from the current profile', async () => {
    await assertFails(getDoc(doc(actor('staff-a', 'staff', '019'), 'customers/a')));
    await assertFails(getDoc(doc(actor('admin', 'staff', null), 'customers/a')));
  });
  it('prevents self-promotion and self-branch changes', async () => {
    const db = actor('staff-a', 'staff', '010');
    await assertSucceeds(updateDoc(doc(db, 'users/staff-a'), { name: 'Updated' }));
    await assertFails(updateDoc(doc(db, 'users/staff-a'), { role: 'admin' }));
    await assertFails(updateDoc(doc(db, 'users/staff-a'), { branchId: '019' }));
    await assertFails(updateDoc(doc(db, 'users/staff-a'), { accountStatus: 'disabled' }));
  });
  it('allows audited normal editing but reserves lifecycle changes for Functions', async () => {
    await assertSucceeds(updateDoc(doc(actor('staff-a', 'staff', '010'), 'customers/a'), { note: 'Own branch', updatedBy: 'staff-a', updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(actor('staff-a', 'staff', '010'), 'customers/a'), { recordState: 'trashed' }));
    await assertFails(updateDoc(doc(actor('manager-a', 'branch_manager', '010'), 'customers/a'), { recordState: 'trashed', deletedBy: 'manager-a', deletedAt: new Date(), purgeAfter: new Date(Date.now() + 30 * 86_400_000) }));
    await assertFails(updateDoc(doc(actor('admin', 'admin', null), 'customers/a'), { branchId: '019', updatedBy: 'admin', updatedAt: serverTimestamp() }));
  });
  it('requires canonical customer creation schema and server-owned audit fields', async () => {
    await assertSucceeds(setDoc(doc(actor('staff-a', 'staff', '010'), 'customers/new-a'), customerCreate('staff-a')));
    await assertSucceeds(setDoc(doc(actor('staff-a', 'staff', '010'), 'customers/with-birth-date'), { ...customerCreate('staff-a'), birthDate: '15-09-1990' }));
    await assertFails(setDoc(doc(actor('staff-a', 'staff', '010'), 'customers/forged'), { ...customerCreate('staff-a'), createdBy: 'someone-else' }));
    await assertFails(setDoc(doc(actor('admin', 'admin', null), 'customers/unknown-branch'), customerCreate('admin', '999')));
    await assertFails(setDoc(doc(actor('admin', 'admin', null), 'customers/extra-field'), { ...customerCreate('admin'), isAdmin: true }));
    await assertFails(setDoc(doc(actor('staff-a', 'staff', '010'), 'customers/bad-image-path'), { ...customerCreate('staff-a'), imageStoragePath: 'customers/a/customer-photo' }));
  });
  it('allows own-branch birth-date edits while rejecting malformed, cross-branch, and greeting writes', async () => {
    await assertSucceeds(updateDoc(doc(actor('staff-a', 'staff', '010'), 'customers/a'), { birthDate: '15-09-1990', updatedBy: 'staff-a', updatedAt: serverTimestamp() }));
    await assertSucceeds(updateDoc(doc(actor('staff-a', 'staff', '010'), 'customers/a'), { birthDate: null, updatedBy: 'staff-a', updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(actor('staff-a', 'staff', '010'), 'customers/a'), { birthDate: '1990-09-15', updatedBy: 'staff-a', updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(actor('staff-b', 'staff', '019'), 'customers/a'), { birthDate: '15-09-1990', updatedBy: 'staff-b', updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(actor('staff-a', 'staff', '010'), 'customers/a'), { birthdayGreeting: { occurrenceYear: 2026, acknowledgedBy: 'staff-a' }, updatedBy: 'staff-a', updatedAt: serverTimestamp() }));
  });
  it('makes activities readable by branch and server-write-only', async () => {
    await assertSucceeds(getDoc(doc(actor('staff-a', 'staff', '010'), 'activities/a')));
    await assertFails(getDoc(doc(actor('staff-b', 'staff', '019'), 'activities/a')));
    await assertFails(updateDoc(doc(actor('staff-a', 'staff', '010'), 'activities/a'), { status: 'completed' }));
  });
});
