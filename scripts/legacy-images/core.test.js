import { describe, expect, it, vi } from 'vitest';
import {
  LegacyImageMigrationError,
  applyLegacyImagePlan,
  assertLegacyImageApplyGuard,
  createLegacyImagePlan,
  digestLegacyImagePlan,
} from './core.mjs';

const PROJECT = 'crm-web-app-97b91';
const BUCKET = 'crm-web-app-97b91.firebasestorage.app';
const NOW = new Date('2026-08-25T03:00:00.000Z');

function metadata(name, overrides = {}) {
  return {
    name,
    generation: '7',
    size: '42',
    contentType: 'image/jpeg',
    md5Hash: 'CY9rzUYh03PK3k6DJie09g==',
    crc32c: 'ImIEBA==',
    ...overrides,
  };
}

function firebaseUrl(path) {
  return `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(path)}?alt=media&token=legacy-token`;
}

function plan(customers, objects) {
  return createLegacyImagePlan({
    project: PROJECT,
    bucket: BUCKET,
    customers,
    objects,
    now: () => NOW,
  });
}

function fakeServices(customers, objects, options = {}) {
  const customerState = new Map(customers.map((customer) => [customer.id, structuredClone(customer)]));
  const objectState = new Map(objects.map((object) => [object.name, structuredClone(object)]));
  const calls = { copied: [], updated: [], deleted: [] };
  return {
    calls,
    customerState,
    objectState,
    inspectObject: vi.fn(async (path) => structuredClone(objectState.get(path) ?? null)),
    copyObject: vi.fn(async (sourcePath, destinationPath) => {
      if (options.copyFailure === destinationPath) throw new Error('simulated copy failure');
      const source = objectState.get(sourcePath);
      if (!source) throw new Error('source missing');
      calls.copied.push({ sourcePath, destinationPath });
      objectState.set(destinationPath, { ...structuredClone(source), name: destinationPath, generation: '8' });
    }),
    readCustomer: vi.fn(async (customerId) => structuredClone(customerState.get(customerId) ?? null)),
    updateCustomer: vi.fn(async (customerId, patch) => {
      if (options.updateFailure === `${customerId}:${Object.keys(patch)[0]}`) throw new Error('simulated Firestore failure');
      calls.updated.push({ customerId, patch: structuredClone(patch) });
      customerState.set(customerId, { ...customerState.get(customerId), ...structuredClone(patch) });
    }),
    // Deliberately present to prove the migration never asks for source deletion.
    deleteObject: vi.fn(async (path) => { calls.deleted.push(path); }),
  };
}

