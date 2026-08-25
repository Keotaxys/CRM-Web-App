// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { digestClaimsPayload } from '../auth-claims/core.mjs';
import { assertMigrationApplyGuard } from './applyGuard.mjs';

function claimsArtifact(project = 'demo-project') {
  const payload = { schemaVersion: 1, sourceProject: project, capturedAt: '2026-08-25T00:00:00.000Z', users: [{ uid: 'u1', customClaims: {} }] };
  return { ...payload, digest: { algorithm: 'SHA-256', value: digestClaimsPayload(payload) } };
}

describe('migration apply guard', () => {
  it('binds apply to the validated pre-apply claims snapshot digest', () => {
    const artifact = claimsArtifact();
    const args = {
      apply: true,
      project: 'demo-project',
      confirmProject: 'demo-project',
      claimsSnapshot: 'claims.json',
      confirmClaimsDigest: artifact.digest.value,
    };
    expect(assertMigrationApplyGuard(args, { ALLOW_PRODUCTION_MIGRATION: 'demo-project' }, artifact)).toEqual({ claimsSnapshotDigest: artifact.digest.value });
    for (const invalid of [
      { ...args, apply: false },
      { ...args, confirmProject: 'wrong' },
      { ...args, claimsSnapshot: '' },
      { ...args, confirmClaimsDigest: 'f'.repeat(64) },
    ]) expect(() => assertMigrationApplyGuard(invalid, { ALLOW_PRODUCTION_MIGRATION: 'demo-project' }, artifact)).toThrow(/blocked/i);
    expect(() => assertMigrationApplyGuard(args, { ALLOW_PRODUCTION_MIGRATION: 'wrong' }, artifact)).toThrow(/blocked/i);
  });

  it('rejects a validly signed claims snapshot from another project', () => {
    const artifact = claimsArtifact('other-project');
    expect(() => assertMigrationApplyGuard({
      apply: true,
      project: 'demo-project',
      confirmProject: 'demo-project',
      claimsSnapshot: 'claims.json',
      confirmClaimsDigest: artifact.digest.value,
    }, { ALLOW_PRODUCTION_MIGRATION: 'demo-project' }, artifact)).toThrow(/project/i);
  });
});
