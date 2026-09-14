import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import GiftCorrectionSheet from './GiftCorrectionSheet';

const serviceMocks = vi.hoisted(() => ({ amendGiftDistribution: vi.fn(), cancelGiftDistribution: vi.fn() }));
vi.mock('../services/giftService', () => serviceMocks);
const distribution = { id: 'd1', branchId: '010', version: 2, recipientType: 'customer', customerId: 'c1', items: [{ giftId: 'umbrella', packs: 1, looseUnits: 2, totalUnits: 12 }], totalUnits: 12 };
const gifts = [{ id: 'umbrella', name: 'Umbrella', unitsPerPack: 10, packLabel: 'pack', unitLabel: 'unit' }];

describe('GiftCorrectionSheet', () => {
  beforeEach(() => { vi.clearAllMocks(); serviceMocks.amendGiftDistribution.mockResolvedValue({}); serviceMocks.cancelGiftDistribution.mockResolvedValue({}); });
  it('requires a reason and shows old and new totals before amending', async () => {
    render(<GiftCorrectionSheet distribution={distribution} gifts={gifts} />);
    expect(screen.getByText(/12/)).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('button', { name: 'ຢືນຢັນການແກ້ໄຂ' }));
    expect(screen.getByRole('alert')).toHaveTextContent('ເຫດຜົນ');
  });
  it('uses expected version and reuses a mutation id for a retry', async () => {
    serviceMocks.cancelGiftDistribution.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({});
    render(<GiftCorrectionSheet distribution={distribution} gifts={gifts} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'ຍົກເລີກລາຍການ' }));
    await user.type(screen.getByLabelText('ເຫດຜົນການແກ້ໄຂ'), 'duplicate');
    await user.click(screen.getByRole('button', { name: 'ຢືນຢັນການຍົກເລີກ' }));
    await screen.findByRole('alert');
    await user.click(screen.getByRole('button', { name: 'ຢືນຢັນການຍົກເລີກ' }));
    expect(serviceMocks.cancelGiftDistribution.mock.calls[0][0]).toMatchObject({ distributionId: 'd1', expectedVersion: 2, reason: 'duplicate' });
    expect(serviceMocks.cancelGiftDistribution.mock.calls[1][0].mutationId).toBe(serviceMocks.cancelGiftDistribution.mock.calls[0][0].mutationId);
  });
});
