import { describe, expect, it } from 'vitest';
import { routeForAuthState } from './routePolicy';

describe('routeForAuthState', () => {
  it.each([
    ['anonymous', '/login'],
    ['pending', '/pending'],
    ['disabled', '/disabled'],
    ['approved', null],
  ])('maps %s to %s', (state, destination) => {
    expect(routeForAuthState(state)).toBe(destination);
  });

  it('keeps admin pages server-claim gated', () => {
    expect(routeForAuthState('approved', true, { role: 'staff' })).toBe('/');
    expect(routeForAuthState('approved', true, { role: 'admin' })).toBe(null);
  });
});
