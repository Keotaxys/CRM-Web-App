import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

const serviceMocks = vi.hoisted(() => ({
  archiveCustomer: vi.fn(),
  getCustomer: vi.fn().mockResolvedValue({ id: 'c1', name: 'Test Customer', branchId: '010', phone: '02055551234', status: 'ໃໝ່', priority: 'ທົ່ວໄປ' }),
  subscribeActivities: vi.fn((_, onData) => { onData([]); return vi.fn(); }),
  transferCustomer: vi.fn().mockResolvedValue(undefined),
  trashCustomer: vi.fn(),
}));
const identity = vi.hoisted(() => ({ user: { uid: 'u1' }, claims: { role: 'admin', branchId: '010', accountStatus: 'approved' } }));

vi.mock('../components/Navbar', () => ({ default: () => null }));
vi.mock('../components/ManagedImage', () => ({ default: () => <div /> }));
vi.mock('../services/customersService', () => ({ archiveCustomer: serviceMocks.archiveCustomer, getCustomer: serviceMocks.getCustomer }));
vi.mock('../services/activitiesService', () => ({ subscribeActivities: serviceMocks.subscribeActivities }));
vi.mock('../services/adminService', () => ({ transferCustomer: serviceMocks.transferCustomer, trashCustomer: serviceMocks.trashCustomer }));
vi.mock('../auth/useAuth', () => ({ useAuth: () => identity }));

import CustomerDetailPage from './CustomerDetailPage';

describe('CustomerDetailPage transfer', () => {
  it('transfers to the selected branch and resets the transfer selector', async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<MemoryRouter initialEntries={['/customers/c1']}><Routes><Route path="/customers/:id" element={<CustomerDetailPage />} /></Routes></MemoryRouter>);

    await screen.findByText('ຮູບລູກຄ້າ');
    expect(screen.getByRole('link', { name: 'ໂທຫາລູກຄ້າ' })).toHaveAttribute('href', 'tel:02055551234');
    expect(screen.getByRole('link', { name: 'ຕິດຕໍ່ຜ່ານ WhatsApp' })).toHaveAttribute('href', 'https://wa.me/8562055551234');
    await user.click(screen.getByRole('combobox', { name: 'Transfer branch' }));
    await user.click(screen.getByRole('option', { name: /019/ }));
    await user.click(screen.getByRole('button', { name: 'Transfer customer' }));

    expect(confirm).toHaveBeenCalled();
    expect(serviceMocks.transferCustomer).toHaveBeenCalledWith('c1', '019');
    expect(screen.getByRole('combobox', { name: 'Transfer branch' })).toHaveTextContent('— Select —');
    confirm.mockRestore();
  });

  it('announces a transfer failure with the Orange error presentation', async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    serviceMocks.transferCustomer.mockRejectedValueOnce(new Error('Transfer failed'));
    render(<MemoryRouter initialEntries={['/customers/c1']}><Routes><Route path="/customers/:id" element={<CustomerDetailPage />} /></Routes></MemoryRouter>);

    await screen.findByText('ຮູບລູກຄ້າ');
    await user.click(screen.getByRole('combobox', { name: 'Transfer branch' }));
    await user.click(screen.getByRole('option', { name: /019/ }));
    await user.click(screen.getByRole('button', { name: 'Transfer customer' }));

    const feedback = await screen.findByRole('alert');
    expect(feedback).toHaveTextContent('Transfer failed');
    expect(feedback).toHaveClass('error-banner');
    confirm.mockRestore();
    consoleError.mockRestore();
  });

  it('renders customer history status through the shared badge mapping', async () => {
    serviceMocks.subscribeActivities.mockImplementationOnce((_, onData) => {
      onData([{ id: 'a1', title: 'ນັດຕິດຕາມ', type: 'customer_visit', status: 'in_progress', startAt: '2026-08-26T02:00:00.000Z' }]);
      return vi.fn();
    });
    render(<MemoryRouter initialEntries={['/customers/c1']}><Routes><Route path="/customers/:id" element={<CustomerDetailPage />} /></Routes></MemoryRouter>);

    const badge = await screen.findByText('ກຳລັງດຳເນີນ');
    expect(badge).toHaveClass('ui-status-badge');
    expect(badge).toHaveAttribute('data-kind', 'activity');
    expect(badge).toHaveAttribute('data-status', 'in_progress');
  });

  it('shows the optional customer birth date when present', async () => {
    serviceMocks.getCustomer.mockResolvedValueOnce({
      id: 'c1',
      name: 'VIP Customer',
      branchId: '010',
      phone: '02055551234',
      status: 'ໃໝ່',
      priority: 'VIP',
      birthDate: '15-09-1990',
    });

    render(<MemoryRouter initialEntries={['/customers/c1']}><Routes><Route path="/customers/:id" element={<CustomerDetailPage />} /></Routes></MemoryRouter>);

    const label = await screen.findByText('ວັນເກີດ');
    expect(label.parentElement).toHaveTextContent('15-09-1990');
  });

  it('shows an empty birth-date value for a legacy customer', async () => {
    render(<MemoryRouter initialEntries={['/customers/c1']}><Routes><Route path="/customers/:id" element={<CustomerDetailPage />} /></Routes></MemoryRouter>);

    const label = await screen.findByText('ວັນເກີດ');
    expect(label.parentElement).toHaveTextContent('—');
  });
});
