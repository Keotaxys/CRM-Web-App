import { render, screen } from '@testing-library/react';
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
function publish() {
  service.subscribeActiveGiftItems.mockImplementation((onData) => { onData([{ id: 'umbrella', name: 'Umbrella', unitsPerPack: 10, packLabel: 'pack', unitLabel: 'unit', sortOrder: 1 }]); return vi.fn(); });
  service.subscribeGiftAllocations.mockImplementation((_identity, _options, onData) => { onData([{ id: 'allocation-a', source: 'HQ', status: 'pending', items: [] }]); return vi.fn(); });
}

describe('GiftInboundPanel', () => {
  beforeEach(() => { vi.clearAllMocks(); publish(); service.receiveGiftStock.mockResolvedValue({}); service.confirmGiftAllocation.mockResolvedValue({}); });

  it('receives direct stock with source and optional reference through compact item rows', async () => {
    const user = userEvent.setup(); render(<GiftInboundPanel identity={manager} effectiveBranchId="010" />);
    await user.type(screen.getByLabelText('Receipt source'), 'HQ');
    await user.selectOptions(screen.getByLabelText('ເຄື່ອງແຈກ'), 'umbrella');
    await user.click(screen.getByRole('button', { name: /receive stock/i }));
    expect(service.receiveGiftStock).toHaveBeenCalledWith(expect.objectContaining({ branchId: '010', source: 'HQ', reference: '', items: [{ giftId: 'umbrella', packs: 1, looseUnits: 0 }] }));
  });

  it('does not claim pending allocation as stock success and confirms only after a dialog', async () => {
    const user = userEvent.setup(); render(<GiftInboundPanel identity={manager} effectiveBranchId="010" />);
    expect(screen.getByText(/Pending allocation/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /confirm allocation/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^confirm$/i }));
    expect(service.confirmGiftAllocation).toHaveBeenCalledWith(expect.objectContaining({ allocationId: 'allocation-a' }));
  });

  it('permits allocation creation to Admin only', () => {
    const { rerender } = render(<GiftInboundPanel identity={manager} effectiveBranchId="010" />);
    expect(screen.queryByRole('button', { name: /create allocation/i })).not.toBeInTheDocument();
    rerender(<GiftInboundPanel identity={admin} effectiveBranchId="010" />);
    expect(screen.getByRole('button', { name: /create allocation/i })).toBeInTheDocument();
  });
});
