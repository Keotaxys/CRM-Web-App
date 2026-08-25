import { describe, expect, it } from 'vitest';
import { customerQuickActions } from './quickActions';

describe('customerQuickActions', () => {
  it('preserves phone, WhatsApp, and legacy GPS links', () => {
    expect(customerQuickActions({ phone: '+856 20 5555 1234', gps: 'https://maps.google.com/test' })).toEqual({
      call: 'tel:+8562055551234',
      whatsapp: 'https://wa.me/8562055551234',
      map: 'https://maps.google.com/test',
    });
  });
});
