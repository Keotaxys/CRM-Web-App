import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import GiftsPage from './GiftsPage';

const authMock = vi.hoisted(() => ({ identity: null }));
vi.mock('../auth/useAuth', () => ({ useAuth: () => authMock.identity }));
vi.mock('../components/Navbar', () => ({ default: ({ title }) => <header>{title}</header> }));
vi.mock('./GiftDistributionForm', () => ({ default: () => <div>FORM</div> }));

function arrange(role, branchId = '010') {
  authMock.identity = { user: { uid: 'u1' }, claims: { role, branchId, accountStatus: 'approved' } };
  render(<GiftsPage />);
}

describe('GiftsPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('defaults Staff to distribution only', () => {
    arrange('staff');
    expect(screen.getByRole('button', { name: 'ແຈກເຄື່ອງ' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('FORM')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'ສະຕັອກ' })).not.toBeInTheDocument();
  });

  it('shows operations tabs to a manager', () => {
    arrange('branch_manager');
    ['ແຈກເຄື່ອງ', 'ສະຕັອກ', 'ຮັບເຂົ້າ', 'ລາຍງານ', 'Campaign'].forEach((label) => {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    });
  });

  it('requires Admin to select a target branch before branch actions', () => {
    arrange('admin', null);
    expect(screen.getByRole('button', { name: 'ລາຍການເຄື່ອງແຈກ' })).toBeInTheDocument();
    expect(screen.getByLabelText('ສາຂາເປົ້າໝາຍ')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('ເລືອກສາຂາ');
    expect(screen.queryByText('FORM')).not.toBeInTheDocument();
  });
});
