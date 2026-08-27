import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

const serviceMocks = vi.hoisted(() => ({
  abortCustomerUploads: vi.fn(),
  changeCustomerStatus: vi.fn(),
  createCustomer: vi.fn(),
  getCustomer: vi.fn(),
  updateCustomer: vi.fn(),
  uploadManagedImage: vi.fn(),
  syncLegacyCustomer: vi.fn(),
}));

vi.mock('../components/Navbar', () => ({ default: () => null }));
vi.mock('./CustomerForm', () => ({
  default: ({ onSubmit }) => <button type="button" onClick={() => onSubmit({ name: 'Test Customer' }, {})}>ບັນທຶກລູກຄ້າ</button>,
}));
vi.mock('../auth/useAuth', () => ({
  useAuth: () => ({ user: { uid: 'u1' }, claims: { role: 'staff', branchId: '010' } }),
}));
vi.mock('../services/customersService', () => ({
  abortCustomerUploads: serviceMocks.abortCustomerUploads,
  changeCustomerStatus: serviceMocks.changeCustomerStatus,
  createCustomer: serviceMocks.createCustomer,
  getCustomer: serviceMocks.getCustomer,
  updateCustomer: serviceMocks.updateCustomer,
}));
vi.mock('../services/imageService', () => ({ uploadManagedImage: serviceMocks.uploadManagedImage }));
vi.mock('../services/webhookService', () => ({ syncLegacyCustomer: serviceMocks.syncLegacyCustomer }));

import CustomerFormPage from './CustomerFormPage';

describe('CustomerFormPage feedback', () => {
  it('announces a customer save failure with the Orange error presentation', async () => {
    const user = userEvent.setup();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    serviceMocks.createCustomer.mockRejectedValueOnce(new Error('save failed'));
    render(
      <MemoryRouter initialEntries={['/customers/new']}>
        <Routes><Route path="/customers/new" element={<CustomerFormPage />} /></Routes>
      </MemoryRouter>,
    );

    await user.click(await screen.findByRole('button', { name: 'ບັນທຶກລູກຄ້າ' }));

    const feedback = await screen.findByRole('alert');
    expect(feedback).toHaveTextContent('ບັນທຶກບໍ່ສຳເລັດ');
    expect(feedback).toHaveClass('error-banner');
    consoleError.mockRestore();
  });
});
