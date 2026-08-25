import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

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
  it('prevents self-promotion and self-branch changes', async () => {
    const db = actor('staff-a', 'staff', '010');
    await assertSucceeds(updateDoc(doc(db, 'users/staff-a'), { name: 'Updated' }));
    await assertFails(updateDoc(doc(db, 'users/staff-a'), { role: 'admin' }));
    await assertFails(updateDoc(doc(db, 'users/staff-a'), { branchId: '019' }));
    await assertFails(updateDoc(doc(db, 'users/staff-a'), { accountStatus: 'approved' }));
  });
  it('allows branch customer editing but keeps trash role-separated', async () => {
    await assertSucceeds(updateDoc(doc(actor('staff-a', 'staff', '010'), 'customers/a'), { note: 'Own branch' }));
    await assertFails(updateDoc(doc(actor('staff-a', 'staff', '010'), 'customers/a'), { recordState: 'trashed' }));
    await assertSucceeds(updateDoc(doc(actor('manager-a', 'branch_manager', '010'), 'customers/a'), { recordState: 'trashed', deletedBy: 'manager-a', deletedAt: new Date(), purgeAfter: new Date(Date.now() + 30 * 86_400_000) }));
  });
  it('makes activities readable by branch and server-write-only', async () => {
    await assertSucceeds(getDoc(doc(actor('staff-a', 'staff', '010'), 'activities/a')));
    await assertFails(getDoc(doc(actor('staff-b', 'staff', '019'), 'activities/a')));
    await assertFails(updateDoc(doc(actor('staff-a', 'staff', '010'), 'activities/a'), { status: 'completed' }));
  });
});
