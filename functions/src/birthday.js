const DAY_MS = 24 * 60 * 60 * 1000;
const STORAGE_PATTERN = /^(\d{2})-(\d{2})-(\d{4})$/;

const laoDateFormatter = new Intl.DateTimeFormat(
  'en-CA',
  {
    timeZone: 'Asia/Vientiane',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  },
);

function validParts(year, month, day) {
  if (year < 1 || month < 1 || month > 12 || day < 1) {
    return false;
  }

  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

function isLeapYear(year) {
  return year % 4 === 0
    && (year % 100 !== 0 || year % 400 === 0);
}

function utcDay({ year, month, day }) {
  return Date.UTC(year, month - 1, day);
}

function pad2(value) {
  return String(value).padStart(2, '0');
}

function dateKey({ year, month, day }) {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function laosDateParts(now) {
  const parts = laoDateFormatter.formatToParts(now);
  const value = (type) => Number(
    parts.find((part) => part.type === type)?.value,
  );
  const result = {
    year: value('year'),
    month: value('month'),
    day: value('day'),
  };

  return validParts(result.year, result.month, result.day)
    ? result
    : null;
}

function observedBirthday(birthDate, occurrenceYear) {
  if (
    birthDate.month === 2
    && birthDate.day === 29
    && !isLeapYear(occurrenceYear)
  ) {
    return {
      year: occurrenceYear,
      month: 2,
      day: 28,
    };
  }

  return {
    year: occurrenceYear,
    month: birthDate.month,
    day: birthDate.day,
  };
}

export function parseBirthDate(value) {
  const match = STORAGE_PATTERN.exec(value ?? '');

  if (!match) {
    return null;
  }

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);

  return validParts(year, month, day)
    ? { day, month, year }
    : null;
}

export function birthdayOccurrenceFor(customer, now = new Date()) {
  if (
    !customer
    || customer.priority !== 'VIP'
    || customer.recordState !== 'active'
  ) {
    return null;
  }

  const birthDate = parseBirthDate(customer.birthDate);
  const today = laosDateParts(now);

  if (
    !birthDate
    || !today
    || utcDay(birthDate) > utcDay(today)
  ) {
    return null;
  }

  let occurrence = observedBirthday(birthDate, today.year);

  if (utcDay(occurrence) < utcDay(today)) {
    occurrence = observedBirthday(birthDate, today.year + 1);
  }

  const daysRemaining = (
    utcDay(occurrence) - utcDay(today)
  ) / DAY_MS;

  if (daysRemaining < 0 || daysRemaining > 14) {
    return null;
  }

  return {
    customerId: customer.id,
    daysRemaining,
    occurrenceDate: dateKey(occurrence),
    occurrenceYear: occurrence.year,
  };
}

export function birthdayReminderFor(customer, now = new Date()) {
  const occurrence = birthdayOccurrenceFor(customer, now);

  if (
    !occurrence
    || customer.birthdayGreeting?.occurrenceYear
      === occurrence.occurrenceYear
  ) {
    return null;
  }

  return occurrence;
}
