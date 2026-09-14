import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  callable: vi.fn(),
  collection: vi.fn(),
  httpsCallable: vi.fn(),
  onSnapshot: vi.fn(),
  orderBy: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  collection: mocks.collection,
  onSnapshot: mocks.onSnapshot,
  orderBy: mocks.orderBy,
  query: mocks.query,
  where: mocks.where,
}));
vi.mock('firebase/functions', () => ({ httpsCallable: mocks.httpsCallable }));
vi.mock('../firebase/config', () => ({ db: {}, functions: { region: 'asia-southeast1' } }));

import {
  adjustGiftStock,
  amendGiftDistribution,
  cancelGiftAllocation,
  cancelGiftDistribution,
  confirmGiftAllocation,
  createGiftAllocation,
  createGiftCampaign,
  createGiftItem,
  receiveGiftStock,
  recordGiftDistribution,
  setGiftLowStockThreshold,
  subscribeActiveGiftItems,
  subscribeAllGiftItems,
  subscribeGiftAllocations,
  subscribeGiftCampaigns,
  subscribeGiftDistributions,
  subscribeGiftMovements,
  subscribeGiftStocks,
  updateGiftCampaign,
  updateGiftItem,
} from './giftService';

const staff = { user: { uid: 'staff-a' }, claims: { role: 'staff', branchId: '010' } };
const manager = { user: { uid: 'manager-a' }, claims: { role: 'branch_manager', branchId: '010' } };
const admin = { user: { uid: 'admin' }, claims: { role: 'admin', branchId: null } };
const range = { startKey: '2026-09-01', endKey: '2026-09-30' };
const operationId = '550e8400-e29b-41d4-a716-446655440000';
const mutationId = '550e8400-e29b-41d4-a716-446655440001';

function expectConstraint(...args) {
  expect(mocks.where).toHaveBeenCalledWith(...args);
}

describe('gift subscriptions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.collection.mockImplementation((_db, name) => ({ collection: name }));
    mocks.where.mockImplementation((...args) => ({ kind: 'where', args }));
    mocks.orderBy.mockImplementation((...args) => ({ kind: 'orderBy', args }));
    mocks.query.mockImplementation((source, ...constraints) => ({ source, constraints }));
    mocks.onSnapshot.mockImplementation((_query, onData) => {
      onData({ docs: [{ id: 'row-a', data: () => ({ active: true, sortOrder: 10 }) }] });
      return 'unsubscribe';
    });
  });

  it('subscribes to active catalog items ordered by sortOrder', () => {
    const onData = vi.fn();
    expect(subscribeActiveGiftItems(onData, vi.fn())).toBe('unsubscribe');
    expectConstraint('active', '==', true);
    expect(mocks.orderBy).toHaveBeenCalledWith('sortOrder', 'asc');
    expect(onData).toHaveBeenCalledWith([expect.objectContaining({ id: 'row-a', active: true })]);
  });

  it('lets only Admin subscribe to the complete catalog', () => {
    subscribeAllGiftItems(admin, vi.fn(), vi.fn());
    expect(mocks.where).not.toHaveBeenCalledWith('active', '==', expect.anything());
    expect(mocks.orderBy).toHaveBeenCalledWith('sortOrder', 'asc');

    expect(() => subscribeAllGiftItems(manager, vi.fn(), vi.fn())).toThrow(/approved gift actor/i);
    expect(() => subscribeAllGiftItems(staff, vi.fn(), vi.fn())).toThrow(/approved gift actor/i);
  });

  it('uses explicit branch, active state, and newest start date for Campaigns', () => {
    subscribeGiftCampaigns(staff, { branchId: 'forged', active: false }, vi.fn(), vi.fn());
    expectConstraint('branchId', '==', '010');
    expectConstraint('active', '==', false);
    expect(mocks.orderBy).toHaveBeenCalledWith('startDate', 'desc');

    vi.clearAllMocks();
    subscribeGiftCampaigns(admin, { branchId: '019', active: true }, vi.fn(), vi.fn());
    expectConstraint('branchId', '==', '019');
  });

  it('locks Staff and Manager stock reads to their claim branch and lets Admin read all', () => {
    subscribeGiftStocks(manager, { branchId: 'forged' }, vi.fn(), vi.fn());
    expectConstraint('branchId', '==', '010');
    expect(mocks.orderBy).toHaveBeenCalledWith('giftId', 'asc');

    vi.clearAllMocks();
    subscribeGiftStocks(admin, {}, vi.fn(), vi.fn());
    expect(mocks.where).not.toHaveBeenCalledWith('branchId', '==', expect.anything());
    expect(mocks.orderBy).toHaveBeenCalledWith('giftId', 'asc');
  });

  it('scopes Staff distribution and movement history to ownership with descending date ranges', () => {
    subscribeGiftDistributions(staff, range, vi.fn(), vi.fn());
    expectConstraint('createdBy', '==', 'staff-a');
    expectConstraint('dateKey', '>=', range.startKey);
    expectConstraint('dateKey', '<=', range.endKey);
    expect(mocks.orderBy).toHaveBeenCalledWith('dateKey', 'desc');

    vi.clearAllMocks();
    subscribeGiftMovements(staff, range, vi.fn(), vi.fn());
    expectConstraint('distributionOwnerUid', '==', 'staff-a');
    expect(mocks.orderBy).toHaveBeenCalledWith('dateKey', 'desc');
  });

  it('scopes Manager history to the claim branch and Admin to an explicit branch or all branches', () => {
    subscribeGiftDistributions(manager, { ...range, branchId: 'forged' }, vi.fn(), vi.fn());
    expectConstraint('branchId', '==', '010');

    vi.clearAllMocks();
    subscribeGiftMovements(admin, { ...range, branchId: '019' }, vi.fn(), vi.fn());
    expectConstraint('branchId', '==', '019');

    vi.clearAllMocks();
    subscribeGiftDistributions(admin, range, vi.fn(), vi.fn());
    expect(mocks.where).not.toHaveBeenCalledWith('branchId', '==', expect.anything());
    expectConstraint('dateKey', '>=', range.startKey);
  });

  it('queries pending allocations by target branch and newest creation time', () => {
    subscribeGiftAllocations(manager, { branchId: 'forged', status: 'pending' }, vi.fn(), vi.fn());
    expectConstraint('targetBranchId', '==', '010');
    expectConstraint('status', '==', 'pending');
    expect(mocks.orderBy).toHaveBeenCalledWith('createdAt', 'desc');
  });

  it('fails closed when a role or required Admin branch scope is invalid', () => {
    expect(() => subscribeGiftDistributions(
      { user: { uid: 'pending' }, claims: { role: null } }, range, vi.fn(), vi.fn(),
    )).toThrow(/approved gift actor/i);
    expect(() => subscribeGiftCampaigns(admin, {}, vi.fn(), vi.fn())).toThrow(/branch/i);
    expect(() => subscribeGiftAllocations(admin, { status: 'pending' }, vi.fn(), vi.fn())).toThrow(/branch/i);
    expect(mocks.onSnapshot).not.toHaveBeenCalled();
  });
});

