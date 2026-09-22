import { laosTodayKey } from '../shared/dateTime';

const RECEIVED_TYPES = new Set(['receive', 'allocation_receive']);
const DISTRIBUTION_TYPES = new Set(['distribute', 'distribution_amend', 'distribution_cancel']);

function parseDateKey(key) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key ?? '');
  if (!match) throw new Error('Valid YYYY-MM-DD gift date required');
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  if (date.toISOString().slice(0, 10) !== key) {
    throw new Error('Valid YYYY-MM-DD gift date required');
  }
  return date;
}

function dateKey(date) {
  return date.toISOString().slice(0, 10);
}

function shiftKey(key, days) {
  const date = parseDateKey(key);
  date.setUTCDate(date.getUTCDate() + days);
  return dateKey(date);
}

function customRange(custom) {
  parseDateKey(custom?.startKey);
  parseDateKey(custom?.endKey);
  if (custom.startKey > custom.endKey) throw new Error('Valid gift date range required');
  return { startKey: custom.startKey, endKey: custom.endKey };
}

export function giftDateRange(preset, anchorKey = laosTodayKey(), custom = {}) {
  const anchor = parseDateKey(anchorKey);
  if (preset === 'today') return { startKey: anchorKey, endKey: anchorKey };
  if (preset === 'week') {
    const mondayOffset = (anchor.getUTCDay() + 6) % 7;
    return {
      startKey: shiftKey(anchorKey, -mondayOffset),
      endKey: shiftKey(anchorKey, 6 - mondayOffset),
    };
  }
  if (preset === 'month') {
    const year = anchor.getUTCFullYear();
    const month = anchor.getUTCMonth();
    return {
      startKey: dateKey(new Date(Date.UTC(year, month, 1))),
      endKey: dateKey(new Date(Date.UTC(year, month + 1, 0))),
    };
  }
  if (preset === 'year') {
    const year = anchor.getUTCFullYear();
    return { startKey: `${year}-01-01`, endKey: `${year}-12-31` };
  }
  if (preset === 'custom') return customRange(custom);
  throw new Error('Valid gift date preset required');
}

function safeInteger(value, label, { minimum = Number.MIN_SAFE_INTEGER } = {}) {
  if (!Number.isSafeInteger(value) || value < minimum) {
    throw new Error(`${label} must be a safe integer`);
  }
  return value;
}

function safeAdd(left, right, label = 'Gift report total') {
  const total = left + right;
  if (!Number.isSafeInteger(total)) throw new Error(`${label} must be a safe integer`);
  return total;
}

function stableId(left, right) {
  return String(left).localeCompare(String(right));
}

function descendingUnits(left, right) {
  if (left.distributedUnits !== right.distributedUnits) {
    return left.distributedUnits > right.distributedUnits ? -1 : 1;
  }
  return 0;
}

function reportRange(filters) {
  const hasStart = filters.startKey != null && filters.startKey !== '';
  const hasEnd = filters.endKey != null && filters.endKey !== '';
  if (!hasStart && !hasEnd) return null;
  if (!hasStart || !hasEnd) throw new Error('Valid gift date range required');
  return customRange(filters);
}

function stockMatches(stock, filters) {
  return (!filters.giftId || stock.giftId === filters.giftId)
    && (!filters.branchId || stock.branchId === filters.branchId);
}

function movementMatches(item, filters, range, canViewInbound) {
  if (!canViewInbound && !DISTRIBUTION_TYPES.has(item.movementType)) return false;
  if (range && (item.dateKey < range.startKey || item.dateKey > range.endKey)) return false;
  if (filters.giftId && item.giftId !== filters.giftId) return false;
  if (filters.branchId && item.branchId !== filters.branchId) return false;
  if (filters.staffUid && item.distributionOwnerUid !== filters.staffUid) return false;
  if (filters.customerId && item.customerId !== filters.customerId) return false;
  if (filters.campaignId && item.campaignId !== filters.campaignId) return false;
  if (filters.movementType && item.movementType !== filters.movementType) return false;
  return true;
}

