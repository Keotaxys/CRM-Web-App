import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import GiftDistributionForm from './GiftDistributionForm';

const serviceMocks = vi.hoisted(() => ({
  recordGiftDistribution: vi.fn(), subscribeActiveGiftItems: vi.fn(), subscribeGiftCampaigns: vi.fn(),
  subscribeGiftStocks: vi.fn(), subscribeCustomers: vi.fn(),
}));
vi.mock('../services/giftService', () => ({
  recordGiftDistribution: serviceMocks.recordGiftDistribution,
  subscribeActiveGiftItems: serviceMocks.subscribeActiveGiftItems,
  subscribeGiftCampaigns: serviceMocks.subscribeGiftCampaigns,
  subscribeGiftStocks: serviceMocks.subscribeGiftStocks,
}));
vi.mock('../services/customersService', () => ({ subscribeCustomers: serviceMocks.subscribeCustomers }));

const staffIdentity = { uid: 'staff-a', role: 'staff', branchId: '010', accountStatus: 'approved' };
const gifts = [
  { id: 'umbrella', name: 'Umbrella', sortOrder: 20, unitsPerPack: 10, packLabel: 'pack', unitLabel: 'unit' },
  { id: 'bag', name: 'Bag', sortOrder: 10, unitsPerPack: 5, packLabel: 'pack', unitLabel: 'unit' },
];
let user;

function publishData() {
  serviceMocks.subscribeActiveGiftItems.mockImplementation((onData) => { onData(gifts); return vi.fn(); });
  serviceMocks.subscribeGiftStocks.mockImplementation((_identity, _options, onData) => { onData([{ giftId: 'umbrella', currentUnits: 17 }, { giftId: 'bag', currentUnits: 5 }]); return vi.fn(); });
  serviceMocks.subscribeGiftCampaigns.mockImplementation((_identity, _options, onData) => { onData([{ id: 'campaign-a', name: 'Campaign A', active: true }]); return vi.fn(); });
  serviceMocks.subscribeCustomers.mockImplementation((_identity, onData) => { onData([{ id: 'customer-a', name: 'Customer A', recordState: 'active', branchId: '010' }]); return vi.fn(); });
}

async function submitFormWithoutRecipient() { await user.click(screen.getByRole('button', { name: 'ບັນທຶກ' })); }
async function chooseOption(control, optionName) {
  await user.click(control);
  await user.click(screen.getByRole('option', { name: optionName }));
}
async function selectSameGiftTwice() {
  await chooseOption(screen.getAllByLabelText('ເຄື່ອງແຈກ')[0], 'Umbrella');
  await user.click(screen.getByRole('button', { name: 'ເພີ່ມເຄື່ອງແຈກ' }));
  await chooseOption(screen.getAllByLabelText('ເຄື່ອງແຈກ')[1], 'Umbrella');
}

