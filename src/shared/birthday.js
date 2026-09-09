import { laosTodayKey } from './dateTime';

const DAY_MS = 24 * 60 * 60 * 1000;
const STORAGE_PATTERN = /^(\d{2})-(\d{2})-(\d{4})$/;
const INPUT_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function pad2(value) {
  return String(value).padStart(2, '0');
}

function isLeapYear(year) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function validParts(year, month, day) {
  if (year < 1 || month < 1 || month > 12 || day < 1) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

function parseDayKey(value) {
  const match = INPUT_PATTERN.exec(value ?? '');
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  return validParts(year, month, day) ? { year, month, day } : null;
}

function dayKey({ year, month, day }) {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function utcDay({ year, month, day }) {
  return Date.UTC(year, month - 1, day);
}

function observedBirthday(parts, occurrenceYear) {
  if (parts.month === 2 && parts.day === 29 && !isLeapYear(occurrenceYear)) {
    return { year: occurrenceYear, month: 2, day: 28 };
  }
  return { year: occurrenceYear, month: parts.month, day: parts.day };
}

export function parseBirthDate(value) {
  const match = STORAGE_PATTERN.exec(value ?? '');
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  return validParts(year, month, day) ? { day, month, year } : null;
}

export function birthDateFromInput(value) {
  if (!value) return null;
  const parts = parseDayKey(value);
  if (!parts) throw new Error('Invalid birth date');
  return `${pad2(parts.day)}-${pad2(parts.month)}-${parts.year}`;
}

export function birthDateToInput(value) {
  const parts = parseBirthDate(value);
  return parts ? dayKey(parts) : '';
}

export function isValidBirthDate(value, todayKey = laosTodayKey()) {
  const birthDate = parseBirthDate(value);
  const today = parseDayKey(todayKey);
  return Boolean(birthDate && today && utcDay(birthDate) <= utcDay(today));
}

export function birthdayReminderGroup(daysRemaining) {
  if (daysRemaining === 0) return 'today';
  if (daysRemaining >= 1 && daysRemaining <= 7) return 'week';
  if (daysRemaining >= 8 && daysRemaining <= 14) return 'fortnight';
  return null;
}

export function birthdayReminderFor(customer, todayKey = laosTodayKey()) {
  if (!customer
    || customer.priority !== 'VIP'
    || customer.recordState !== 'active'
    || !isValidBirthDate(customer.birthDate, todayKey)) {
    return null;
  }

  const birthDate = parseBirthDate(customer.birthDate);
  const today = parseDayKey(todayKey);
  let occurrence = observedBirthday(birthDate, today.year);
  if (utcDay(occurrence) < utcDay(today)) {
    occurrence = observedBirthday(birthDate, today.year + 1);
  }

  const daysRemaining = (utcDay(occurrence) - utcDay(today)) / DAY_MS;
  const group = birthdayReminderGroup(daysRemaining);
  if (!group
    || customer.birthdayGreeting?.occurrenceYear === occurrence.year) {
    return null;
  }

  return {
    customer,
    customerId: customer.id,
    daysRemaining,
    group,
    occurrenceDate: dayKey(occurrence),
    occurrenceYear: occurrence.year,
  };
}

export function sortBirthdayReminders(items) {
  return [...items].sort((left, right) => {
    const dayDifference = left.daysRemaining - right.daysRemaining;
    if (dayDifference) return dayDifference;
    const leftName = left.customer?.name ?? '';
    const rightName = right.customer?.name ?? '';
    return leftName.localeCompare(rightName, 'lo');
  });
}
