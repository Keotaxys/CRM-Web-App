import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { migrateCustomer, migrateUser } from './core.mjs';

export class MigrationClaimsError extends Error {
  constructor(message, details) {
    super(message);
    this.name = 'MigrationClaimsError';
    this.details = details;
  }
}

export function migrationFailureReport(error, project) {
  if (!(error instanceof MigrationClaimsError)) return null;
  const summary = error.details?.failureSummary ?? {};
  const recovery = error.details?.recovery ?? {};
  const evidence = error.details?.manualRecoveryEvidence;
  const retryIdentifiers = evidence?.stage === 'firestore_batch'
    ? evidence.failedBatch?.documentPaths
    : evidence?.failures?.map(({ uid }) => uid);
  return {
    mode: 'APPLY_PARTIAL_FAILURE',
    project,
    stage: summary.stage ?? 'unknown',
    failed: summary.failedCount ?? 0,
    retryStatus: summary.retryStatus ?? 'operator_review_required',
    ...(recovery.path ? { recoveryPath: recovery.path } : {}),
    ...(recovery.status === 'write_failed' ? { recoveryWriteFailed: true } : {}),
    ...(recovery.status === 'write_failed' && retryIdentifiers?.length ? { retryIdentifiers } : {}),
  };
}

function timestampName(value) {
  return value.toISOString().replaceAll(':', '').replaceAll('.', '-');
}

