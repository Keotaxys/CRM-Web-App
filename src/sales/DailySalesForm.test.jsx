import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import DailySalesForm from './DailySalesForm';

const serviceMocks = vi.hoisted(() => ({
  subscribeActiveSalesProducts: vi.fn(),
  subscribeDailySales: vi.fn(),
  saveDailySales: vi.fn(),
}));
const authMock = vi.hoisted(() => ({ identity: null }));

vi.mock('../auth/useAuth', () => ({ useAuth: () => authMock.identity }));
vi.mock('../services/salesService', () => serviceMocks);

const activeProducts = [
  { id: 'atm', name: 'ATM', active: true, sortOrder: 20 },
  { id: 'bcel', name: 'BCEL One', active: true, sortOrder: 10 },
  { id: 'ibank', name: 'i-Bank', active: true, sortOrder: 30 },
];

function arrange({ role = 'staff', records = [], saveError = null } = {}) {
  authMock.identity = { user: { uid: 'staff-a' }, profile: { name: 'Staff A' }, claims: { role, branchId: 'VTE' } };
  serviceMocks.subscribeActiveSalesProducts.mockImplementation((onData) => { onData(activeProducts); return vi.fn(); });
  serviceMocks.subscribeDailySales.mockImplementation((_identity, _range, onData) => { onData(records); return vi.fn(); });
  serviceMocks.saveDailySales.mockImplementation(() => saveError ? Promise.reject(saveError) : Promise.resolve());
  return render(<DailySalesForm />);
}

async function chooseProduct(rowNumber, productName) {
  const user = userEvent.setup();
  await user.click(screen.getByRole('combobox', { name: `ຜະລິດຕະພັນແຖວ ${rowNumber}` }));
  await user.click(screen.getByRole('option', { name: productName }));
}

