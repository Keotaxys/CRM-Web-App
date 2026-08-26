import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CalendarPage from './CalendarPage';

const serviceMocks = vi.hoisted(() => ({ subscribeActivities: vi.fn(), subscribeAssignableUsers: vi.fn() }));
const identity = vi.hoisted(() => ({ user: { uid: 'u1' }, claims: { branchId: '010' } }));

vi.mock('../components/Navbar', () => ({ default: () => null }));
vi.mock('../auth/useAuth', () => ({ useAuth: () => identity }));
vi.mock('../services/activitiesService', () => ({ subscribeActivities: serviceMocks.subscribeActivities }));
vi.mock('../services/usersService', () => ({ subscribeAssignableUsers: serviceMocks.subscribeAssignableUsers }));

describe('CalendarPage shared filters and agenda', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    serviceMocks.subscribeActivities.mockImplementation((_, onData) => { onData([
      { id: 'boundary-next-day', type: 'appointment', status: 'in_progress', title: 'Boundary Next Day', startAt: '2026-08-25T17:30:00.000Z', assignedStaffIds: ['u1'] },
      { id: 'later', type: 'event', status: 'planned', title: 'Later', startAt: '2026-08-26T04:00:00.000Z', assignedStaffIds: ['u2'] },
      { id: 'earlier', type: 'appointment', status: 'in_progress', title: 'Earlier', startAt: '2026-08-26T02:00:00.000Z', assignedStaffIds: ['u1'] },
    ]); return vi.fn(); });
    serviceMocks.subscribeAssignableUsers.mockImplementation((_, onData) => { onData([{ uid: 'u1', name: 'One' }, { uid: 'u2', name: 'Two' }]); return vi.fn(); });
  });

  it('keeps the Laos agenda grouping, labels, chronological items, and add route', () => {
    render(<MemoryRouter><CalendarPage /></MemoryRouter>);

    const addLinks = screen.getAllByRole('link', { name: '＋' });
    expect(addLinks).toHaveLength(1);
    expect(addLinks[0]).toHaveAttribute('href', '/activities/new/appointment?date=2026-08-26');
    const boundaryDay = screen.getByText('Boundary Next Day').closest('.calendar-day');
    expect(boundaryDay).toHaveTextContent('26');
    expect(boundaryDay).toContain(screen.getByText('Earlier'));
    expect(screen.getByText('Earlier').compareDocumentPosition(screen.getByText('Later')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText('Earlier').closest('.calendar-item')).toHaveTextContent('ນັດໝາຍ');
    expect(screen.getByText('Earlier').closest('.calendar-item').querySelector('[data-status="in_progress"]')).not.toBeNull();
  });

  it('uses shared select controls for calendar filters and shows the empty state', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><CalendarPage /></MemoryRouter>);

    expect(screen.getByRole('combobox', { name: 'ປະເພດໃນປະຕິທິນ' }).tagName).toBe('BUTTON');
    expect(screen.getByRole('combobox', { name: 'ພະນັກງານໃນປະຕິທິນ' })).toHaveAttribute('aria-autocomplete', 'list');
    await user.click(screen.getByRole('combobox', { name: 'ສະຖານະໃນປະຕິທິນ' }));
    await user.click(screen.getByRole('option', { name: 'ສຳເລັດແລ້ວ' }));
    expect(screen.getByText('ບໍ່ມີກິດຈະກຳໃນປະຕິທິນ')).toBeInTheDocument();
  });

  it('exposes exact calendar filter options and preserves type, scope, staff, and status results without resubscribing', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><CalendarPage /></MemoryRouter>);

    const type = screen.getByRole('combobox', { name: 'ປະເພດໃນປະຕິທິນ' });
    await user.click(type);
    expect(screen.getByRole('option', { name: 'ທຸກປະເພດ' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('option', { name: 'ນັດໝາຍ' })).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('option', { name: 'ກິດຈະກຳ' })).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('option', { name: 'ນັດພົບລູກຄ້າ' })).toHaveAttribute('aria-selected', 'false');
    await user.click(screen.getByRole('option', { name: 'ກິດຈະກຳ' }));
    expect(screen.getByText('Later')).toBeInTheDocument();
    expect(screen.queryByText('Earlier')).not.toBeInTheDocument();

    const scope = screen.getByRole('combobox', { name: 'ຂອບເຂດປະຕິທິນ' });
    await user.click(scope);
    expect(screen.getByRole('option', { name: 'ກິດຈະກຳຂອງສາຂາ' })).toHaveAttribute('aria-selected', 'true');
    await user.click(screen.getByRole('option', { name: 'ກິດຈະກຳຂອງຂ້ອຍ' }));
    expect(screen.queryByText('Later')).not.toBeInTheDocument();

    await user.click(type);
    await user.click(screen.getByRole('option', { name: 'ທຸກປະເພດ' }));
    const staff = screen.getByRole('combobox', { name: 'ພະນັກງານໃນປະຕິທິນ' });
    expect(staff).toHaveAttribute('aria-autocomplete', 'list');
    await user.click(staff);
    await user.type(staff, 'Two');
    await user.click(screen.getByRole('option', { name: 'Two' }));
    expect(screen.queryByText('Boundary Next Day')).not.toBeInTheDocument();
    expect(screen.queryByText('Later')).not.toBeInTheDocument();

    await user.click(scope);
    await user.click(screen.getByRole('option', { name: 'ກິດຈະກຳຂອງສາຂາ' }));
    expect(screen.getByText('Later')).toBeInTheDocument();
    const status = screen.getByRole('combobox', { name: 'ສະຖານະໃນປະຕິທິນ' });
    await user.click(status);
    const expectedStatuses = [['ທຸກສະຖານະ', 'all', 'true'], ['ວາງແຜນ', 'planned', 'false'], ['ຢືນຢັນແລ້ວ', 'confirmed', 'false'], ['ກຳລັງດຳເນີນ', 'in_progress', 'false'], ['ສຳເລັດແລ້ວ', 'completed', 'false'], ['ຍົກເລີກ', 'cancelled', 'false']];
    expect(screen.getAllByRole('option')).toHaveLength(expectedStatuses.length);
    expect(screen.getAllByRole('option').map((option) => option.id)).toEqual(expectedStatuses.map(([, value]) => `calendar-status-option-${value}`));
    expectedStatuses.forEach(([label, value, selected]) => {
      expect(screen.getByRole('option', { name: label })).toHaveAttribute('id', `calendar-status-option-${value}`);
      expect(screen.getByRole('option', { name: label })).toHaveAttribute('aria-selected', selected);
    });
    await user.click(screen.getByRole('option', { name: 'ວາງແຜນ' }));
    expect(screen.getByText('Later')).toBeInTheDocument();
    expect(screen.queryByText('Boundary Next Day')).not.toBeInTheDocument();
    expect(serviceMocks.subscribeActivities).toHaveBeenCalledTimes(1);
    expect(serviceMocks.subscribeAssignableUsers).toHaveBeenCalledTimes(1);
  });
});
