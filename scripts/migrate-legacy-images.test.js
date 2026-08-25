import { describe, expect, it, vi } from 'vitest';
import { createLegacyImagePlan } from './legacy-images/core.mjs';
import { main, managedCopyOptions } from './migrate-legacy-images.mjs';

const PROJECT = 'crm-web-app-97b91';
const BUCKET = 'crm-web-app-97b91.firebasestorage.app';
const SOURCE = 'customers/legacy.jpg';
const URL = `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(SOURCE)}?alt=media&token=secret`;
const OBJECT = { name: SOURCE, generation: '1', size: '10', contentType: 'image/jpeg', md5Hash: 'abc', crc32c: 'def' };

function services() {
  return {
    db: {},
    inspectObject: vi.fn(),
    copyObject: vi.fn(),
    readCustomer: vi.fn(),
    updateCustomer: vi.fn(),
    close: vi.fn(async () => undefined),
  };
}

describe('legacy image migration CLI safety', () => {
  it('creates managed copies without carrying legacy bearer-token metadata', () => {
    expect(managedCopyOptions({ contentType: 'image/jpeg' })).toEqual({
      contentType: 'image/jpeg',
      metadata: {},
      preconditionOpts: { ifGenerationMatch: 0 },
    });
  });

  it('defaults to a read-only dry-run that writes only a private reviewed plan', async () => {
    const connected = services();
    const writePlan = vi.fn(async () => undefined);
    const logger = { log: vi.fn(), error: vi.fn() };

    const result = await main([
      '--project', PROJECT,
      '--bucket', BUCKET,
      '--out', 'artifacts/private/legacy-images/reviewed.json',
    ], {}, {
      adminServices: async () => connected,
      loadCustomers: async () => [{ id: 'customer-1', imageUrl: URL }],
      inspectCandidateObjects: async () => [OBJECT],
      writePlan,
      now: () => new Date('2026-08-25T03:00:00.000Z'),
      logger,
    });

    expect(result).toMatchObject({ mode: 'DRY_RUN', sourceDeletionPlanned: 0, summary: { readyToCopy: 1, conflicts: 0 } });
    expect(writePlan).toHaveBeenCalledWith(expect.objectContaining({ sourceProject: PROJECT }), expect.stringMatching(/artifacts[\\/]private[\\/]legacy-images[\\/]reviewed\.json$/));
    expect(connected.copyObject).not.toHaveBeenCalled();
    expect(connected.updateCustomer).not.toHaveBeenCalled();
    expect(connected.close).toHaveBeenCalledOnce();
  });

  it('blocks apply before any remote write when a required confirmation is missing', async () => {
    const connected = services();
    const adminServices = vi.fn(async () => connected);
    const artifact = createLegacyImagePlan({
      project: PROJECT,
      bucket: BUCKET,
      customers: [{ id: 'customer-1', imageUrl: URL }],
      objects: [OBJECT],
      now: () => new Date('2026-08-25T03:00:00.000Z'),
    });

    await expect(main([
      '--apply',
      '--project', PROJECT,
      '--bucket', BUCKET,
      '--confirm-project', PROJECT,
      '--input', 'artifacts/private/legacy-images/reviewed.json',
      '--confirm-digest', artifact.digest.value,
    ], { ALLOW_PRODUCTION_MIGRATION: PROJECT }, {
      adminServices,
      readFile: async () => JSON.stringify(artifact),
      logger: { log: vi.fn(), error: vi.fn() },
    })).rejects.toThrow(/apply blocked/i);

    expect(adminServices).not.toHaveBeenCalled();
    expect(connected.copyObject).not.toHaveBeenCalled();
    expect(connected.updateCustomer).not.toHaveBeenCalled();
    expect(connected.close).not.toHaveBeenCalled();
  });
});
