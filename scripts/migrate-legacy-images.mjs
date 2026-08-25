import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  LegacyImageMigrationError,
  applyLegacyImagePlan,
  assertLegacyImageApplyGuard,
  createLegacyImagePlan,
  legacyImageCandidates,
  validateLegacyImagePlan,
} from './legacy-images/core.mjs';

function argsOf(argv) {
  const result = { apply: false };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--apply') result.apply = true;
    else if (value.startsWith('--')) {
      if (!argv[index + 1] || argv[index + 1].startsWith('--')) throw new Error(`Missing value for ${value}`);
      result[value.slice(2)] = argv[index + 1];
      index += 1;
    } else throw new Error(`Unexpected argument: ${value}`);
  }
  return result;
}

function timestampName(value) {
  return value.toISOString().replaceAll(':', '').replaceAll('.', '-');
}

function referenceDigest(value) {
  return createHash('sha256').update(value).digest('hex');
}

export function managedCopyOptions(evidence) {
  return {
    contentType: evidence.contentType,
    metadata: {},
    preconditionOpts: { ifGenerationMatch: 0 },
  };
}

async function adminServices(project, bucketName) {
  const [{ initializeApp, applicationDefault, deleteApp }, { getFirestore }, { getStorage }] = await Promise.all([
    import('firebase-admin/app'),
    import('firebase-admin/firestore'),
    import('firebase-admin/storage'),
  ]);
  const app = initializeApp({ credential: applicationDefault(), projectId: project, storageBucket: bucketName }, `legacy-image-migration-${Date.now()}`);
  const db = getFirestore(app);
  const bucket = getStorage(app).bucket(bucketName);
  const inspectObject = async (path) => {
    if (!path) return null;
    try {
      const [metadata] = await bucket.file(path).getMetadata();
      return metadata;
    } catch (error) {
      if (Number(error?.code) === 404) return null;
      throw error;
    }
  };
  return {
    db,
    bucket,
    inspectObject,
    copyObject: async (sourcePath, destinationPath, evidence) => {
      const source = bucket.file(sourcePath, { generation: evidence.sourceGeneration });
      const destination = bucket.file(destinationPath);
      await source.copy(destination, managedCopyOptions(evidence));
    },
    readCustomer: async (customerId) => {
      const snapshot = await db.doc(`customers/${customerId}`).get();
      return snapshot.exists ? { id: snapshot.id, ...snapshot.data() } : null;
    },
    updateCustomer: async (customerId, patch, record) => db.runTransaction(async (transaction) => {
      const customerRef = db.doc(`customers/${customerId}`);
      const snapshot = await transaction.get(customerRef);
      if (!snapshot.exists) throw new Error('Customer disappeared before managed reference update');
      const customer = snapshot.data();
      if (typeof customer[record.legacyField] !== 'string' || referenceDigest(customer[record.legacyField]) !== record.referenceDigest) throw new Error('Legacy Customer reference changed before managed reference update');
      if (customer[record.managedField] && customer[record.managedField] !== record.destinationPath) throw new Error('Managed Customer reference changed before update');
      transaction.update(customerRef, patch);
    }),
    close: () => deleteApp(app),
  };
}

async function loadCustomers(db) {
  const snapshot = await db.collection('customers').get();
  return snapshot.docs.map((document) => ({ id: document.id, ...document.data() }));
}

async function inspectCandidateObjects(customers, bucketName, inspectObject) {
  const paths = new Set();
  for (const candidate of legacyImageCandidates(customers, bucketName)) {
    if (candidate.sourcePath) paths.add(candidate.sourcePath);
    paths.add(candidate.destinationPath);
  }
  const objects = await Promise.all([...paths].sort().map((path) => inspectObject(path)));
  return objects.filter(Boolean);
}

