import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ActivitiesPage from './ActivitiesPage';

const serviceMocks = vi.hoisted(() => ({
  subscribeActivities: vi.fn(),
  subscribeAssignableUsers: vi.fn(),
}));
const identity = vi.hoisted(() => ({ user: { uid: 'u1' }, claims: { branchId: '010' } }));

vi.mock('../components/Navbar', () => ({ default: () => null }));
vi.mock('../auth/useAuth', () => ({ useAuth: () => identity }));
vi.mock('../services/activitiesService', () => ({ subscribeActivities: serviceMocks.subscribeActivities }));
vi.mock('../services/usersService', () => ({ subscribeAssignableUsers: serviceMocks.subscribeAssignableUsers }));

const activities = [
  { id: 'a', type: 'appointment', status: 'in_progress', title: 'Meeting A', startAt: '2026-08-26T02:00:00.000Z', assignedStaffIds: ['u1'] },
  { id: 'b', type: 'event', status: 'planned', title: 'Meeting B', startAt: '2026-08-25T02:00:00.000Z', assignedStaffIds: ['u2'] },
];

describe('ActivitiesPage shared filters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    serviceMocks.subscribeActivities.mockImplementation((_, onData) => { onData(activities); return vi.fn(); });
    serviceMocks.subscribeAssignableUsers.mockImplementation((_, onData) => { onData([{ uid: 'u1', name: 'One' }, { uid: 'u2', name: 'Two' }]); return vi.fn(); });
  });

  it('filters with the shared controls without adding subscriptions', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><ActivitiesPage /></MemoryRouter>);

    await user.click(screen.getByRole('combobox', { name: 'ສະຖານະກິດຈະກຳ' }));
    await user.click(screen.getByRole('option', { name: 'ກຳລັງດຳເນີນ' }));
    expect(screen.getByText('Meeting A')).toBeInTheDocument();
    expect(screen.queryByText('Meeting B')).not.toBeInTheDocument();

    expect(serviceMocks.subscribeActivities).toHaveBeenCalledTimes(1);
    expect(serviceMocks.subscribeAssignableUsers).toHaveBeenCalledTimes(1);
  });

  it('preserves branch and mine scope while staff selection filters the rendered activities without resubscribing', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><ActivitiesPage /></MemoryRouter>);

    const scope = screen.getByRole('combobox', { name: 'ຂອບເຂດກິດຈະກຳ' });
    await user.click(scope);
    expect(screen.getByRole('option', { name: 'ກິດຈະກຳຂອງສາຂາ' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('option', { name: 'ກິດຈະກຳຂອງຂ້ອຍ' })).toHaveAttribute('aria-selected', 'false');
    await user.click(screen.getByRole('option', { name: 'ກິດຈະກຳຂອງຂ້ອຍ' }));
    expect(screen.getByText('Meeting A')).toBeInTheDocument();
    expect(screen.queryByText('Meeting B')).not.toBeInTheDocument();

    const staff = screen.getByRole('combobox', { name: 'ພະນັກງານຮັບຜິດຊອບ' });
    expect(staff).toHaveAttribute('aria-autocomplete', 'list');
    await user.click(staff);
    await user.type(staff, 'Two');
    await user.click(screen.getByRole('option', { name: 'Two' }));
    expect(screen.queryByText('Meeting A')).not.toBeInTheDocument();
    expect(screen.queryByText('Meeting B')).not.toBeInTheDocument();

    await user.click(scope);
    await user.click(screen.getByRole('option', { name: 'ກິດຈະກຳຂອງສາຂາ' }));
    expect(screen.queryByText('Meeting A')).not.toBeInTheDocument();
    expect(screen.getByText('Meeting B')).toBeInTheDocument();
    expect(serviceMocks.subscribeActivities).toHaveBeenCalledTimes(1);
    expect(serviceMocks.subscribeAssignableUsers).toHaveBeenCalledTimes(1);
  });

  it('uses a native themed date field with Laos day-key filtering', () => {
    render(<MemoryRouter><ActivitiesPage /></MemoryRouter>);
    const date = screen.getByLabelText('ວັນທີກິດຈະກຳ');
    expect(date).toHaveAttribute('type', 'date');
    fireEvent.change(date, { target: { value: '2026-08-26' } });
    expect(screen.getByText('Meeting A')).toBeInTheDocument();
    expect(screen.queryByText('Meeting B')).not.toBeInTheDocument();
  });

  it('announces an asynchronous loading failure with the Orange error presentation', async () => {
    const reason = new Error('load failed');
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    serviceMocks.subscribeActivities.mockImplementationOnce((_, __, onError) => {
      onError(reason);
      return vi.fn();
    });

    render(<MemoryRouter><ActivitiesPage /></MemoryRouter>);

    const feedback = await screen.findByRole('alert');
    expect(feedback).toHaveTextContent('ບໍ່ສາມາດໂຫຼດກິດຈະກຳ');
    expect(feedback).toHaveClass('error-banner');
    consoleError.mockRestore();
  });
});