export async function writeMigrationRecoveryArtifact(artifact, options = {}) {
  const directory = options.directory ?? 'artifacts/private/migration-recovery';
  await mkdir(directory, { recursive: true });
  const path = join(directory, `claim-failures-${timestampName(new Date(artifact.createdAt))}.json`);
  await writeFile(path, `${JSON.stringify(artifact, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
  return { path, artifact };
}

function intendedAccess(user, patch) {
  return {
    role: patch.role ?? user.role ?? null,
    branchId: Object.hasOwn(patch, 'branchId') ? patch.branchId : (user.branchId ?? null),
    accountStatus: patch.accountStatus ?? user.accountStatus ?? null,
  };
}

function pendingProfile(authUser, FieldValue) {
  return {
    name: '',
    email: authUser.email ?? null,
    phone: '',
    photoURL: authUser.photoURL ?? '',
    photoStoragePath: '',
    role: null,
    branchId: null,
    accountStatus: 'pending',
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    approvedAt: null,
    approvedBy: null,
  };
}

export async function applyMigration(snapshot, services, options = {}) {
  const mutations = [];
  const claimPlans = [];
  const profileWriteByUid = new Map();
  let pendingProfilesCreated = 0;
  const recoveryDirectory = options.directory ?? 'artifacts/private/migration-recovery';
  const prepareRecovery = options.prepareRecovery ?? (() => mkdir(recoveryDirectory, { recursive: true }));
  await prepareRecovery();
  const writer = options.writeRecoveryArtifact ?? ((value) => writeMigrationRecoveryArtifact(value, options));
  const recordRecovery = async (artifact) => {
    try {
      const saved = await writer(artifact);
      return { status: 'written', path: saved.path };
    } catch (error) {
      return { status: 'write_failed', error: error instanceof Error ? error.message : String(error) };
    }
  };

  for (const customer of snapshot.customers ?? []) {
    const migration = migrateCustomer(customer);
    if (migration.conflicts.length) throw new Error(`Migration conflict for customer ${migration.id}`);
    if (Object.keys(migration.patch).length) mutations.push({ ref: services.db.doc(`customers/${migration.id}`), patch: migration.patch });
  }

  for (const user of snapshot.users ?? []) {
    const migration = migrateUser(user);
    if (migration.conflicts.length) throw new Error(`Migration conflict for user ${migration.uid}`);
    if (Object.keys(migration.patch).length) {
      mutations.push({ ref: services.db.doc(`users/${migration.uid}`), patch: migration.patch, uid: migration.uid });
      profileWriteByUid.set(migration.uid, 'planned');
    } else profileWriteByUid.set(migration.uid, 'not_needed');
    claimPlans.push({ uid: migration.uid, intendedAccess: intendedAccess(user, migration.patch) });
  }

  const profileIds = new Set((snapshot.users ?? []).map((user) => user.uid));
  for (const authUser of snapshot.authUsers ?? []) {
    if (profileIds.has(authUser.uid)) continue;
    const patch = pendingProfile(authUser, services.FieldValue);
    mutations.push({ ref: services.db.doc(`users/${authUser.uid}`), patch, uid: authUser.uid });
    profileWriteByUid.set(authUser.uid, 'planned');
    claimPlans.push({ uid: authUser.uid, intendedAccess: { role: null, branchId: null, accountStatus: 'pending' } });
    pendingProfilesCreated += 1;
  }

  let batches = 0;
  const committedDocumentPaths = [];
  for (let offset = 0; offset < mutations.length; offset += 400) {
    const batch = services.db.batch();
    const group = mutations.slice(offset, offset + 400);
    group.forEach(({ ref, patch }) => batch.set(ref, patch, { merge: true }));
    try {
      await batch.commit();
    } catch (error) {
      const artifact = {
        schemaVersion: 1,
        sourceProject: options.project ?? null,
        claimsSnapshotDigest: options.claimsSnapshotDigest ?? null,
        createdAt: (options.now?.() ?? new Date()).toISOString(),
        stage: 'firestore_batch',
        committedBatchCount: batches,
        committedDocumentPaths,
        failedBatch: {
          number: batches + 1,
          documentPaths: group.map(({ ref }) => ref.path),
          retryStatus: 'rerun_required',
          error: error instanceof Error ? error.message : String(error),
        },
      };
      const recovery = await recordRecovery(artifact);
      throw new MigrationClaimsError('Migration stopped after a Firestore batch failure; rerun is required', {
        result: { firestoreWritesPlanned: mutations.length, firestoreWritesCommitted: committedDocumentPaths.length, committedBatchCount: batches },
        failureSummary: { stage: 'firestore_batch', failedCount: group.length, retryStatus: 'rerun_required' },
        recovery,
        ...(recovery.status === 'write_failed' ? { manualRecoveryEvidence: artifact } : {}),
      });
    }
    group.forEach(({ uid }) => { if (uid) profileWriteByUid.set(uid, 'succeeded'); });
    committedDocumentPaths.push(...group.map(({ ref }) => ref.path));
    batches += 1;
  }

  const failures = [];
  let successfulClaimUpdates = 0;
  for (const plan of claimPlans) {
    try {
      const account = await services.auth.getUser(plan.uid);
      await services.auth.setCustomUserClaims(plan.uid, { ...(account.customClaims ?? {}), ...plan.intendedAccess });
      successfulClaimUpdates += 1;
    } catch (error) {
      failures.push({
        uid: plan.uid,
        intendedAccess: plan.intendedAccess,
        firestoreProfileWrite: profileWriteByUid.get(plan.uid) === 'succeeded' ? 'succeeded' : 'not_needed',
        authClaimUpdate: 'failed',
        retryStatus: 'required',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const result = {
    firestoreWrites: mutations.length,
    claimUpdates: claimPlans.length,
    successfulClaimUpdates,
    pendingProfilesCreated,
    batches,
  };
  if (failures.length) {
    const artifact = {
      schemaVersion: 1,
      sourceProject: options.project ?? null,
      claimsSnapshotDigest: options.claimsSnapshotDigest ?? null,
      createdAt: (options.now?.() ?? new Date()).toISOString(),
      failures,
    };
    const recovery = await recordRecovery(artifact);
    throw new MigrationClaimsError('Migration profile writes completed but one or more Auth claim updates failed', {
      result,
      failureSummary: { stage: 'auth_claims', failedCount: failures.length, retryStatus: 'rerun_required' },
      recovery,
      ...(recovery.status === 'write_failed' ? { manualRecoveryEvidence: artifact } : {}),
    });
  }
  return result;
}
