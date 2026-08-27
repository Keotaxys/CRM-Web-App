import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

const serviceMocks = vi.hoisted(() => ({
  getActivity: vi.fn(),
  saveActivity: vi.fn(),
  subscribeCustomers: vi.fn(() => vi.fn()),
  subscribeAssignableUsers: vi.fn(() => vi.fn()),
}));

vi.mock('../components/Navbar', () => ({ default: () => null }));
vi.mock('./ActivityForm', () => ({
  default: ({ onSubmit }) => <button type="button" onClick={() => onSubmit({ title: 'Test Activity' })}>ບັນທຶກກິດຈະກຳ</button>,
}));
vi.mock('../auth/useAuth', () => ({
  useAuth: () => ({ user: { uid: 'u1' }, claims: { role: 'staff', branchId: '010' } }),
}));
vi.mock('../services/customersService', () => ({ subscribeCustomers: serviceMocks.subscribeCustomers }));
vi.mock('../services/usersService', () => ({ subscribeAssignableUsers: serviceMocks.subscribeAssignableUsers }));
vi.mock('../services/activitiesService', () => ({
  getActivity: serviceMocks.getActivity,
  saveActivity: serviceMocks.saveActivity,
}));

import ActivityFormPage from './ActivityFormPage';

describe('ActivityFormPage feedback', () => {
  it('announces an activity save failure with the Orange error presentation', async () => {
    const user = userEvent.setup();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    serviceMocks.saveActivity.mockRejectedValueOnce(new Error('ບັນທຶກກິດຈະກຳບໍ່ສຳເລັດ'));
    render(
      <MemoryRouter initialEntries={['/activities/new/event']}>
        <Routes><Route path="/activities/new/:type" element={<ActivityFormPage />} /></Routes>
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: 'ບັນທຶກກິດຈະກຳ' }));

    const feedback = await screen.findByRole('alert');
    expect(feedback).toHaveTextContent('ບັນທຶກກິດຈະກຳບໍ່ສຳເລັດ');
    expect(feedback).toHaveClass('error-banner');
    consoleError.mockRestore();
  });
});
