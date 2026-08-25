import { createHash } from 'node:crypto';

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!isPlainObject(value)) return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
}

function normalizePayload(payload) {
  return canonicalize({
    schemaVersion: payload.schemaVersion,
    sourceProject: payload.sourceProject,
    capturedAt: payload.capturedAt,
    users: [...payload.users]
      .map((user) => ({ uid: user.uid, customClaims: canonicalize(user.customClaims ?? {}) }))
      .sort((left, right) => left.uid.localeCompare(right.uid)),
  });
}

export function digestClaimsPayload(payload) {
  return createHash('sha256').update(JSON.stringify(normalizePayload(payload))).digest('hex');
}

export async function snapshotAuthClaims({ auth, project, now = () => new Date() }) {
  if (!project) throw new Error('Snapshot requires an explicit project');
  const users = [];
  let pageToken;
  do {
    const page = await auth.listUsers(1000, pageToken);
    users.push(...page.users.map((user) => ({ uid: user.uid, customClaims: user.customClaims ?? {} })));
    pageToken = page.pageToken;
  } while (pageToken);
  const payload = normalizePayload({ schemaVersion: 1, sourceProject: project, capturedAt: now().toISOString(), users });
  return { ...payload, digest: { algorithm: 'SHA-256', value: digestClaimsPayload(payload) } };
}

export function validateClaimsArtifact(artifact, targetProject) {
  if (!isPlainObject(artifact) || artifact.schemaVersion !== 1) throw new Error('Malformed Auth claims artifact schema');
  if (!targetProject || typeof artifact.sourceProject !== 'string' || artifact.sourceProject !== targetProject) throw new Error('Auth claims artifact project mismatch');
  if (typeof artifact.capturedAt !== 'string' || Number.isNaN(Date.parse(artifact.capturedAt))) throw new Error('Malformed Auth claims artifact timestamp');
  if (!Array.isArray(artifact.users)) throw new Error('Malformed Auth claims artifact users');
  const seen = new Set();
  for (const user of artifact.users) {
    if (!isPlainObject(user) || typeof user.uid !== 'string' || !user.uid.trim()) throw new Error('Every Auth claims artifact record requires an explicit UID');
    if (seen.has(user.uid)) throw new Error(`Duplicate UID in Auth claims artifact: ${user.uid}`);
    if (!isPlainObject(user.customClaims)) throw new Error(`Malformed custom claims for UID ${user.uid}`);
    seen.add(user.uid);
  }
  if (artifact.digest?.algorithm !== 'SHA-256' || !/^[a-f0-9]{64}$/.test(artifact.digest?.value ?? '')) throw new Error('Malformed Auth claims artifact digest');
  const payload = normalizePayload(artifact);
  if (digestClaimsPayload(payload) !== artifact.digest.value) throw new Error('Auth claims artifact digest mismatch');
  return { ...payload, digest: structuredClone(artifact.digest) };
}

export async function planClaimsRestore(artifact, auth) {
  const changes = [];
  const unchanged = [];
  for (const record of artifact.users) {
    const account = await auth.getUser(record.uid);
    const before = canonicalize(account.customClaims ?? {});
    const after = canonicalize(record.customClaims);
    if (JSON.stringify(before) === JSON.stringify(after)) unchanged.push(record.uid);
    else changes.push({ uid: record.uid, before, after });
  }
  return { changes, unchanged };
}

export function assertRestoreApplyGuard(args, env = process.env) {
  const valid = args?.apply === true
    && Boolean(args.project)
    && args.project === args.confirmProject
    && Boolean(args.input)
    && typeof args.confirmDigest === 'string'
    && args.confirmDigest === args.artifactDigest
    && env.ALLOW_PRODUCTION_MIGRATION === args.project;
  if (!valid) throw new Error('Auth claims restore apply blocked: require --apply, --project, matching --confirm-project, --input, matching --confirm-digest, and ALLOW_PRODUCTION_MIGRATION');
}

export class AuthClaimsRestoreError extends Error {
  constructor(message, details) {
    super(message);
    this.name = 'AuthClaimsRestoreError';
    this.details = details;
  }
}

export async function applyClaimsRestore(plan, auth) {
  const result = { attempted: plan.changes.length, succeeded: [], failed: [] };
  for (const change of plan.changes) {
    try {
      const account = await auth.getUser(change.uid);
      const current = canonicalize(account.customClaims ?? {});
      if (JSON.stringify(current) !== JSON.stringify(canonicalize(change.before))) {
        result.failed.push({ uid: change.uid, error: 'stale restore plan', retryStatus: 'fresh_plan_required' });
        continue;
      }
      await auth.setCustomUserClaims(change.uid, structuredClone(change.after));
      result.succeeded.push(change.uid);
    } catch (error) {
      result.failed.push({ uid: change.uid, error: error instanceof Error ? error.message : String(error), retryStatus: 'required' });
    }
  }
  if (result.failed.length) throw new AuthClaimsRestoreError('Auth claims restore partially failed', result);
  return result;
}

export async function restoreAuthClaims({ artifact, auth, project, apply = false, onPlan = async () => undefined }) {
  const validated = validateClaimsArtifact(artifact, project);
  const plan = await planClaimsRestore(validated, auth);
  if (!apply) {
    return {
      mode: 'DRY_RUN',
      project,
      representedUsers: validated.users.length,
      plannedChanges: plan.changes,
      unchangedUsers: plan.unchanged,
    };
  }
  await onPlan({
    mode: 'APPLY_PLAN',
    project,
    representedUsers: validated.users.length,
    plannedChanges: plan.changes,
    unchangedUsers: plan.unchanged,
  });
  try {
    return { mode: 'APPLY', project, representedUsers: validated.users.length, applyResult: await applyClaimsRestore(plan, auth) };
  } catch (error) {
    if (!(error instanceof AuthClaimsRestoreError)) throw error;
    throw new AuthClaimsRestoreError(error.message, {
      ...error.details,
      plan: { changes: structuredClone(plan.changes), unchanged: structuredClone(plan.unchanged) },
    });
  }
}