function movementRow(item, catalogById) {
  const recipientType = item.recipientType
    ?? (item.customerId ? 'customer' : item.campaignId ? 'campaign' : '');
  const recipientName = recipientType === 'customer'
    ? item.customerNameSnapshot ?? item.customerName ?? item.customerId ?? ''
    : recipientType === 'campaign'
      ? item.campaignNameSnapshot ?? item.campaignName ?? item.campaignId ?? ''
      : '';
  return {
    ...item,
    giftName: item.giftNameSnapshot ?? catalogById.get(item.giftId)?.name ?? item.giftId ?? '',
    beforeUnits: item.balanceBeforeUnits ?? item.beforeUnits ?? null,
    afterUnits: item.balanceAfterUnits ?? item.afterUnits ?? null,
    distributionOwnerName: item.distributionOwnerNameSnapshot
      ?? item.distributionOwnerName ?? item.distributionOwnerUid ?? '',
    actorName: item.actorNameSnapshot ?? item.actorName ?? item.actorUid ?? '',
    recipientType,
    recipientName,
    reason: item.reason ?? '',
  };
}

function emptyMovementSummary(idField, id, nameField, name) {
  return {
    [idField]: id,
    [nameField]: name ?? id,
    receivedUnits: 0,
    distributedUnits: 0,
    adjustmentUnits: 0,
    currentUnits: 0,
    lowStockCount: 0,
    latestSnapshotKey: '',
  };
}

function updateSnapshot(summary, key, nameField, name) {
  if (name != null && key >= summary.latestSnapshotKey) {
    summary.latestSnapshotKey = key;
    summary[nameField] = name;
  }
}

function addMovement(summary, item) {
  if (RECEIVED_TYPES.has(item.movementType)) {
    summary.receivedUnits = safeAdd(summary.receivedUnits, item.deltaUnits);
  } else if (DISTRIBUTION_TYPES.has(item.movementType)) {
    summary.distributedUnits = safeAdd(summary.distributedUnits, -item.deltaUnits);
  } else if (item.movementType === 'adjust') {
    summary.adjustmentUnits = safeAdd(summary.adjustmentUnits, item.deltaUnits);
  }
}

function getOrCreate(map, id, create) {
  if (!map.has(id)) map.set(id, create());
  return map.get(id);
}

function finishSummary(summary, canViewInbound) {
  const row = { ...summary };
  delete row.latestSnapshotKey;
  if (!canViewInbound) {
    delete row.receivedUnits;
    delete row.adjustmentUnits;
  }
  return row;
}

function validateCollections({ movements, stocks, gifts }) {
  if (!Array.isArray(movements)) throw new Error('Gift report movements must be an array');
  if (!Array.isArray(stocks)) throw new Error('Gift report stocks must be an array');
  if (!Array.isArray(gifts)) throw new Error('Gift report gifts must be an array');
}

