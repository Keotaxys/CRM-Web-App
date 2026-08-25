import { describe, expect, it } from 'vitest';
import { customerImagePath, profileImagePath } from './imagePaths';

describe('managed image paths', () => {
  it('supports exactly customer-photo and place-photo customer slots', () => {
    expect(customerImagePath('customer-123', 'customer')).toBe('customers/customer-123/customer-photo');
    expect(customerImagePath('customer-123', 'place')).toBe('customers/customer-123/place-photo');
    expect(() => customerImagePath('customer-123', 'visit')).toThrow(/slot/i);
  });

  it('uses an owner-scoped profile avatar path', () => {
    expect(profileImagePath('uid-123')).toBe('profiles/uid-123/avatar');
  });
});
