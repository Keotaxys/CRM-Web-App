import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  auth: { claims: { role: 'branch_manager', branchId: '010' }, loading: false, state: 'approved' },
}));

vi.mock('./context/AuthContext', () => ({ default: ({ children }) => children }));
vi.mock('./auth/useAuth', () => ({ useAuth: () => mocks.auth }));
vi.mock('./birthdays/BirthdayRemindersProvider', () => ({ default: ({ children }) => children }));
vi.mock('./gifts/GiftLowStockProvider', () => ({ default: ({ children }) => children }));
vi.mock('./components/AppShell', async () => {
  const { Outlet } = await import('react-router-dom');
  return { default: () => <Outlet/> };
});
vi.mock('./pages/Login', () => ({ default: () => <div>login page</div> }));
vi.mock('./gifts/GiftsPage', () => ({ default: () => <div>gifts page</div> }));
vi.mock('./notifications/NotificationCenterPage', () => ({ default: () => <div>notifications page</div> }));

import App from './App';

function at(path) {
  window.history.replaceState({}, '', path);
  render(<App/>);
}

describe('App gift notification routes', () => {
  afterEach(() => cleanup());

  it.each([
    ['/gifts', 'gifts page'],
    ['/notifications', 'notifications page'],
  ])('resolves %s for approved users', async (path, page) => {
    mocks.auth = { claims: { role: 'branch_manager', branchId: '010' }, loading: false, state: 'approved' };
    at(path);
    expect(await screen.findByText(page)).toBeInTheDocument();
  });

  it.each([
    ['anonymous', 'login page'],
    ['pending', 'ລໍຖ້າການອະນຸມັດ'],
    ['disabled', 'ບັນຊີຖືກປິດໃຊ້ງານ'],
  ])('keeps %s accounts blocked from notification routes', async (state, destination) => {
    mocks.auth = { claims: {}, loading: false, state, logout: vi.fn(), refreshProfile: vi.fn() };
    at('/notifications');
    expect(await screen.findByText(destination)).toBeInTheDocument();
  });
});
