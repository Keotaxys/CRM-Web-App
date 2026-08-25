// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { digestClaimsPayload } from './auth-claims/core.mjs';
import { main } from './restore-auth-claims.mjs';

function artifactFor(project = 'demo-project') {
  const payload = {
    schemaVersion: 1,
    sourceProject: project,
    capturedAt: '2026-08-25T00:00:00.000Z',
    users: [{ uid: 'u1', customClaims: { role: 'staff', branchId: '010', accountStatus: 'approved' } }],
  };
  return { ...payload, digest: { algorithm: 'SHA-256', value: digestClaimsPayload(payload) } };
}

describe('restore Auth claims CLI recovery', () => {
  it('blocks apply without the explicit production claim-change freeze confirmation', async () => {
    const artifact = artifactFor();
    const openAuth = vi.fn();

    await expect(main([
      '--apply', '--project', 'demo-project', '--confirm-project', 'demo-project',
      '--input', 'claims.json', '--confirm-digest', artifact.digest.value,
    ], { ALLOW_PRODUCTION_MIGRATION: 'demo-project' }, {
      readArtifact: vi.fn(async () => artifact),
      authForProject: openAuth,
    })).rejects.toThrow(/blocked/i);

    expect(openAuth).not.toHaveBeenCalled();
  });

  it('persists a private recovery artifact and prints only its aggregate path after partial apply failure', async () => {
    const artifact = artifactFor();
    const auth = {
      getUser: vi.fn(async (uid) => ({ uid, customClaims: { role: 'staff', branchId: '020', accountStatus: 'approved' } })),
      setCustomUserClaims: vi.fn(async () => { throw new Error('simulated denial'); }),
    };
    const close = vi.fn();
    const prepareRecovery = vi.fn(async () => undefined);
    const writeRecoveryArtifact = vi.fn(async (value) => ({ path: 'artifacts/private/auth-claims-restore-recovery/failure.json', artifact: value }));
    const logger = { log: vi.fn(), error: vi.fn() };

    await expect(main([
      '--apply', '--project', 'demo-project', '--confirm-project', 'demo-project',
      '--confirm-claims-freeze', 'demo-project', '--input', 'claims.json', '--confirm-digest', artifact.digest.value,
    ], { ALLOW_PRODUCTION_MIGRATION: 'demo-project' }, {
      readArtifact: vi.fn(async () => artifact),
      authForProject: vi.fn(async () => ({ auth, close })),
      prepareRecovery,
      writeRecoveryArtifact,
      logger,
    })).rejects.toThrow(/partially failed/i);

    expect(prepareRecovery).toHaveBeenCalledOnce();
    expect(writeRecoveryArtifact).toHaveBeenCalledOnce();
    expect(writeRecoveryArtifact.mock.calls[0][0]).toMatchObject({
      sourceProject: 'demo-project',
      artifactDigest: artifact.digest.value,
      plan: { changes: [{ uid: 'u1' }] },
      applyResult: { attempted: 1, succeeded: [], failed: [{ uid: 'u1', retryStatus: 'required' }] },
    });
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('artifacts/private/auth-claims-restore-recovery/failure.json'));
    expect(logger.error.mock.calls[0][0]).not.toContain('branchId');
    expect(close).toHaveBeenCalledOnce();
  });
});
