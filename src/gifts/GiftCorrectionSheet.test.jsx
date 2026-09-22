import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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
  it('begins a new mutation after a failed attempt changes, while an unchanged retry retains its id', async () => {
    serviceMocks.amendGiftDistribution.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({});
    render(<GiftCorrectionSheet distribution={distribution} gifts={gifts} />);
    const user = userEvent.setup();
    const reason = screen.getByLabelText('ເຫດຜົນການແກ້ໄຂ');
    await user.type(reason, 'first');
    await user.click(screen.getByRole('button', { name: 'ຢືນຢັນການແກ້ໄຂ' }));
    await screen.findByRole('alert');
    const firstId = serviceMocks.amendGiftDistribution.mock.calls[0][0].mutationId;
    await user.type(reason, ' revised');
    await user.click(screen.getByRole('button', { name: 'ຢືນຢັນການແກ້ໄຂ' }));
    expect(serviceMocks.amendGiftDistribution.mock.calls[1][0].mutationId).not.toBe(firstId);
  });
  it('begins a new mutation after a failed attempt changes an item', async () => {
    serviceMocks.amendGiftDistribution.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({});
    render(<GiftCorrectionSheet distribution={distribution} gifts={gifts} />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('ເຫດຜົນການແກ້ໄຂ'), 'first');
    await user.click(screen.getByRole('button', { name: 'ຢືນຢັນການແກ້ໄຂ' }));
    await screen.findByRole('alert');
    const firstId = serviceMocks.amendGiftDistribution.mock.calls[0][0].mutationId;
    fireEvent.change(screen.getByLabelText('ຈຳນວນຫໍ່ umbrella'), { target: { value: '2' } });
    await user.click(screen.getByRole('button', { name: 'ຢືນຢັນການແກ້ໄຂ' }));
    expect(serviceMocks.amendGiftDistribution.mock.calls[1][0].mutationId).not.toBe(firstId);
  });
  it('begins a new mutation after a failed attempt changes action', async () => {
    serviceMocks.cancelGiftDistribution.mockRejectedValueOnce(new Error('offline'));
    render(<GiftCorrectionSheet distribution={distribution} gifts={gifts} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'ຍົກເລີກລາຍການ' }));
    await user.type(screen.getByLabelText('ເຫດຜົນການແກ້ໄຂ'), 'first');
    await user.click(screen.getByRole('button', { name: 'ຢືນຢັນການຍົກເລີກ' }));
    await screen.findByRole('alert');
    const firstId = serviceMocks.cancelGiftDistribution.mock.calls[0][0].mutationId;
    await user.click(screen.getByRole('button', { name: 'ແກ້ໄຂລາຍການ' }));
    await user.click(screen.getByRole('button', { name: 'ຢືນຢັນການແກ້ໄຂ' }));
    expect(serviceMocks.amendGiftDistribution.mock.calls[0][0].mutationId).not.toBe(firstId);
  });
  it('does not confirm or invent totals until every referenced gift is loaded', () => {
    render(<GiftCorrectionSheet distribution={distribution} gifts={[]} />);
    expect(screen.getByRole('status')).toHaveTextContent('ກຳລັງໂຫຼດ');
    expect(screen.getByRole('button', { name: 'ຢືນຢັນການແກ້ໄຂ' })).toBeDisabled();
  });
  it('amends a retired gift from stored snapshots and allows cancellation without catalog metadata', async () => {
    const stored = { ...distribution, items: [{ ...distribution.items[0], giftNameSnapshot: 'Original Umbrella', unitsPerPackSnapshot: 10 }] };
    render(<GiftCorrectionSheet distribution={stored} gifts={[]} />);
    expect(screen.getByText('Original Umbrella')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('ຈຳນວນຫໍ່ umbrella'), { target: { value: '2' } });
    expect(screen.getByText('ຈຳນວນເກົ່າ: 12 · ຈຳນວນໃໝ່: 22')).toBeInTheDocument();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'ຍົກເລີກລາຍການ' }));
    await user.type(screen.getByLabelText('ເຫດຜົນການແກ້ໄຂ'), 'Returned');
    await user.click(screen.getByRole('button', { name: 'ຢືນຢັນການຍົກເລີກ' }));
    expect(serviceMocks.cancelGiftDistribution).toHaveBeenCalledWith(expect.objectContaining({ expectedVersion: 2 }));
  });
  it('shows the stored old total and recalculates the new total after a quantity edit', () => {
    render(<GiftCorrectionSheet distribution={distribution} gifts={gifts} />);
    expect(screen.getByText('ຈຳນວນເກົ່າ: 12 · ຈຳນວນໃໝ່: 12')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('ຈຳນວນຫໍ່ umbrella'), { target: { value: '2' } });
    expect(screen.getByText('ຈຳນວນເກົ່າ: 12 · ຈຳນວນໃໝ່: 22')).toBeInTheDocument();
  });
  it('keeps a cleared draft quantity safe and gates the correction until totals are valid', () => {
    render(<GiftCorrectionSheet distribution={distribution} gifts={gifts} />);
    fireEvent.change(screen.getByLabelText('ຈຳນວນຫໍ່ umbrella'), { target: { value: '' } });
    expect(screen.getByLabelText('ຈຳນວນຫໍ່ umbrella')).toHaveValue(null);
    expect(screen.getByRole('status')).toHaveTextContent('ຈຳນວນຕ້ອງເປັນຈຳນວນເຕັມບວກ');
    expect(screen.getByRole('button', { name: 'ຢືນຢັນການແກ້ໄຂ' })).toBeDisabled();
  });
  it('treats leading-zero correction quantities as invalid instead of crashing', () => {
    render(<GiftCorrectionSheet distribution={distribution} gifts={gifts} />);
    fireEvent.change(screen.getByLabelText('ຈຳນວນຫໍ່ umbrella'), { target: { value: '01' } });
    expect(screen.getByRole('status')).toHaveTextContent('ຈຳນວນຕ້ອງເປັນຈຳນວນເຕັມບວກ');
    expect(screen.getByRole('button', { name: 'ຢືນຢັນການແກ້ໄຂ' })).toBeDisabled();
  });
  it('gates an overflowed correction total instead of crashing', () => {
    const smallDistribution = { ...distribution, items: [{ ...distribution.items[0], packs: 0, looseUnits: 1, totalUnits: 1 }], totalUnits: 1 };
    const hugePackGift = [{ ...gifts[0], unitsPerPack: Number.MAX_SAFE_INTEGER }];
    render(<GiftCorrectionSheet distribution={smallDistribution} gifts={hugePackGift} />);
    fireEvent.change(screen.getByLabelText('ຈຳນວນຫໍ່ umbrella'), { target: { value: '1' } });
    expect(screen.getByRole('status')).toHaveTextContent('ຈຳນວນຕ້ອງເປັນຈຳນວນເຕັມບວກ');
    expect(screen.getByRole('button', { name: 'ຢືນຢັນການແກ້ໄຂ' })).toBeDisabled();
  });
  it('locks payload controls while a correction is in flight', async () => {
    let resolve;
    serviceMocks.amendGiftDistribution.mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
    render(<GiftCorrectionSheet distribution={distribution} gifts={gifts} />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('ເຫດຜົນການແກ້ໄຂ'), 'wait');
    await user.click(screen.getByRole('button', { name: 'ຢືນຢັນການແກ້ໄຂ' }));
    expect(screen.getByLabelText('ເຫດຜົນການແກ້ໄຂ')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'ຍົກເລີກລາຍການ' })).toBeDisabled();
    resolve({});
    await waitFor(() => expect(screen.getByLabelText('ເຫດຜົນການແກ້ໄຂ')).not.toBeDisabled());
  });
});
