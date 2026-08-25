import { describe, expect, it } from 'vitest';
import { fromLaosDateTimeInput, laosDayKey, toInputDateTime } from './dateTime';

describe('Laos CRM date boundaries', () => {
  it('groups an evening UTC instant into the following Laos day', () => {
    expect(laosDayKey('2026-08-24T18:30:00Z')).toBe('2026-08-25');
  });

  it('round-trips datetime-local values explicitly in UTC+7', () => {
    const instant = fromLaosDateTimeInput('2026-08-25T01:30');
    expect(instant.toISOString()).toBe('2026-08-24T18:30:00.000Z');
    expect(toInputDateTime(instant)).toBe('2026-08-25T01:30');
  });
});
