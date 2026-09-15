import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import NotificationCenterPage from './NotificationCenterPage';

const mocks = vi.hoisted(() => ({
  acknowledgeGreeting: vi.fn(),
  auth: { claims: { role: 'branch_manager', branchId: '010' } },
  birthdays: null,
  gifts: null,
}));

vi.mock('../components/Navbar', () => ({ default: ({ title }) => <div>{title}</div> }));
vi.mock('../auth/useAuth', () => ({ useAuth: () => mocks.auth }));
vi.mock('../birthdays/useBirthdayReminders', () => ({ useBirthdayReminders: () => mocks.birthdays }));
vi.mock('../gifts/useGiftLowStock', () => ({ useGiftLowStock: () => mocks.gifts }));

const birthday = {
  customerId: 'vip-1',
  occurrenceYear: 2026,
  daysRemaining: 0,
  customer: { id: 'vip-1', name: 'VIP One', birthDate: '15-09-1990' },
};
const lowStock = {
  branchId: '010', giftId: 'umbrella', currentUnits: 2, lowStockThresholdUnits: 5,
  gift: { name: 'Umbrella' },
};

describe('NotificationCenterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth = { claims: { role: 'branch_manager', branchId: '010' } };
    mocks.birthdays = { acknowledgingIds: new Set(), acknowledgeGreeting: mocks.acknowledgeGreeting, count: 1, error: '', loading: false, reminders: [birthday] };
    mocks.gifts = { count: 1, error: '', items: [lowStock], loading: false };
  });

  it('preserves birthday detail and acknowledgement actions', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><NotificationCenterPage/></MemoryRouter>);
    expect(screen.getByRole('link', { name: 'ເບິ່ງ VIP One' })).toHaveAttribute('href', '/customers/vip-1');
    await user.click(screen.getByRole('button', { name: 'ອວຍພອນແລ້ວ' }));
    expect(mocks.acknowledgeGreeting).toHaveBeenCalledWith(birthday);
  });

  it('shows a low-stock card with the exact stock destination to Managers and Admins', () => {
    render(<MemoryRouter><NotificationCenterPage/></MemoryRouter>);
    expect(screen.getByText('Umbrella')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'ເບິ່ງສະຕັອກ Umbrella' })).toHaveAttribute('href', '/gifts?tab=stock&branchId=010&giftId=umbrella');
  });

  it('does not show low-stock cards to Staff', () => {
    mocks.auth = { claims: { role: 'staff', branchId: '010' } };
    render(<MemoryRouter><NotificationCenterPage/></MemoryRouter>);
    expect(screen.queryByText('Umbrella')).not.toBeInTheDocument();
  });
});
