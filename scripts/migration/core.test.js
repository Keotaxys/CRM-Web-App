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

  it('migrates a legacy user once and treats the migrated user as clean on the second run', () => {
    const legacy = { uid: 'u1', branch: '010 - ສຳນັກງານໃຫຍ່' };
    const first = migrateUser(legacy);
    expect(first).toEqual({ uid: 'u1', patch: { role: 'staff', branchId: '010', accountStatus: 'approved' }, conflicts: [] });
    const second = migrateUser({ ...legacy, ...first.patch });
    expect(second).toEqual({ uid: 'u1', patch: {}, conflicts: [] });
  });

  it('keeps canonical Pending, Disabled, Staff, Branch Manager, and Admin profiles idempotent', () => {
    const canonicalUsers = [
      { uid: 'pending', role: null, branchId: null, accountStatus: 'pending' },
      { uid: 'disabled-staff', role: 'staff', branchId: '020', accountStatus: 'disabled' },
      { uid: 'disabled-manager', role: 'branch_manager', branchId: '050', accountStatus: 'disabled' },
      { uid: 'staff', role: 'staff', branchId: '060', accountStatus: 'approved' },
      { uid: 'manager', role: 'branch_manager', branchId: '110', accountStatus: 'approved' },
      { uid: 'admin', role: 'admin', branchId: null, accountStatus: 'approved' },
      { uid: 'disabled-admin', role: 'admin', branchId: null, accountStatus: 'disabled' },
    ];
    for (const user of canonicalUsers) {
      expect(migrateUser(user), user.uid).toEqual({ uid: user.uid, patch: {}, conflicts: [] });
    }
  });

  it('keeps a bootstrapped canonical Admin clean without trusting legacy branch Admin', () => {
    expect(migrateUser({ uid: 'verified-admin', branch: 'Admin', role: 'admin', branchId: null, accountStatus: 'approved' })).toEqual({ uid: 'verified-admin', patch: {}, conflicts: [] });
    const admin = migrateUser({ uid: 'u2', branch: 'Admin' });
    expect(admin.patch).toEqual({});
    expect(admin.conflicts).toContain('legacy_admin_requires_verified_uid');
  });

  it('fails closed for invalid role, branch, and account-status combinations', () => {
    const invalidUsers = [
      { uid: 'pending-with-role', role: 'staff', branchId: '010', accountStatus: 'pending' },
      { uid: 'approved-no-role', role: null, branchId: null, accountStatus: 'approved' },
      { uid: 'admin-with-branch', role: 'admin', branchId: '010', accountStatus: 'approved' },
      { uid: 'staff-no-branch', role: 'staff', branchId: null, accountStatus: 'approved' },
      { uid: 'manager-bad-branch', role: 'branch_manager', branchId: '999', accountStatus: 'disabled' },
      { uid: 'unknown-role', role: 'superuser', branchId: '010', accountStatus: 'approved' },
      { uid: 'unknown-status', role: 'staff', branchId: '010', accountStatus: 'mystery' },
    ];
    for (const user of invalidUsers) {
      const result = migrateUser(user);
      expect(result.patch, user.uid).toEqual({});
      expect(result.conflicts.length, user.uid).toBeGreaterThan(0);
    }
  });

  it('blocks invalid truthy canonical fields instead of trusting them', () => {
    expect(migrateCustomer({ id: 'c1', branchId: '999', recordState: 'live' }).conflicts).toEqual(expect.arrayContaining(['invalid_existing_branch', 'invalid_record_state']));
    expect(migrateUser({ uid: 'u1', branchId: '999', role: 'staff', accountStatus: 'approved' }).conflicts).toContain('invalid_existing_branch');
    expect(migrateUser({ uid: 'u2', branchId: '010', role: 'staff', accountStatus: 'mystery' }).conflicts).toContain('invalid_account_status');
  });

  it('counts invalid access states in the apply gate total', () => {
    const report = analyzeSnapshot({ customers: [], users: [{ uid: 'u1', role: 'admin', branchId: '010', accountStatus: 'approved' }] });
    expect(report.conflictCounts.invalidCanonicalAccessState).toBe(1);
    expect(report.migrationConflictCount).toBe(1);
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

  it('reports Auth/profile coverage without exposing UIDs', () => {
    const report=analyzeSnapshot({customers:[],users:[{uid:'profile-only'}],authUsers:[{uid:'auth-only'}]});
    expect(report).toMatchObject({authUserCount:1,authUsersMissingProfile:1,userDocumentsMissingAuth:1});
    expect(report.userDocumentsMissingAuth).toBeGreaterThan(0);
    expect(JSON.stringify(report)).not.toContain('auth-only');
  });

  it('never changes Customer IDs or Firebase Auth UIDs', () => {
    const customer = migrateCustomer({ id: 'customer-fixed-id', branch: '020 - ສາຂາ ຄຳມ່ວນ' });
    const user = migrateUser({ uid: 'auth-fixed-uid', branch: '020 - ສາຂາ ຄຳມ່ວນ' });
    expect(customer.id).toBe('customer-fixed-id');
    expect(customer.patch).not.toHaveProperty('id');
    expect(user.uid).toBe('auth-fixed-uid');
    expect(user.patch).not.toHaveProperty('uid');
  });

  it('reports only unreferenced storage objects as potential orphans', () => {
    const report = auditStorageObjects(
      [{ imageStoragePath: 'customers/c1/customer-photo', placeImageUrl: 'https://firebasestorage.googleapis.com/v0/b/demo/o/places%2Flegacy.jpg?alt=media&token=x' }],
      ['customers/c1/customer-photo', 'places/legacy.jpg', 'places/orphan.jpg'],
    );
    expect(report).toEqual({ objectCount: 3, referencedObjectCount: 2, potentialOrphanCount: 1, potentialOrphanPaths: ['places/orphan.jpg'] });
  });
});
