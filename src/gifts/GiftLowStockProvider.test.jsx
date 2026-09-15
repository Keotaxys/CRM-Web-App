import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  catalog: vi.fn(),
  onCatalog: null,
  onStocks: null,
  stocks: vi.fn(),
  unsubscribeCatalog: vi.fn(),
  unsubscribeStocks: vi.fn(),
  identity: {
    user: { uid: 'manager-1' },
    claims: { role: 'branch_manager', branchId: '010', accountStatus: 'approved' },
  },
}));

vi.mock('../auth/useAuth', () => ({ useAuth: () => mocks.identity }));
vi.mock('../services/giftService', () => ({
  subscribeActiveGiftItems: mocks.catalog,
  subscribeGiftStocks: mocks.stocks,
}));

import GiftLowStockProvider from './GiftLowStockProvider';
import { useGiftLowStock } from './useGiftLowStock';

function Probe() {
  const { count, items, loading } = useGiftLowStock();
  return <><output aria-label="count">{count}</output><output aria-label="items">{items.map((item) => item.giftId).join(',')}</output><output aria-label="loading">{String(loading)}</output></>;
}

const gift = (id, active = true) => ({ id, active, name: `Gift ${id}`, unitsPerPack: 1, unitLabel: 'unit', packLabel: 'pack' });
const stock = (giftId, currentUnits, lowStockThresholdUnits, branchId = '010') => ({ giftId, currentUnits, lowStockThresholdUnits, branchId });

describe('GiftLowStockProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.identity = { user: { uid: 'manager-1' }, claims: { role: 'branch_manager', branchId: '010', accountStatus: 'approved' } };
    mocks.catalog.mockImplementation((onData) => { mocks.onCatalog = onData; return mocks.unsubscribeCatalog; });
    mocks.stocks.mockImplementation((_identity, _options, onData) => { mocks.onStocks = onData; return mocks.unsubscribeStocks; });
  });

  it('does not subscribe or expose low-stock data to Staff', () => {
    mocks.identity = { user: { uid: 'staff-1' }, claims: { role: 'staff', branchId: '010', accountStatus: 'approved' } };
    render(<GiftLowStockProvider><Probe/></GiftLowStockProvider>);
    expect(mocks.catalog).not.toHaveBeenCalled();
    expect(mocks.stocks).not.toHaveBeenCalled();
    expect(screen.getByLabelText('count')).toHaveTextContent('0');
    expect(screen.getByLabelText('loading')).toHaveTextContent('false');
  });

  it('subscribes a Manager to their branch stocks', () => {
    render(<GiftLowStockProvider><Probe/></GiftLowStockProvider>);
    expect(mocks.stocks).toHaveBeenCalledWith(mocks.identity, {}, expect.any(Function), expect.any(Function));
  });

  it('subscribes an Admin to all branch stocks', () => {
    mocks.identity = { user: { uid: 'admin-1' }, claims: { role: 'admin', branchId: null, accountStatus: 'approved' } };
    render(<GiftLowStockProvider><Probe/></GiftLowStockProvider>);
    expect(mocks.stocks).toHaveBeenCalledWith(mocks.identity, {}, expect.any(Function), expect.any(Function));
  });

  it('includes active gifts at or below threshold and excludes inactive or above-threshold rows', () => {
    render(<GiftLowStockProvider><Probe/></GiftLowStockProvider>);
    act(() => {
      mocks.onCatalog([gift('equal'), gift('below'), gift('above'), gift('inactive', false)]);
      mocks.onStocks([stock('equal', 5, 5), stock('below', 2, 5), stock('above', 6, 5), stock('inactive', 0, 5)]);
    });
    expect(screen.getByLabelText('count')).toHaveTextContent('2');
    expect(screen.getByLabelText('items')).toHaveTextContent('equal,below');
  });

  it('clears a resolved alert from the next live snapshot without an acknowledgement write', () => {
    render(<GiftLowStockProvider><Probe/></GiftLowStockProvider>);
    act(() => {
      mocks.onCatalog([gift('umbrella')]);
      mocks.onStocks([stock('umbrella', 2, 5)]);
    });
    expect(screen.getByLabelText('count')).toHaveTextContent('1');
    act(() => mocks.onStocks([stock('umbrella', 6, 5)]));
    expect(screen.getByLabelText('count')).toHaveTextContent('0');
  });
});
