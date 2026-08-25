import { describe, expect, it } from 'vitest';
import { bucketFollowUp } from './followUp';

const now = new Date('2026-08-25T12:00:00+07:00');

describe('follow-up buckets', () => {
  it.each([
    ['2026-08-24T23:59:59+07:00', 'overdue'],
    ['2026-08-25T00:00:00+07:00', 'today'],
    ['2026-08-25T23:59:59+07:00', 'today'],
    ['2026-08-26T00:00:00+07:00', 'upcoming'],
  ])('classifies %s as %s using explicit local-day boundaries', (value, expected) => {
    expect(bucketFollowUp({ followUpRequired: true, followUpDate: new Date(value) }, now, 7)).toBe(expected);
  });

  it('excludes completed or non-required follow-up', () => {
    expect(bucketFollowUp({ followUpRequired: false, followUpDate: now }, now, 7)).toBeNull();
    expect(bucketFollowUp({ followUpRequired: true, followUpCompletedAt: now, followUpDate: now }, now, 7)).toBeNull();
  });
});
