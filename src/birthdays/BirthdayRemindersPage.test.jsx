import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import BirthdayRemindersPage from './BirthdayRemindersPage';

const mocks = vi.hoisted(() => ({
  acknowledge: vi.fn(),
  auth: {
    claims: {
      role: 'admin',
      branchId: null,
    },
  },
  state: null,
}));

vi.mock('../components/Navbar', () => ({
  default: ({ title }) => <div data-testid="navbar">{title}</div>,
}));

vi.mock('../auth/useAuth', () => ({
  useAuth: () => mocks.auth,
}));

vi.mock('./useBirthdayReminders', () => ({
  useBirthdayReminders: () => mocks.state,
}));

const reminder = (id, daysRemaining, group, branchId = '010') => ({
  customerId: id,
  daysRemaining,
  group,
  occurrenceDate: `2026-09-${String(9 + daysRemaining).padStart(2, '0')}`,
  occurrenceYear: 2026,
  customer: {
    id,
    name: `VIP ${id}`,
    birthDate: `${String(9 + daysRemaining).padStart(2, '0')}-09-1990`,
    branchId,
  },
});

describe('BirthdayRemindersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth = {
      claims: {
        role: 'admin',
        branchId: null,
      },
    };
    mocks.state = {
      acknowledgingIds: new Set(),
      acknowledgeGreeting: mocks.acknowledge,
      count: 3,
      error: '',
      loading: false,
      reminders: [
        reminder('today', 0, 'today', '010'),
        reminder('week', 5, 'week', '019'),
        reminder('fortnight', 12, 'fortnight', '020'),
      ],
    };
  });

  it('groups reminders and shows detail links, dates, days, and Admin branch labels', () => {
    render(<MemoryRouter><BirthdayRemindersPage/></MemoryRouter>);

    expect(screen.getByText('ວັນເກີດມື້ນີ້')).toBeInTheDocument();
    expect(screen.getByText('ເຫຼືອ 1–7 ມື້')).toBeInTheDocument();
    expect(screen.getByText('ເຫຼືອ 8–14 ມື້')).toBeInTheDocument();
    expect(screen.getByText('VIP week')).toBeInTheDocument();
    expect(screen.getByText(/14-09-1990/)).toBeInTheDocument();
    expect(screen.getByText(/ເຫຼືອ 5 ມື້/)).toBeInTheDocument();
    expect(screen.getByText('019 - ສາຂາ ໂພນໂຮງ')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'ເບິ່ງ VIP week' })).toHaveAttribute(
      'href',
      '/customers/week',
    );
  });

  it('calls the trusted acknowledgement and reflects its busy state', async () => {
    const user = userEvent.setup();
    mocks.state.reminders = [reminder('week', 5, 'week')];
    mocks.state.acknowledgingIds = new Set(['week']);

    const view = render(<MemoryRouter><BirthdayRemindersPage/></MemoryRouter>);
    expect(screen.getByRole('button', { name: 'ກຳລັງບັນທຶກ...' })).toBeDisabled();

    mocks.state.acknowledgingIds = new Set();
    view.rerender(<MemoryRouter><BirthdayRemindersPage/></MemoryRouter>);
    await user.click(screen.getByRole('button', { name: 'ອວຍພອນແລ້ວ' }));
    expect(mocks.acknowledge).toHaveBeenCalledWith(mocks.state.reminders[0]);
  });

  it('shows loading, empty, and accessible error states', () => {
    mocks.state = {
      ...mocks.state,
      count: 0,
      error: 'ບໍ່ສາມາດຢືນຢັນການອວຍພອນໄດ້',
      loading: true,
      reminders: [],
    };
    const view = render(<MemoryRouter><BirthdayRemindersPage/></MemoryRouter>);

    expect(screen.getByText('ກຳລັງໂຫຼດວັນເກີດ...')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('ບໍ່ສາມາດ');

    mocks.state = { ...mocks.state, error: '', loading: false };
    view.rerender(<MemoryRouter><BirthdayRemindersPage/></MemoryRouter>);
    expect(screen.getByText('ບໍ່ມີວັນເກີດ VIP ໃນ 14 ມື້ຂ້າງໜ້າ')).toBeInTheDocument();
  });

  it('does not show branch labels to Staff', () => {
    mocks.auth = {
      claims: {
        role: 'staff',
        branchId: '010',
      },
    };
    mocks.state.reminders = [reminder('today', 0, 'today', '010')];

    render(<MemoryRouter><BirthdayRemindersPage/></MemoryRouter>);
    expect(screen.queryByText('010 - ສຳນັກງານໃຫຍ່')).not.toBeInTheDocument();
  });
});
