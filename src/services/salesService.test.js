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
  amendDailySales,
  createSalesProduct,
  saveDailySales,
  subscribeActiveSalesProducts,
  subscribeAllSalesProducts,
  subscribeDailySales,
  updateSalesProduct,
} from './salesService';

const range = { startKey: '2026-09-01', endKey: '2026-09-30' };
const staffIdentity = { user: { uid: 'staff-a' }, claims: { role: 'staff', branchId: '010' } };
const managerIdentity = { user: { uid: 'manager-a' }, claims: { role: 'branch_manager', branchId: '010' } };
const adminIdentity = { user: { uid: 'admin' }, claims: { role: 'admin', branchId: null } };

describe('sales product subscriptions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.collection.mockImplementation((_db, name) => ({ collection: name }));
    mocks.where.mockImplementation((...args) => ({ kind: 'where', args }));
    mocks.orderBy.mockImplementation((...args) => ({ kind: 'orderBy', args }));
    mocks.query.mockImplementation((source, ...constraints) => ({ source, constraints }));
    mocks.onSnapshot.mockImplementation((_query, onData) => {
      onData({
        docs: [{
          id: 'bcel',
          data: () => ({ name: 'BCEL One', active: true, sortOrder: 10 }),
        }],
      });
      return 'unsubscribe';
    });
  });

  it('subscribes to active products ordered by catalog order and normalizes results', () => {
    const onData = vi.fn();
    const onError = vi.fn();

    expect(subscribeActiveSalesProducts(onData, onError)).toBe('unsubscribe');

    expect(mocks.where).toHaveBeenCalledWith('active', '==', true);
    expect(mocks.orderBy).toHaveBeenCalledWith('sortOrder', 'asc');
    expect(onData).toHaveBeenCalledWith([{ id: 'bcel', name: 'BCEL One', active: true, sortOrder: 10 }]);
    expect(mocks.onSnapshot).toHaveBeenCalledWith(expect.any(Object), expect.any(Function), onError);
  });

  it('subscribes to all products for Admin catalog management', () => {
    subscribeAllSalesProducts(vi.fn(), vi.fn());

    expect(mocks.where).not.toHaveBeenCalledWith('active', '==', expect.anything());
    expect(mocks.orderBy).toHaveBeenCalledWith('sortOrder', 'asc');
  });
});

describe('role-scoped daily sales subscriptions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.collection.mockReturnValue({ collection: 'dailySales' });
    mocks.where.mockImplementation((...args) => ({ kind: 'where', args }));
    mocks.orderBy.mockImplementation((...args) => ({ kind: 'orderBy', args }));
    mocks.query.mockImplementation((source, ...constraints) => ({ source, constraints }));
    mocks.onSnapshot.mockReturnValue('unsubscribe');
  });

  it('scopes Staff to own records and the requested date range', () => {
    subscribeDailySales(staffIdentity, range, vi.fn(), vi.fn());

    expect(mocks.where).toHaveBeenCalledWith('staffUid', '==', 'staff-a');
    expect(mocks.where).toHaveBeenCalledWith('dateKey', '>=', '2026-09-01');
    expect(mocks.where).toHaveBeenCalledWith('dateKey', '<=', '2026-09-30');
    expect(mocks.orderBy).toHaveBeenCalledWith('dateKey', 'desc');
  });

  it('scopes Branch Managers to their branch and the requested date range', () => {
    subscribeDailySales(managerIdentity, range, vi.fn(), vi.fn());

    expect(mocks.where).toHaveBeenCalledWith('branchId', '==', '010');
    expect(mocks.where).not.toHaveBeenCalledWith('staffUid', '==', expect.anything());
  });

  it('lets Admin query all branches within the requested date range', () => {
    subscribeDailySales(adminIdentity, range, vi.fn(), vi.fn());

    expect(mocks.where).not.toHaveBeenCalledWith('staffUid', '==', expect.anything());
    expect(mocks.where).not.toHaveBeenCalledWith('branchId', '==', expect.anything());
    expect(mocks.where).toHaveBeenCalledWith('dateKey', '>=', '2026-09-01');
    expect(mocks.where).toHaveBeenCalledWith('dateKey', '<=', '2026-09-30');
  });

  it('fails closed for an unsupported actor role', () => {
    expect(() => subscribeDailySales(
      { user: { uid: 'pending' }, claims: { role: null, branchId: null } },
      range,
      vi.fn(),
      vi.fn(),
    )).toThrow(/approved sales actor/i);
    expect(mocks.onSnapshot).not.toHaveBeenCalled();
  });
});

describe('trusted sales callable wrappers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.httpsCallable.mockReturnValue(mocks.callable);
    mocks.callable.mockResolvedValue({ data: { id: 'result-id', totalQuantity: 2 } });
  });

  it('saves only the supplied product quantities', async () => {
    await expect(saveDailySales([{ productId: 'bcel', quantity: 2 }])).resolves.toEqual({ id: 'result-id', totalQuantity: 2 });
    expect(mocks.httpsCallable).toHaveBeenCalledWith({ region: 'asia-southeast1' }, 'saveDailySales');
    expect(mocks.callable).toHaveBeenCalledWith({ items: [{ productId: 'bcel', quantity: 2 }] });
  });

  it('amends with exactly the stable mutation id, reason, target, and items', async () => {
    const request = {
      dailySalesId: '2026-09-01_staff-a',
      mutationId: '550e8400-e29b-41d4-a716-446655440000',
      reason: 'Correct team total',
      items: [{ productId: 'bcel', quantity: 4 }],
      branchId: 'forged-client-field',
    };

    await amendDailySales(request);

    expect(mocks.httpsCallable).toHaveBeenCalledWith({ region: 'asia-southeast1' }, 'amendDailySales');
    expect(mocks.callable).toHaveBeenCalledWith({
      dailySalesId: '2026-09-01_staff-a',
      mutationId: '550e8400-e29b-41d4-a716-446655440000',
      reason: 'Correct team total',
      items: [{ productId: 'bcel', quantity: 4 }],
    });
  });

  it('uses the exact product administration callables and payloads', async () => {
    await createSalesProduct({ name: 'BCEL One', sortOrder: 10, active: false });
    expect(mocks.httpsCallable).toHaveBeenLastCalledWith({ region: 'asia-southeast1' }, 'createSalesProduct');
    expect(mocks.callable).toHaveBeenLastCalledWith({ name: 'BCEL One', sortOrder: 10 });

    await updateSalesProduct('bcel', { name: 'BCEL One Mobile', sortOrder: 20, active: false, createdBy: 'forged' });
    expect(mocks.httpsCallable).toHaveBeenLastCalledWith({ region: 'asia-southeast1' }, 'updateSalesProduct');
    expect(mocks.callable).toHaveBeenLastCalledWith({
      productId: 'bcel',
      name: 'BCEL One Mobile',
      sortOrder: 20,
      active: false,
    });
  });
});
