import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SalesReportPanel from './SalesReportPanel';

const serviceMocks = vi.hoisted(() => ({
  subscribeDailySales: vi.fn(),
  subscribeAllSalesProducts: vi.fn(),
  subscribeAssignableUsers: vi.fn(),
  amendDailySales: vi.fn(),
  dailyError: null,
}));
const authMock = vi.hoisted(() => ({ identity: null }));

vi.mock('../auth/useAuth', () => ({ useAuth: () => authMock.identity }));
vi.mock('../shared/dateTime', async (original) => ({ ...await original(), laosTodayKey: () => '2026-09-11' }));
vi.mock('../services/salesService', () => ({
  subscribeDailySales: serviceMocks.subscribeDailySales,
  subscribeAllSalesProducts: serviceMocks.subscribeAllSalesProducts,
  amendDailySales: serviceMocks.amendDailySales,
}));
vi.mock('../services/usersService', () => ({ subscribeAssignableUsers: serviceMocks.subscribeAssignableUsers }));
vi.mock('../components/ui/DateField', () => ({
  default: ({ id, label, value, onChange }) => <label htmlFor={id}>{label}<input id={id} value={value} onChange={onChange} /></label>,
}));

const products = [
  { id: 'bcel', name: 'BCEL One', sortOrder: 1 },
  { id: 'atm', name: 'ATM', sortOrder: 2 },
];
const records = [
  { id: '2026-09-11_staff-a', dateKey: '2026-09-11', staffUid: 'staff-a', staffNameSnapshot: 'Staff A', branchId: '010', items: [{ productId: 'bcel', productNameSnapshot: 'BCEL One', quantity: 5 }] },
  { id: '2026-09-10_staff-b', dateKey: '2026-09-10', staffUid: 'staff-b', staffNameSnapshot: 'Staff B', branchId: '019', items: [{ productId: 'atm', productNameSnapshot: 'ATM', quantity: 2 }] },
];
const users = [
  { uid: 'staff-a', name: 'Staff A', branchId: '010' },
  { uid: 'staff-b', name: 'Staff B', branchId: '019' },
];

function arrange(role = 'staff', data = records) {
  authMock.identity = { user: { uid: 'staff-a' }, claims: { role, branchId: '010' } };
  serviceMocks.subscribeAllSalesProducts.mockImplementation((onData) => { onData(products); return vi.fn(); });
  serviceMocks.subscribeAssignableUsers.mockImplementation((_identity, onData) => { onData(users); return vi.fn(); });
  serviceMocks.subscribeDailySales.mockImplementation((_identity, _range, onData, onError) => {
    if (serviceMocks.dailyError) onError(serviceMocks.dailyError); else onData(data);
    return vi.fn();
  });
  return render(<SalesReportPanel />);
}

describe('SalesReportPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    serviceMocks.dailyError = null;
    serviceMocks.amendDailySales.mockResolvedValue({});
  });

  it('queries preset ranges and renders Monday-Sunday labels, totals, and ranking', async () => {
    arrange();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'ອາທິດນີ້' }));
    expect(serviceMocks.subscribeDailySales).toHaveBeenLastCalledWith(
      authMock.identity,
      { startKey: '2026-09-07', endKey: '2026-09-13' },
      expect.any(Function),
      expect.any(Function),
    );
    expect(screen.getByText('2026-09-07 – 2026-09-13')).toBeInTheDocument();
    expect(screen.getByText('ຍອດລວມ 7')).toBeInTheDocument();
    expect(screen.getByRole('row', { name: /1 BCEL One 5/ })).toBeInTheDocument();
  });

  it('uses a valid custom range and refuses incomplete or reversed dates before querying', async () => {
    arrange();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'ກຳນົດເອງ' }));
    const before = serviceMocks.subscribeDailySales.mock.calls.length;
    fireEvent.change(screen.getByLabelText('ເລີ່ມວັນທີ'), { target: { value: '2026-09-10' } });
    fireEvent.change(screen.getByLabelText('ສິ້ນສຸດວັນທີ'), { target: { value: '2026-09-01' } });
    expect(serviceMocks.subscribeDailySales).toHaveBeenCalledTimes(before);
    expect(screen.getByRole('alert')).toHaveTextContent('ຊ່ວງວັນທີບໍ່ຖືກຕ້ອງ');
    fireEvent.change(screen.getByLabelText('ສິ້ນສຸດວັນທີ'), { target: { value: '2026-09-12' } });
    await waitFor(() => expect(serviceMocks.subscribeDailySales).toHaveBeenLastCalledWith(
      authMock.identity, { startKey: '2026-09-10', endKey: '2026-09-12' }, expect.any(Function), expect.any(Function),
    ));
  });

  it('shows role-specific filters and local filters do not resubscribe', async () => {
    let view = arrange('staff');
    expect(screen.queryByLabelText('ສາຂາ')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('ພະນັກງານ')).not.toBeInTheDocument();
    view.unmount();

    view = arrange('branch_manager');
    expect(screen.queryByLabelText('ສາຂາ')).not.toBeInTheDocument();
    expect(screen.getByLabelText('ພະນັກງານ')).toBeInTheDocument();
    expect(serviceMocks.subscribeAssignableUsers).toHaveBeenLastCalledWith(authMock.identity, expect.any(Function), expect.any(Function));
    view.unmount();

    arrange('admin');
    expect(screen.getByLabelText('ສາຂາ')).toBeInTheDocument();
    expect(screen.getByLabelText('ພະນັກງານ')).toBeInTheDocument();
    const calls = serviceMocks.subscribeDailySales.mock.calls.length;
    const user = userEvent.setup();
    await user.click(screen.getByLabelText('ຜະລິດຕະພັນ'));
    await user.click(screen.getByRole('option', { name: 'BCEL One' }));
    expect(serviceMocks.subscribeDailySales).toHaveBeenCalledTimes(calls);
    expect(screen.getByText('ຍອດລວມ 5')).toBeInTheDocument();
  });

  it('distinguishes an empty successful result from a query failure', () => {
    const { unmount } = arrange('staff', []);
    expect(screen.getByText('ຍອດລວມ 0')).toBeInTheDocument();
    unmount();
    serviceMocks.dailyError = new Error('denied');
    arrange('staff');
    expect(screen.getByRole('alert')).toHaveTextContent('ບໍ່ສາມາດໂຫຼດລາຍງານ');
    expect(screen.queryByText('ຍອດລວມ 0')).not.toBeInTheDocument();
  });

  it('allows Manager and Admin to open corrections for returned records but never Staff', async () => {
    let view = arrange('staff');
    expect(screen.queryByRole('button', { name: 'ແກ້ໄຂຍອດ 2026-09-11 Staff A' })).not.toBeInTheDocument();
    view.unmount();

    view = arrange('branch_manager', [records[0]]);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'ແກ້ໄຂຍອດ 2026-09-11 Staff A' }));
    expect(screen.getByRole('dialog', { name: 'ແກ້ໄຂຍອດຂາຍ' })).toBeInTheDocument();
    view.unmount();

    arrange('admin');
    expect(screen.getByRole('button', { name: 'ແກ້ໄຂຍອດ 2026-09-10 Staff B' })).toBeInTheDocument();
  });
});