describe('legacy image copy-first planning', () => {
  it('plans only the canonical customer-photo slot when only a customer photo exists', () => {
    const source = 'customers/legacy-customer.jpg';
    const artifact = plan([{ id: 'customer-1', imageUrl: firebaseUrl(source) }], [metadata(source)]);

    expect(artifact.records).toEqual([
      expect.objectContaining({
        customerId: 'customer-1',
        slot: 'customer-photo',
        sourcePath: source,
        destinationPath: 'customers/customer-1/customer-photo',
        managedField: 'imageStoragePath',
        status: 'ready_to_copy',
      }),
    ]);
    expect(artifact.summary).toEqual({ total: 1, readyToCopy: 1, alreadyCopied: 0, conflicts: 0 });
  });

  it('plans only the canonical place-photo slot when only a place photo exists', () => {
    const source = 'places/legacy-place.jpg';
    const artifact = plan([{ id: 'customer-1', placeImageUrl: firebaseUrl(source) }], [metadata(source)]);

    expect(artifact.records).toEqual([
      expect.objectContaining({
        customerId: 'customer-1',
        slot: 'place-photo',
        sourcePath: source,
        destinationPath: 'customers/customer-1/place-photo',
        managedField: 'placeImageStoragePath',
        status: 'ready_to_copy',
      }),
    ]);
  });

  it('produces two independently verifiable records when both photos exist', () => {
    const customerSource = 'customers/legacy-customer.jpg';
    const placeSource = 'places/legacy-place.jpg';
    const artifact = plan([{ id: 'customer-1', imageUrl: firebaseUrl(customerSource), placeImageUrl: firebaseUrl(placeSource) }], [metadata(customerSource), metadata(placeSource)]);

    expect(artifact.records.map(({ slot }) => slot)).toEqual(['customer-photo', 'place-photo']);
    expect(artifact.summary).toEqual({ total: 2, readyToCopy: 2, alreadyCopied: 0, conflicts: 0 });
  });

  it('fails the plan closed when a referenced legacy object is missing', () => {
    const artifact = plan([{ id: 'customer-1', imageUrl: firebaseUrl('customers/missing.jpg') }], []);

    expect(artifact.records[0]).toMatchObject({ status: 'missing_source' });
    expect(artifact.summary.conflicts).toBe(1);
  });

  it('classifies an identical existing destination as an idempotent already-copied record', () => {
    const source = metadata('customers/legacy-customer.jpg');
    const destination = metadata('customers/customer-1/customer-photo', { generation: '99' });
    const artifact = plan([{ id: 'customer-1', imageUrl: firebaseUrl(source.name) }], [source, destination]);

    expect(artifact.records[0]).toMatchObject({ status: 'already_copied', needsFirestoreUpdate: true });
    expect(artifact.summary).toEqual({ total: 1, readyToCopy: 0, alreadyCopied: 1, conflicts: 0 });
  });

  it('fails closed when an existing destination checksum differs', () => {
    const source = metadata('customers/legacy-customer.jpg');
    const destination = metadata('customers/customer-1/customer-photo', { md5Hash: 'different-checksum' });
    const artifact = plan([{ id: 'customer-1', imageUrl: firebaseUrl(source.name) }], [source, destination]);

    expect(artifact.records[0]).toMatchObject({ status: 'destination_mismatch' });
    expect(artifact.summary.conflicts).toBe(1);
  });
});

