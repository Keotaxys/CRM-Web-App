import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';

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
  await setDoc(doc(context.firestore(), 'salesProducts/bcel'), { name: 'BCEL One', active: true, sortOrder: 10 });
  await setDoc(doc(context.firestore(), 'dailySales/2026-09-11_staff-a'), { dateKey: '2026-09-11', staffUid: 'staff-a', branchId: '010', items: [], totalQuantity: 0 });
  await setDoc(doc(context.firestore(), 'dailySales/2026-09-11_staff-b'), { dateKey: '2026-09-11', staffUid: 'staff-b', branchId: '019', items: [], totalQuantity: 0 });
  await setDoc(doc(context.firestore(), 'dailySales/2026-09-11_staff-a/revisions/change-1'), { changedBy: 'manager-a', changedAt: new Date() });
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
    const withoutBirthDate = customerCreate('staff-a');
    delete withoutBirthDate.birthDate;
    await assertSucceeds(setDoc(doc(actor('staff-a', 'staff', '010'), 'customers/legacy-client'), withoutBirthDate));
    await assertFails(setDoc(doc(actor('staff-a', 'staff', '010'), 'customers/forged'), { ...customerCreate('staff-a'), createdBy: 'someone-else' }));
    await assertFails(setDoc(doc(actor('admin', 'admin', null), 'customers/unknown-branch'), customerCreate('admin', '999')));
    await assertFails(setDoc(doc(actor('admin', 'admin', null), 'customers/extra-field'), { ...customerCreate('admin'), isAdmin: true }));
    await assertFails(setDoc(doc(actor('staff-a', 'staff', '010'), 'customers/bad-image-path'), { ...customerCreate('staff-a'), imageStoragePath: 'customers/a/customer-photo' }));
    await assertFails(setDoc(doc(actor('staff-a', 'staff', '010'), 'customers/forged-greeting'), { ...customerCreate('staff-a'), birthdayGreeting: { occurrenceYear: 2026 } }));
  });
  it('allows own-branch birth-date edits while rejecting malformed, cross-branch, and greeting writes', async () => {
    await assertSucceeds(updateDoc(doc(actor('staff-a', 'staff', '010'), 'customers/a'), { birthDate: '15-09-1990', updatedBy: 'staff-a', updatedAt: serverTimestamp() }));
    await assertSucceeds(updateDoc(doc(actor('staff-a', 'staff', '010'), 'customers/a'), { birthDate: null, updatedBy: 'staff-a', updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(actor('staff-a', 'staff', '010'), 'customers/a'), { birthDate: '1990-09-15', updatedBy: 'staff-a', updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(actor('staff-a', 'staff', '010'), 'customers/a'), { birthDate: '1-09-1990', updatedBy: 'staff-a', updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(actor('staff-a', 'staff', '010'), 'customers/a'), { birthDate: 'not-a-date', updatedBy: 'staff-a', updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(actor('staff-b', 'staff', '019'), 'customers/a'), { birthDate: '15-09-1990', updatedBy: 'staff-b', updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(actor('staff-a', 'staff', '010'), 'customers/a'), { birthdayGreeting: { occurrenceYear: 2026, acknowledgedBy: 'staff-a' }, updatedBy: 'staff-a', updatedAt: serverTimestamp() }));
  });
  it('makes activities readable by branch and server-write-only', async () => {
    await assertSucceeds(getDoc(doc(actor('staff-a', 'staff', '010'), 'activities/a')));
    await assertFails(getDoc(doc(actor('staff-b', 'staff', '019'), 'activities/a')));
    await assertFails(updateDoc(doc(actor('staff-a', 'staff', '010'), 'activities/a'), { status: 'completed' }));
  });
});

describe('Firestore daily sales actor matrix', () => {
  it('denies anonymous, pending, and disabled sales reads', async () => {
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'salesProducts/bcel')));
    await assertFails(getDoc(doc(actor('pending', 'staff', '010', 'pending'), 'dailySales/2026-09-11_staff-a')));
    await assertFails(getDoc(doc(actor('disabled', 'staff', '010', 'disabled'), 'dailySales/2026-09-11_staff-a')));
  });

  it('lets staff read only their own daily sales', async () => {
    const db = actor('staff-a', 'staff', '010');
    await assertSucceeds(getDoc(doc(db, 'dailySales/2026-09-11_staff-a')));
    await assertFails(getDoc(doc(db, 'dailySales/2026-09-11_staff-b')));
  });

  it('lets branch managers read their branch and their own record only', async () => {
    const managerA = actor('manager-a', 'branch_manager', '010');
    const managerB = actor('manager-b', 'branch_manager', '019');
    await assertSucceeds(getDoc(doc(managerA, 'dailySales/2026-09-11_staff-a')));
    await assertFails(getDoc(doc(managerB, 'dailySales/2026-09-11_staff-a')));
  });

  it('lets admins read daily sales from every branch', async () => {
    const db = actor('admin', 'admin', null);
    await assertSucceeds(getDoc(doc(db, 'dailySales/2026-09-11_staff-a')));
    await assertSucceeds(getDoc(doc(db, 'dailySales/2026-09-11_staff-b')));
  });

  it('applies parent sales scope to revision reads', async () => {
    const revisionPath = 'dailySales/2026-09-11_staff-a/revisions/change-1';
    await assertSucceeds(getDoc(doc(actor('staff-a', 'staff', '010'), revisionPath)));
    await assertSucceeds(getDoc(doc(actor('manager-a', 'branch_manager', '010'), revisionPath)));
    await assertFails(getDoc(doc(actor('staff-b', 'staff', '019'), revisionPath)));
    await assertFails(getDoc(doc(actor('manager-b', 'branch_manager', '019'), revisionPath)));
    await assertSucceeds(getDoc(doc(actor('admin', 'admin', null), revisionPath)));
  });

  it('lets every approved actor read products', async () => {
    await assertSucceeds(getDoc(doc(actor('staff-a', 'staff', '010'), 'salesProducts/bcel')));
    await assertSucceeds(getDoc(doc(actor('manager-a', 'branch_manager', '010'), 'salesProducts/bcel')));
    await assertSucceeds(getDoc(doc(actor('admin', 'admin', null), 'salesProducts/bcel')));
  });

  it('requires staff queries to prove ownership and denies same-branch team queries', async () => {
    const staffDb = actor('staff-a', 'staff', '010');
    const staffQuery = query(collection(staffDb, 'dailySales'), where('staffUid', '==', 'staff-a'), where('dateKey', '>=', '2026-09-01'), where('dateKey', '<=', '2026-09-30'), orderBy('dateKey', 'desc'));
    await assertSucceeds(getDocs(staffQuery));
    await assertFails(getDocs(query(collection(staffDb, 'dailySales'), where('branchId', '==', '010'))));
  });

  it('supports branch-scoped manager queries and unrestricted admin date queries', async () => {
    const managerDb = actor('manager-a', 'branch_manager', '010');
    const managerQuery = query(collection(managerDb, 'dailySales'), where('branchId', '==', '010'), where('dateKey', '>=', '2026-09-01'), where('dateKey', '<=', '2026-09-30'), orderBy('dateKey', 'desc'));
    await assertSucceeds(getDocs(managerQuery));
    await assertFails(getDocs(query(collection(managerDb, 'dailySales'), where('branchId', '==', '019'))));

    const adminDb = actor('admin', 'admin', null);
    const adminQuery = query(collection(adminDb, 'dailySales'), where('dateKey', '>=', '2026-09-01'), where('dateKey', '<=', '2026-09-30'), orderBy('dateKey', 'desc'));
    await assertSucceeds(getDocs(adminQuery));
  });

  it('denies all direct sales catalog, daily record, and revision writes', async () => {
    const db = actor('admin', 'admin', null);
    await assertFails(setDoc(doc(db, 'salesProducts/ibank'), { name: 'iBank', active: true, sortOrder: 20 }));
    await assertFails(updateDoc(doc(db, 'salesProducts/bcel'), { name: 'Renamed' }));
    await assertFails(deleteDoc(doc(db, 'salesProducts/bcel')));

    await assertFails(setDoc(doc(db, 'dailySales/new'), { dateKey: '2026-09-12', staffUid: 'admin', branchId: null, items: [], totalQuantity: 0 }));
    await assertFails(updateDoc(doc(db, 'dailySales/2026-09-11_staff-a'), { totalQuantity: 1 }));
    await assertFails(deleteDoc(doc(db, 'dailySales/2026-09-11_staff-a')));

    await assertFails(setDoc(doc(db, 'dailySales/2026-09-11_staff-a/revisions/change-2'), { changedBy: 'admin', changedAt: new Date() }));
    await assertFails(updateDoc(doc(db, 'dailySales/2026-09-11_staff-a/revisions/change-1'), { changedBy: 'admin' }));
    await assertFails(deleteDoc(doc(db, 'dailySales/2026-09-11_staff-a/revisions/change-1')));
  });
});