describe('GiftDistributionForm', () => {
  beforeEach(() => { vi.clearAllMocks(); user = userEvent.setup(); publishData(); serviceMocks.recordGiftDistribution.mockResolvedValue({}); });

  it('starts with one gift row and adds only selected products', async () => {
    render(<GiftDistributionForm identity={staffIdentity} />);
    expect(screen.getAllByLabelText('ເຄື່ອງແຈກ')).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: 'ເພີ່ມເຄື່ອງແຈກ' }));
    expect(screen.getAllByLabelText('ເຄື່ອງແຈກ')).toHaveLength(2);
  });

  it('requires exactly one Customer or Campaign and prevents duplicate gifts', async () => {
    render(<GiftDistributionForm identity={staffIdentity} />);
    await submitFormWithoutRecipient();
    expect(screen.getByRole('alert')).toHaveTextContent('ລູກຄ້າ ຫຼື Campaign');
    await selectSameGiftTwice();
    expect(screen.getByRole('alert')).toHaveTextContent('ຊ້ຳ');
  });

  it('sorts gifts and displays current stock in packs and units', async () => {
    render(<GiftDistributionForm identity={staffIdentity} />);
    await user.click(screen.getByLabelText('ເຄື່ອງແຈກ'));
    expect(screen.getAllByRole('option', { name: /Bag|Umbrella/ }).map((option) => option.textContent)).toEqual(['Bag', 'Umbrella']);
    await user.click(screen.getByRole('option', { name: 'Umbrella' }));
    expect(screen.getByText('1 pack 7 unit')).toBeInTheDocument();
    expect(screen.getByText('ລວມ: 10')).toBeInTheDocument();
  });

  it('keeps editing safe when a selected quantity is cleared and reports it as invalid', async () => {
    render(<GiftDistributionForm identity={staffIdentity} />);
    await chooseOption(screen.getByLabelText('ເຄື່ອງແຈກ'), 'Umbrella');
    await user.clear(screen.getByLabelText('ຈຳນວນຫໍ່'));
    expect(screen.getByLabelText('ຈຳນວນຫໍ່')).toHaveValue(null);
    expect(screen.getByText('ລວມ: —')).toBeInTheDocument();
    expect(screen.getByText('ຈຳນວນຕ້ອງເປັນຈຳນວນເຕັມ')).toBeInTheDocument();
    await submitFormWithoutRecipient();
    expect(screen.getByRole('alert')).toHaveTextContent('ລູກຄ້າ ຫຼື Campaign');
  });

  it('uses a searchable branch-scoped recipient selector for Customers and active Campaigns', async () => {
    serviceMocks.subscribeCustomers.mockImplementation((_identity, onData) => { onData([{ id: 'customer-a', name: 'Customer A', recordState: 'active', branchId: '020' }]); return vi.fn(); });
    render(<GiftDistributionForm identity={{ ...staffIdentity, role: 'admin', branchId: null }} effectiveBranchId="020" />);
    expect(serviceMocks.subscribeGiftCampaigns).toHaveBeenCalledWith(expect.anything(), { branchId: '020', active: true }, expect.any(Function), expect.any(Function));
    expect(serviceMocks.subscribeCustomers.mock.calls[0][0].claims).toMatchObject({ role: 'branch_manager', branchId: '020' });
    await chooseOption(screen.getByLabelText('ປະເພດຜູ້ຮັບ'), 'ລູກຄ້າ');
    await user.click(screen.getByRole('combobox', { name: 'ຜູ້ຮັບ' }));
    expect(screen.getByRole('option', { name: 'Customer A' })).toBeInTheDocument();
    await user.click(screen.getByRole('option', { name: 'Customer A' }));
    await chooseOption(screen.getByLabelText('ປະເພດຜູ້ຮັບ'), 'Campaign');
    await user.click(screen.getByRole('combobox', { name: 'ຜູ້ຮັບ' }));
    expect(screen.getByRole('option', { name: 'Campaign A' })).toBeInTheDocument();
  });

  it('caps at 25 rows and rejects invalid whole quantities', async () => {
    render(<GiftDistributionForm identity={staffIdentity} />);
    for (let index = 1; index < 25; index += 1) fireEvent.click(screen.getByRole('button', { name: 'ເພີ່ມເຄື່ອງແຈກ' }));
    expect(screen.getAllByLabelText('ເຄື່ອງແຈກ')).toHaveLength(25);
    expect(screen.getByRole('button', { name: 'ເພີ່ມເຄື່ອງແຈກ' })).toBeDisabled();
    await chooseOption(screen.getAllByLabelText('ເຄື່ອງແຈກ')[0], 'Umbrella');
    fireEvent.change(screen.getAllByLabelText('ຈຳນວນຫໍ່')[0], { target: { value: '1.5' } });
    expect(screen.getAllByLabelText('ຈຳນວນຫໍ່')[0]).toHaveValue(1);
  });

  it('keeps the draft and operation id after insufficient stock, preventing duplicate submit', async () => {
    let reject;
    serviceMocks.recordGiftDistribution.mockImplementationOnce(() => new Promise((_, fail) => { reject = fail; }));
    render(<GiftDistributionForm identity={staffIdentity} />);
    await chooseOption(screen.getByLabelText('ປະເພດຜູ້ຮັບ'), 'ລູກຄ້າ');
    await user.click(screen.getByRole('combobox', { name: 'ຜູ້ຮັບ' }));
    await user.click(screen.getByRole('option', { name: 'Customer A' }));
    await chooseOption(screen.getByLabelText('ເຄື່ອງແຈກ'), 'Umbrella');
    await user.dblClick(screen.getByRole('button', { name: 'ບັນທຶກ' }));
    expect(serviceMocks.recordGiftDistribution).toHaveBeenCalledTimes(1);
    const operationId = serviceMocks.recordGiftDistribution.mock.calls[0][0].distributionId;
    reject({ message: 'insufficient gift stock' });
    expect(await screen.findByRole('alert')).toHaveTextContent('Stock');
    await user.click(screen.getByRole('button', { name: 'ບັນທຶກ' }));
    await waitFor(() => expect(serviceMocks.recordGiftDistribution).toHaveBeenCalledTimes(2));
    expect(serviceMocks.recordGiftDistribution.mock.calls[1][0].distributionId).toBe(operationId);
  });

  it('allocates independent row keys after a successful reset', async () => {
    render(<GiftDistributionForm identity={staffIdentity} />);
    await chooseOption(screen.getByLabelText('ປະເພດຜູ້ຮັບ'), 'ລູກຄ້າ');
    await user.click(screen.getByRole('combobox', { name: 'ຜູ້ຮັບ' }));
    await user.click(screen.getByRole('option', { name: 'Customer A' }));
    await chooseOption(screen.getByLabelText('ເຄື່ອງແຈກ'), 'Umbrella');
    await user.click(screen.getByRole('button', { name: 'ບັນທຶກ' }));
    await waitFor(() => expect(serviceMocks.recordGiftDistribution).toHaveBeenCalledTimes(1));
    await user.click(screen.getByRole('button', { name: 'ເພີ່ມເຄື່ອງແຈກ' }));
    const rows = screen.getAllByLabelText('ເຄື່ອງແຈກ');
    await chooseOption(rows[0], 'Bag');
    await chooseOption(rows[1], 'Umbrella');
    expect(screen.getAllByLabelText('ເຄື່ອງແຈກ')[0]).toHaveTextContent('Bag');
    expect(screen.getAllByLabelText('ເຄື່ອງແຈກ')[1]).toHaveTextContent('Umbrella');
  });
});
