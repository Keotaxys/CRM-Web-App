// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { applyMigration, migrationFailureReport, MigrationClaimsError } from './apply.mjs';

function fakeServices({ users = {}, claims = {}, failClaimsFor = [], failBatchNumbers = [] } = {}) {
  const documents = new Map(Object.entries(users).map(([uid, value]) => [`users/${uid}`, structuredClone(value)]));
  const customerDocuments = new Map();
  const claimState = new Map(Object.entries(claims).map(([uid, value]) => [uid, structuredClone(value)]));
  const claimCalls = [];
  const firestoreWrites = [];
  const batchFailures = new Set(failBatchNumbers);
  let batchNumber = 0;
  const db = {
    doc: (path) => ({ path }),
    batch: () => {
      const writes = [];
      return {
        set: (ref, patch) => writes.push({ ref, patch }),
        commit: async () => {
          batchNumber += 1;
          if (batchFailures.delete(batchNumber)) throw new Error('simulated batch failure');
          for (const { ref, patch } of writes) {
            firestoreWrites.push({ path: ref.path, patch: structuredClone(patch) });
            const target = ref.path.startsWith('users/') ? documents : customerDocuments;
            target.set(ref.path, { ...(target.get(ref.path) ?? {}), ...structuredClone(patch) });
          }
        },
      };
    },
  };
  const auth = {
    getUser: vi.fn(async (uid) => ({ uid, customClaims: claimState.get(uid) ?? {} })),
    setCustomUserClaims: vi.fn(async (uid, value) => {
      claimCalls.push({ uid, value: structuredClone(value) });
      if (failClaimsFor.includes(uid)) throw new Error('simulated claim failure');
      claimState.set(uid, structuredClone(value));
    }),
  };
  return {
    services: { db, auth, FieldValue: { serverTimestamp: () => 'SERVER_TIMESTAMP' } },
    documents,
    customerDocuments,
    claimState,
    claimCalls,
    firestoreWrites,
  };
}

