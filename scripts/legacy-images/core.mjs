import { createHash } from 'node:crypto';

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const SLOT_CONFIG = [
  { slot: 'customer-photo', legacyField: 'imageUrl', managedField: 'imageStoragePath', legacyPrefix: 'customers/' },
  { slot: 'place-photo', legacyField: 'placeImageUrl', managedField: 'placeImageStoragePath', legacyPrefix: 'places/' },
];

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!isPlainObject(value)) return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function normalizeMetadata(value) {
  if (!value) return null;
  return {
    name: String(value.name ?? ''),
    generation: String(value.generation ?? ''),
    size: String(value.size ?? ''),
    contentType: String(value.contentType ?? ''),
    md5Hash: value.md5Hash ? String(value.md5Hash) : null,
    crc32c: value.crc32c ? String(value.crc32c) : null,
  };
}

function metadataEvidence(value) {
  const metadata = normalizeMetadata(value);
  if (!metadata) return null;
  const { name: _name, ...evidence } = metadata;
  return evidence;
}

function hasChecksum(value) {
  return Boolean(value?.md5Hash || value?.crc32c);
}

function sameObjectBytes(source, destination) {
  if (!source || !destination) return false;
  const sameChecksum = source.md5Hash && destination.md5Hash
    ? source.md5Hash === destination.md5Hash
    : Boolean(source.crc32c && destination.crc32c && source.crc32c === destination.crc32c);
  return sameChecksum
    && String(source.size) === String(destination.size)
    && source.contentType === destination.contentType;
}

function sameSourceEvidence(current, expected) {
  if (!current || !expected) return false;
  return current.generation === expected.generation
    && current.size === expected.size
    && current.contentType === expected.contentType
    && current.md5Hash === expected.md5Hash
    && current.crc32c === expected.crc32c;
}

