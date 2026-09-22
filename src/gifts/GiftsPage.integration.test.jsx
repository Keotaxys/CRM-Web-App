import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import GiftsPage from './GiftsPage';

const auth = vi.hoisted(() => ({ identity: null }));
const service = vi.hoisted(() => Object.fromEntries([
  'subscribeActiveGiftItems', 'subscribeGiftStocks', 'subscribeGiftCampaigns', 'subscribeGiftDistributions',
  'amendGiftDistribution', 'cancelGiftDistribution', 'recordGiftDistribution', 'adjustGiftStock', 'setGiftLowStockThreshold',
].map((name) => [name, vi.fn()])));
vi.mock('../auth/useAuth', () => ({ useAuth: () => auth.identity }));
vi.mock('../components/Navbar', () => ({ default: ({ title }) => <header>{title}</header> }));
vi.mock('../services/giftService', () => service);
vi.mock('../services/customersService', () => ({ subscribeCustomers: (_identity, onData) => { onData([]); return () => {}; } }));
vi.mock('../sales/useLaosDay', () => ({ useLaosDay: () => '2026-09-14' }));

const gifts = [{ id: 'umbrella', name: 'Umbrella', active: true, unitsPerPack: 10 },
  { id: 'shirt', name: 'Shirt', active: true, unitsPerPack: 5 }];
const distribution = { id: 'distribution-a', branchId: '010', version: 2, dateKey: '2026-09-14',
  createdBy: 'u1', distributionOwnerUid: 'u1', status: 'active', recipientType: 'customer',
  customerId: 'customer-a', customerNameSnapshot: 'Original Customer', campaignId: null,
  items: [{ giftId: 'umbrella', giftNameSnapshot: 'Original Umbrella', unitsPerPackSnapshot: 10,
    packs: 1, looseUnits: 2, totalUnits: 12 }], totalUnits: 12, note: '' };
function arrange(role = 'staff', url = '/gifts') {
  auth.identity = { user: { uid: 'u1' }, claims: { role, branchId: role === 'admin' ? null : '010', accountStatus: 'approved' } };
  return render(<MemoryRouter initialEntries={[url]}><GiftsPage /></MemoryRouter>);
}
function historyRows(rows) {
  service.subscribeGiftDistributions.mockImplementation((_identity, _options, onData) => { onData(rows); return vi.fn(); });
}
async function changeHistoryStart(user, value) {
  await user.click(screen.getByLabelText('ວັນທີເລີ່ມປະຫວັດ'));
  await user.click(screen.getByRole('button', { name: `ເລືອກ ${value}` }));
  await user.click(screen.getByRole('button', { name: 'ຢືນຢັນ', exact: true }));
}
beforeEach(() => {
  vi.resetAllMocks();
  service.subscribeActiveGiftItems.mockImplementation((onData) => { onData(gifts); return vi.fn(); });
  service.subscribeGiftStocks.mockImplementation((_identity, options, onData) => {
    onData(gifts.map((gift) => ({ giftId: gift.id, branchId: options.branchId, currentUnits: 20, lowStockThresholdUnits: 5 })));
    return vi.fn();
  });
  service.subscribeGiftCampaigns.mockImplementation((_identity, _options, onData) => { onData([]); return vi.fn(); });
  historyRows([distribution]);
  service.amendGiftDistribution.mockResolvedValue({}); service.cancelGiftDistribution.mockResolvedValue({});
});

