// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { analyzeSnapshot, auditStorageObjects, migrateCustomer, migrateUser } from './core.mjs';

describe('migration transforms', () => {
  it('extends a customer without changing its ID or legacy fields', () => {
    const source = { id: 'c1', name: 'Legacy', gps: 'https://maps/old', imageUrl: 'https://image', branch: '020 - ສາຂາ ຄຳມ່ວນ' };
    const result = migrateCustomer(source);
    expect(result.id).toBe('c1');
    expect(result.patch).toEqual({ branchId: '020', recordState: 'active' });
    expect(source).toEqual({ id: 'c1', name: 'Legacy', gps: 'https://maps/old', imageUrl: 'https://image', branch: '020 - ສາຂາ ຄຳມ່ວນ' });
  });

  it('approves safely mapped legacy users as staff but flags legacy Admin for manual review', () => {
    expect(migrateUser({ uid: 'u1', branch: '010 - ສຳນັກງານໃຫຍ່' }).patch).toEqual({ role: 'staff', branchId: '010', accountStatus: 'approved' });
    const admin = migrateUser({ uid: 'u2', branch: 'Admin' });
    expect(admin.patch).toEqual({});
    expect(admin.conflicts).toContain('legacy_admin_requires_verified_uid');
  });

  it('produces aggregate coverage without customer PII', () => {
    const report = analyzeSnapshot({
      customers: [
        { id: 'c1', branch: '010 - ສຳນັກງານໃຫຍ່', gps: 'https://maps', imageUrl: 'https://image' },
        { id: 'c2', branch: 'Unknown' },
      ],
      users: [{ uid: 'u1', branch: '010 - ສຳນັກງານໃຫຍ່' }],
      storageObjects: ['customers/legacy-face.jpg', 'unused.jpg'],
    });
    expect(report).toMatchObject({ customerCount: 2, userCount: 1, customersNeedingBranchId: 2, usersNeedingAccessFields: 1, legacyGpsCount: 1, legacyImageCount: 1 });
    expect(JSON.stringify(report)).not.toContain('Legacy');
    expect(report.conflictCounts.unknownCustomerBranch).toBe(1);
  });

  it('reports only unreferenced storage objects as potential orphans', () => {
    const report = auditStorageObjects(
      [{ imageStoragePath: 'customers/c1/customer-photo', placeImageUrl: 'https://firebasestorage.googleapis.com/v0/b/demo/o/places%2Flegacy.jpg?alt=media&token=x' }],
      ['customers/c1/customer-photo', 'places/legacy.jpg', 'places/orphan.jpg'],
    );
    expect(report).toEqual({ objectCount: 3, referencedObjectCount: 2, potentialOrphanCount: 1, potentialOrphanPaths: ['places/orphan.jpg'] });
  });
});
