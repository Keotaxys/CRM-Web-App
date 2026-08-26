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
});
