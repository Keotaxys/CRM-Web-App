import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import GiftInboundPanel from './GiftInboundPanel';

const service = vi.hoisted(() => ({
  subscribeActiveGiftItems: vi.fn(), subscribeGiftAllocations: vi.fn(), receiveGiftStock: vi.fn(),
  createGiftAllocation: vi.fn(), confirmGiftAllocation: vi.fn(), cancelGiftAllocation: vi.fn(),
}));
vi.mock('../services/giftService', () => service);

const manager = { uid: 'manager-1', role: 'branch_manager', branchId: '010', accountStatus: 'approved' };
const admin = { uid: 'admin-1', role: 'admin', branchId: null, accountStatus: 'approved' };
const pending = { id: 'allocation-a', targetBranchId: '010', reference: 'HQ-2026-001', source: 'HQ', status: 'pending',
  items: [{ giftId: 'umbrella', giftNameSnapshot: 'Original Umbrella', packs: 2, looseUnits: 3,
    unitsPerPackSnapshot: 10, totalUnits: 23 }, { giftId: 'shirt', giftNameSnapshot: 'Original Shirt',
    packs: 1, looseUnits: 2, unitsPerPackSnapshot: 5, totalUnits: 7 }] };
function publish(pendingItems = [pending]) {
  service.subscribeActiveGiftItems.mockImplementation((onData) => { onData([{ id: 'umbrella', name: 'Umbrella', unitsPerPack: 10, packLabel: 'pack', unitLabel: 'unit', sortOrder: 1 }]); return vi.fn(); });
  service.subscribeGiftAllocations.mockImplementation((_identity, options, onData) => {
    const allocations = {
      pending: pendingItems,
      confirmed: [{ id: 'allocation-confirmed', source: 'Confirmed allocation', status: 'confirmed', items: [] }],
      cancelled: [{ id: 'allocation-cancelled', source: 'Cancelled allocation', status: 'cancelled', items: [] }],
    };
    onData(allocations[options.status]); return vi.fn();
  });
}

