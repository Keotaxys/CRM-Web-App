import { act, render, screen } from '@testing-library/react';
import { createMemoryRouter, MemoryRouter, Route, RouterProvider, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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
const secondActivity = { ...activity, id: 'a2', customerId: 'c2', title: 'Second customer planning' };

function renderPage() {
  render(<MemoryRouter initialEntries={['/activities/a1']}><Routes><Route path="/activities/:id" element={<ActivityDetailPage />} /></Routes></MemoryRouter>);
}

describe('ActivityDetailPage linked customer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

  it('hides stale customer actions while the next activity customer is unresolved', async () => {
    const secondCustomer = new Promise(() => {});
    serviceMocks.getActivity.mockImplementation((id) => Promise.resolve(id === 'a1' ? activity : secondActivity));
    serviceMocks.getCustomer.mockImplementation((id) => id === 'c1'
      ? Promise.resolve({ id: 'c1', name: 'Customer One', phone: '020 5555 1234' })
      : secondCustomer);
    const router = createMemoryRouter([{ path: '/activities/:id', element: <ActivityDetailPage /> }], { initialEntries: ['/activities/a1'] });

    render(<RouterProvider router={router} />);
    expect(await screen.findByText('Customer One')).toBeVisible();

    await act(async () => { await router.navigate('/activities/a2'); });
    expect(await screen.findByRole('heading', { name: 'Second customer planning' })).toBeVisible();
    expect(screen.queryByText('Customer One')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'ໂທຫາລູກຄ້າ' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'ຕິດຕໍ່ຜ່ານ WhatsApp' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'ເບິ່ງລູກຄ້າ' })).toHaveAttribute('href', '/customers/c2');
  });
});
