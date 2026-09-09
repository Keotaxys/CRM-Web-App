import test from 'node:test';
import assert from 'node:assert/strict';
import {
  birthdayReminderFor,
  parseBirthDate,
} from '../src/birthday.js';

test('server birthday parser accepts only real DD-MM-YYYY dates', () => {
  assert.deepEqual(parseBirthDate('29-02-2020'), {
    day: 29,
    month: 2,
    year: 2020,
  });

  for (const value of [
    '2020-02-29',
    '29-02-2021',
    '31-04-2020',
    'not-a-date',
    null,
  ]) {
    assert.equal(parseBirthDate(value), null);
  }
});

test('server reminder calculation uses Laos calendar dates and a 14-day window', () => {
  const customer = {
    id: 'c1',
    priority: 'VIP',
    recordState: 'active',
    birthDate: '01-01-1990',
  };

  assert.deepEqual(
    birthdayReminderFor(customer, new Date('2034-12-18T12:00:00+07:00')),
    {
      customerId: 'c1',
      daysRemaining: 14,
      occurrenceDate: '2035-01-01',
      occurrenceYear: 2035,
    },
  );

  assert.equal(
    birthdayReminderFor(customer, new Date('2034-12-17T12:00:00+07:00')),
    null,
  );

  for (const [date, daysRemaining] of [
    ['2034-12-25T12:00:00+07:00', 7],
    ['2034-12-31T12:00:00+07:00', 1],
    ['2035-01-01T12:00:00+07:00', 0],
  ]) {
    assert.equal(
      birthdayReminderFor(customer, new Date(date))?.daysRemaining,
      daysRemaining,
    );
  }
});

test('server reminder observes leap-day birthdays on 28 February in non-leap years', () => {
  const result = birthdayReminderFor({
    id: 'leap',
    priority: 'VIP',
    recordState: 'active',
    birthDate: '29-02-2000',
  }, new Date('2035-02-14T12:00:00+07:00'));

  assert.deepEqual(result, {
    customerId: 'leap',
    daysRemaining: 14,
    occurrenceDate: '2035-02-28',
    occurrenceYear: 2035,
  });
});

test('server reminder calculation excludes ineligible and acknowledged customers', () => {
  const base = {
    id: 'c1',
    priority: 'VIP',
    recordState: 'active',
    birthDate: '15-09-1990',
  };
  const now = new Date('2026-09-09T12:00:00+07:00');

  assert.equal(birthdayReminderFor({ ...base, priority: 'ທົ່ວໄປ' }, now), null);
  assert.equal(birthdayReminderFor({ ...base, recordState: 'archived' }, now), null);
  assert.equal(birthdayReminderFor({
    ...base,
    birthdayGreeting: { occurrenceYear: 2026 },
  }, now), null);
});