export function buildGiftReport({ movements, stocks, gifts, filters = {} } = {}) {
  validateCollections({ movements, stocks, gifts });
  if (!filters || typeof filters !== 'object' || Array.isArray(filters)) {
    throw new Error('Gift report filters must be an object');
  }
  const range = reportRange(filters);
  const canViewInbound = filters.canViewInbound !== false;
  const catalogById = new Map(gifts.map((gift) => [gift.id, gift]));
  const giftsById = new Map();
  const branchesById = new Map();
  const staffById = new Map();
  const customersById = new Map();
  const campaignsById = new Map();

  for (const gift of gifts) {
    if (!gift?.id || (filters.giftId && gift.id !== filters.giftId)) continue;
    giftsById.set(gift.id, {
      ...emptyMovementSummary('giftId', gift.id, 'giftName', gift.name),
      sortOrder: Number.isSafeInteger(gift.sortOrder) ? gift.sortOrder : 0,
      unitsPerPack: Number.isSafeInteger(gift.unitsPerPack) && gift.unitsPerPack > 0
        ? gift.unitsPerPack : null,
    });
  }

  const selectedStocks = [];
  for (const stock of stocks) {
    if (!stockMatches(stock, filters)) continue;
    const currentUnits = safeInteger(stock.currentUnits, 'Gift stock', { minimum: 0 });
    const threshold = safeInteger(stock.lowStockThresholdUnits ?? 0, 'Low-stock threshold', { minimum: 0 });
    const lowStock = catalogById.get(stock.giftId)?.active === true && currentUnits <= threshold;
    selectedStocks.push({ ...stock, currentUnits, lowStockThresholdUnits: threshold, lowStock });

    const giftId = stock.giftId ?? '';
    const gift = getOrCreate(giftsById, giftId, () => ({
      ...emptyMovementSummary(
        'giftId', giftId, 'giftName', stock.giftNameSnapshot ?? catalogById.get(giftId)?.name,
      ),
      sortOrder: catalogById.get(giftId)?.sortOrder ?? 0,
      unitsPerPack: catalogById.get(giftId)?.unitsPerPack ?? null,
    }));
    gift.currentUnits = safeAdd(gift.currentUnits, currentUnits);
    if (lowStock) gift.lowStockCount = safeAdd(gift.lowStockCount, 1);

    const branchId = stock.branchId ?? '';
    const branch = getOrCreate(branchesById, branchId, () => (
      emptyMovementSummary('branchId', branchId, 'branchName', stock.branchNameSnapshot ?? branchId)
    ));
    branch.currentUnits = safeAdd(branch.currentUnits, currentUnits);
    if (lowStock) branch.lowStockCount = safeAdd(branch.lowStockCount, 1);
  }

  const selectedMovements = [];
  for (const item of movements) {
    parseDateKey(item?.dateKey);
    const deltaUnits = safeInteger(item?.deltaUnits, 'Gift movement delta');
    const normalized = { ...item, deltaUnits };
    if (!movementMatches(normalized, filters, range, canViewInbound)) continue;
    selectedMovements.push(movementRow(normalized, catalogById));
    const snapshotKey = `${normalized.dateKey}\u0000${normalized.id ?? ''}`;

    const giftId = normalized.giftId ?? '';
    const gift = getOrCreate(giftsById, giftId, () => ({
      ...emptyMovementSummary(
        'giftId', giftId, 'giftName', normalized.giftNameSnapshot ?? catalogById.get(giftId)?.name,
      ),
      sortOrder: catalogById.get(giftId)?.sortOrder ?? 0,
      unitsPerPack: catalogById.get(giftId)?.unitsPerPack ?? null,
    }));
    updateSnapshot(gift, snapshotKey, 'giftName', normalized.giftNameSnapshot);
    addMovement(gift, normalized);

    const branchId = normalized.branchId ?? '';
    const branch = getOrCreate(branchesById, branchId, () => (
      emptyMovementSummary('branchId', branchId, 'branchName', normalized.branchNameSnapshot ?? branchId)
    ));
    updateSnapshot(branch, snapshotKey, 'branchName', normalized.branchNameSnapshot);
    addMovement(branch, normalized);

    if (DISTRIBUTION_TYPES.has(normalized.movementType) && normalized.distributionOwnerUid) {
      const staffUid = normalized.distributionOwnerUid;
      const staff = getOrCreate(staffById, staffUid, () => ({
        staffUid,
        staffName: normalized.distributionOwnerNameSnapshot
          ?? normalized.distributionOwnerName ?? staffUid,
        branchId,
        distributedUnits: 0,
        latestSnapshotKey: '',
      }));
      staff.distributedUnits = safeAdd(staff.distributedUnits, -deltaUnits);
      if (snapshotKey >= staff.latestSnapshotKey) {
        staff.latestSnapshotKey = snapshotKey;
        staff.staffName = normalized.distributionOwnerNameSnapshot
          ?? normalized.distributionOwnerName ?? staff.staffName;
        staff.branchId = branchId;
      }
    }

    if (DISTRIBUTION_TYPES.has(normalized.movementType) && normalized.customerId) {
      const customer = getOrCreate(customersById, normalized.customerId, () => ({
        customerId: normalized.customerId,
        customerName: normalized.customerNameSnapshot ?? normalized.customerName ?? normalized.customerId,
        distributedUnits: 0,
        latestSnapshotKey: '',
      }));
      customer.distributedUnits = safeAdd(customer.distributedUnits, -deltaUnits);
      updateSnapshot(
        customer, snapshotKey, 'customerName',
        normalized.customerNameSnapshot ?? normalized.customerName,
      );
    }

    if (DISTRIBUTION_TYPES.has(normalized.movementType) && normalized.campaignId) {
      const campaign = getOrCreate(campaignsById, normalized.campaignId, () => ({
        campaignId: normalized.campaignId,
        campaignName: normalized.campaignNameSnapshot ?? normalized.campaignName ?? normalized.campaignId,
        distributedUnits: 0,
        latestSnapshotKey: '',
      }));
      campaign.distributedUnits = safeAdd(campaign.distributedUnits, -deltaUnits);
      updateSnapshot(
        campaign, snapshotKey, 'campaignName',
        normalized.campaignNameSnapshot ?? normalized.campaignName,
      );
    }
  }

  selectedMovements.sort((left, right) => stableId(right.dateKey, left.dateKey)
    || stableId(left.id ?? '', right.id ?? ''));

  const giftRows = [...giftsById.values()]
    .map((summary) => finishSummary(summary, canViewInbound))
    .sort((left, right) => descendingUnits(left, right)
      || left.sortOrder - right.sortOrder || stableId(left.giftId, right.giftId));
  const branchRows = [...branchesById.values()]
    .map((summary) => finishSummary(summary, canViewInbound))
    .sort((left, right) => descendingUnits(left, right) || stableId(left.branchId, right.branchId));
  const staff = [...staffById.values()]
    .map((summary) => finishSummary(summary, true))
    .sort((left, right) => descendingUnits(left, right) || stableId(left.staffUid, right.staffUid));
  const customers = [...customersById.values()]
    .map((summary) => finishSummary(summary, true))
    .sort((left, right) => descendingUnits(left, right) || stableId(left.customerId, right.customerId));
  const campaigns = [...campaignsById.values()]
    .map((summary) => finishSummary(summary, true))
    .sort((left, right) => descendingUnits(left, right) || stableId(left.campaignId, right.campaignId));

  let receivedUnits = 0;
  let distributedUnits = 0;
  let adjustmentUnits = 0;
  for (const row of selectedMovements) {
    if (RECEIVED_TYPES.has(row.movementType)) receivedUnits = safeAdd(receivedUnits, row.deltaUnits);
    else if (DISTRIBUTION_TYPES.has(row.movementType)) {
      distributedUnits = safeAdd(distributedUnits, -row.deltaUnits);
    } else if (row.movementType === 'adjust') adjustmentUnits = safeAdd(adjustmentUnits, row.deltaUnits);
  }
  let currentUnits = 0;
  let lowStockCount = 0;
  for (const stock of selectedStocks) {
    currentUnits = safeAdd(currentUnits, stock.currentUnits);
    if (stock.lowStock) lowStockCount = safeAdd(lowStockCount, 1);
  }

  const report = {
    receivedUnits,
    distributedUnits,
    adjustmentUnits,
    currentUnits,
    lowStockCount,
    gifts: giftRows,
    branches: branchRows,
    staff,
    customers,
    campaigns,
    movements: selectedMovements,
    stocks: selectedStocks.map((stock) => ({
      ...stock,
      giftName: stock.giftNameSnapshot ?? catalogById.get(stock.giftId)?.name ?? stock.giftId ?? '',
      unitsPerPack: catalogById.get(stock.giftId)?.unitsPerPack ?? null,
      packLabel: catalogById.get(stock.giftId)?.packLabel ?? '',
      unitLabel: catalogById.get(stock.giftId)?.unitLabel ?? '',
    })),
    canViewInbound,
  };
  // `stocks` is workbook support data; keep the approved public empty result compact.
  if (report.stocks.length === 0) delete report.stocks;
  if (!canViewInbound) {
    delete report.receivedUnits;
    delete report.adjustmentUnits;
  }
  return report;
}
