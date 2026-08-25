import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
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

export async function main(argv = process.argv.slice(2), env = process.env) {
  const args = argsOf(argv);
  if (!args.project || !args.input) throw new Error('Auth claims restore requires --project and --input, including for dry-run');
  if (args.apply) assertRestoreApplyGuard({ apply: true, project: args.project, confirmProject: args['confirm-project'], input: args.input }, env);
  const artifact = JSON.parse(await readFile(resolve(args.input), 'utf8'));
  validateClaimsArtifact(artifact, args.project);
  const services = await authForProject(args.project);
  try {
    const result = await restoreAuthClaims({ artifact, auth: services.auth, project: args.project, apply: args.apply, onPlan: async (plan) => console.log(JSON.stringify(plan, null, 2)) });
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    if (error instanceof AuthClaimsRestoreError) console.error(JSON.stringify({ mode: 'APPLY_PARTIAL_FAILURE', project: args.project, ...error.details }, null, 2));
    throw error;
  } finally {
    await services.close();
  }
}

if (resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
