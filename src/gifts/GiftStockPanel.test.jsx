import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import GiftStockPanel from './GiftStockPanel';

const service = vi.hoisted(() => ({
  subscribeActiveGiftItems: vi.fn(), subscribeGiftStocks: vi.fn(),
  setGiftLowStockThreshold: vi.fn(), adjustGiftStock: vi.fn(),
}));
vi.mock('../services/giftService', () => service);

const manager = { uid: 'manager-1', role: 'branch_manager', branchId: '010', accountStatus: 'approved' };
const gifts = [{ id: 'umbrella', name: 'Umbrella', unitsPerPack: 10, packLabel: 'pack', unitLabel: 'unit', sortOrder: 1 }];

function publish() {
  service.subscribeActiveGiftItems.mockImplementation((onData) => { onData(gifts); return vi.fn(); });
  service.subscribeGiftStocks.mockImplementation((_identity, _options, onData) => { onData([{ giftId: 'umbrella', currentUnits: 10, lowStockThresholdUnits: 10 }]); return vi.fn(); });
}

describe('GiftStockPanel', () => {
  beforeEach(() => { vi.clearAllMocks(); publish(); service.setGiftLowStockThreshold.mockResolvedValue({}); service.adjustGiftStock.mockResolvedValue({}); });

  it('shows pack and unit stock with equal-threshold low state', () => {
    render(<GiftStockPanel identity={manager} effectiveBranchId="010" />);
    expect(screen.getByText('1 pack 0 unit')).toBeInTheDocument();
    expect(screen.getByText(/Low stock/i)).toBeInTheDocument();
  });

  it('updates a threshold and keeps the manager locked to their own branch', async () => {
    const user = userEvent.setup();
    render(<GiftStockPanel identity={manager} effectiveBranchId="019" />);
    expect(service.subscribeGiftStocks).toHaveBeenCalledWith(manager, { branchId: '010' }, expect.any(Function), expect.any(Function));
    await user.clear(screen.getByLabelText('Low-stock threshold'));
    await user.type(screen.getByLabelText('Low-stock threshold'), '4');
    await user.click(screen.getByRole('button', { name: /update threshold/i }));
    expect(service.setGiftLowStockThreshold).toHaveBeenCalledWith({ branchId: '010', giftId: 'umbrella', lowStockThresholdUnits: '4' });
  });

  it('requires an adjustment reason and retains an error for a retry', async () => {
    const user = userEvent.setup();
    service.adjustGiftStock.mockRejectedValueOnce({ message: 'insufficient gift stock' });
    render(<GiftStockPanel identity={manager} effectiveBranchId="010" />);
    await user.selectOptions(screen.getByLabelText('Adjustment item'), 'umbrella');
    await user.clear(screen.getByLabelText('Adjustment units'));
    await user.type(screen.getByLabelText('Adjustment units'), '-1');
    await user.click(screen.getByRole('button', { name: /adjust stock/i }));
    expect(screen.getByRole('alert')).toHaveTextContent(/reason/i);
    await user.type(screen.getByLabelText('Adjustment reason'), 'Count correction');
    await user.click(screen.getByRole('button', { name: /adjust stock/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/Stock/i);
    expect(screen.getByLabelText('Adjustment reason')).toHaveValue('Count correction');
  });
});
