import { readFileSync } from 'node:fs';
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

const screensCss = readFileSync('src/styles/screens.css', 'utf8');

describe('Admin disabled-user lifecycle', () => {
  beforeEach(() => vi.clearAllMocks());

  it('uses the dedicated Reactivate action with the selected role and branch instead of generic access update', async () => {
    const user = userEvent.setup();
    const { container } = render(<AdminPage />);

    await user.click(screen.getByRole('button', { name: 'ປິດໃຊ້ງານ' }));
    const [role, branch] = screen.getAllByRole('combobox');
    await user.click(role);
    await user.click(screen.getByRole('option', { name: 'ຫົວໜ້າສາຂາ' }));
    await user.click(branch);
    await user.click(screen.getByRole('option', { name: /020/ }));
    await user.click(screen.getByRole('button', { name: 'ເປີດໃຊ້ງານຄືນ' }));

    await waitFor(() => expect(serviceMocks.reactivateUser).toHaveBeenCalledWith('disabled-user', 'branch_manager', '020'));
    expect(serviceMocks.updateUserAccess).not.toHaveBeenCalled();
    expect(container.querySelector('section')).toHaveClass('ui-glass-card--padded');
  });

  it('keeps the branch selector disabled when the Admin role is selected', async () => {
    const user = userEvent.setup();
    render(<AdminPage />);

    await user.click(screen.getByRole('button', { name: 'ປິດໃຊ້ງານ' }));
    const [role, branch] = screen.getAllByRole('combobox');
    await user.click(role);
    await user.click(screen.getByRole('option', { name: 'ຜູ້ບໍລິຫານລະບົບ' }));

    expect(branch).toBeDisabled();
  });

  it('uses Lao accessible names for role and branch controls without visible English labels', async () => {
    const user = userEvent.setup();
    render(<AdminPage />);

    await user.click(screen.getByRole('button', { name: 'ປິດໃຊ້ງານ' }));

    expect(screen.getByRole('combobox', { name: 'ບົດບາດຂອງ Disabled User' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'ສາຂາຂອງ Disabled User' })).toBeInTheDocument();
    expect(screen.queryByText('Role for Disabled User')).not.toBeInTheDocument();
    expect(screen.queryByText('Branch for Disabled User')).not.toBeInTheDocument();
  });

  it('shows branch and trash management actions in Lao', async () => {
    const user = userEvent.setup();
    const { container } = render(<AdminPage />);

    expect(screen.getByRole('button', { name: 'ຜູ້ໃຊ້' })).toHaveClass('ui-button--neutral');
    expect(container.querySelector('.ui-button--ghost')).not.toBeInTheDocument();

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

  it('announces a page-level subscription failure with the Orange error presentation', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    serviceMocks.subscribeUsers.mockImplementationOnce((_, onError) => {
      onError(new Error('load failed'));
      return vi.fn();
    });

    render(<AdminPage />);

    const feedback = await screen.findByRole('alert');
    expect(feedback).toHaveTextContent('ໂຫຼດຂໍ້ມູນສູນບໍລິຫານບໍ່ສຳເລັດ');
    expect(feedback).toHaveClass('error-banner');
    consoleError.mockRestore();
  });

  it('announces a row-level save failure without red utility styling', async () => {
    const user = userEvent.setup();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    serviceMocks.reactivateUser.mockRejectedValueOnce(new Error('save failed'));
    render(<AdminPage />);

    await user.click(screen.getByRole('button', { name: 'ປິດໃຊ້ງານ' }));
    await user.click(screen.getByRole('button', { name: 'ເປີດໃຊ້ງານຄືນ' }));

    const feedback = await screen.findByRole('alert');
    expect(feedback).toHaveTextContent('ບໍ່ສາມາດປ່ຽນສະຖານະຜູ້ໃຊ້ໄດ້');
    expect(feedback).toHaveClass('error-banner');
    expect(feedback).not.toHaveClass('text-red-600');
    consoleError.mockRestore();
  });

  it('keeps populated long-name trash rows on the mobile-safe grid contract', async () => {
    const user = userEvent.setup();
    const longCustomerName = 'ຮ້ານລູກຄ້າຊື່ຍາວຕິດກັນຫຼາຍເກີນພື້ນທີ່ຈໍມືຖື320px';
    const longActivityTitle = 'ກິດຈະກຳຫົວຂໍ້ຍາວຕິດກັນຫຼາຍເກີນພື້ນທີ່ຈໍມືຖື320px';
    serviceMocks.subscribeTrash
      .mockImplementationOnce((_, onData) => { onData([{ id: 'c-long', name: longCustomerName, branchId: '010' }]); return vi.fn(); })
      .mockImplementationOnce((_, onData) => { onData([{ id: 'a-long', title: longActivityTitle, branchId: '010' }]); return vi.fn(); });
    render(<AdminPage />);

    await user.click(screen.getByRole('button', { name: 'ຖັງຂີ້ເຫຍື້ອ' }));

    const customerRow = screen.getByText(longCustomerName).closest('.trash-row');
    const activityRow = screen.getByText(longActivityTitle).closest('.trash-row');
    expect(customerRow).toBeInTheDocument();
    expect(activityRow).toBeInTheDocument();
    expect(customerRow).toContainElement(screen.getAllByRole('button', { name: 'ກູ້ຄືນ' })[0]);
    expect(customerRow).toContainElement(screen.getAllByRole('button', { name: 'ລຶບ' })[0]);
    expect(screensCss).toMatch(/\.trash-row\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s+auto\s+auto[^}]*max-width:\s*100%/s);
    expect(screensCss).toMatch(/\.trash-row\s*>\s*\*\s*\{[^}]*min-width:\s*0[^}]*max-width:\s*100%[^}]*overflow-wrap:\s*anywhere/s);
    expect(screensCss).toMatch(/@media\s*\(max-width:\s*430px\)[\s\S]*\.trash-row\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
  });
});
