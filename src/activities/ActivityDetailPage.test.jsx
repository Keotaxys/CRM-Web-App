import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

const serviceMocks = vi.hoisted(() => ({
  getActivity: vi.fn(),
  getCustomer: vi.fn(),
}));
const identity = vi.hoisted(() => ({ user: { uid: 'u1' }, claims: { role: 'staff', branchId: '010', accountStatus: 'approved' } }));

vi.mock('../components/Navbar', () => ({ default: () => null }));
vi.mock('../auth/useAuth', () => ({ useAuth: () => identity }));
vi.mock('../services/activitiesService', () => ({
  cancelActivity: vi.fn(), completeFollowUp: vi.fn(), getActivity: serviceMocks.getActivity, trashActivity: vi.fn(),
}));
vi.mock('../services/customersService', () => ({ getCustomer: serviceMocks.getCustomer }));

import ActivityDetailPage from './ActivityDetailPage';

const activity = {
  id: 'a1', customerId: 'c1', type: 'appointment', status: 'planned', title: 'Customer planning',
  startAt: '2026-08-26T02:00:00.000Z', endAt: '2026-08-26T03:00:00.000Z', location: '', purpose: 'Plan', assignedStaffIds: [], note: '',
};

function renderPage() {
  render(<MemoryRouter initialEntries={['/activities/a1']}><Routes><Route path="/activities/:id" element={<ActivityDetailPage />} /></Routes></MemoryRouter>);
}

describe('ActivityDetailPage linked customer', () => {
  it('shows the linked customer and contact actions after it loads', async () => {
    serviceMocks.getActivity.mockResolvedValue(activity);
    serviceMocks.getCustomer.mockResolvedValue({ id: 'c1', name: 'Customer One', phone: '020 5555 1234' });

    renderPage();

    expect(await screen.findByText('Customer One')).toBeVisible();
    expect(screen.getByRole('link', { name: 'ໂທຫາລູກຄ້າ' })).toHaveAttribute('href', 'tel:02055551234');
    expect(screen.getByRole('link', { name: 'ຕິດຕໍ່ຜ່ານ WhatsApp' })).toHaveAttribute('href', 'https://wa.me/8562055551234');
  });

  it('keeps the activity and customer-detail link available if the linked customer fails to load', async () => {
    serviceMocks.getActivity.mockResolvedValue(activity);
    serviceMocks.getCustomer.mockRejectedValue(new Error('unavailable'));

    renderPage();

    expect(await screen.findByRole('heading', { name: 'Customer planning' })).toBeVisible();
    expect(screen.getByText('ວາງແຜນ')).toBeVisible();
    expect(screen.getByText('Plan')).toBeVisible();
    expect(screen.getByRole('link', { name: 'ເບິ່ງລູກຄ້າ' })).toHaveAttribute('href', '/customers/c1');
  });
});
