import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../firebase/config';
import {
  normalizeGiftCampaign,
  normalizeGiftDistribution,
  normalizeGiftItem,
  normalizeGiftMovement,
  normalizeGiftStock,
} from '../gifts/giftModel';

function actor(identity) {
  return {
    uid: identity?.user?.uid ?? identity?.uid ?? null,
    role: identity?.claims?.role ?? identity?.role ?? null,
    branchId: identity?.claims?.branchId ?? identity?.branchId ?? null,
    accountStatus: identity?.claims?.accountStatus ?? identity?.accountStatus ?? null,
  };
}

function approvedActor(identity, allowedRoles = ['staff', 'branch_manager', 'admin']) {
  const current = actor(identity);
  if (!current.uid || !allowedRoles.includes(current.role)
    || (current.accountStatus && current.accountStatus !== 'approved')) {
    throw new Error('Approved gift actor required');
  }
  return current;
}

function requiredBranch(value) {
  if (typeof value !== 'string' || !value.trim()) throw new Error('Gift branch is required');
  return value;
}

function scopedBranch(identity, requestedBranch, allowedRoles) {
  const current = approvedActor(identity, allowedRoles);
  return current.role === 'admin'
    ? requiredBranch(requestedBranch)
    : requiredBranch(current.branchId);
}

function subscribeCollection(name, constraints, normalize, onData, onError) {
  return onSnapshot(query(collection(db, name), ...constraints), (snapshot) => {
    onData(snapshot.docs.map((item) => normalize({ id: item.id, ...item.data() })));
  }, onError);
}

export function subscribeActiveGiftItems(onData, onError) {
  return subscribeCollection('giftItems', [
    where('active', '==', true),
    orderBy('sortOrder', 'asc'),
  ], normalizeGiftItem, onData, onError);
}

export function subscribeAllGiftItems(identity, onData, onError) {
  approvedActor(identity, ['admin']);
  return subscribeCollection(
    'giftItems', [orderBy('sortOrder', 'asc')], normalizeGiftItem, onData, onError,
  );
}

export function subscribeGiftCampaigns(identity, options, onData, onError) {
  const current = approvedActor(identity, ['staff', 'branch_manager', 'admin']);
  const active = options?.active ?? true;
  if (typeof active !== 'boolean') throw new Error('Gift Campaign active filter is required');
  if (current.role === 'staff' && !active) {
    throw new Error('Staff gift Campaigns must be active');
  }
  const branchId = current.role === 'admin'
    ? requiredBranch(options?.branchId)
    : requiredBranch(current.branchId);
  return subscribeCollection('giftCampaigns', [
    where('branchId', '==', branchId),
    where('active', '==', active),
    orderBy('startDate', 'desc'),
  ], normalizeGiftCampaign, onData, onError);
}

export function subscribeGiftStocks(identity, options = {}, onData, onError) {
  const current = approvedActor(identity);
  const constraints = [];
  if (current.role === 'admin') {
    if (options.branchId) constraints.push(where('branchId', '==', requiredBranch(options.branchId)));
  } else {
    constraints.push(where('branchId', '==', requiredBranch(current.branchId)));
  }
  constraints.push(orderBy('giftId', 'asc'));
  return subscribeCollection('branchGiftStocks', constraints, normalizeGiftStock, onData, onError);
}

function historyConstraints(identity, options, staffOwnerField) {
  const current = approvedActor(identity);
  const constraints = [];
  if (current.role === 'staff') {
    constraints.push(where(staffOwnerField, '==', current.uid));
  } else if (current.role === 'branch_manager') {
    constraints.push(where('branchId', '==', requiredBranch(current.branchId)));
  } else if (options?.branchId) {
    constraints.push(where('branchId', '==', requiredBranch(options.branchId)));
  }
  const startKey = options?.startKey;
  const endKey = options?.endKey;
  if (typeof startKey !== 'string' || typeof endKey !== 'string' || startKey > endKey) {
    throw new Error('Valid gift date range is required');
  }
  constraints.push(
    where('dateKey', '>=', startKey),
    where('dateKey', '<=', endKey),
    orderBy('dateKey', 'desc'),
  );
  return constraints;
}

export function subscribeGiftDistributions(identity, options, onData, onError) {
  return subscribeCollection(
    'giftDistributions',
    historyConstraints(identity, options, 'createdBy'),
    normalizeGiftDistribution,
    onData,
    onError,
  );
}

export function subscribeGiftMovements(identity, options, onData, onError) {
  return subscribeCollection(
    'giftStockMovements',
    historyConstraints(identity, options, 'distributionOwnerUid'),
    normalizeGiftMovement,
    onData,
    onError,
  );
}

export function subscribeGiftAllocations(identity, options, onData, onError) {
  const branchId = scopedBranch(identity, options?.branchId, ['branch_manager', 'admin']);
  const status = options?.status;
  if (!['pending', 'confirmed', 'cancelled'].includes(status)) {
    throw new Error('Gift allocation status is required');
  }
  return subscribeCollection('giftAllocations', [
    where('targetBranchId', '==', branchId),
    where('status', '==', status),
    orderBy('createdAt', 'desc'),
  ], (value) => value, onData, onError);
}

async function invoke(name, payload) {
  const result = await httpsCallable(functions, name)(payload);
  return result.data;
}

