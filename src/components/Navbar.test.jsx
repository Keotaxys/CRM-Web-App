import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Navbar from './Navbar';

const mocks = vi.hoisted(() => ({
  birthdayCount: 0,
  giftCount: 0,
  logout: vi.fn(),
}));

vi.mock('../auth/useAuth', () => ({
  useAuth: () => ({
    claims: {
      role: 'staff',
      branchId: '010',
    },
    logout: mocks.logout,
  }),
}));

vi.mock('../birthdays/useBirthdayReminders', () => ({
  useBirthdayReminders: () => ({ count: mocks.birthdayCount }),
}));

vi.mock('../gifts/useGiftLowStock', () => ({
  useGiftLowStock: () => ({ count: mocks.giftCount, items: [], loading: false, error: '' }),
}));

describe('Navbar notifications', () => {
  beforeEach(() => {
    mocks.birthdayCount = 0;
    mocks.giftCount = 0;
  });

  it('links the bell to the notification center without a zero badge', () => {
    render(<MemoryRouter><Navbar title="ລູກຄ້າ"/></MemoryRouter>);

    const link = screen.getByRole('link', {
      name: 'ແຈ້ງເຕືອນ 0 ລາຍການ',
    });
    expect(link).toHaveAttribute('href', '/notifications');
    expect(screen.queryByTestId('notification-count')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ອອກລະບົບ' })).toBeInTheDocument();
  });

  it('shows one combined bell count and links to the notification center', () => {
    mocks.birthdayCount = 2;
    mocks.giftCount = 3;
    render(<MemoryRouter><Navbar title="ກິດຈະກຳ"/></MemoryRouter>);

    expect(screen.getByRole('heading', { name: 'ກິດຈະກຳ' })).toBeInTheDocument();
    expect(screen.getByRole('link', {
      name: 'ແຈ້ງເຕືອນ 5 ລາຍການ',
    })).toHaveAttribute('href', '/notifications');
    expect(screen.getByTestId('notification-count')).toHaveTextContent('5');
  });

  it('caps the visible combined count at 99+', () => {
    mocks.birthdayCount = 80;
    mocks.giftCount = 25;
    render(<MemoryRouter><Navbar title="ກິດຈະກຳ"/></MemoryRouter>);
    expect(screen.getByTestId('notification-count')).toHaveTextContent('99+');
  });
});