describe('GiftInboundPanel', () => {
  beforeEach(() => { vi.clearAllMocks(); publish(); service.receiveGiftStock.mockResolvedValue({}); service.confirmGiftAllocation.mockResolvedValue({}); });

  it('receives direct stock with source and optional reference through compact item rows', async () => {
    const user = userEvent.setup(); render(<GiftInboundPanel identity={manager} effectiveBranchId="010" />);
    await user.type(screen.getByLabelText('ແຫຼ່ງຮັບເຂົ້າ'), 'HQ');
    await user.click(screen.getByLabelText('ເຄື່ອງແຈກ'));
    await user.click(screen.getByRole('option', { name: 'Umbrella' }));
    await user.click(screen.getByRole('button', { name: /ບັນທຶກຮັບເຂົ້າ/i }));
    expect(service.receiveGiftStock).toHaveBeenCalledWith(expect.objectContaining({ branchId: '010', source: 'HQ', reference: '', items: [{ giftId: 'umbrella', packs: 1, looseUnits: 0 }] }));
  });

  it('does not claim pending allocation as stock success and confirms only after a dialog', async () => {
    const user = userEvent.setup(); render(<GiftInboundPanel identity={manager} effectiveBranchId="010" />);
    expect(screen.getByText(/ລໍຖ້າຢືນຢັນ/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /ຢືນຢັນການໂອນ/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^ຢືນຢັນ$/i }));
    expect(service.confirmGiftAllocation).toHaveBeenCalledWith(expect.objectContaining({ allocationId: 'allocation-a' }));
  });

  it('permits allocation creation to Admin only', () => {
    const { rerender } = render(<GiftInboundPanel identity={manager} effectiveBranchId="010" />);
    expect(screen.queryByRole('button', { name: /ສ້າງລາຍການໂອນ/i })).not.toBeInTheDocument();
    rerender(<GiftInboundPanel identity={admin} effectiveBranchId="010" />);
    expect(screen.getByRole('button', { name: /ສ້າງລາຍການໂອນ/i })).toBeInTheDocument();
  });

  it('keeps Admin-only allocation cancellation hidden from a Manager', () => {
    render(<GiftInboundPanel identity={manager} effectiveBranchId="010" />);

    expect(screen.getByRole('button', { name: /ຢືນຢັນການໂອນ/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^ຍົກເລີກການໂອນ$/i })).not.toBeInTheDocument();
  });

  it('renders confirmed and cancelled history as disabled actions and gives cancellation its own dialog', async () => {
    const user = userEvent.setup(); render(<GiftInboundPanel identity={admin} effectiveBranchId="010" />);
    expect(screen.getAllByText('ຢືນຢັນແລ້ວ').length).toBeGreaterThan(0);
    expect(screen.getAllByText('ຍົກເລີກແລ້ວ').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'ຢືນຢັນແລ້ວ' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'ຍົກເລີກແລ້ວ' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: /^ຍົກເລີກການໂອນ$/i }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: 'ຍົກເລີກການໂອນ' })).toBeInTheDocument();
    expect(within(dialog).getByText(/ບໍ່ປັບສະຕັອກ/i)).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'ຍົກເລີກການໂອນ' })).toBeInTheDocument();
  });

  it.each([manager, admin])('shows branch, reference and snapshot quantities before $role confirms', async (identity) => {
    const user = userEvent.setup(); render(<GiftInboundPanel identity={identity} effectiveBranchId="010" />);
    await user.click(screen.getByRole('button', { name: /ຢືນຢັນການໂອນ/i }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('010 - ສຳນັກງານໃຫຍ່')).toBeInTheDocument();
    expect(within(dialog).getByText('HQ-2026-001')).toBeInTheDocument();
    const umbrella = within(dialog).getByRole('listitem', { name: 'Original Umbrella' });
    expect(umbrella).toHaveTextContent('2 ຫໍ່ × 10 ຊິ້ນ + 3 ຊິ້ນ = 23 ຊິ້ນ');
    expect(within(dialog).getByRole('listitem', { name: 'Original Shirt' })).toHaveTextContent('1 ຫໍ່ × 5 ຊິ້ນ + 2 ຊິ້ນ = 7 ຊິ້ນ');
    expect(within(dialog).getByText('ລວມ: 30 ຊິ້ນ')).toBeInTheDocument();
    expect(service.confirmGiftAllocation).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole('button', { name: 'ຢືນຢັນ' }));
    expect(service.confirmGiftAllocation).toHaveBeenCalledWith(expect.objectContaining({ allocationId: pending.id }));
  });

  it('distinguishes pending allocations from the same source by reference and ID', () => {
    publish([pending, { ...pending, id: 'allocation-b', reference: 'HQ-2026-002' }]);
    render(<GiftInboundPanel identity={manager} effectiveBranchId="010" />);
    expect(screen.getByRole('group', { name: 'ການໂອນເຄື່ອງແຈກ HQ-2026-001' })).toHaveTextContent('allocation-a');
    expect(screen.getByRole('group', { name: 'ການໂອນເຄື່ອງແຈກ HQ-2026-002' })).toHaveTextContent('allocation-b');
  });

  it('rejects a blank cancellation reason and submits the exact reason with a stable retry ID', async () => {
    service.cancelGiftAllocation.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({});
    const user = userEvent.setup(); render(<GiftInboundPanel identity={admin} effectiveBranchId="010" />);
    await user.click(screen.getByRole('button', { name: /^ຍົກເລີກການໂອນ$/i }));
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'ຍົກເລີກການໂອນ' }));
    expect(service.cancelGiftAllocation).not.toHaveBeenCalled();
    expect(within(dialog).getByRole('alert')).toHaveTextContent('ເຫດຜົນ');
    const reason = '  Duplicate shipment — HQ-2026-001  ';
    await user.type(within(dialog).getByLabelText('ເຫດຜົນການຍົກເລີກ'), reason);
    await user.click(within(dialog).getByRole('button', { name: 'ຍົກເລີກການໂອນ' }));
    expect(within(dialog).getByLabelText('ເຫດຜົນການຍົກເລີກ')).toHaveValue(reason);
    const submitted = service.cancelGiftAllocation.mock.calls[0][0];
    expect(submitted).toMatchObject({ allocationId: 'allocation-a', reason });
    await user.click(within(dialog).getByRole('button', { name: 'ຍົກເລີກການໂອນ' }));
    expect(service.cancelGiftAllocation.mock.calls[1][0]).toEqual(submitted);
  });
});