describe('trusted gift callable wrappers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.httpsCallable.mockReturnValue(mocks.callable);
    mocks.callable.mockResolvedValue({ data: { ok: true } });
  });

  async function expectLastCall(name, payload) {
    expect(mocks.httpsCallable).toHaveBeenLastCalledWith({ region: 'asia-southeast1' }, name);
    expect(mocks.callable).toHaveBeenLastCalledWith(payload);
  }

  it('uses exact catalog and Campaign callable payloads', async () => {
    await createGiftItem({ name: 'Umbrella', unitLabel: 'unit', packLabel: 'pack', unitsPerPack: '10', sortOrder: '2', active: false, createdBy: 'forged' });
    await expectLastCall('createGiftItem', { name: 'Umbrella', unitLabel: 'unit', packLabel: 'pack', unitsPerPack: 10, sortOrder: 2 });

    await updateGiftItem('umbrella', { name: 'Umbrella 2', unitLabel: 'unit', packLabel: 'box', unitsPerPack: 12, sortOrder: 3, active: false, updatedBy: 'forged' });
    await expectLastCall('updateGiftItem', { giftId: 'umbrella', name: 'Umbrella 2', unitLabel: 'unit', packLabel: 'box', unitsPerPack: 12, sortOrder: 3, active: false });

    await createGiftCampaign({ name: 'New year', branchId: '010', startDate: '2026-12-01', endDate: '2026-12-31', note: 'Seasonal', active: false });
    await expectLastCall('createGiftCampaign', { name: 'New year', branchId: '010', startDate: '2026-12-01', endDate: '2026-12-31', note: 'Seasonal' });

    await updateGiftCampaign('campaign-a', { name: 'New year', branchId: '010', startDate: '2026-12-02', endDate: '2026-12-31', note: '', active: false, normalizedName: 'forged' });
    await expectLastCall('updateGiftCampaign', { campaignId: 'campaign-a', name: 'New year', branchId: '010', startDate: '2026-12-02', endDate: '2026-12-31', note: '', active: false });
  });

  it('uses exact stock and allocation callable payloads while preserving operation IDs', async () => {
    await setGiftLowStockThreshold({ branchId: '010', giftId: 'umbrella', lowStockThresholdUnits: '5', version: 99 });
    await expectLastCall('setGiftLowStockThreshold', { branchId: '010', giftId: 'umbrella', lowStockThresholdUnits: 5 });

    await receiveGiftStock({ receiptId: operationId, branchId: '010', source: 'HQ', reference: null, items: [{ giftId: 'umbrella', packs: '2', looseUnits: '5', totalUnits: 25 }], status: 'forged' });
    await expectLastCall('receiveGiftStock', { receiptId: operationId, branchId: '010', source: 'HQ', reference: '', items: [{ giftId: 'umbrella', packs: 2, looseUnits: 5 }] });

    await createGiftAllocation({ allocationId: operationId, targetBranchId: '019', source: 'HQ', reference: 'A-1', items: [{ giftId: 'umbrella', packs: 1, looseUnits: 0 }], confirmedBy: 'forged' });
    await expectLastCall('createGiftAllocation', { allocationId: operationId, targetBranchId: '019', source: 'HQ', reference: 'A-1', items: [{ giftId: 'umbrella', packs: 1, looseUnits: 0 }] });

    await confirmGiftAllocation({ allocationId: operationId, mutationId, status: 'forged' });
    await expectLastCall('confirmGiftAllocation', { allocationId: operationId, mutationId });

    await cancelGiftAllocation({ allocationId: operationId, mutationId, reason: 'Duplicate', cancelledBy: 'forged' });
    await expectLastCall('cancelGiftAllocation', { allocationId: operationId, mutationId, reason: 'Duplicate' });

    await adjustGiftStock({ adjustmentId: operationId, branchId: '010', reason: 'Count correction', items: [{ giftId: 'umbrella', deltaUnits: '-2', balanceAfterUnits: 3 }] });
    await expectLastCall('adjustGiftStock', { adjustmentId: operationId, branchId: '010', reason: 'Count correction', items: [{ giftId: 'umbrella', deltaUnits: -2 }] });
  });

  it('uses exact distribution callable payloads and preserves mutation IDs', async () => {
    const content = {
      distributionId: operationId,
      expectedDateKey: '2026-09-14',
      branchId: '010',
      recipientType: 'customer',
      customerId: 'customer-a',
      campaignId: undefined,
      items: [{ giftId: 'umbrella', packs: 0, looseUnits: '2', totalUnits: 2 }],
      note: undefined,
      createdBy: 'forged',
    };
    await recordGiftDistribution(content);
    await expectLastCall('recordGiftDistribution', {
      distributionId: operationId,
      expectedDateKey: '2026-09-14',
      branchId: '010',
      recipientType: 'customer',
      customerId: 'customer-a',
      campaignId: null,
      items: [{ giftId: 'umbrella', packs: 0, looseUnits: 2 }],
      note: '',
    });

    await amendGiftDistribution({ ...content, mutationId, expectedVersion: '2', reason: 'Correction' });
    await expectLastCall('amendGiftDistribution', {
      distributionId: operationId,
      mutationId,
      expectedVersion: 2,
      reason: 'Correction',
      branchId: '010',
      recipientType: 'customer',
      customerId: 'customer-a',
      campaignId: null,
      items: [{ giftId: 'umbrella', packs: 0, looseUnits: 2 }],
      note: '',
    });

    await cancelGiftDistribution({ distributionId: operationId, mutationId, expectedVersion: 2, reason: 'Duplicate', branchId: '010', status: 'forged' });
    await expectLastCall('cancelGiftDistribution', { distributionId: operationId, mutationId, expectedVersion: 2, reason: 'Duplicate', branchId: '010' });
  });

  it('rejects invalid form integers before invoking Functions', async () => {
    expect(() => createGiftItem({ name: 'X', unitLabel: 'u', packLabel: 'p', unitsPerPack: '1.5', sortOrder: 1 })).toThrow(/integer/i);
    expect(() => receiveGiftStock({ receiptId: operationId, branchId: '010', source: 'HQ', items: [{ giftId: 'umbrella', packs: -1, looseUnits: 0 }] })).toThrow(/integer/i);
    expect(() => adjustGiftStock({ adjustmentId: operationId, branchId: '010', reason: 'Count', items: [{ giftId: 'umbrella', deltaUnits: 0 }] })).toThrow(/integer/i);
    expect(mocks.httpsCallable).not.toHaveBeenCalled();
  });
});
