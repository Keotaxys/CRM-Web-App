import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DailySalesForm from './DailySalesForm';

const serviceMocks = vi.hoisted(() => ({
  subscribeActiveSalesProducts: vi.fn(),
  subscribeDailySales: vi.fn(),
  saveDailySales: vi.fn(),
}));
const authMock = vi.hoisted(() => ({ identity: null }));

vi.mock('../auth/useAuth', () => ({ useAuth: () => authMock.identity }));
vi.mock('../shared/dateTime', async (original) => ({
  ...await original(),
  laosTodayKey: () => '2026-09-11',
}));
vi.mock('../services/salesService', () => serviceMocks);

const activeProducts = [
  { id: 'bcel', name: 'BCEL One', active: true, sortOrder: 1 },
  { id: 'atm', name: 'ATM', active: true, sortOrder: 2 },
];

function arrange({ role = 'staff', records = [], saveError = null } = {}) {
  authMock.identity = { user: { uid: 'staff-a' }, profile: { name: 'Staff A' }, claims: { role, branchId: 'VTE' } };
  serviceMocks.subscribeActiveSalesProducts.mockImplementation((onData) => { onData(activeProducts); return vi.fn(); });
  serviceMocks.subscribeDailySales.mockImplementation((_identity, _range, onData) => { onData(records); return vi.fn(); });
  serviceMocks.saveDailySales.mockImplementation(() => saveError ? Promise.reject(saveError) : Promise.resolve());
  return render(<DailySalesForm />);
}

describe('DailySalesForm', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders active catalog order and a saved inactive historical product with existing quantities', async () => {
    arrange({ records: [{ id: 'today_staff-a', items: [
      { productId: 'atm', productNameSnapshot: 'ATM', quantity: 3 },
      { productId: 'old', productNameSnapshot: 'ຜະລິດຕະພັນເກົ່າ', quantity: 2 },
    ] }] });
    expect((await screen.findAllByRole('spinbutton')).map((input) => input.getAttribute('aria-label'))).toEqual([
      'ຈຳນວນ BCEL One', 'ຈຳນວນ ATM', 'ຈຳນວນ ຜະລິດຕະພັນເກົ່າ',
    ]);
    expect(screen.getByLabelText('ຈຳນວນ ATM')).toHaveValue(3);
    expect(screen.getByLabelText('ຈຳນວນ ຜະລິດຕະພັນເກົ່າ')).toHaveValue(2);
  });

  it('waits for both subscriptions and loads only the current manager entry', async () => {
    authMock.identity = { user: { uid: 'staff-a' }, profile: { name: 'Staff A' }, claims: { role: 'branch_manager', branchId: '010' } };
    let publishProducts;
    let publishSales;
    serviceMocks.subscribeActiveSalesProducts.mockImplementation((onData) => { publishProducts = onData; return vi.fn(); });
    serviceMocks.subscribeDailySales.mockImplementation((_identity, _range, onData) => { publishSales = onData; return vi.fn(); });
    render(<DailySalesForm />);
    act(() => publishProducts(activeProducts));
    expect(await screen.findByLabelText('ຈຳນວນ BCEL One')).toHaveValue(0);
    act(() => publishSales([
      { id: 'today_staff-b', staffUid: 'staff-b', items: [{ productId: 'bcel', productNameSnapshot: 'BCEL One', quantity: 9 }] },
      { id: 'today_staff-a', staffUid: 'staff-a', items: [{ productId: 'bcel', productNameSnapshot: 'BCEL One', quantity: 2 }] },
    ]));
    await waitFor(() => expect(screen.getByLabelText('ຈຳນວນ BCEL One')).toHaveValue(2));
  });

  it('keeps controls whole and nonnegative while allowing a cleared controlled input', async () => {
    arrange();
    const user = userEvent.setup();
    const input = await screen.findByLabelText('ຈຳນວນ BCEL One');
    await user.click(screen.getByRole('button', { name: 'ເພີ່ມ BCEL One' }));
    expect(input).toHaveValue(1);
    await user.click(screen.getByRole('button', { name: 'ຫຼຸດ BCEL One' }));
    await user.click(screen.getByRole('button', { name: 'ຫຼຸດ BCEL One' }));
    expect(input).toHaveValue(0);
    await user.clear(input);
    expect(input).toHaveValue(null);
    await user.type(input, '1.5');
    expect(input).toHaveValue(1);
  });

  it('guards double submit synchronously and announces success', async () => {
    let resolveSave;
    arrange();
    serviceMocks.saveDailySales.mockImplementation(() => new Promise((resolve) => { resolveSave = resolve; }));
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'ເພີ່ມ BCEL One' }));
    const saveButton = screen.getByRole('button', { name: 'ບັນທຶກຍອດມື້ນີ້' });
    await user.dblClick(saveButton);
    expect(serviceMocks.saveDailySales).toHaveBeenCalledTimes(1);
    expect(serviceMocks.saveDailySales).toHaveBeenCalledWith([{ productId: 'bcel', quantity: 1 }]);
    resolveSave();
    expect(await screen.findByRole('status')).toHaveTextContent('ບັນທຶກຍອດຂາຍແລ້ວ');
  });

  it('preserves quantities and reports an error when saving fails', async () => {
    arrange({ saveError: new Error('offline') });
    const user = userEvent.setup();
    const input = await screen.findByLabelText('ຈຳນວນ BCEL One');
    await user.type(input, '4');
    await user.click(screen.getByRole('button', { name: 'ບັນທຶກຍອດມື້ນີ້' }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(input).toHaveValue(4);
  });

  it('does not render an entry form for Admin', async () => {
    arrange({ role: 'admin' });
    await waitFor(() => expect(serviceMocks.subscribeActiveSalesProducts).not.toHaveBeenCalled());
    expect(screen.queryByRole('button', { name: 'ບັນທຶກຍອດມື້ນີ້' })).not.toBeInTheDocument();
  });
});
