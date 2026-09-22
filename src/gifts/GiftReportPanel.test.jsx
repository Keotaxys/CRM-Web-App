import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import GiftReportPanel from './GiftReportPanel';

const serviceMocks = vi.hoisted(() => ({
  subscribeActiveGiftItems: vi.fn(),
  subscribeGiftMovements: vi.fn(),
  subscribeGiftStocks: vi.fn(),
  subscribeAssignableUsers: vi.fn(),
  movementMode: 'data',
}));
const authMock = vi.hoisted(() => ({ identity: null }));

vi.mock('../auth/useAuth', () => ({ useAuth: () => authMock.identity }));
vi.mock('../services/giftService', () => ({
  subscribeActiveGiftItems: serviceMocks.subscribeActiveGiftItems,
  subscribeGiftMovements: serviceMocks.subscribeGiftMovements,
  subscribeGiftStocks: serviceMocks.subscribeGiftStocks,
}));
vi.mock('../services/usersService', () => ({
  subscribeAssignableUsers: serviceMocks.subscribeAssignableUsers,
}));
vi.mock('../components/ui/DateField', () => ({
  default: ({ id, label, value, onChange }) => (
    <label htmlFor={id}>{label}<input id={id} value={value} onChange={onChange} /></label>
  ),
}));

const gifts = [
  { id: 'umbrella', name: 'Umbrella', active: true, sortOrder: 1, unitsPerPack: 10 },
  { id: 'bag', name: 'Bag', active: true, sortOrder: 2, unitsPerPack: 5 },
];
const stocks = [
  { branchId: '010', giftId: 'umbrella', currentUnits: 20, lowStockThresholdUnits: 5 },
  { branchId: '010', giftId: 'bag', currentUnits: 2, lowStockThresholdUnits: 2 },
];
const movements = [
  {
    id: 'receive-a', movementType: 'receive', branchId: '010', giftId: 'umbrella',
    giftNameSnapshot: 'Umbrella', deltaUnits: 20, dateKey: '2026-09-13',
    actorUid: 'manager-a', actorRole: 'branch_manager', distributionOwnerUid: null,
    customerId: null, campaignId: null,
  },
  {
    id: 'distribute-a', movementType: 'distribute', branchId: '010', giftId: 'umbrella',
    giftNameSnapshot: 'Umbrella', deltaUnits: -3, dateKey: '2026-09-13',
    actorUid: 'manager-a', actorRole: 'branch_manager', distributionOwnerUid: 'staff-a',
    customerId: 'customer-a', customerNameSnapshot: 'Customer A', campaignId: null,
  },
  {
    id: 'distribute-b', movementType: 'distribute', branchId: '010', giftId: 'bag',
    giftNameSnapshot: 'Bag', deltaUnits: -9, dateKey: '2026-09-13',
    actorUid: 'staff-b', actorRole: 'staff', distributionOwnerUid: 'staff-b',
    customerId: null, campaignId: 'campaign-a', campaignNameSnapshot: 'Campaign A',
  },
  {
    id: 'adjust-a', movementType: 'adjust', branchId: '010', giftId: 'bag',
    giftNameSnapshot: 'Bag', deltaUnits: -1, dateKey: '2026-09-13',
    actorUid: 'manager-a', actorRole: 'branch_manager', distributionOwnerUid: null,
    customerId: null, campaignId: null, reason: 'Count correction',
  },
];
const users = [
  { uid: 'manager-a', name: 'Manager A', branchId: '010' },
  { uid: 'staff-a', name: 'Staff A', branchId: '010' },
  { uid: 'staff-b', name: 'Staff B', branchId: '010' },
  { uid: 'outside', name: 'Outside', branchId: '019' },
];

function arrange(role = 'branch_manager', props = {}, data = movements, source = {}) {
  authMock.identity = {
    user: { uid: role === 'staff' ? 'staff-a' : `${role}-a`, displayName: '' },
    claims: { role, branchId: role === 'admin' ? null : '010', accountStatus: 'approved' },
    profile: { name: role === 'staff' ? 'Staff A' : role === 'admin' ? 'Admin A' : 'Manager A' },
  };
  serviceMocks.subscribeActiveGiftItems.mockImplementation((onData) => { onData(source.gifts ?? gifts); return vi.fn(); });
  serviceMocks.subscribeGiftStocks.mockImplementation((_identity, _options, onData) => { onData(source.stocks ?? stocks); return vi.fn(); });
  serviceMocks.subscribeAssignableUsers.mockImplementation((_identity, onData) => { onData(users); return vi.fn(); });
  serviceMocks.subscribeGiftMovements.mockImplementation((_identity, _options, onData, onError) => {
    if (serviceMocks.movementMode === 'data') onData(data);
    if (serviceMocks.movementMode === 'error') onError(new Error('denied'));
    return vi.fn();
  });
  return render(<GiftReportPanel effectiveBranchId={role === 'admin' ? '010' : undefined} {...props} />);
}

