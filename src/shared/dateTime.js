export function toDate(value) {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate();
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDateTime(value) {
  const date = toDate(value);
  return date ? new Intl.DateTimeFormat('lo-LA', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Vientiane' }).format(date) : '—';
}

export function toInputDateTime(value) {
  const date = toDate(value);
  if (!date) return '';
  const local = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

export function fromLaosDateTimeInput(value) {
  if (!value) return null;
  const date = new Date(`${value}:00+07:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function laosDayKey(value) {
  const date = toDate(value);
  if (!date) return '';
  return new Date(date.getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function laosTodayKey(now = new Date()) {
  return laosDayKey(now);
}

export function millisecondsUntilNextLaosDay(now = new Date()) {
  const [year, month, day] = laosTodayKey(now).split('-').map(Number);
  const nextMidnight = Date.UTC(year, month - 1, day + 1) - 7 * 60 * 60 * 1000;
  return Math.max(0, nextMidnight - now.getTime());
}

export function isLaosDayWithinInclusiveRange(value, startKey, endKey) {
  if (!startKey || !endKey || startKey > endKey) return false;
  const key = laosDayKey(value);
  return Boolean(key && key >= startKey && key <= endKey);
}

export function formatLaosTime(value) {
  const date = toDate(value);
  return date ? new Intl.DateTimeFormat('lo-LA', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Vientiane' }).format(date) : '—';
}