describe('Gifts page history and correction destination', () => {
  it('opens a Staff own-day correction from date-bounded history and cancels from snapshots after catalog deactivation', async () => {
    service.subscribeActiveGiftItems.mockImplementation((onData) => { onData([]); return vi.fn(); });
    const user = userEvent.setup(); arrange();
    expect(service.subscribeGiftDistributions).toHaveBeenCalledWith(auth.identity,
      { branchId: '010', startKey: '2026-09-14', endKey: '2026-09-14' }, expect.any(Function), expect.any(Function));
    expect(screen.getByText('Original Customer')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'ແກ້ໄຂ distribution-a' }));
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'ຍົກເລີກລາຍການ' }));
    await user.type(within(dialog).getByLabelText('ເຫດຜົນການແກ້ໄຂ'), 'Returned');
    await user.click(within(dialog).getByRole('button', { name: 'ຢືນຢັນການຍົກເລີກ' }));
    expect(service.cancelGiftDistribution).toHaveBeenCalledWith(expect.objectContaining({ distributionId: 'distribution-a', branchId: '010', expectedVersion: 2, reason: 'Returned' }));
  });

  it('limits Staff corrections to owner, own branch and same Laos day', async () => {
    historyRows([distribution, { ...distribution, id: 'other-owner', createdBy: 'u2' },
      { ...distribution, id: 'foreign', branchId: '019' },
      { ...distribution, id: 'past-day', dateKey: '2026-09-13' }]);
    const user = userEvent.setup(); arrange();
    await changeHistoryStart(user, '2026-09-13');
    expect(screen.getByRole('button', { name: 'ແກ້ໄຂ distribution-a' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'ແກ້ໄຂ past-day' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'ແກ້ໄຂ other-owner' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'ແກ້ໄຂ foreign' })).not.toBeInTheDocument();
  });

  it.each(['branch_manager', 'admin'])('allows $0 past-day correction only in its explicit branch scope', async (role) => {
    historyRows([{ ...distribution, dateKey: '2026-09-13', createdBy: 'u2' }, { ...distribution, id: 'foreign', branchId: '019' }]);
    const user = userEvent.setup(); arrange(role, role === 'admin' ? '/gifts?branchId=010' : '/gifts');
    await changeHistoryStart(user, '2026-09-13');
    expect(screen.queryByRole('button', { name: 'ແກ້ໄຂ foreign' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'ແກ້ໄຂ distribution-a' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('keeps failed correction retries stable and reloads a stale version for review before a new mutation', async () => {
    service.amendGiftDistribution.mockRejectedValueOnce(new Error('offline'))
      .mockRejectedValueOnce({ code: 'functions/failed-precondition', message: 'Distribution version changed; refresh before saving' });
    const user = userEvent.setup(); arrange('branch_manager');
    await user.click(screen.getByRole('button', { name: 'ແກ້ໄຂ distribution-a' }));
    await user.type(screen.getByLabelText('ເຫດຜົນການແກ້ໄຂ'), 'Correct quantity');
    await user.click(screen.getByRole('button', { name: 'ຢືນຢັນການແກ້ໄຂ' }));
    await user.click(screen.getByRole('button', { name: 'ຢືນຢັນການແກ້ໄຂ' }));
    expect(service.amendGiftDistribution.mock.calls[1][0]).toEqual(service.amendGiftDistribution.mock.calls[0][0]);
    expect(screen.getByRole('button', { name: 'ຢືນຢັນການແກ້ໄຂ' })).toBeDisabled();
    historyRows([{ ...distribution, version: 3, totalUnits: 22, items: [{ ...distribution.items[0], packs: 2, totalUnits: 22 }] }]);
    await user.click(screen.getByRole('button', { name: 'ໂຫຼດລາຍການລ່າສຸດ' }));
    expect(screen.getByText('ຈຳນວນເກົ່າ: 22 · ຈຳນວນໃໝ່: 22')).toBeInTheDocument();
    await user.type(screen.getByLabelText('ເຫດຜົນການແກ້ໄຂ'), 'Reviewed latest');
    await user.click(screen.getByRole('button', { name: 'ຢືນຢັນການແກ້ໄຂ' }));
    expect(service.amendGiftDistribution.mock.calls[2][0].expectedVersion).toBe(3);
    expect(service.amendGiftDistribution.mock.calls[2][0].mutationId).not.toBe(service.amendGiftDistribution.mock.calls[0][0].mutationId);
  });

  it('clears history on a subscription error and rejects invalid date ranges', async () => {
    let fail;
    service.subscribeGiftDistributions.mockImplementation((_identity, _options, onData, onError) => { fail = onError; onData([distribution]); return vi.fn(); });
    const user = userEvent.setup(); arrange();
    act(() => fail(new Error('offline')));
    expect(screen.queryByRole('button', { name: 'ແກ້ໄຂ distribution-a' })).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
    service.subscribeGiftDistributions.mockClear();
    await changeHistoryStart(user, '2026-09-15');
    expect(service.subscribeGiftDistributions).not.toHaveBeenCalled();
  });
});

describe('low-stock notification page destination', () => {
  it.each([
    ['admin', '019', '019'], ['branch_manager', '010', '010'],
    ['branch_manager', '019', '010'], ['branch_manager', 'unknown', '010'],
  ])('opens Stock and filters the gift for %s requested %s using safe branch %s', (role, requested, safe) => {
    arrange(role, `/gifts?tab=stock&branchId=${requested}&giftId=umbrella`);
    expect(screen.getByRole('button', { name: 'ສະຕັອກ' })).toHaveAttribute('aria-pressed', 'true');
    expect(service.subscribeGiftStocks).toHaveBeenCalledWith(auth.identity, { branchId: safe }, expect.any(Function), expect.any(Function));
    expect(screen.getByText('Umbrella')).toBeInTheDocument();
    expect(screen.queryByText('Shirt')).not.toBeInTheDocument();
    expect(service.subscribeGiftDistributions).not.toHaveBeenCalled();
  });

  it.each(['unknown', '010&branchId=019'])('requires explicit valid Admin branch for %s', (branch) => {
    arrange('admin', `/gifts?tab=stock&branchId=${branch}&giftId=umbrella`);
    expect(screen.getByRole('alert')).toHaveTextContent('ເລືອກສາຂາ');
    expect(service.subscribeGiftStocks).not.toHaveBeenCalled();
  });

  it('ignores malformed gift IDs without leaving the Manager scope', () => {
    arrange('branch_manager', '/gifts?tab=stock&branchId=010&giftId=bad%2Fid');
    expect(screen.getByText('Umbrella')).toBeInTheDocument();
    expect(screen.getByText('Shirt')).toBeInTheDocument();
  });

  it('does not expose Stock operations to Staff through notification parameters', () => {
    arrange('staff', '/gifts?tab=stock&branchId=019&giftId=umbrella');
    expect(screen.queryByRole('button', { name: 'Adjust stock' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ແຈກເຄື່ອງ' })).toHaveAttribute('aria-pressed', 'true');
  });
});
