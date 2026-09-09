import { describe, expect, it } from 'vitest';
import {
  customerCreatePayload,
  customerUpdatePayload,
  normalizeCustomer,
} from './customerModel';

describe('legacy customer compatibility', () => {
  const legacy = {
    id: 'customer-1',
    name: 'Legacy',
    phone: '020',
    address: 'Address',
    status: 'ຕິດຕາມຕໍ່',
    priority: 'VIP',
    branch: '010 - ສຳນັກງານໃຫຍ່',
    note: 'keep',
    gps: 'https://maps.example/legacy',
    imageUrl: 'https://images/face',
    placeImageUrl: 'https://images/place',
    statusTimestamps: { 'ໃໝ່': 'old-value' },
    createdBy: 'legacy@example.com',
    createdAt: 'legacy-created-at',
  };

  it('preserves legacy fields and derives only safe compatibility defaults', () => {
    expect(normalizeCustomer(legacy)).toEqual(
      expect.objectContaining({
        ...legacy,
        birthDate: null,
        branchId: '010',
        recordState: 'active',
        location: null,
      }),
    );
  });

  it('does not fabricate coordinates from a legacy GPS URL', () => {
    expect(normalizeCustomer(legacy).location).toBeNull();
  });

  it('creates own-branch records with immutable creation metadata', () => {
    const payload = customerCreatePayload(
      {
        name: 'A',
        phone: '020',
        status: 'ໃໝ່',
        birthDate: '15-09-1990',
      },
      {
        uid: 'u1',
        email: 'u@example.com',
        branchId: '010',
      },
      'NOW',
    );

    expect(payload).toMatchObject({
      branchId: '010',
      branch: '010 - ສຳນັກງານໃຫຍ່',
      recordState: 'active',
      createdBy: 'u1',
      createdAt: 'NOW',
      updatedBy: 'u1',
      updatedAt: 'NOW',
      birthDate: '15-09-1990',
    });
  });

  it('stores a missing birth date as null and allows ordinary users to edit or clear it', () => {
    expect(customerCreatePayload(
      { name: 'A', phone: '020', status: 'ໃໝ່' },
      { uid: 'u1', branchId: '010' },
      'NOW',
    ).birthDate).toBeNull();

    expect(customerUpdatePayload(
      { birthDate: '15-09-1990' },
      { uid: 'u1' },
      'NOW',
    )).toMatchObject({ birthDate: '15-09-1990' });

    expect(customerUpdatePayload(
      { birthDate: null },
      { uid: 'u1' },
      'NOW',
    )).toMatchObject({ birthDate: null });
  });

  it('drops privileged fields from ordinary customer updates', () => {
    const payload = customerUpdatePayload(
      {
        name: 'Changed',
        branchId: '999',
        createdBy: 'attacker',
        createdAt: 'fake',
        deletedBy: 'attacker',
        deletedAt: 'fake',
        role: 'admin',
      },
      { uid: 'u1' },
      'NOW',
    );

    expect(payload).toEqual({
      name: 'Changed',
      updatedBy: 'u1',
      updatedAt: 'NOW',
    });
  });

  it('keeps status lifecycle fields out of generic customer updates', () => {
    const payload = customerUpdatePayload(
      {
        name: 'Changed',
        status: 'ດຳເນີນການແລ້ວ',
        statusTimestamps: {
          'ດຳເນີນການແລ້ວ': 'STALE',
        },
      },
      { uid: 'u1' },
      'NOW',
    );

    expect(payload).toEqual({
      name: 'Changed',
      updatedBy: 'u1',
      updatedAt: 'NOW',
    });
  });
});
