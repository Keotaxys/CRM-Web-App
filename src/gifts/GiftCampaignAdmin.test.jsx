import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import GiftCampaignAdmin from './GiftCampaignAdmin';

const service = vi.hoisted(() => ({ subscribeGiftCampaigns: vi.fn(), createGiftCampaign: vi.fn(), updateGiftCampaign: vi.fn() }));
vi.mock('../services/giftService', () => service);
const manager = { uid: 'manager-1', role: 'branch_manager', branchId: '010', accountStatus: 'approved' };
const admin = { uid: 'admin-1', role: 'admin', branchId: null, accountStatus: 'approved' };

function publish() { service.subscribeGiftCampaigns.mockImplementation((_identity, _options, onData) => { onData([{ id: 'campaign-a', name: 'Old Campaign', branchId: '010', active: false, startDate: '2026-01-01', endDate: '2026-01-02', note: '' }]); return vi.fn(); }); }
describe('GiftCampaignAdmin', () => {
  beforeEach(() => { vi.clearAllMocks(); publish(); });
  it('locks a manager Campaign to their own branch and retains inactive history', () => {
    render(<GiftCampaignAdmin identity={manager} effectiveBranchId="019" />);
    expect(service.subscribeGiftCampaigns).toHaveBeenCalledWith(manager, { branchId: '010', active: false }, expect.any(Function), expect.any(Function));
    expect(screen.getByText('Old Campaign')).toBeInTheDocument();
    expect(screen.getByLabelText('Campaign branch')).toBeDisabled();
  });
  it('requires a valid ordered campaign date range and lets Admin choose the branch', async () => {
    const user = userEvent.setup(); render(<GiftCampaignAdmin identity={admin} effectiveBranchId="010" />);
    expect(screen.getByLabelText('Campaign branch')).not.toBeDisabled();
    await user.type(screen.getByLabelText('Campaign name'), 'New Campaign');
    await user.clear(screen.getByLabelText('Start date')); await user.type(screen.getByLabelText('Start date'), '2026-12-31');
    await user.clear(screen.getByLabelText('End date')); await user.type(screen.getByLabelText('End date'), '2026-01-01');
    await user.click(screen.getByRole('button', { name: /save campaign/i }));
    expect(screen.getByRole('alert')).toHaveTextContent(/date range/i);
  });

  it('clears active and inactive Campaign history when an Admin switches to an empty branch', () => {
    service.subscribeGiftCampaigns.mockImplementation((_identity, options, onData) => {
      onData(options.branchId === '010' && options.active ? [{ id: 'campaign-live', name: 'Branch 010 Campaign', branchId: '010', active: true, startDate: '2026-01-01', endDate: '2026-01-02', note: '' }] : []);
      return vi.fn();
    });
    const { rerender } = render(<GiftCampaignAdmin identity={admin} effectiveBranchId="010" />);
    expect(screen.getByText('Branch 010 Campaign')).toBeInTheDocument();
    rerender(<GiftCampaignAdmin identity={admin} effectiveBranchId="019" />);
    expect(screen.queryByText('Branch 010 Campaign')).not.toBeInTheDocument();
  });
});
