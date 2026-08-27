import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

const serviceMocks = vi.hoisted(() => ({
  changeCustomerStatus: vi.fn(),
  subscribeCustomers: vi.fn(),
  syncLegacyCustomer: vi.fn(),
}));

vi.mock('../components/Navbar', () => ({ default: () => null }));
vi.mock('../auth/useAuth', () => ({
  useAuth: () => ({ user: { uid: 'u1' }, claims: { role: 'staff', branchId: '010' } }),
}));
vi.mock('../services/customersService', () => ({
  changeCustomerStatus: serviceMocks.changeCustomerStatus,
  subscribeCustomers: serviceMocks.subscribeCustomers,
}));
vi.mock('../services/webhookService', () => ({
  syncLegacyCustomer: serviceMocks.syncLegacyCustomer,
}));

import CustomersPage from './CustomersPage';

describe('CustomersPage feedback', () => {
  it('announces a customer subscription failure with the Orange error presentation', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    serviceMocks.subscribeCustomers.mockImplementationOnce((_, __, onError) => {
      onError(new Error('load failed'));
      return vi.fn();
    });

    render(<MemoryRouter><CustomersPage /></MemoryRouter>);

    const feedback = await screen.findByRole('alert');
    expect(feedback).toHaveTextContent('ບໍ່ສາມາດໂຫຼດລູກຄ້າໄດ້');
    expect(feedback).toHaveClass('error-banner');
    consoleError.mockRestore();
  });
});