describe('migration apply recovery', () => {
  it('records durable remediation evidence when a claim update fails after the profile write', async () => {
    const fake = fakeServices({ users: { u1: { branch: '020 - ສາຂາ ຄຳມ່ວນ' } }, failClaimsFor: ['u1'] });
    const writeRecoveryArtifact = vi.fn(async (artifact) => ({ path: 'private/recovery.json', artifact }));
    const snapshot = { customers: [], users: [{ uid: 'u1', branch: '020 - ສາຂາ ຄຳມ່ວນ' }], authUsers: [{ uid: 'u1' }] };

    let failure;
    try {
      await applyMigration(snapshot, fake.services, { writeRecoveryArtifact });
    } catch (error) {
      failure = error;
    }

    expect(failure).toBeInstanceOf(MigrationClaimsError);
    expect(fake.documents.get('users/u1')).toMatchObject({ role: 'staff', branchId: '020', accountStatus: 'approved' });
    expect(writeRecoveryArtifact).toHaveBeenCalledOnce();
    const artifact = writeRecoveryArtifact.mock.calls[0][0];
    expect(artifact.failures).toEqual([{
      uid: 'u1',
      intendedAccess: { role: 'staff', branchId: '020', accountStatus: 'approved' },
      firestoreProfileWrite: 'succeeded',
      authClaimUpdate: 'failed',
      retryStatus: 'required',
      error: 'simulated claim failure',
    }]);
    expect(JSON.stringify(artifact)).not.toContain('email');
    expect(migrationFailureReport(failure, 'demo-project')).toMatchObject({
      mode: 'APPLY_PARTIAL_FAILURE',
      project: 'demo-project',
      stage: 'auth_claims',
      failed: 1,
      recoveryPath: 'private/recovery.json',
    });
  });

  it('safely repairs claims on rerun without another profile write or duplicate user data', async () => {
    const fake = fakeServices({ users: { u1: { branch: '020 - ສາຂາ ຄຳມ່ວນ', role: 'staff', branchId: '020', accountStatus: 'approved' } }, claims: { u1: { featureFlag: true } } });
    const snapshot = { customers: [], users: [{ uid: 'u1', branch: '020 - ສາຂາ ຄຳມ່ວນ', role: 'staff', branchId: '020', accountStatus: 'approved' }], authUsers: [{ uid: 'u1' }] };

    const result = await applyMigration(snapshot, fake.services);

    expect(result).toMatchObject({ firestoreWrites: 0, claimUpdates: 1, pendingProfilesCreated: 0 });
    expect(fake.firestoreWrites).toHaveLength(0);
    expect(fake.claimState.get('u1')).toEqual({ featureFlag: true, role: 'staff', branchId: '020', accountStatus: 'approved' });
    expect([...fake.documents.keys()]).toEqual(['users/u1']);
  });

  it('creates an Auth-only Pending profile once and remains clean on rerun', async () => {
    const fake = fakeServices();
    const firstSnapshot = { customers: [], users: [], authUsers: [{ uid: 'auth-only', email: 'hidden@example.test', photoURL: '' }] };
    const first = await applyMigration(firstSnapshot, fake.services);
    const pending = fake.documents.get('users/auth-only');
    const secondSnapshot = { customers: [], users: [{ uid: 'auth-only', ...pending }], authUsers: [{ uid: 'auth-only' }] };
    const second = await applyMigration(secondSnapshot, fake.services);

    expect(first).toMatchObject({ firestoreWrites: 1, pendingProfilesCreated: 1 });
    expect(second).toMatchObject({ firestoreWrites: 0, pendingProfilesCreated: 0, claimUpdates: 1 });
    expect([...fake.documents.keys()]).toEqual(['users/auth-only']);
    expect(fake.claimState.get('auth-only')).toEqual({ role: null, branchId: null, accountStatus: 'pending' });
  });

  it('fails closed before any write or claim update for an invalid access state', async () => {
    const fake = fakeServices({ users: { u1: { role: 'admin', branchId: '010', accountStatus: 'approved' } } });
    const snapshot = { customers: [], users: [{ uid: 'u1', role: 'admin', branchId: '010', accountStatus: 'approved' }], authUsers: [{ uid: 'u1' }] };

    await expect(applyMigration(snapshot, fake.services)).rejects.toThrow(/conflict/i);
    expect(fake.firestoreWrites).toHaveLength(0);
    expect(fake.services.auth.setCustomUserClaims).not.toHaveBeenCalled();
  });

  it('records later-batch failure evidence and safely completes on rerun', async () => {
    const fake = fakeServices({ failBatchNumbers: [2] });
    const customers = Array.from({ length: 401 }, (_, index) => ({ id: `c${index}`, branch: '020 - ສາຂາ ຄຳມ່ວນ' }));
    const writeRecoveryArtifact = vi.fn(async (artifact) => ({ path: 'private/firestore-recovery.json', artifact }));

    let failure;
    try { await applyMigration({ customers, users: [], authUsers: [] }, fake.services, { project: 'demo-project', writeRecoveryArtifact }); }
    catch (error) { failure = error; }

    expect(failure).toBeInstanceOf(MigrationClaimsError);
    expect(fake.customerDocuments.size).toBe(400);
    expect(writeRecoveryArtifact).toHaveBeenCalledOnce();
    expect(writeRecoveryArtifact.mock.calls[0][0]).toMatchObject({
      stage: 'firestore_batch',
      sourceProject: 'demo-project',
      committedBatchCount: 1,
      failedBatch: { number: 2, retryStatus: 'rerun_required' },
    });
    expect(writeRecoveryArtifact.mock.calls[0][0].committedDocumentPaths).toHaveLength(400);

    const rerunCustomers = customers.map((customer) => ({ ...customer, ...(fake.customerDocuments.get(`customers/${customer.id}`) ?? {}) }));
    const result = await applyMigration({ customers: rerunCustomers, users: [], authUsers: [] }, fake.services, { project: 'demo-project', writeRecoveryArtifact });

    expect(result.firestoreWrites).toBe(1);
    expect(fake.customerDocuments.size).toBe(401);
  });

  it('preserves structured manual evidence when recovery artifact persistence fails', async () => {
    const fake = fakeServices({ users: { u1: { branch: '020 - ສາຂາ ຄຳມ່ວນ' } }, failClaimsFor: ['u1'] });
    const snapshot = { customers: [], users: [{ uid: 'u1', branch: '020 - ສາຂາ ຄຳມ່ວນ' }], authUsers: [{ uid: 'u1' }] };

    let failure;
    try { await applyMigration(snapshot, fake.services, { project: 'demo-project', writeRecoveryArtifact: vi.fn(async () => { throw new Error('disk full'); }) }); }
    catch (error) { failure = error; }

    expect(failure).toBeInstanceOf(MigrationClaimsError);
    expect(failure.details.recovery).toEqual({ status: 'write_failed', error: 'disk full' });
    expect(failure.details.failureSummary).toMatchObject({ stage: 'auth_claims', failedCount: 1, retryStatus: 'rerun_required' });
    expect(migrationFailureReport(failure, 'demo-project')).toMatchObject({
      mode: 'APPLY_PARTIAL_FAILURE',
      project: 'demo-project',
      stage: 'auth_claims',
      failed: 1,
      recoveryWriteFailed: true,
      retryIdentifiers: ['u1'],
    });
  });
});
