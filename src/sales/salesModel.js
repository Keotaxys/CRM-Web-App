import { toDate } from '../shared/dateTime';

function normalizeTimestamps(value) {
  const normalized = { ...value };
  for (const field of ['createdAt', 'updatedAt']) {
    if (Object.hasOwn(value, field)) normalized[field] = toDate(value[field]);
  }
  return normalized;
}

export function normalizeSalesProduct(product) {
  if (!product) return null;
  return normalizeTimestamps(product);
}

export function normalizeDailySales(record) {
  if (!record) return null;
  const items = (Array.isArray(record.items) ? record.items : [])
    .map((item) => ({
      productId: item?.productId,
      productNameSnapshot: item?.productNameSnapshot,
      quantity: Number(item?.quantity),
    }))
    .filter((item) => item.productId && Number.isInteger(item.quantity) && item.quantity > 0);

  return {
    ...normalizeTimestamps(record),
    items,
    totalQuantity: items.reduce((total, item) => total + item.quantity, 0),
  };
}

export function salesItemsFromQuantities(quantities) {
  return Object.entries(quantities ?? {}).flatMap(([productId, rawQuantity]) => {
    const text = String(rawQuantity ?? '').trim();
    const quantity = text === '' ? 0 : Number(text);
    if (!Number.isInteger(quantity) || quantity < 0) {
      throw new Error('Sales quantity must be a nonnegative integer');
    }
    return quantity > 0 ? [{ productId, quantity }] : [];
  });
}