describe('legacy image copy-first apply behavior', () => {
  it('is idempotent across a duplicate rerun and never duplicates the destination', async () => {
    const source = metadata('customers/legacy-customer.jpg');
    const customer = { id: 'customer-1', imageUrl: firebaseUrl(source.name), imageStoragePath: null };
    const artifact = plan([customer], [source]);
    const services = fakeServices([customer], [source]);

    const first = await applyLegacyImagePlan(artifact, services);
    const second = await applyLegacyImagePlan(artifact, services);

    expect(first).toMatchObject({ succeeded: 1, copied: 1, firestoreUpdates: 1, failed: [] });
    expect(second).toMatchObject({ succeeded: 1, copied: 0, alreadyPresent: 1, firestoreUpdates: 0, failed: [] });
    expect(services.calls.copied).toHaveLength(1);
  });

  it('records copy failure without writing the Firestore managed path', async () => {
    const source = metadata('customers/legacy-customer.jpg');
    const customer = { id: 'customer-1', imageUrl: firebaseUrl(source.name), imageStoragePath: null };
    const artifact = plan([customer], [source]);
    const services = fakeServices([customer], [source], { copyFailure: 'customers/customer-1/customer-photo' });

    await expect(applyLegacyImagePlan(artifact, services)).rejects.toMatchObject({
      name: 'LegacyImageMigrationError',
      details: { failed: [expect.objectContaining({ stage: 'copy', retryStatus: 'required' })] },
    });
    expect(services.calls.updated).toEqual([]);
  });

  it('leaves a verified copy in place after Firestore failure so rerun only retries the reference update', async () => {
    const source = metadata('customers/legacy-customer.jpg');
    const customer = { id: 'customer-1', imageUrl: firebaseUrl(source.name), imageStoragePath: null };
    const artifact = plan([customer], [source]);
    const services = fakeServices([customer], [source], { updateFailure: 'customer-1:imageStoragePath' });

    await expect(applyLegacyImagePlan(artifact, services)).rejects.toBeInstanceOf(LegacyImageMigrationError);
    expect(services.objectState.has('customers/customer-1/customer-photo')).toBe(true);
    services.updateCustomer = vi.fn(async (customerId, patch) => services.customerState.set(customerId, { ...services.customerState.get(customerId), ...patch }));

    const rerun = await applyLegacyImagePlan(artifact, services);
    expect(rerun).toMatchObject({ succeeded: 1, copied: 0, alreadyPresent: 1, firestoreUpdates: 1, failed: [] });
    expect(services.calls.copied).toHaveLength(1);
  });

  it('reports partial success while preserving the successful slot when another copy fails', async () => {
    const customerSource = metadata('customers/legacy-customer.jpg');
    const placeSource = metadata('places/legacy-place.jpg');
    const customer = { id: 'customer-1', imageUrl: firebaseUrl(customerSource.name), placeImageUrl: firebaseUrl(placeSource.name) };
    const artifact = plan([customer], [customerSource, placeSource]);
    const services = fakeServices([customer], [customerSource, placeSource], { copyFailure: 'customers/customer-1/place-photo' });

    await expect(applyLegacyImagePlan(artifact, services)).rejects.toMatchObject({
      details: {
        succeeded: [expect.objectContaining({ slot: 'customer-photo' })],
        failed: [expect.objectContaining({ slot: 'place-photo', stage: 'copy' })],
      },
    });
    expect(services.customerState.get('customer-1').imageStoragePath).toBe('customers/customer-1/customer-photo');
    expect(services.customerState.get('customer-1').placeImageStoragePath).toBeUndefined();
  });

  it('does not delete or alter any legacy source object', async () => {
    const source = metadata('customers/legacy-customer.jpg');
    const sourceBefore = structuredClone(source);
    const customer = { id: 'customer-1', imageUrl: firebaseUrl(source.name) };
    const artifact = plan([customer], [source]);
    const services = fakeServices([customer], [source]);

    await applyLegacyImagePlan(artifact, services);

    expect(services.deleteObject).not.toHaveBeenCalled();
    expect(services.objectState.get(source.name)).toEqual(sourceBefore);
    expect(services.customerState.get('customer-1').imageUrl).toBe(customer.imageUrl);
  });

  it('rejects apply unless project, digest, copy-only confirmation, input, and environment all match', () => {
    const source = metadata('customers/legacy-customer.jpg');
    const artifact = plan([{ id: 'customer-1', imageUrl: firebaseUrl(source.name) }], [source]);
    const valid = {
      apply: true,
      project: PROJECT,
      confirmProject: PROJECT,
      confirmCopyOnly: PROJECT,
      input: 'artifacts/private/legacy-images/plan.json',
      confirmDigest: artifact.digest.value,
      artifactDigest: artifact.digest.value,
    };

    expect(() => assertLegacyImageApplyGuard(valid, { ALLOW_PRODUCTION_MIGRATION: PROJECT })).not.toThrow();
    for (const key of ['confirmProject', 'confirmCopyOnly', 'input', 'confirmDigest']) {
      expect(() => assertLegacyImageApplyGuard({ ...valid, [key]: null }, { ALLOW_PRODUCTION_MIGRATION: PROJECT })).toThrow(/apply blocked/i);
    }
    expect(() => assertLegacyImageApplyGuard(valid, {})).toThrow(/apply blocked/i);
  });

  it('rejects a digest-valid artifact that targets anything outside the deterministic managed slot', async () => {
    const source = metadata('customers/legacy-customer.jpg');
    const customer = { id: 'customer-1', imageUrl: firebaseUrl(source.name) };
    const artifact = plan([customer], [source]);
    artifact.records[0].managedField = 'role';
    artifact.records[0].destinationPath = 'profiles/another-user/avatar';
    artifact.digest.value = digestLegacyImagePlan(artifact);
    const services = fakeServices([customer], [source]);

    await expect(applyLegacyImagePlan(artifact, services)).rejects.toThrow(/malformed/i);
    expect(services.copyObject).not.toHaveBeenCalled();
    expect(services.updateCustomer).not.toHaveBeenCalled();
  });
});
