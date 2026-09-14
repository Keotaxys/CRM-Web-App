import { toDate } from '../shared/dateTime';

const TIMESTAMP_FIELDS = [
  'createdAt',
  'updatedAt',
  'cancelledAt',
  'confirmedAt',
  'occurredAt',
];

function normalizeTimestamps(value) {
  const normalized = { ...value };
  for (const field of TIMESTAMP_FIELDS) {
    if (Object.hasOwn(value, field)) normalized[field] = toDate(value[field]);
  }
  return normalized;
}

function formInteger(value, { minimum = 0, label = 'Gift quantity' } = {}) {
  let number;
  if (typeof value === 'number') {
    if (Object.is(value, -0)) {
      throw new Error(`${label} must be a safe integer`);
    }
    number = value;
  } else if (typeof value === 'string') {
    const text = value.trim();
    if (!/^(?:0|-?[1-9]\d*)$/.test(text)) {
      throw new Error(`${label} must be a safe integer`);
    }
    number = Number(text);
  } else {
    throw new Error(`${label} must be a safe integer`);
  }
  if (!Number.isSafeInteger(number) || number < minimum) {
    throw new Error(`${label} must be a safe integer`);
  }
  return number;
}

export function giftLineTotal(line, gift) {
  const packs = formInteger(line?.packs);
  const looseUnits = formInteger(line?.looseUnits);
  const unitsPerPack = formInteger(gift?.unitsPerPack, {
    minimum: 1,
    label: 'Gift units per pack',
  });
  const totalUnits = packs * unitsPerPack + looseUnits;
  if (!Number.isSafeInteger(totalUnits)) {
    throw new Error('Gift quantity must be a safe integer');
  }
  return totalUnits;
}

export function giftStockDisplay(currentUnits, gift) {
  const units = formInteger(currentUnits, { label: 'Gift stock' });
  const unitsPerPack = formInteger(gift?.unitsPerPack, {
    minimum: 1,
    label: 'Gift units per pack',
  });
  const packs = Math.floor(units / unitsPerPack);
  const looseUnits = units % unitsPerPack;
  return `${packs} ${gift?.packLabel ?? ''} ${looseUnits} ${gift?.unitLabel ?? ''}`.trim();
}

export function isLowGiftStock(stock) {
  const currentUnits = Number(stock?.currentUnits);
  const threshold = Number(stock?.lowStockThresholdUnits);
  return Number.isSafeInteger(currentUnits)
    && Number.isSafeInteger(threshold)
    && currentUnits >= 0
    && threshold >= 0
    && currentUnits <= threshold;
}

export function normalizeGiftItem(item) {
  return item ? normalizeTimestamps(item) : null;
}

export function normalizeGiftStock(stock) {
  if (!stock) return null;
  const normalized = normalizeTimestamps(stock);
  for (const field of ['currentUnits', 'lowStockThresholdUnits', 'version']) {
    if (Object.hasOwn(stock, field)) normalized[field] = Number(stock[field]);
  }
  return normalized;
}

export function normalizeGiftCampaign(campaign) {
  return campaign ? normalizeTimestamps(campaign) : null;
}

export function normalizeGiftDistribution(distribution) {
  if (!distribution) return null;
  const items = (Array.isArray(distribution.items) ? distribution.items : [])
    .map((item) => ({
      ...item,
      packs: Number(item?.packs),
      looseUnits: Number(item?.looseUnits),
      totalUnits: Number(item?.totalUnits),
    }))
    .filter((item) => item.giftId
      && Number.isSafeInteger(item.packs) && item.packs >= 0
      && Number.isSafeInteger(item.looseUnits) && item.looseUnits >= 0
      && Number.isSafeInteger(item.totalUnits) && item.totalUnits > 0);
  return {
    ...normalizeTimestamps(distribution),
    items,
    totalUnits: items.reduce((total, item) => total + item.totalUnits, 0),
  };
}

export function normalizeGiftMovement(movement) {
  if (!movement) return null;
  const normalized = normalizeTimestamps(movement);
  for (const field of ['deltaUnits', 'balanceBeforeUnits', 'balanceAfterUnits']) {
    if (Object.hasOwn(movement, field)) normalized[field] = Number(movement[field]);
  }
  return normalized;
}
