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
  it.each([
    ['functions/permission-denied', 'ທ່ານບໍ່ມີສິດ'],
    ['functions/invalid-argument', 'ກະລຸນາກວດຈຳນວນ'],
    ['functions/unauthenticated', 'ກະລຸນາເຂົ້າລະບົບໃໝ່'],
    ['functions/failed-precondition', 'ຂໍ້ມູນປ່ຽນແລ້ວ'],
  ])('maps %s to actionable Lao and preserves the daily draft', async (code, message) => {
    const { container } = arrange({ saveError: { code, message: 'Backend English' } });
    fireEvent.change(screen.getByLabelText('ຈຳນວນ BCEL One'), { target: { value: '4' } });
    await act(async () => fireEvent.submit(container.querySelector('form')));
    expect(screen.getByRole('alert')).toHaveTextContent(message);
    expect(screen.getByLabelText('ຈຳນວນ BCEL One')).toHaveValue(4);
  });
  it.each([0, 2])('keeps a deactivated draft product visible and limits it to its saved quantity %s', (saved) => {
    const { container } = arrange({ records: saved ? [{ staffUid: 'staff-a', items: [{ productId: 'bcel', productNameSnapshot: 'BCEL One', quantity: saved }] }] : [] });
    fireEvent.change(screen.getByLabelText('ຈຳນວນ BCEL One'), { target: { value: '5' } });
    fireEvent.change(screen.getByLabelText('ຈຳນວນ ATM'), { target: { value: '3' } });
    act(() => serviceMocks.subscribeActiveSalesProducts.mock.calls[0][0]([activeProducts[1]]));
    expect(screen.getByLabelText('ຈຳນວນ BCEL One')).toHaveValue(5);
    expect(screen.getByText('ປິດນຳໃຊ້')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('ກະລຸນາຫຼຸດຈຳນວນ');
    fireEvent.submit(container.querySelector('form'));
    expect(serviceMocks.saveDailySales).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('ຈຳນວນ BCEL One'), { target: { value: String(saved) } });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    fireEvent.submit(container.querySelector('form'));
    expect(serviceMocks.saveDailySales).toHaveBeenCalledWith(
      saved ? [{ productId: 'bcel', quantity: 2 }, { productId: 'atm', quantity: 3 }] : [{ productId: 'atm', quantity: 3 }],
      '2026-09-11',
    );
  });
  it.each(['pending', 'failed'])('blocks controls and programmatic submit while daily load is %s', (state) => {
    arrange().unmount();
    serviceMocks.subscribeDailySales.mockImplementation((_identity, _range, _onData, onError) => {
      if (state === 'failed') onError(new Error('offline'));
      return vi.fn();
    });
    const { container } = render(<DailySalesForm />);
    expect(screen.getByLabelText('ຈຳນວນ BCEL One')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'ບັນທຶກຍອດມື້ນີ້' })).toBeDisabled();
    fireEvent.submit(container.querySelector('form'));
    expect(serviceMocks.saveDailySales).not.toHaveBeenCalled();
  });
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-09-11T10:00:00Z'));
  });
  afterEach(() => vi.useRealTimers());

  it.each(['focus', 'submit'])('locks yesterday draft after suspended tab resumes through %s and reloads today', (trigger) => {
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
    expect(screen.getByLabelText('ຈຳນວນ BCEL One')).toHaveValue(0);
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
    expect(screen.getByLabelText('ຈຳນວນ BCEL One')).toHaveValue(0);
    expect(screen.getByLabelText('ຈຳນວນ BCEL One')).toBeDisabled();
  });

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
    expect(serviceMocks.saveDailySales).toHaveBeenCalledWith([{ productId: 'bcel', quantity: 1 }], '2026-09-11');
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
