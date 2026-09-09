import { describe, expect, it } from 'vitest';
import {
  birthDateFromInput,
  birthDateToInput,
  birthdayReminderFor,
  isValidBirthDate,
  parseBirthDate,
  sortBirthdayReminders,
} from './birthday';

const vip = (overrides = {}) => ({
  id: 'customer-1',
  name: 'VIP Customer',
  priority: 'VIP',
  recordState: 'active',
  birthDate: '15-09-1990',
  ...overrides,
});

describe('customer birth-date storage contract', () => {
  it('converts between the date picker and DD-MM-YYYY storage', () => {
    expect(birthDateFromInput('1990-09-15')).toBe('15-09-1990');
    expect(birthDateToInput('15-09-1990')).toBe('1990-09-15');
    expect(birthDateFromInput('')).toBeNull();
    expect(birthDateToInput(null)).toBe('');
  });

  it.each([
    '1990-09-15',
    '1-09-1990',
    '15-9-1990',
    '31-02-2020',
    '29-02-2021',
    '00-01-2000',
    'not-a-date',
  ])('rejects malformed or impossible stored value %s', (value) => {
    expect(parseBirthDate(value)).toBeNull();
  });

  it('accepts a real leap day and rejects future dates', () => {
    expect(parseBirthDate('29-02-2020')).toEqual({
      day: 29,
      month: 2,
      year: 2020,
    });
    expect(isValidBirthDate('09-09-2026', '2026-09-09')).toBe(true);
    expect(isValidBirthDate('10-09-2026', '2026-09-09')).toBe(false);
  });
});

describe('VIP birthday reminders', () => {
  it.each([
    ['01-01-1990', '2034-12-18', 14, 2035],
    ['01-01-1990', '2034-12-25', 7, 2035],
    ['01-01-1990', '2034-12-31', 1, 2035],
    ['01-01-1990', '2035-01-01', 0, 2035],
  ])('calculates %s from %s as %i days remaining', (birthDate, today, days, year) => {
    expect(birthdayReminderFor(vip({ birthDate }), today)).toMatchObject({
      customerId: 'customer-1',
      daysRemaining: days,
      occurrenceYear: year,
    });
  });

  it('excludes day 15 and a birthday whose next occurrence is outside the window', () => {
    expect(birthdayReminderFor(vip({ birthDate: '01-01-1990' }), '2034-12-17')).toBeNull();
    expect(birthdayReminderFor(vip({ birthDate: '01-01-1990' }), '2035-01-02')).toBeNull();
  });

  it('observes 29 February on 28 February in a non-leap year', () => {
    expect(birthdayReminderFor(vip({ birthDate: '29-02-2000' }), '2035-02-14')).toMatchObject({
      daysRemaining: 14,
      occurrenceDate: '2035-02-28',
      occurrenceYear: 2035,
    });
  });

  it.each([
    { priority: 'ທົ່ວໄປ' },
    { recordState: 'archived' },
    { recordState: 'trashed' },
    { birthDate: null },
    { birthDate: '31-02-2020' },
  ])('excludes an ineligible customer %#', (overrides) => {
    expect(birthdayReminderFor(vip(overrides), '2026-09-01')).toBeNull();
  });

  it('excludes an acknowledged occurrence and returns the next annual occurrence later', () => {
    const customer = vip({
      birthdayGreeting: {
        occurrenceYear: 2026,
        acknowledgedBy: 'u1',
      },
    });

    expect(birthdayReminderFor(customer, '2026-09-01')).toBeNull();
    expect(birthdayReminderFor(customer, '2027-09-01')).toMatchObject({
      occurrenceYear: 2027,
      daysRemaining: 14,
    });
  });

  it('sorts by urgency and then customer name', () => {
    const items = [
      { daysRemaining: 7, customer: { name: 'Zulu' } },
      { daysRemaining: 1, customer: { name: 'Beta' } },
      { daysRemaining: 1, customer: { name: 'Alpha' } },
    ];

    expect(sortBirthdayReminders(items).map((item) => item.customer.name)).toEqual([
      'Alpha',
      'Beta',
      'Zulu',
    ]);
    expect(items[0].customer.name).toBe('Zulu');
  });
});