describe('DailySalesForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-09-11T10:00:00Z'));
  });
  afterEach(() => vi.useRealTimers());

  it('starts with one compact row, follows Admin display order, defaults selection to one, and prevents duplicates', async () => {
    arrange();
    expect(await screen.findAllByRole('combobox', { name: /ຜະລິດຕະພັນແຖວ/ })).toHaveLength(1);
    expect(screen.getAllByRole('spinbutton')).toHaveLength(1);

    const user = userEvent.setup();
    await user.click(screen.getByRole('combobox', { name: 'ຜະລິດຕະພັນແຖວ 1' }));
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(['BCEL One', 'ATM', 'i-Bank']);
    await user.click(screen.getByRole('option', { name: 'BCEL One' }));
    expect(screen.getByLabelText('ຈຳນວນ BCEL One')).toHaveValue(1);

    await user.click(screen.getByRole('button', { name: '+ ເພີ່ມຜະລິດຕະພັນ' }));
    expect(screen.getAllByRole('combobox', { name: /ຜະລິດຕະພັນແຖວ/ })).toHaveLength(2);
    await user.click(screen.getByRole('combobox', { name: 'ຜະລິດຕະພັນແຖວ 2' }));
    expect(screen.queryByRole('option', { name: 'BCEL One' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(['ATM', 'i-Bank']);
  });

  it('adds and removes only the rows needed for products sold that day', async () => {
    arrange();
    await chooseProduct(1, 'BCEL One');
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: '+ ເພີ່ມຜະລິດຕະພັນ' }));
    await chooseProduct(2, 'ATM');
    expect(screen.getByLabelText('ຈຳນວນ ATM')).toHaveValue(1);
    await user.click(screen.getByRole('button', { name: 'ລຶບແຖວ ATM' }));
    expect(screen.queryByLabelText('ຈຳນວນ ATM')).not.toBeInTheDocument();
    expect(screen.getAllByRole('combobox', { name: /ຜະລິດຕະພັນແຖວ/ })).toHaveLength(1);
  });

  it('restores saved products as compact rows and submits the unchanged data contract', async () => {
    const { container } = arrange({ records: [{ staffUid: 'staff-a', items: [
      { productId: 'atm', productNameSnapshot: 'ATM', quantity: 3 },
      { productId: 'bcel', productNameSnapshot: 'BCEL One', quantity: 2 },
    ] }] });
    expect(await screen.findAllByRole('combobox', { name: /ຜະລິດຕະພັນແຖວ/ })).toHaveLength(2);
    expect(screen.getByLabelText('ຈຳນວນ BCEL One')).toHaveValue(2);
    expect(screen.getByLabelText('ຈຳນວນ ATM')).toHaveValue(3);
    fireEvent.change(screen.getByLabelText('ຈຳນວນ ATM'), { target: { value: '4' } });
    fireEvent.submit(container.querySelector('form'));
    await waitFor(() => expect(serviceMocks.saveDailySales).toHaveBeenCalledWith(
      [{ productId: 'bcel', quantity: 2 }, { productId: 'atm', quantity: 4 }],
      '2026-09-11',
    ));
  });

  it('keeps a saved inactive product visible, removable, and capped at its saved quantity', async () => {
    const { container } = arrange({ records: [{ staffUid: 'staff-a', items: [
      { productId: 'old', productNameSnapshot: 'ຜະລິດຕະພັນເກົ່າ', quantity: 2 },
    ] }] });
    const input = await screen.findByLabelText('ຈຳນວນ ຜະລິດຕະພັນເກົ່າ');
    expect(screen.getByText('ປິດນຳໃຊ້')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'ຜະລິດຕະພັນແຖວ 1' })).toBeDisabled();
    fireEvent.change(input, { target: { value: '3' } });
    expect(screen.getByRole('alert')).toHaveTextContent('ກະລຸນາຫຼຸດຈຳນວນ');
    fireEvent.submit(container.querySelector('form'));
    expect(serviceMocks.saveDailySales).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: '1' } });
    fireEvent.submit(container.querySelector('form'));
    await waitFor(() => expect(serviceMocks.saveDailySales).toHaveBeenCalledWith(
      [{ productId: 'old', quantity: 1 }], '2026-09-11',
    ));
    await userEvent.setup().click(screen.getByRole('button', { name: 'ລຶບແຖວ ຜະລິດຕະພັນເກົ່າ' }));
    expect(screen.queryByText('ປິດນຳໃຊ້')).not.toBeInTheDocument();
  });

  it('fails closed if a newly selected product becomes inactive before saving', async () => {
    const { container } = arrange();
    await chooseProduct(1, 'BCEL One');
    fireEvent.change(screen.getByLabelText('ຈຳນວນ BCEL One'), { target: { value: '5' } });
    act(() => serviceMocks.subscribeActiveSalesProducts.mock.calls[0][0](
      activeProducts.filter((product) => product.id !== 'bcel'),
    ));
    expect(screen.getByText('ປິດນຳໃຊ້')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('ກະລຸນາຫຼຸດຈຳນວນ');
    fireEvent.submit(container.querySelector('form'));
    expect(serviceMocks.saveDailySales).not.toHaveBeenCalled();
  });

  it.each([
    ['functions/permission-denied', 'ທ່ານບໍ່ມີສິດ'],
    ['functions/invalid-argument', 'ກະລຸນາກວດຈຳນວນ'],
    ['functions/unauthenticated', 'ກະລຸນາເຂົ້າລະບົບໃໝ່'],
    ['functions/failed-precondition', 'ຂໍ້ມູນປ່ຽນແລ້ວ'],
  ])('maps %s to actionable Lao and preserves the daily draft', async (code, message) => {
    arrange({ saveError: { code, message: 'Backend English' } });
    await chooseProduct(1, 'BCEL One');
    fireEvent.change(screen.getByLabelText('ຈຳນວນ BCEL One'), { target: { value: '4' } });
    await userEvent.setup().click(screen.getByRole('button', { name: 'ບັນທຶກຍອດມື້ນີ້' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(screen.getByLabelText('ຈຳນວນ BCEL One')).toHaveValue(4);
  });

  it.each(['pending', 'failed'])('blocks submit while daily load is %s', (state) => {
    arrange().unmount();
    serviceMocks.subscribeDailySales.mockImplementation((_identity, _range, _onData, onError) => {
      if (state === 'failed') onError(new Error('offline'));
      return vi.fn();
    });
    const { container } = render(<DailySalesForm />);
    expect(screen.getByRole('button', { name: 'ບັນທຶກຍອດມື້ນີ້' })).toBeDisabled();
    fireEvent.submit(container.querySelector('form'));
    expect(serviceMocks.saveDailySales).not.toHaveBeenCalled();
  });

  it.each(['focus', 'submit'])('locks yesterday draft after suspended tab resumes through %s and reloads today', async (trigger) => {
    vi.setSystemTime(new Date('2026-09-11T16:59:59Z'));
    const { container } = arrange({ records: [{ staffUid: 'staff-a', items: [{ productId: 'bcel', quantity: 5 }] }] });
    vi.setSystemTime(new Date('2026-09-11T17:00:00Z'));
    if (trigger === 'focus') fireEvent(window, new Event('focus'));
    else fireEvent.submit(container.querySelector('form'));
    expect(serviceMocks.saveDailySales).not.toHaveBeenCalled();
    expect(screen.getByLabelText('ຈຳນວນ BCEL One')).toBeDisabled();
    expect(screen.getByLabelText('ຈຳນວນ BCEL One')).toHaveValue(5);
    serviceMocks.subscribeDailySales.mockImplementation((_identity, _range, onData) => { onData([]); return vi.fn(); });
    fireEvent.click(screen.getByRole('button', { name: 'ໂຫຼດມື້ໃໝ່' }));
    expect(await screen.findAllByRole('combobox', { name: /ຜະລິດຕະພັນແຖວ/ })).toHaveLength(1);
    expect(screen.getByRole('spinbutton')).toHaveValue(null);
    expect(serviceMocks.subscribeDailySales).toHaveBeenLastCalledWith(authMock.identity,
      { startKey: '2026-09-12', endKey: '2026-09-12' }, expect.any(Function), expect.any(Function));
  });

  it('resets hydration for a different identity and ignores old subscription callbacks', () => {
    const view = arrange({ records: [{ staffUid: 'staff-a', items: [{ productId: 'bcel', quantity: 5 }] }] });
    const oldCallback = serviceMocks.subscribeDailySales.mock.calls[0][2];
    authMock.identity = { ...authMock.identity, user: { uid: 'staff-b' } };
    serviceMocks.subscribeDailySales.mockImplementation(() => vi.fn());
    view.rerender(<DailySalesForm />);
    act(() => oldCallback([{ staffUid: 'staff-a', items: [{ productId: 'bcel', quantity: 99 }] }]));
    expect(screen.queryByLabelText('ຈຳນວນ BCEL One')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ບັນທຶກຍອດມື້ນີ້' })).toBeDisabled();
  });

  it('waits for both subscriptions and loads only the current manager entry', async () => {
    authMock.identity = { user: { uid: 'staff-a' }, profile: { name: 'Staff A' }, claims: { role: 'branch_manager', branchId: '010' } };
    let publishProducts;
    let publishSales;
    serviceMocks.subscribeActiveSalesProducts.mockImplementation((onData) => { publishProducts = onData; return vi.fn(); });
    serviceMocks.subscribeDailySales.mockImplementation((_identity, _range, onData) => { publishSales = onData; return vi.fn(); });
    render(<DailySalesForm />);
    act(() => publishProducts(activeProducts));
    expect(screen.queryByLabelText('ຈຳນວນ BCEL One')).not.toBeInTheDocument();
    act(() => publishSales([
      { id: 'today_staff-b', staffUid: 'staff-b', items: [{ productId: 'bcel', productNameSnapshot: 'BCEL One', quantity: 9 }] },
      { id: 'today_staff-a', staffUid: 'staff-a', items: [{ productId: 'bcel', productNameSnapshot: 'BCEL One', quantity: 2 }] },
    ]));
    expect(await screen.findByLabelText('ຈຳນວນ BCEL One')).toHaveValue(2);
  });

  it('accepts only whole nonnegative quantities while allowing a cleared input', async () => {
    arrange();
    await chooseProduct(1, 'BCEL One');
    const input = screen.getByLabelText('ຈຳນວນ BCEL One');
    fireEvent.change(input, { target: { value: '' } });
    expect(input).toHaveValue(null);
    fireEvent.change(input, { target: { value: '1.5' } });
    expect(input).toHaveValue(null);
    fireEvent.change(input, { target: { value: '-1' } });
    expect(input).toHaveValue(null);
    fireEvent.change(input, { target: { value: '5' } });
    expect(input).toHaveValue(5);
  });

  it('guards double submit synchronously and announces success', async () => {
    let resolveSave;
    arrange();
    serviceMocks.saveDailySales.mockImplementation(() => new Promise((resolve) => { resolveSave = resolve; }));
    await chooseProduct(1, 'BCEL One');
    const saveButton = screen.getByRole('button', { name: 'ບັນທຶກຍອດມື້ນີ້' });
    await userEvent.setup().dblClick(saveButton);
    expect(serviceMocks.saveDailySales).toHaveBeenCalledTimes(1);
    expect(serviceMocks.saveDailySales).toHaveBeenCalledWith([{ productId: 'bcel', quantity: 1 }], '2026-09-11');
    resolveSave();
    expect(await screen.findByRole('status')).toHaveTextContent('ບັນທຶກຍອດຂາຍແລ້ວ');
  });

  it('can save an explicit zero-sales day without selecting a product', async () => {
    arrange();
    await userEvent.setup().click(screen.getByRole('button', { name: 'ບັນທຶກຍອດມື້ນີ້' }));
    expect(serviceMocks.saveDailySales).toHaveBeenCalledWith([], '2026-09-11');
  });

  it('does not render an entry form for Admin', async () => {
    arrange({ role: 'admin' });
    await waitFor(() => expect(serviceMocks.subscribeActiveSalesProducts).not.toHaveBeenCalled());
    expect(screen.queryByRole('button', { name: 'ບັນທຶກຍອດມື້ນີ້' })).not.toBeInTheDocument();
  });
});
