import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Home from './Home';

const serviceMocks = vi.hoisted(() => ({
  subscribeActivities: vi.fn(),
  subscribeCustomers: vi.fn(),
}));

const identity = vi.hoisted(() => ({
  user: { uid: 'u1', email: 'staff@example.com' },
  claims: { role: 'staff', branchId: '010' },
  profile: { name: 'Staff' },
}));

vi.mock('../components/Navbar', () => ({ default: () => null }));
vi.mock('../auth/useAuth', () => ({ useAuth: () => identity }));
vi.mock('../services/activitiesService', () => ({ subscribeActivities: serviceMocks.subscribeActivities }));
vi.mock('../services/customersService', () => ({ subscribeCustomers: serviceMocks.subscribeCustomers }));

describe('Home dashboard surface', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    serviceMocks.subscribeCustomers.mockImplementation((_, onData) => {
      onData([]);
      return vi.fn();
    });
    serviceMocks.subscribeActivities.mockImplementation((_, onData) => {
      onData([{
        id: 'visit-1',
        type: 'customer_visit',
        status: 'in_progress',
        title: 'Today visit',
        startAt: new Date(),
        assignedStaffIds: ['u1'],
      }]);
      return vi.fn();
    });
  });

  it('uses the canonical customer meeting summary and in-progress status', () => {
    render(<MemoryRouter><Home /></MemoryRouter>);

    expect(screen.getByText('ນັດພົບລູກຄ້າມື້ນີ້')).toBeInTheDocument();
    expect(screen.getByText('ກຳລັງດຳເນີນ')).toBeInTheDocument();
    expect(screen.queryByText(/ການຢ້ຽມລູກຄ້າ/)).not.toBeInTheDocument();
  });
});
