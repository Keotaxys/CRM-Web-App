import { describe, expect, it } from 'vitest';
import {
  fromLaosDateTimeInput,
  isLaosDayWithinInclusiveRange,
  laosDayKey,
  laosTodayKey,
  millisecondsUntilNextLaosDay,
  toInputDateTime,
} from './dateTime';

describe('Laos CRM date boundaries', () => {
  it('groups an evening UTC instant into the following Laos day', () => {
    expect(laosDayKey('2026-08-24T18:30:00Z')).toBe('2026-08-25');
  });

  it('round-trips datetime-local values explicitly in UTC+7', () => {
    const instant = fromLaosDateTimeInput('2026-08-25T01:30');
    expect(instant.toISOString()).toBe('2026-08-24T18:30:00.000Z');
    expect(toInputDateTime(instant)).toBe('2026-08-25T01:30');
  });

  it('derives today and the next midnight in Laos from an instant', () => {
    const now = new Date('2026-09-08T17:30:00.000Z');

    expect(laosTodayKey(now)).toBe('2026-09-09');
    expect(millisecondsUntilNextLaosDay(now)).toBe(23.5 * 60 * 60 * 1000);
  });

  it('matches both inclusive activity range endpoints', () => {
    expect(isLaosDayWithinInclusiveRange('2026-09-08T17:00:00.000Z', '2026-09-09', '2026-09-10')).toBe(true);
    expect(isLaosDayWithinInclusiveRange('2026-09-09T16:59:59.000Z', '2026-09-09', '2026-09-10')).toBe(true);
    expect(isLaosDayWithinInclusiveRange('2026-09-10T17:00:00.000Z', '2026-09-09', '2026-09-10')).toBe(false);
  });

  it('fails closed for incomplete or reversed activity ranges', () => {
    expect(isLaosDayWithinInclusiveRange(new Date(), '', '2026-09-10')).toBe(false);
    expect(isLaosDayWithinInclusiveRange(new Date(), '2026-09-10', '2026-09-09')).toBe(false);
  });
});
