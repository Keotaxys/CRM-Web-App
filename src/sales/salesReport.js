import { laosTodayKey } from '../shared/dateTime';

function parseKey(key) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key ?? '');
  if (!match) throw new Error('Valid YYYY-MM-DD date required');
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  if (date.toISOString().slice(0, 10) !== key) throw new Error('Valid YYYY-MM-DD date required');
  return date;
}

function dateKey(date) {
  return date.toISOString().slice(0, 10);
}

function shiftKey(key, days) {
  const date = parseKey(key);
  date.setUTCDate(date.getUTCDate() + days);
  return dateKey(date);
}

function monthRange(anchor) {
  const year = anchor.getUTCFullYear();
  const month = anchor.getUTCMonth();
  return {
    startKey: dateKey(new Date(Date.UTC(year, month, 1))),
    endKey: dateKey(new Date(Date.UTC(year, month + 1, 0))),
  };
}

function yearRange(anchor) {
  const year = anchor.getUTCFullYear();
  return { startKey: `${year}-01-01`, endKey: `${year}-12-31` };
}

function validatedCustomRange(startKey, endKey) {
  parseKey(startKey);
  parseKey(endKey);
  if (startKey > endKey) throw new Error('Valid sales date range required');
  return { startKey, endKey };
}

export function salesDateRange(preset, anchorKey = laosTodayKey(), custom = {}) {
  const anchor = parseKey(anchorKey);
  if (preset === 'today') return { startKey: anchorKey, endKey: anchorKey };
  if (preset === 'week') {
    const mondayOffset = (anchor.getUTCDay() + 6) % 7;
    return {
      startKey: shiftKey(anchorKey, -mondayOffset),
      endKey: shiftKey(anchorKey, 6 - mondayOffset),
    };
  }
  if (preset === 'month') return monthRange(anchor);
  if (preset === 'year') return yearRange(anchor);
  if (preset === 'custom') return validatedCustomRange(custom.startKey, custom.endKey);
  throw new Error('Valid sales date preset required');
}

function stableId(left, right) {
  return String(left).localeCompare(String(right));
}

function increment(totalMap, productId, quantity) {
  totalMap.set(productId, (totalMap.get(productId) ?? 0) + quantity);
}

function productOrder(productsById, leftId, rightId) {
  const leftOrder = productsById.get(leftId)?.sortOrder ?? 0;
  const rightOrder = productsById.get(rightId)?.sortOrder ?? 0;
  return leftOrder - rightOrder || stableId(leftId, rightId);
}

function plainProductTotals(totalMap, productsById) {
  return Object.fromEntries(
    [...totalMap.entries()].sort(([leftId], [rightId]) => productOrder(productsById, leftId, rightId)),
  );
}

function preferLatestSnapshot(summary, date, label, tieBreaker) {
  if (date > summary.latestDate || (date === summary.latestDate && tieBreaker > summary.latestTieBreaker)) {
    summary.latestDate = date;
    summary.latestTieBreaker = tieBreaker;
    summary.label = label;
    return true;
  }
  return false;
}

