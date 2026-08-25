// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { applyMigration, MigrationClaimsError } from './apply.mjs';

function fakeServices({ users = {}, claims = {}, failClaimsFor = [] } = {}) {
  const documents = new Map(Object.entries(users).map(([uid, value]) => [`users/${uid}`, structuredClone(value)]));
  const customerDocuments = new Map();
  const claimState = new Map(Object.entries(claims).map(([uid, value]) => [uid, structuredClone(value)]));
  const claimCalls = [];
  const firestoreWrites = [];
  const db = {
    doc: (path) => ({ path }),
    batch: () => {
      const writes = [];
      return {
        set: (ref, patch) => writes.push({ ref, patch }),
        commit: async () => {
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
});
