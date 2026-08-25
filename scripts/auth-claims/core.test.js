// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import {
  AuthClaimsRestoreError,
  applyClaimsRestore,
  assertRestoreApplyGuard,
  digestClaimsPayload,
  planClaimsRestore,
  restoreAuthClaims,
  snapshotAuthClaims,
  validateClaimsArtifact,
} from './core.mjs';

const capturedAt = '2026-08-25T00:00:00.000Z';
const payload = {
  schemaVersion: 1,
  sourceProject: 'demo-project',
  capturedAt,
  users: [
    { uid: 'a', customClaims: {} },
    { uid: 'b', customClaims: { branchId: '010', role: 'staff' } },
  ],
};

function signedArtifact(value = payload) {
  return { ...structuredClone(value), digest: { algorithm: 'SHA-256', value: digestClaimsPayload(value) } };
}

describe('Auth claims snapshot', () => {
  it('serializes UID and custom claims deterministically with project metadata and no PII', async () => {
    const listUsers = vi.fn()
      .mockResolvedValueOnce({ users: [{ uid: 'b', email: 'private@example.test', customClaims: { role: 'staff', branchId: '010' } }], pageToken: 'next' })
      .mockResolvedValueOnce({ users: [{ uid: 'a', email: 'other@example.test' }], pageToken: undefined });
    const auth = new Proxy({ listUsers }, { get(target, property) { if (property !== 'listUsers') throw new Error(`snapshot attempted mutation API ${String(property)}`); return target[property]; } });

    const artifact = await snapshotAuthClaims({ auth, project: 'demo-project', now: () => new Date(capturedAt) });

    expect(artifact).toEqual({
      ...payload,
      digest: { algorithm: 'SHA-256', value: 'ba0bd66c0fa07f28e3833602236f2e7f77990e0ac0cb7a5de4649ed2b9221a78' },
    });
    expect(JSON.stringify(artifact)).not.toContain('example.test');
    expect(listUsers).toHaveBeenNthCalledWith(1, 1000, undefined);
    expect(listUsers).toHaveBeenNthCalledWith(2, 1000, 'next');
  });

  it('produces the same digest when input user and claim-key order differs', () => {
    const reordered = { ...payload, users: [{ uid: 'b', customClaims: { role: 'staff', branchId: '010' } }, { uid: 'a', customClaims: {} }] };
    expect(digestClaimsPayload(reordered)).toBe('ba0bd66c0fa07f28e3833602236f2e7f77990e0ac0cb7a5de4649ed2b9221a78');
  });
});

describe('Auth claims restore', () => {
  it('defaults to a read-only dry-run and reports the exact valid restore plan', async () => {
    const setCustomUserClaims = vi.fn();
    const auth = {
      getUser: vi.fn(async (uid) => ({ uid, customClaims: uid === 'a' ? { old: true } : { branchId: '010', role: 'staff' } })),
      setCustomUserClaims,
    };

    const result = await restoreAuthClaims({ artifact: signedArtifact(), auth, project: 'demo-project', apply: false });

    expect(result).toEqual({ mode: 'DRY_RUN', project: 'demo-project', representedUsers: 2, plannedChanges: [{ uid: 'a', before: { old: true }, after: {} }], unchangedUsers: ['b'] });
    expect(setCustomUserClaims).not.toHaveBeenCalled();
  });

  it('rejects digest mismatch, project mismatch, and malformed explicit UID records', () => {
    const badDigest = signedArtifact(); badDigest.digest.value = '0'.repeat(64);
    expect(() => validateClaimsArtifact(badDigest, 'demo-project')).toThrow(/digest/i);
    expect(() => validateClaimsArtifact(signedArtifact(), 'other-project')).toThrow(/project/i);
    const duplicate = signedArtifact({ ...payload, users: [{ uid: 'a', customClaims: {} }, { uid: 'a', customClaims: {} }] });
    expect(() => validateClaimsArtifact(duplicate, 'demo-project')).toThrow(/duplicate/i);
    const malformed = signedArtifact({ ...payload, users: [{ customClaims: {} }] });
    expect(() => validateClaimsArtifact(malformed, 'demo-project')).toThrow(/uid/i);
  });

  it('requires every apply guard and exact production environment confirmation', () => {
    const valid = { apply: true, project: 'prod-project', confirmProject: 'prod-project', input: 'claims.json' };
    expect(() => assertRestoreApplyGuard(valid, { ALLOW_PRODUCTION_MIGRATION: 'prod-project' })).not.toThrow();
    for (const invalid of [
      { ...valid, apply: false },
      { ...valid, project: '' },
      { ...valid, confirmProject: 'wrong' },
      { ...valid, input: '' },
    ]) expect(() => assertRestoreApplyGuard(invalid, { ALLOW_PRODUCTION_MIGRATION: 'prod-project' })).toThrow(/blocked/i);
    expect(() => assertRestoreApplyGuard(valid, { ALLOW_PRODUCTION_MIGRATION: 'wrong' })).toThrow(/blocked/i);
  });

  it('applies only explicit changed UID records and replaces claims with the artifact value', async () => {
    const auth = {
      getUser: vi.fn(async (uid) => ({ uid, customClaims: uid === 'a' ? { old: true } : { branchId: '010', role: 'staff' } })),
      setCustomUserClaims: vi.fn(async () => undefined),
    };
    const plan = await planClaimsRestore(validateClaimsArtifact(signedArtifact(), 'demo-project'), auth);

    const result = await applyClaimsRestore(plan, auth);

    expect(result).toEqual({ attempted: 1, succeeded: ['a'], failed: [] });
    expect(auth.setCustomUserClaims).toHaveBeenCalledExactlyOnceWith('a', {});
  });

  it('reports every completed and failed UID when an apply partially fails', async () => {
    const plan = { changes: [{ uid: 'a', before: {}, after: { role: 'staff' } }, { uid: 'b', before: {}, after: { role: 'staff' } }], unchanged: [] };
    const auth = { setCustomUserClaims: vi.fn(async (uid) => { if (uid === 'a') throw new Error('denied'); }) };

    let failure;
    try { await applyClaimsRestore(plan, auth); } catch (error) { failure = error; }

    expect(failure).toBeInstanceOf(AuthClaimsRestoreError);
    expect(failure.details).toEqual({ attempted: 2, succeeded: ['b'], failed: [{ uid: 'a', error: 'denied', retryStatus: 'required' }] });
    expect(auth.setCustomUserClaims).toHaveBeenCalledTimes(2);
  });
});
