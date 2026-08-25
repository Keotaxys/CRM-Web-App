import { describe, expect, it } from 'vitest';
import { deriveAuthState, pendingProfilePayload } from './authModel';

describe('auth account lifecycle', () => {
  it('distinguishes anonymous, pending, disabled, and approved states', () => {
    expect(deriveAuthState(null, null, null)).toBe('anonymous');
    expect(deriveAuthState({ uid: 'u1' }, { accountStatus: 'pending' }, {})).toBe('pending');
    expect(deriveAuthState({ uid: 'u1' }, { accountStatus: 'disabled' }, {})).toBe('disabled');
    expect(deriveAuthState({ uid: 'u1' }, { accountStatus: 'approved', role: 'staff', branchId: '010' }, { accountStatus: 'approved', role: 'staff', branchId: '010' })).toBe('approved');
  });

  it('fails closed when profile and server claims do not both approve access', () => {
    expect(deriveAuthState({ uid: 'u1' }, { accountStatus: 'approved' }, {})).toBe('pending');
    expect(deriveAuthState({ uid: 'u1' }, { accountStatus: 'approved' }, { accountStatus: 'disabled' })).toBe('disabled');
    expect(deriveAuthState({ uid: 'u1' }, { accountStatus: 'approved', role: 'staff', branchId: '010' }, { accountStatus: 'approved', role: 'staff', branchId: '019' })).toBe('pending');
  });

  it('creates registration profiles without self-selected role or branch', () => {
    const payload = pendingProfilePayload({ uid: 'u1', email: 'user@example.com' }, { name: 'New User', phone: '020' });
    expect(payload).toMatchObject({
      name: 'New User', phone: '020', email: 'user@example.com', role: null,
      branchId: null, accountStatus: 'pending',
    });
    expect(payload).not.toHaveProperty('branch');
    expect(payload.photoStoragePath).toBe('');
  });
});
