import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const serviceMocks = vi.hoisted(() => ({
  approveUser: vi.fn(),
  cleanupExpiredTrash: vi.fn(),
  disableUser: vi.fn(),
  permanentlyDeleteActivity: vi.fn(),
  permanentlyDeleteCustomer: vi.fn(),
  reactivateUser: vi.fn().mockResolvedValue({ uid: 'disabled-user', accountStatus: 'approved' }),
  restoreActivity: vi.fn(),
  restoreCustomer: vi.fn(),
  subscribeTrash: vi.fn((_, onData) => { onData([]); return vi.fn(); }),
  subscribeUsers: vi.fn((onData) => {
    onData([{ uid: 'disabled-user', name: 'Disabled User', role: 'staff', branchId: '019', accountStatus: 'disabled' }]);
    return vi.fn();
  }),
  updateUserAccess: vi.fn(),
}));

vi.mock('../components/Navbar', () => ({ default: () => null }));
vi.mock('../services/adminService', () => serviceMocks);

import AdminPage from './AdminPage';

describe('Admin disabled-user lifecycle', () => {
  beforeEach(() => vi.clearAllMocks());

  it('uses the dedicated Reactivate action with the selected role and branch instead of generic access update', async () => {
    const user = userEvent.setup();
    render(<AdminPage />);

    await user.click(screen.getByRole('button', { name: 'ປິດໃຊ້ງານ' }));
    const [role, branch] = screen.getAllByRole('combobox');
    await user.selectOptions(role, 'branch_manager');
    await user.selectOptions(branch, '020');
    await user.click(screen.getByRole('button', { name: 'ເປີດໃຊ້ງານຄືນ' }));

    await waitFor(() => expect(serviceMocks.reactivateUser).toHaveBeenCalledWith('disabled-user', 'branch_manager', '020'));
    expect(serviceMocks.updateUserAccess).not.toHaveBeenCalled();
  });

  it('shows branch and trash management actions in Lao', async () => {
    const user = userEvent.setup();
    render(<AdminPage />);

    await user.click(screen.getByRole('button', { name: 'ສາຂາ' }));
    expect(screen.getByRole('heading', { name: 'ລາຍຊື່ສາຂາ' })).toBeInTheDocument();
    expect(screen.getAllByText('ເປີດໃຊ້ງານ').length).toBeGreaterThan(0);
    expect(screen.queryByText('Branch Master')).not.toBeInTheDocument();
    expect(screen.queryByText('Active')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'ຖັງຂີ້ເຫຍື້ອ' }));
    expect(screen.getByRole('button', { name: 'ລຶບລາຍການທີ່ຄົບ 30 ວັນ' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'ລູກຄ້າໃນຖັງຂີ້ເຫຍື້ອ' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'ກິດຈະກຳໃນຖັງຂີ້ເຫຍື້ອ' })).toBeInTheDocument();
  });
});
