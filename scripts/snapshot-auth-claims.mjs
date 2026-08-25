import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { snapshotAuthClaims } from './auth-claims/core.mjs';

function argsOf(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (!value.startsWith('--')) throw new Error(`Unexpected argument: ${value}`);
    result[value.slice(2)] = argv[index + 1];
    index += 1;
  }
  return result;
}

function timestampName(date) {
  return date.toISOString().replaceAll(':', '').replaceAll('.', '-');
}

async function authForProject(project) {
  const [{ initializeApp, applicationDefault, deleteApp }, { getAuth }] = await Promise.all([
    import('firebase-admin/app'),
    import('firebase-admin/auth'),
  ]);
  const app = initializeApp({ credential: applicationDefault(), projectId: project }, `auth-claims-snapshot-${Date.now()}`);
  return { auth: getAuth(app), close: () => deleteApp(app) };
}

export async function main(argv = process.argv.slice(2)) {
  const args = argsOf(argv);
  if (!args.project) throw new Error('Auth claims snapshot requires explicit --project');
  const now = new Date();
  const out = resolve(args.out ?? `artifacts/private/auth-claims-${timestampName(now)}.json`);
  const services = await authForProject(args.project);
  try {
    const artifact = await snapshotAuthClaims({ auth: services.auth, project: args.project, now: () => now });
    await mkdir(dirname(out), { recursive: true });
    await writeFile(out, `${JSON.stringify(artifact, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
    await writeFile(`${out}.sha256`, `${artifact.digest.value}  ${out.split(/[\\/]/).pop()}\n`, { encoding: 'utf8', flag: 'wx' });
    console.log(JSON.stringify({ mode: 'READ_ONLY_SNAPSHOT', sourceProject: args.project, representedUsers: artifact.users.length, output: out, digest: artifact.digest }, null, 2));
  } finally {
    await services.close();
  }
}

if (resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