async function writePlan(artifact, output) {
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(artifact, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
  await writeFile(`${output}.sha256`, `${artifact.digest.value}  ${output.split(/[\\/]/).pop()}\n`, { encoding: 'utf8', flag: 'wx' });
}

async function writeRecovery(artifact) {
  const directory = 'artifacts/private/legacy-image-recovery';
  await mkdir(directory, { recursive: true });
  const path = join(directory, `partial-${timestampName(new Date(artifact.createdAt))}.json`);
  await writeFile(path, `${JSON.stringify(artifact, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
  return path;
}

export async function main(argv = process.argv.slice(2), env = process.env, dependencies = {}) {
  const args = argsOf(argv);
  if (!args.project || !args.bucket) throw new Error('Legacy image migration requires explicit --project and --bucket');
  const now = dependencies.now?.() ?? new Date();
  const connect = dependencies.adminServices ?? adminServices;
  const logger = dependencies.logger ?? console;
  const withServices = async (operation) => {
    const services = await connect(args.project, args.bucket);
    try { return await operation(services); }
    finally { await services.close(); }
  };
  if (!args.apply) {
    if (args.input) throw new Error('Dry-run creates a fresh plan and does not accept --input');
    return withServices(async (services) => {
      const customers = await (dependencies.loadCustomers ?? loadCustomers)(services.db);
      const objects = await (dependencies.inspectCandidateObjects ?? inspectCandidateObjects)(customers, args.bucket, services.inspectObject);
      const artifact = createLegacyImagePlan({ project: args.project, bucket: args.bucket, customers, objects, now: () => now });
      const output = resolve(args.out ?? `artifacts/private/legacy-images/predeploy-${timestampName(now)}.json`);
      await (dependencies.writePlan ?? writePlan)(artifact, output);
      const result = { mode: 'DRY_RUN', project: args.project, bucket: args.bucket, output, digest: artifact.digest, summary: artifact.summary, sourceDeletionPlanned: 0 };
      logger.log(JSON.stringify(result, null, 2));
      return result;
    });
  }

  if (!args.input) throw new Error('Legacy image apply requires --input');
  const artifact = JSON.parse(await (dependencies.readFile ?? readFile)(resolve(args.input), 'utf8'));
  const validated = validateLegacyImagePlan(artifact, args.project, args.bucket);
  assertLegacyImageApplyGuard({
    apply: true,
    project: args.project,
    confirmProject: args['confirm-project'],
    confirmCopyOnly: args['confirm-copy-only'],
    input: args.input,
    confirmDigest: args['confirm-digest'],
    artifactDigest: validated.digest.value,
  }, env);
  if (validated.summary.conflicts > 0) throw new Error('Legacy image apply blocked: reviewed plan contains conflicts');
  logger.log(JSON.stringify({ mode: 'APPLY_PLAN', project: args.project, bucket: args.bucket, digest: validated.digest, summary: validated.summary, sourceDeletionPlanned: 0 }, null, 2));
  return withServices(async (services) => {
    try {
      const applyResult = await applyLegacyImagePlan(validated, services);
      const result = { mode: 'APPLY', project: args.project, bucket: args.bucket, planDigest: validated.digest.value, applyResult, sourceObjectsDeleted: 0 };
      logger.log(JSON.stringify(result, null, 2));
      return result;
    } catch (error) {
      if (!(error instanceof LegacyImageMigrationError)) throw error;
      const recoveryArtifact = {
        schemaVersion: 1,
        sourceProject: args.project,
        bucket: args.bucket,
        planDigest: validated.digest.value,
        createdAt: now.toISOString(),
        applyResult: error.details,
        sourceObjectsDeleted: 0,
        retryStatus: 'review_then_rerun_same_plan_or_create_fresh_plan',
      };
      try {
        const recoveryPath = await (dependencies.writeRecovery ?? writeRecovery)(recoveryArtifact);
        error.details.recovery = { status: 'written', path: recoveryPath };
        logger.error(JSON.stringify({ mode: 'APPLY_PARTIAL_FAILURE', project: args.project, succeeded: error.details.succeeded?.length ?? 0, failed: error.details.failed?.length ?? 0, recoveryPath, sourceObjectsDeleted: 0 }, null, 2));
      } catch (recoveryError) {
        error.details.recovery = { status: 'write_failed', error: recoveryError instanceof Error ? recoveryError.message : String(recoveryError) };
        logger.error(JSON.stringify({ mode: 'APPLY_PARTIAL_FAILURE', project: args.project, failed: error.details.failed?.length ?? 0, recoveryWriteFailed: true, sourceObjectsDeleted: 0 }, null, 2));
      }
      throw error;
    }
  });
}

if (resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