describe('GiftReportPanel', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-09-13T05:00:00Z'));
    vi.clearAllMocks();
    serviceMocks.movementMode = 'data';
  });
  afterEach(() => vi.useRealTimers());

  it('queries Today and Laos Monday-Sunday presets inside the actor branch scope', async () => {
    arrange();
    expect(serviceMocks.subscribeGiftMovements).toHaveBeenLastCalledWith(
      authMock.identity,
      { startKey: '2026-09-13', endKey: '2026-09-13', branchId: '010' },
      expect.any(Function), expect.any(Function),
    );
    await userEvent.setup({ advanceTimers: vi.advanceTimersByTime }).click(
      screen.getByRole('button', { name: 'ອາທິດນີ້' }),
    );
    expect(serviceMocks.subscribeGiftMovements).toHaveBeenLastCalledWith(
      authMock.identity,
      { startKey: '2026-09-07', endKey: '2026-09-13', branchId: '010' },
      expect.any(Function), expect.any(Function),
    );
    expect(screen.getByText('2026-09-07 – 2026-09-13')).toBeInTheDocument();
  });

  it('accepts a valid custom range and refuses incomplete or reversed dates', async () => {
    arrange();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.click(screen.getByRole('button', { name: 'ກຳນົດເອງ' }));
    const before = serviceMocks.subscribeGiftMovements.mock.calls.length;
    fireEvent.change(screen.getByLabelText('ເລີ່ມວັນທີ'), { target: { value: '2026-09-10' } });
    fireEvent.change(screen.getByLabelText('ສິ້ນສຸດວັນທີ'), { target: { value: '2026-09-01' } });
    expect(serviceMocks.subscribeGiftMovements).toHaveBeenCalledTimes(before);
    expect(screen.getByRole('alert')).toHaveTextContent('ຊ່ວງວັນທີບໍ່ຖືກຕ້ອງ');
    fireEvent.change(screen.getByLabelText('ສິ້ນສຸດວັນທີ'), { target: { value: '2026-09-12' } });
    await waitFor(() => expect(serviceMocks.subscribeGiftMovements).toHaveBeenLastCalledWith(
      authMock.identity,
      { startKey: '2026-09-10', endKey: '2026-09-12', branchId: '010' },
      expect.any(Function), expect.any(Function),
    ));
  });

  it('renders role-scoped controls and hides inbound/adjustment information from Staff', () => {
    let view = arrange('staff');
    expect(screen.queryByLabelText('ພະນັກງານ')).not.toBeInTheDocument();
    expect(screen.queryByText(/ຍອດຮັບ/)).not.toBeInTheDocument();
    expect(screen.queryByText('adjust')).not.toBeInTheDocument();
    expect(screen.getByText('ຍອດແຈກ 3')).toBeInTheDocument();
    expect(serviceMocks.subscribeAssignableUsers).not.toHaveBeenCalled();
    view.unmount();

    view = arrange('branch_manager');
    expect(screen.getByLabelText('ພະນັກງານ')).toBeInTheDocument();
    expect(screen.queryByLabelText('ສາຂາ')).not.toBeInTheDocument();
    view.unmount();

    arrange('admin');
    expect(screen.getByLabelText('ສາຂາ')).toHaveTextContent('010');
    expect(serviceMocks.subscribeGiftStocks).toHaveBeenLastCalledWith(
      authMock.identity, { branchId: '010' }, expect.any(Function), expect.any(Function),
    );
  });

  it('shows KPI values and an auditable movement table', () => {
    arrange();
    expect(screen.getByText('ຍອດຮັບ 20')).toBeInTheDocument();
    expect(screen.getByText('ຍອດແຈກ 12')).toBeInTheDocument();
    expect(screen.getByText('Stock ປັດຈຸບັນ 22')).toBeInTheDocument();
    expect(screen.getByText('low-stock 1')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'ສະຫຼຸບຕາມ gift' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'ສະຫຼຸບຕາມ branch' })).toBeInTheDocument();
    const table = screen.getByRole('region', { name: 'ລາຍການເຄື່ອນໄຫວ' });
    expect(within(table).getByRole('row', { name: /2026-09-13 distribute Umbrella -3/ })).toBeInTheDocument();
    expect(within(table).getByText('Count correction')).toBeInTheDocument();
  });

  it('exports the current locally filtered report without another query', async () => {
    const onExport = vi.fn().mockResolvedValue();
    arrange('branch_manager', { onExport });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const queryCount = serviceMocks.subscribeGiftMovements.mock.calls.length;
    await user.click(screen.getByLabelText('ເຄື່ອງແຈກ'));
    await user.click(screen.getByRole('option', { name: 'Umbrella' }));
    expect(screen.getByText('ຍອດແຈກ 3')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'ສົ່ງອອກ Excel' }));
    expect(onExport).toHaveBeenCalledWith(
      expect.objectContaining({ receivedUnits: 20, distributedUnits: 3, currentUnits: 20 }),
      expect.objectContaining({
        startKey: '2026-09-13', endKey: '2026-09-13', exportedBy: 'Manager A',
        filters: expect.objectContaining({ giftId: 'umbrella' }),
      }),
    );
    expect(serviceMocks.subscribeGiftMovements).toHaveBeenCalledTimes(queryCount);
  });

  it('offers an inactive historical gift from scoped movements and stock for filtered export', async () => {
    const onExport = vi.fn().mockResolvedValue();
    const historicalMovement = {
      id: 'archived-gift-movement', movementType: 'distribute', branchId: '010',
      giftId: 'archived-mug', giftNameSnapshot: 'Archived Mug', deltaUnits: -4,
      dateKey: '2026-09-13', actorUid: 'staff-a', actorRole: 'staff',
      distributionOwnerUid: 'staff-a', customerId: 'customer-a',
      customerNameSnapshot: 'Customer A', campaignId: null, campaignNameSnapshot: null,
    };
    arrange('branch_manager', { onExport }, [historicalMovement], {
      gifts: [gifts[1], gifts[0]],
      stocks: [{
        branchId: '010', giftId: 'archived-mug', giftNameSnapshot: 'Archived Mug',
        currentUnits: 7, lowStockThresholdUnits: 2,
      }],
    });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.click(screen.getByLabelText('ເຄື່ອງແຈກ'));
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'ທັງໝົດ', 'Umbrella', 'Bag', 'Archived Mug',
    ]);
    await user.click(screen.getByRole('option', { name: 'Archived Mug' }));
    expect(screen.getByText('ຍອດແຈກ 4')).toBeInTheDocument();
    expect(screen.getByText('Stock ປັດຈຸບັນ 7')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'ສົ່ງອອກ Excel' }));
    expect(onExport).toHaveBeenCalledWith(
      expect.objectContaining({
        distributedUnits: 4,
        gifts: [expect.objectContaining({ giftId: 'archived-mug', giftName: 'Archived Mug' })],
        movements: [expect.objectContaining({ giftId: 'archived-mug' })],
      }),
      expect.objectContaining({ filters: expect.objectContaining({ giftId: 'archived-mug' }) }),
    );
  });

  it('keeps loading and query failure distinct from a successful empty report', () => {
    serviceMocks.movementMode = 'loading';
    let view = arrange();
    expect(screen.getByText('ກຳລັງໂຫຼດລາຍງານ')).toBeInTheDocument();
    expect(screen.queryByText('ຍອດແຈກ 0')).not.toBeInTheDocument();
    view.unmount();

    serviceMocks.movementMode = 'error';
    view = arrange();
    expect(screen.getByRole('alert')).toHaveTextContent('ບໍ່ສາມາດໂຫຼດລາຍງານ');
    expect(screen.queryByText('ຍອດແຈກ 0')).not.toBeInTheDocument();
    view.unmount();

    serviceMocks.movementMode = 'data';
    arrange('branch_manager', {}, []);
    expect(screen.getByText('ຍອດແຈກ 0')).toBeInTheDocument();
    expect(screen.getByText('ບໍ່ມີລາຍການເຄື່ອນໄຫວ')).toBeInTheDocument();
  });
});
