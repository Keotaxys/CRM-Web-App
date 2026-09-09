import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Navbar from './Navbar';

const mocks = vi.hoisted(() => ({
  count: 0,
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
  useBirthdayReminders: () => ({ count: mocks.count }),
}));

describe('Navbar birthday notifications', () => {
  beforeEach(() => {
    mocks.count = 0;
  });

  it('links the bell to the reminder page without a zero badge', () => {
    render(<MemoryRouter><Navbar title="ລູກຄ້າ"/></MemoryRouter>);

    const link = screen.getByRole('link', {
      name: 'ແຈ້ງເຕືອນວັນເກີດ 0 ລາຍການ',
    });
    expect(link).toHaveAttribute('href', '/birthdays');
    expect(screen.queryByTestId('birthday-reminder-count')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ອອກລະບົບ' })).toBeInTheDocument();
  });

  it('shows an accessible positive count beside the bell', () => {
    mocks.count = 3;
    render(<MemoryRouter><Navbar title="ກິດຈະກຳ"/></MemoryRouter>);

    expect(screen.getByRole('heading', { name: 'ກິດຈະກຳ' })).toBeInTheDocument();
    expect(screen.getByRole('link', {
      name: 'ແຈ້ງເຕືອນວັນເກີດ 3 ລາຍການ',
    })).toHaveAttribute('href', '/birthdays');
    expect(screen.getByTestId('birthday-reminder-count')).toHaveTextContent('3');
  });
});
