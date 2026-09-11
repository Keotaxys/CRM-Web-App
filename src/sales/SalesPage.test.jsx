import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SalesPage from './SalesPage';

const authMock = vi.hoisted(() => ({ identity: null }));
vi.mock('../auth/useAuth', () => ({ useAuth: () => authMock.identity }));
vi.mock('../components/Navbar', () => ({ default: ({ title }) => <header>{title}</header> }));
vi.mock('./DailySalesForm', () => ({ default: () => <div>ENTRY FORM</div> }));

function renderSalesPage(role) {
  authMock.identity = { user: { uid: 'u1' }, claims: { role, branchId: 'VTE' } };
  return { ...render(<SalesPage />), ...screen };
}

describe('SalesPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it.each(['staff', 'branch_manager'])('shows today entry to %s', (role) => {
    expect(renderSalesPage(role).getByRole('button', { name: 'ບັນທຶກມື້ນີ້' })).toBeInTheDocument();
    expect(screen.getByText('ENTRY FORM')).toBeInTheDocument();
  });

  it('hides self-entry and shows product management for Admin', () => {
    expect(renderSalesPage('admin').queryByRole('button', { name: 'ບັນທຶກມື້ນີ້' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ຈັດການຜະລິດຕະພັນ' })).toBeInTheDocument();
  });
});
