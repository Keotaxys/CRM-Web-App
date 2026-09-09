import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  acknowledge: vi.fn(),
  onCustomers: null,
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
  todayKey: '2026-09-01',
  identity: {
    user: { uid: 'staff-a' },
    claims: {
      role: 'staff',
      branchId: '010',
      accountStatus: 'approved',
    },
  },
}));

vi.mock('../auth/useAuth', () => ({
  useAuth: () => mocks.identity,
}));

vi.mock('../services/customersService', () => ({
  acknowledgeBirthdayGreeting: mocks.acknowledge,
  subscribeCustomers: mocks.subscribe,
}));

vi.mock('../shared/dateTime', async (importOriginal) => ({
  ...(await importOriginal()),
  laosTodayKey: () => mocks.todayKey,
  millisecondsUntilNextLaosDay: () => 60_000,
}));

import BirthdayRemindersProvider from './BirthdayRemindersProvider';
import { useBirthdayReminders } from './useBirthdayReminders';

const eligible = (overrides = {}) => ({
  id: 'c1',
  name: 'VIP One',
  branchId: '010',
  priority: 'VIP',
  recordState: 'active',
  birthDate: '15-09-1990',
  ...overrides,
});

function Probe({ label = 'probe' }) {
  const state = useBirthdayReminders();

  return <div>
    <output aria-label={`${label}-count`}>{state.count}</output>
    <output aria-label={`${label}-ids`}>{state.reminders.map((item) => item.customerId).join(',')}</output>
    {state.error && <p role="alert">{state.error}</p>}
    <button type="button" onClick={() => state.acknowledgeGreeting(state.reminders[0])}>ack</button>
  </div>;
}

describe('BirthdayRemindersProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.todayKey = '2026-09-01';
    mocks.subscribe.mockImplementation((identity, onData) => {
      mocks.onCustomers = onData;
      return mocks.unsubscribe;
    });
    mocks.acknowledge.mockResolvedValue({ acknowledged: true });
  });

  it('owns one branch-scoped subscription shared by all consumers', async () => {
    render(<BirthdayRemindersProvider><Probe label="one"/><Probe label="two"/></BirthdayRemindersProvider>);

    expect(mocks.subscribe).toHaveBeenCalledTimes(1);
    expect(mocks.subscribe.mock.calls[0][0].claims.branchId).toBe('010');

    act(() => {
      mocks.onCustomers([
        eligible(),
        eligible({ id: 'normal', priority: 'ທົ່ວໄປ' }),
        eligible({ id: 'outside', birthDate: '30-09-1990' }),
      ]);
    });

    expect(await screen.findByLabelText('one-count')).toHaveTextContent('1');
    expect(screen.getByLabelText('two-ids')).toHaveTextContent('c1');
  });

  it('hides a reminder only after the trusted acknowledgement succeeds', async () => {
    const user = userEvent.setup();
    let resolveAcknowledge;
    mocks.acknowledge.mockReturnValue(new Promise((resolve) => {
      resolveAcknowledge = resolve;
    }));

    render(<BirthdayRemindersProvider><Probe/></BirthdayRemindersProvider>);
    act(() => mocks.onCustomers([eligible()]));
    expect(await screen.findByLabelText('probe-count')).toHaveTextContent('1');

    await user.click(screen.getByRole('button', { name: 'ack' }));
    expect(screen.getByLabelText('probe-count')).toHaveTextContent('1');

    act(() => resolveAcknowledge({ acknowledged: true }));
    await waitFor(() => expect(screen.getByLabelText('probe-count')).toHaveTextContent('0'));
    expect(mocks.acknowledge).toHaveBeenCalledWith('c1');
  });

  it('keeps the reminder visible and reports a controlled error when acknowledgement fails', async () => {
    const user = userEvent.setup();
    mocks.acknowledge.mockRejectedValue(new Error('offline'));

    render(<BirthdayRemindersProvider><Probe/></BirthdayRemindersProvider>);
    act(() => mocks.onCustomers([eligible()]));
    await screen.findByText('1');
    await user.click(screen.getByRole('button', { name: 'ack' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('ບໍ່ສາມາດຢືນຢັນການອວຍພອນໄດ້');
    expect(screen.getByLabelText('probe-count')).toHaveTextContent('1');
  });

  it('recalculates when the app returns to focus and unsubscribes on unmount', async () => {
    const view = render(<BirthdayRemindersProvider><Probe/></BirthdayRemindersProvider>);
    act(() => mocks.onCustomers([eligible({ birthDate: '15-09-1990' })]));
    expect(await screen.findByLabelText('probe-count')).toHaveTextContent('1');

    mocks.todayKey = '2026-09-16';
    fireEvent.focus(window);
    await waitFor(() => expect(screen.getByLabelText('probe-count')).toHaveTextContent('0'));

    view.unmount();
    expect(mocks.unsubscribe).toHaveBeenCalledTimes(1);
  });
});