export function parseStorageReference(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    if (value.startsWith('gs://')) {
      const url = new URL(value);
      return { bucket: url.hostname, path: decodeURIComponent(url.pathname.replace(/^\//, '')) };
    }
    const url = new URL(value);
    if (url.hostname === 'firebasestorage.googleapis.com') {
      const match = url.pathname.match(/^\/v0\/b\/([^/]+)\/o\/([^/]+)$/);
      return match ? { bucket: decodeURIComponent(match[1]), path: decodeURIComponent(match[2]) } : null;
    }
    if (url.hostname === 'storage.googleapis.com') {
      const match = url.pathname.match(/^\/([^/]+)\/(.+)$/);
      return match ? { bucket: decodeURIComponent(match[1]), path: decodeURIComponent(match[2]) } : null;
    }
  } catch {
    return null;
  }
  return null;
}

function planPayload(value) {
  return canonicalize({
    schemaVersion: value.schemaVersion,
    kind: value.kind,
    sourceProject: value.sourceProject,
    bucket: value.bucket,
    createdAt: value.createdAt,
    records: [...value.records].sort((left, right) => `${left.customerId}:${left.slot}`.localeCompare(`${right.customerId}:${right.slot}`)),
    summary: value.summary,
  });
}

export function digestLegacyImagePlan(value) {
  return sha256(JSON.stringify(planPayload(value)));
}

export function createLegacyImagePlan({ project, bucket, customers = [], objects = [], now = () => new Date() }) {
  if (!project || !bucket) throw new Error('Legacy image plan requires explicit project and bucket');
  const objectByPath = new Map(objects.map((object) => [object.name, normalizeMetadata(object)]));
  const records = [];
  for (const customer of [...customers].sort((left, right) => String(left.id).localeCompare(String(right.id)))) {
    if (!customer?.id) throw new Error('Every legacy image Customer requires an explicit ID');
    for (const config of SLOT_CONFIG) {
      const reference = customer[config.legacyField];
      if (!reference) continue;
      const parsed = parseStorageReference(reference);
      const destinationPath = `customers/${customer.id}/${config.slot}`;
      const base = {
        customerId: customer.id,
        slot: config.slot,
        legacyField: config.legacyField,
        managedField: config.managedField,
        referenceDigest: sha256(reference),
        sourcePath: parsed?.path ?? null,
        destinationPath,
        source: null,
        destination: null,
        needsFirestoreUpdate: customer[config.managedField] !== destinationPath,
      };
      if (!parsed || parsed.bucket !== bucket || !parsed.path.startsWith(config.legacyPrefix)) {
        records.push({ ...base, status: 'invalid_reference' });
        continue;
      }
      if (customer[config.managedField] && customer[config.managedField] !== destinationPath) {
        records.push({ ...base, status: 'managed_path_conflict' });
        continue;
      }
      const source = objectByPath.get(parsed.path) ?? null;
      if (!source) {
        records.push({ ...base, status: 'missing_source' });
        continue;
      }
      const sourceEvidence = metadataEvidence(source);
      if (!IMAGE_TYPES.has(sourceEvidence.contentType) || !hasChecksum(sourceEvidence) || !sourceEvidence.generation || !sourceEvidence.size) {
        records.push({ ...base, source: sourceEvidence, status: 'invalid_source_metadata' });
        continue;
      }
      const destination = objectByPath.get(destinationPath) ?? null;
      if (!destination) {
        records.push({ ...base, source: sourceEvidence, status: 'ready_to_copy' });
        continue;
      }
      const destinationEvidence = metadataEvidence(destination);
      records.push({
        ...base,
        source: sourceEvidence,
        destination: destinationEvidence,
        status: sameObjectBytes(sourceEvidence, destinationEvidence) ? 'already_copied' : 'destination_mismatch',
      });
    }
  }
  const summary = {
    total: records.length,
    readyToCopy: records.filter(({ status }) => status === 'ready_to_copy').length,
    alreadyCopied: records.filter(({ status }) => status === 'already_copied').length,
    conflicts: records.filter(({ status }) => !['ready_to_copy', 'already_copied'].includes(status)).length,
  };
  const payload = planPayload({
    schemaVersion: 1,
    kind: 'crm-legacy-image-copy-plan',
    sourceProject: project,
    bucket,
    createdAt: now().toISOString(),
    records,
    summary,
  });
  return { ...payload, digest: { algorithm: 'SHA-256', value: digestLegacyImagePlan(payload) } };
}

export function validateLegacyImagePlan(artifact, project, bucket) {
  if (!isPlainObject(artifact) || artifact.schemaVersion !== 1 || artifact.kind !== 'crm-legacy-image-copy-plan') throw new Error('Malformed legacy image plan schema');
  if (!project || artifact.sourceProject !== project) throw new Error('Legacy image plan project mismatch');
  if (!bucket || artifact.bucket !== bucket) throw new Error('Legacy image plan bucket mismatch');
  if (!Array.isArray(artifact.records) || !isPlainObject(artifact.summary)) throw new Error('Malformed legacy image plan records');
  if (typeof artifact.createdAt !== 'string' || Number.isNaN(Date.parse(artifact.createdAt))) throw new Error('Malformed legacy image plan timestamp');
  if (artifact.digest?.algorithm !== 'SHA-256' || !/^[a-f0-9]{64}$/.test(artifact.digest?.value ?? '')) throw new Error('Malformed legacy image plan digest');
  if (digestLegacyImagePlan(artifact) !== artifact.digest.value) throw new Error('Legacy image plan digest mismatch');
  const seen = new Set();
  for (const record of artifact.records) {
    const key = `${record?.customerId}:${record?.slot}`;
    const config = SLOT_CONFIG.find(({ slot }) => slot === record?.slot);
    if (typeof record?.customerId !== 'string' || !record.customerId || record.customerId.includes('/') || !config || seen.has(key)) throw new Error('Malformed or duplicate legacy image plan record');
    const expectedDestination = `customers/${record.customerId}/${config.slot}`;
    if (record.legacyField !== config.legacyField || record.managedField !== config.managedField || record.destinationPath !== expectedDestination) throw new Error('Malformed legacy image plan managed slot');
    if (!/^[a-f0-9]{64}$/.test(record.referenceDigest ?? '') || typeof record.needsFirestoreUpdate !== 'boolean') throw new Error('Malformed legacy image plan reference evidence');
    const statuses = new Set(['ready_to_copy', 'already_copied', 'invalid_reference', 'managed_path_conflict', 'missing_source', 'invalid_source_metadata', 'destination_mismatch']);
    if (!statuses.has(record.status)) throw new Error('Malformed legacy image plan status');
    if (record.sourcePath !== null && (typeof record.sourcePath !== 'string' || !record.sourcePath.startsWith(config.legacyPrefix))) throw new Error('Malformed legacy image plan source path');
    if (['ready_to_copy', 'already_copied'].includes(record.status)) {
      if (!record.sourcePath || !isPlainObject(record.source) || !record.source.generation || !record.source.size || !IMAGE_TYPES.has(record.source.contentType) || !hasChecksum(record.source)) throw new Error('Malformed legacy image plan source evidence');
    }
    seen.add(key);
  }
  const expectedSummary = {
    total: artifact.records.length,
    readyToCopy: artifact.records.filter(({ status }) => status === 'ready_to_copy').length,
    alreadyCopied: artifact.records.filter(({ status }) => status === 'already_copied').length,
    conflicts: artifact.records.filter(({ status }) => !['ready_to_copy', 'already_copied'].includes(status)).length,
  };
  if (JSON.stringify(canonicalize(artifact.summary)) !== JSON.stringify(canonicalize(expectedSummary))) throw new Error('Malformed legacy image plan summary');
  return structuredClone(artifact);
}

export function assertLegacyImageApplyGuard(args, env = process.env) {
  const valid = args?.apply === true
    && Boolean(args.project)
    && args.project === args.confirmProject
    && args.project === args.confirmCopyOnly
    && Boolean(args.input)
    && typeof args.confirmDigest === 'string'
    && args.confirmDigest === args.artifactDigest
    && env.ALLOW_PRODUCTION_MIGRATION === args.project;
  if (!valid) throw new Error('Legacy image apply blocked: require --apply, matching --project/--confirm-project/--confirm-copy-only, --input, matching --confirm-digest, and ALLOW_PRODUCTION_MIGRATION');
}

export class LegacyImageMigrationError extends Error {
  constructor(message, details) {
    super(message);
    this.name = 'LegacyImageMigrationError';
    this.details = details;
  }
}

function referenceMatches(customer, record) {
  const reference = customer?.[record.legacyField];
  return typeof reference === 'string' && sha256(reference) === record.referenceDigest;
}

function managedPathIsSafe(customer, record) {
  const value = customer?.[record.managedField];
  return !value || value === record.destinationPath;
}

async function preflightRecord(record, services) {
  const [customer, source, destination] = await Promise.all([
    services.readCustomer(record.customerId),
    services.inspectObject(record.sourcePath),
    services.inspectObject(record.destinationPath),
  ]);
  const sourceEvidence = metadataEvidence(source);
  const destinationEvidence = metadataEvidence(destination);
  if (!customer) return { record, stage: 'preflight', error: 'customer missing', retryStatus: 'fresh_plan_required' };
  if (!referenceMatches(customer, record)) return { record, stage: 'preflight', error: 'legacy reference changed', retryStatus: 'fresh_plan_required' };
  if (!managedPathIsSafe(customer, record)) return { record, stage: 'preflight', error: 'managed path changed', retryStatus: 'fresh_plan_required' };
  if (!sameSourceEvidence(sourceEvidence, record.source)) return { record, stage: 'preflight', error: 'source object changed or disappeared', retryStatus: 'fresh_plan_required' };
  if (destinationEvidence && !sameObjectBytes(sourceEvidence, destinationEvidence)) return { record, stage: 'preflight', error: 'destination does not match source', retryStatus: 'manual_review_required' };
  return { record, customer, source: sourceEvidence, destination: destinationEvidence };
}

export async function applyLegacyImagePlan(artifact, services) {
  const validated = validateLegacyImagePlan(artifact, artifact.sourceProject, artifact.bucket);
  if (validated.summary.conflicts > 0) {
    throw new LegacyImageMigrationError('Legacy image plan contains unresolved conflicts', {
      succeeded: [],
      failed: validated.records.filter(({ status }) => !['ready_to_copy', 'already_copied'].includes(status)).map((record) => ({ customerId: record.customerId, slot: record.slot, stage: 'plan', error: record.status, retryStatus: 'fresh_plan_required' })),
    });
  }

  const preflight = await Promise.all(validated.records.map((record) => preflightRecord(record, services)));
  const preflightFailures = preflight.filter(({ error }) => error).map(({ record, ...failure }) => ({ customerId: record.customerId, slot: record.slot, ...failure }));
  if (preflightFailures.length) throw new LegacyImageMigrationError('Legacy image apply preflight failed before writes', { succeeded: [], failed: preflightFailures });

  const result = { attempted: validated.records.length, succeeded: [], failed: [], copied: 0, alreadyPresent: 0, firestoreUpdates: 0 };
  for (const item of preflight) {
    const { record } = item;
    let destination = item.destination;
    let copied = false;
    try {
      if (!destination) {
        try {
          await services.copyObject(record.sourcePath, record.destinationPath, {
            sourceGeneration: record.source.generation,
            contentType: record.source.contentType,
          });
          copied = true;
          result.copied += 1;
        } catch (error) {
          destination = metadataEvidence(await services.inspectObject(record.destinationPath));
          if (!destination || !sameObjectBytes(item.source, destination)) {
            result.failed.push({ customerId: record.customerId, slot: record.slot, stage: 'copy', error: error instanceof Error ? error.message : String(error), retryStatus: 'required' });
            continue;
          }
        }
        destination = metadataEvidence(await services.inspectObject(record.destinationPath));
      }
      if (!sameObjectBytes(item.source, destination)) {
        result.failed.push({ customerId: record.customerId, slot: record.slot, stage: 'verify_copy', error: 'copied destination checksum, size, or MIME type mismatch', retryStatus: 'manual_review_required' });
        continue;
      }
      if (!copied) result.alreadyPresent += 1;

      const currentCustomer = await services.readCustomer(record.customerId);
      if (!referenceMatches(currentCustomer, record) || !managedPathIsSafe(currentCustomer, record)) {
        result.failed.push({ customerId: record.customerId, slot: record.slot, stage: 'firestore_precondition', error: 'Customer reference changed after copy', retryStatus: 'fresh_plan_required' });
        continue;
      }
      if (currentCustomer[record.managedField] !== record.destinationPath) {
        try {
          await services.updateCustomer(record.customerId, { [record.managedField]: record.destinationPath }, record);
          result.firestoreUpdates += 1;
        } catch (error) {
          result.failed.push({ customerId: record.customerId, slot: record.slot, stage: 'firestore_update', error: error instanceof Error ? error.message : String(error), retryStatus: 'required' });
          continue;
        }
      }
      result.succeeded.push({ customerId: record.customerId, slot: record.slot, copied, firestoreUpdated: currentCustomer[record.managedField] !== record.destinationPath, retryStatus: 'complete' });
    } catch (error) {
      result.failed.push({ customerId: record.customerId, slot: record.slot, stage: 'unexpected', error: error instanceof Error ? error.message : String(error), retryStatus: 'operator_review_required' });
    }
  }
  if (result.failed.length) throw new LegacyImageMigrationError('Legacy image migration partially failed; retain copied objects and rerun after review', result);
  return { ...result, succeeded: result.succeeded.length };
}

export function legacyImageCandidates(customers, bucket) {
  const candidates = [];
  for (const customer of customers) {
    for (const config of SLOT_CONFIG) {
      const reference = customer?.[config.legacyField];
      if (!reference) continue;
      const parsed = parseStorageReference(reference);
      candidates.push({
        customerId: customer.id,
        sourcePath: parsed?.bucket === bucket ? parsed.path : null,
        destinationPath: `customers/${customer.id}/${config.slot}`,
      });
    }
  }
  return candidates;
}