export function buildSalesReport(records = [], products = []) {
  const productsById = new Map();
  const staffById = new Map();
  const branchesById = new Map();
  const daysByKey = new Map();
  let totalQuantity = 0;

  for (const product of products) {
    productsById.set(product.id, {
      productId: product.id,
      name: product.name ?? product.id,
      totalQuantity: 0,
      sortOrder: Number.isInteger(product.sortOrder) ? product.sortOrder : 0,
      latestDate: '',
      latestTieBreaker: '',
    });
  }

  for (const record of records) {
    const date = record.dateKey ?? '';
    const staffUid = record.staffUid ?? '';
    const branchId = record.branchId ?? '';
    const staffName = record.staffNameSnapshot ?? staffUid;
    const normalizedItems = [];
    let recordTotal = 0;

    let staff = staffById.get(staffUid);
    if (!staff) {
      staff = {
        staffUid,
        label: staffName,
        branchId,
        productTotals: new Map(),
        totalQuantity: 0,
        latestDate: '',
        latestTieBreaker: '',
      };
      staffById.set(staffUid, staff);
    }
    if (preferLatestSnapshot(staff, date, staffName, `${staffName}\u0000${branchId}`)) staff.branchId = branchId;

    let branch = branchesById.get(branchId);
    if (!branch) {
      branch = { branchId, productTotals: new Map(), totalQuantity: 0 };
      branchesById.set(branchId, branch);
    }

    for (const item of Array.isArray(record.items) ? record.items : []) {
      const quantity = Number(item?.quantity);
      const productId = item?.productId;
      if (!productId || !Number.isInteger(quantity) || quantity <= 0) continue;
      const snapshotName = item.productNameSnapshot ?? productId;

      let product = productsById.get(productId);
      if (!product) {
        product = {
          productId,
          name: snapshotName,
          totalQuantity: 0,
          sortOrder: 0,
          latestDate: '',
          latestTieBreaker: '',
        };
        productsById.set(productId, product);
      }
      if (preferLatestSnapshot(product, date, snapshotName, `${snapshotName}\u0000${staffUid}`)) {
        product.name = snapshotName;
      }
      product.totalQuantity += quantity;
      increment(staff.productTotals, productId, quantity);
      increment(branch.productTotals, productId, quantity);
      recordTotal += quantity;
      totalQuantity += quantity;
      normalizedItems.push({ productId, productNameSnapshot: snapshotName, quantity });
    }

    staff.totalQuantity += recordTotal;
    branch.totalQuantity += recordTotal;
    normalizedItems.sort((left, right) => productOrder(productsById, left.productId, right.productId));

    let day = daysByKey.get(date);
    if (!day) {
      day = { dateKey: date, totalQuantity: 0, rows: [] };
      daysByKey.set(date, day);
    }
    day.totalQuantity += recordTotal;
    day.rows.push({ staffUid, staffName, branchId, items: normalizedItems, totalQuantity: recordTotal });
  }

  // Product totals descend; catalog order and stable product id break ties.
  const productRows = [...productsById.values()]
    .sort((left, right) => right.totalQuantity - left.totalQuantity
      || left.sortOrder - right.sortOrder
      || stableId(left.productId, right.productId))
    .map((product) => ({
      productId: product.productId,
      name: product.name,
      totalQuantity: product.totalQuantity,
      percentage: totalQuantity > 0 ? (product.totalQuantity / totalQuantity) * 100 : 0,
      rank: 0,
      sortOrder: product.sortOrder,
    }));
  productRows.forEach((product, index) => {
    product.rank = index > 0 && product.totalQuantity === productRows[index - 1].totalQuantity
      ? productRows[index - 1].rank
      : index + 1;
  });

  // Staff and branch totals descend; their stable ids break ties.
  const staff = [...staffById.values()]
    .sort((left, right) => right.totalQuantity - left.totalQuantity || stableId(left.staffUid, right.staffUid))
    .map((item) => ({
      staffUid: item.staffUid,
      staffName: item.label,
      branchId: item.branchId,
      productTotals: plainProductTotals(item.productTotals, productsById),
      totalQuantity: item.totalQuantity,
    }));
  const branches = [...branchesById.values()]
    .sort((left, right) => right.totalQuantity - left.totalQuantity || stableId(left.branchId, right.branchId))
    .map((item) => ({
      branchId: item.branchId,
      productTotals: plainProductTotals(item.productTotals, productsById),
      totalQuantity: item.totalQuantity,
    }));

  // Days descend; staff uid provides the stable row tie-breaker within each day.
  const days = [...daysByKey.values()]
    .sort((left, right) => stableId(right.dateKey, left.dateKey))
    .map((day) => ({
      ...day,
      rows: day.rows.sort((left, right) => stableId(left.staffUid, right.staffUid)),
    }));

  return { totalQuantity, products: productRows, staff, branches, days };
}
