import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AuthClaimsRestoreError, assertRestoreApplyGuard, restoreAuthClaims, validateClaimsArtifact } from './auth-claims/core.mjs';

function argsOf(argv) {
  const result = { apply: false };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--apply') result.apply = true;
    else if (value.startsWith('--')) { result[value.slice(2)] = argv[index + 1]; index += 1; }
    else throw new Error(`Unexpected argument: ${value}`);
  }
  return result;
}

async function authForProject(project) {
  const [{ initializeApp, applicationDefault, deleteApp }, { getAuth }] = await Promise.all([
    import('firebase-admin/app'),
    import('firebase-admin/auth'),
  ]);
  const app = initializeApp({ credential: applicationDefault(), projectId: project }, `auth-claims-restore-${Date.now()}`);
  return { auth: getAuth(app), close: () => deleteApp(app) };
}

const recoveryDirectory = 'artifacts/private/auth-claims-restore-recovery';

function timestampName(value) {
  return value.toISOString().replaceAll(':', '').replaceAll('.', '-');
}

async function prepareRecovery() {
  await mkdir(recoveryDirectory, { recursive: true });
}

async function writeRecoveryArtifact(artifact) {
  const path = join(recoveryDirectory, `restore-failures-${timestampName(new Date(artifact.createdAt))}.json`);
  await writeFile(path, `${JSON.stringify(artifact, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
  return { path, artifact };
}

export async function main(argv = process.argv.slice(2), env = process.env, dependencies = {}) {
  const args = argsOf(argv);
  if (!args.project || !args.input) throw new Error('Auth claims restore requires --project and --input, including for dry-run');
  const readArtifact = dependencies.readArtifact ?? (async (path) => JSON.parse(await readFile(resolve(path), 'utf8')));
  const artifact = await readArtifact(args.input);
  const validated = validateClaimsArtifact(artifact, args.project);
  if (args.apply) {
    assertRestoreApplyGuard({
      apply: true,
      project: args.project,
      confirmProject: args['confirm-project'],
      confirmClaimsFreeze: args['confirm-claims-freeze'],
      input: args.input,
      confirmDigest: args['confirm-digest'],
      artifactDigest: validated.digest.value,
    }, env);
    await (dependencies.prepareRecovery ?? prepareRecovery)();
  }
  const services = await (dependencies.authForProject ?? authForProject)(args.project);
  const logger = dependencies.logger ?? console;
  try {
    const result = await restoreAuthClaims({ artifact: validated, auth: services.auth, project: args.project, apply: args.apply, onPlan: async (plan) => logger.log(JSON.stringify(plan, null, 2)) });
    logger.log(JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    if (error instanceof AuthClaimsRestoreError) {
      const { plan, ...applyResult } = error.details;
      const recoveryArtifact = {
        schemaVersion: 1,
        sourceProject: args.project,
        artifactDigest: validated.digest.value,
        createdAt: new Date().toISOString(),
        plan,
        applyResult,
      };
      try {
        const recovery = await (dependencies.writeRecoveryArtifact ?? writeRecoveryArtifact)(recoveryArtifact);
        error.details.recovery = { status: 'written', path: recovery.path };
        logger.error(JSON.stringify({
          mode: 'APPLY_PARTIAL_FAILURE',
          project: args.project,
          attempted: applyResult.attempted,
          succeeded: applyResult.succeeded.length,
          failed: applyResult.failed.length,
          recoveryPath: recovery.path,
        }, null, 2));
      } catch (recoveryError) {
        error.details.recovery = { status: 'write_failed', error: recoveryError instanceof Error ? recoveryError.message : String(recoveryError) };
        logger.error(JSON.stringify({
          mode: 'APPLY_PARTIAL_FAILURE',
          project: args.project,
          failed: applyResult.failed.length,
          recoveryWriteFailed: true,
          retryUids: applyResult.failed.map(({ uid }) => uid),
        }, null, 2));
      }
    }
    throw error;
  } finally {
    await services.close();
  }
}

if (resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
