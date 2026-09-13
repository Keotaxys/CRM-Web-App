export class SalesOperationError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'SalesOperationError';
    this.code = code;
  }
}

const UID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const laosDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Vientiane', year: 'numeric', month: '2-digit', day: '2-digit',
});

export function laosSalesDateKey(now = new Date()) {
  const parts = Object.fromEntries(laosDateFormatter.formatToParts(now).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function dailySalesDocumentId(dateKey, uid) {
  if (!DATE_KEY_PATTERN.test(dateKey)) throw new SalesOperationError('invalid-argument', 'Invalid sales date');
  if (!UID_PATTERN.test(uid)) throw new SalesOperationError('invalid-argument', 'Invalid staff uid');
  return `${dateKey}_${uid}`;
}

export function normalizeSalesProductName(name) {
  const normalized = String(name ?? '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('en-US');
  if (!normalized) throw new SalesOperationError('invalid-argument', 'Product name required');
  return normalized;
}

export function validateSalesItems(items, catalogById, existingItems = []) {
  if (!Array.isArray(items)) throw new SalesOperationError('invalid-argument', 'Sales items must be an array');
  if (!(catalogById instanceof Map)) throw new SalesOperationError('failed-precondition', 'Sales product catalog unavailable');

  const existingQuantities = new Map(
    (Array.isArray(existingItems) ? existingItems : []).map((item) => [item?.productId, item?.quantity]),
  );
  const existingNames = new Map(
    (Array.isArray(existingItems) ? existingItems : []).map((item) => [item?.productId, item?.productNameSnapshot]),
  );
  const seen = new Set();
  const normalizedItems = [];

  for (const item of items) {
    const productId = item?.productId;
    if (typeof productId !== 'string' || !UID_PATTERN.test(productId)) {
      throw new SalesOperationError('invalid-argument', 'Invalid sales product id');
    }
    if (seen.has(productId)) throw new SalesOperationError('invalid-argument', 'Duplicate sales product id');
    seen.add(productId);

    const quantity = item?.quantity;
    if (!Number.isInteger(quantity) || quantity < 0) {
      throw new SalesOperationError('invalid-argument', 'Sales quantity must be a nonnegative integer');
    }

    const product = catalogById.get(productId);
    if (!product) throw new SalesOperationError('failed-precondition', 'Sales product not found');
    if (!product.active && quantity > (existingQuantities.get(productId) ?? 0)) {
      throw new SalesOperationError('failed-precondition', 'Inactive sales product quantity cannot increase');
    }
    if (quantity > 0) {
      normalizedItems.push({ productId, productNameSnapshot: existingNames.get(productId) ?? product.name, quantity });
    }
  }

  return {
    items: normalizedItems,
    totalQuantity: normalizedItems.reduce((total, item) => total + item.quantity, 0),
  };
}
