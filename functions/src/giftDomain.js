import { createHash } from 'node:crypto';

export class GiftOperationError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'GiftOperationError';
    this.code = code;
  }
}

const ID = /^[A-Za-z0-9_-]{1,128}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const formatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Vientiane', year: 'numeric', month: '2-digit', day: '2-digit',
});

export function laosGiftDateKey(now = new Date()) {
  const parts = Object.fromEntries(formatter.formatToParts(now)
    .map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function assertUuid(value, label = 'Operation') {
  if (typeof value !== 'string' || !UUID.test(value)) {
    throw new GiftOperationError('invalid-argument', `${label} id must be a UUID`);
  }
  return value;
}

export function assertDocumentId(value, label = 'Document') {
  if (typeof value !== 'string' || !ID.test(value)) {
    throw new GiftOperationError('invalid-argument', `${label} id is invalid`);
  }
  return value;
}

export function normalizeGiftName(value) {
  if (typeof value !== 'string') {
    throw new GiftOperationError('invalid-argument', 'Gift name is required');
  }
  const name = value.trim().replace(/\s+/g, ' ');
  if (!name) throw new GiftOperationError('invalid-argument', 'Gift name is required');
  return { name, normalizedName: name.toLocaleLowerCase('lo-LA') };
}

export function giftStockId(branchId, giftId) {
  if (!ID.test(branchId ?? '') || !ID.test(giftId ?? '')) {
    throw new GiftOperationError('invalid-argument', 'Invalid gift stock identity');
  }
  return `${branchId}_${giftId}`;
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort()
      .map((key) => [key, canonicalize(value[key])]));
  }
  return value;
}

export function giftRequestDigest(value) {
  return createHash('sha256').update(JSON.stringify(canonicalize(value))).digest('hex');
}

export function giftMovementId(operationId, giftId) {
  return `${assertUuid(operationId)}_${assertDocumentId(giftId, 'Gift')}`;
}

export function normalizeGiftLines(lines, catalogById) {
  if (!Array.isArray(lines) || lines.length < 1 || lines.length > 25) {
    throw new GiftOperationError('invalid-argument', 'Gift items must contain 1 to 25 rows');
  }
  if (!(catalogById instanceof Map)) {
    throw new GiftOperationError('failed-precondition', 'Gift catalog unavailable');
  }
  const seen = new Set();
  const items = lines.map((line) => {
    const giftId = assertDocumentId(line?.giftId, 'Gift');
    if (seen.has(giftId)) throw new GiftOperationError('invalid-argument', 'Duplicate gift id');
    seen.add(giftId);
    const packs = Number(line?.packs ?? 0);
    const looseUnits = Number(line?.looseUnits ?? 0);
    if (!Number.isSafeInteger(packs) || packs < 0
      || !Number.isSafeInteger(looseUnits) || looseUnits < 0) {
      throw new GiftOperationError('invalid-argument', 'Gift quantities must be nonnegative safe integers');
    }
    const gift = catalogById.get(giftId);
    if (!gift?.active || !Number.isSafeInteger(gift.unitsPerPack) || gift.unitsPerPack < 1) {
      throw new GiftOperationError('failed-precondition', 'Active gift with valid safe pack size required');
    }
    const totalUnits = packs * gift.unitsPerPack + looseUnits;
    if (!Number.isSafeInteger(totalUnits)) {
      throw new GiftOperationError('invalid-argument', 'Gift quantity exceeds safe integer range');
    }
    if (totalUnits < 1) throw new GiftOperationError('invalid-argument', 'Gift row quantity required');
    return {
      giftId, giftNameSnapshot: gift.name, packs, looseUnits,
      unitsPerPackSnapshot: gift.unitsPerPack, totalUnits,
    };
  });
  const totalUnits = items.reduce((sum, item) => sum + item.totalUnits, 0);
  if (!Number.isSafeInteger(totalUnits)) {
    throw new GiftOperationError('invalid-argument', 'Gift quantity exceeds safe integer range');
  }
  return { items, totalUnits };
}
