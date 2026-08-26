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
    serviceMocks.subscribeActivities.mockImplementation((_, onData) => { onData([
      { id: 'later', type: 'event', status: 'planned', title: 'Later', startAt: '2026-08-26T04:00:00.000Z', assignedStaffIds: ['u1'] },
      { id: 'earlier', type: 'appointment', status: 'in_progress', title: 'Earlier', startAt: '2026-08-26T02:00:00.000Z', assignedStaffIds: ['u1'] },
    ]); return vi.fn(); });
    serviceMocks.subscribeAssignableUsers.mockImplementation((_, onData) => { onData([{ uid: 'u1', name: 'One' }]); return vi.fn(); });
  });

  it('keeps the Laos agenda grouping, labels, chronological items, and add route', () => {
    render(<MemoryRouter><CalendarPage /></MemoryRouter>);

    const heading = screen.getByText((_, element) => element?.className === 'calendar-date' && element.textContent.includes('26'));
    expect(heading).toBeInTheDocument();
    expect(screen.getByText('Earlier').compareDocumentPosition(screen.getByText('Later')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText('Earlier').closest('.calendar-item')).toHaveTextContent('ນັດໝາຍ');
    expect(screen.getByText('ກຳລັງດຳເນີນ')).toHaveAttribute('data-status', 'in_progress');
    expect(screen.getByRole('link', { name: '＋' })).toHaveAttribute('href', '/activities/new/appointment?date=2026-08-26');
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
});