function formInteger(value, { minimum = 0, nonzero = false, label = 'Gift quantity' } = {}) {
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
  if (!Number.isSafeInteger(number) || number < minimum || (nonzero && number === 0)) {
    throw new Error(`${label} must be a safe integer`);
  }
  return number;
}

function giftLines(items) {
  if (!Array.isArray(items) || items.length < 1 || items.length > 25) {
    throw new Error('Gift items must contain 1 to 25 rows');
  }
  const seen = new Set();
  return items.map((item) => {
    if (typeof item?.giftId !== 'string' || !item.giftId || seen.has(item.giftId)) {
      throw new Error('Gift item ids must be unique');
    }
    seen.add(item.giftId);
    const packs = formInteger(item.packs);
    const looseUnits = formInteger(item.looseUnits);
    if (packs === 0 && looseUnits === 0) throw new Error('Gift quantity must be a positive integer');
    return { giftId: item.giftId, packs, looseUnits };
  });
}

function distributionContent(values) {
  return {
    recipientType: values.recipientType,
    customerId: values.customerId ?? null,
    campaignId: values.campaignId ?? null,
    items: giftLines(values.items),
    note: values.note ?? '',
  };
}

export function createGiftItem(values) {
  return invoke('createGiftItem', {
    name: values.name,
    unitLabel: values.unitLabel,
    packLabel: values.packLabel,
    unitsPerPack: formInteger(values.unitsPerPack, { minimum: 1, label: 'Gift units per pack' }),
    sortOrder: formInteger(values.sortOrder, { label: 'Gift sort order' }),
    active: values.active,
  });
}

export function updateGiftItem(giftId, values) {
  return invoke('updateGiftItem', {
    giftId,
    name: values.name,
    unitLabel: values.unitLabel,
    packLabel: values.packLabel,
    unitsPerPack: formInteger(values.unitsPerPack, { minimum: 1, label: 'Gift units per pack' }),
    sortOrder: formInteger(values.sortOrder, { label: 'Gift sort order' }),
    active: values.active,
  });
}

export function createGiftCampaign(values) {
  return invoke('createGiftCampaign', {
    name: values.name,
    branchId: values.branchId,
    startDate: values.startDate,
    endDate: values.endDate,
    note: values.note ?? '',
    active: values.active,
  });
}

export function updateGiftCampaign(campaignId, values) {
  return invoke('updateGiftCampaign', {
    campaignId,
    name: values.name,
    branchId: values.branchId,
    startDate: values.startDate,
    endDate: values.endDate,
    note: values.note ?? '',
    active: values.active,
  });
}

export function setGiftLowStockThreshold(values) {
  return invoke('setGiftLowStockThreshold', {
    branchId: values.branchId,
    giftId: values.giftId,
    lowStockThresholdUnits: formInteger(values.lowStockThresholdUnits, {
      label: 'Low-stock threshold',
    }),
  });
}

export function receiveGiftStock(values) {
  return invoke('receiveGiftStock', {
    receiptId: values.receiptId,
    branchId: values.branchId,
    source: values.source,
    reference: values.reference ?? '',
    items: giftLines(values.items),
  });
}

export function createGiftAllocation(values) {
  return invoke('createGiftAllocation', {
    allocationId: values.allocationId,
    targetBranchId: values.targetBranchId,
    source: values.source,
    reference: values.reference ?? '',
    items: giftLines(values.items),
  });
}

export function confirmGiftAllocation(values) {
  return invoke('confirmGiftAllocation', {
    allocationId: values.allocationId,
    mutationId: values.mutationId,
  });
}

export function cancelGiftAllocation(values) {
  return invoke('cancelGiftAllocation', {
    allocationId: values.allocationId,
    mutationId: values.mutationId,
    reason: values.reason,
  });
}

export function adjustGiftStock(values) {
  if (!Array.isArray(values.items) || values.items.length < 1 || values.items.length > 25) {
    throw new Error('Gift items must contain 1 to 25 rows');
  }
  const seen = new Set();
  const items = values.items.map((item) => {
    if (typeof item?.giftId !== 'string' || !item.giftId || seen.has(item.giftId)) {
      throw new Error('Gift item ids must be unique');
    }
    seen.add(item.giftId);
    return {
      giftId: item.giftId,
      deltaUnits: formInteger(item.deltaUnits, { nonzero: true, minimum: Number.MIN_SAFE_INTEGER }),
    };
  });
  return invoke('adjustGiftStock', {
    adjustmentId: values.adjustmentId,
    branchId: values.branchId,
    reason: values.reason,
    items,
  });
}

export function recordGiftDistribution(values) {
  return invoke('recordGiftDistribution', {
    distributionId: values.distributionId,
    expectedDateKey: values.expectedDateKey,
    branchId: values.branchId,
    ...distributionContent(values),
  });
}

export function amendGiftDistribution(values) {
  return invoke('amendGiftDistribution', {
    distributionId: values.distributionId,
    mutationId: values.mutationId,
    expectedVersion: formInteger(values.expectedVersion, {
      minimum: 1,
      label: 'Expected gift distribution version',
    }),
    reason: values.reason,
    branchId: values.branchId ?? null,
    ...distributionContent(values),
  });
}

export function cancelGiftDistribution(values) {
  return invoke('cancelGiftDistribution', {
    distributionId: values.distributionId,
    mutationId: values.mutationId,
    expectedVersion: formInteger(values.expectedVersion, {
      minimum: 1,
      label: 'Expected gift distribution version',
    }),
    reason: values.reason,
    branchId: values.branchId ?? null,
  });
}
