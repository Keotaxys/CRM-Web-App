import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SalesCorrectionSheet from './SalesCorrectionSheet';

const serviceMocks = vi.hoisted(() => ({ amendDailySales: vi.fn() }));
vi.mock('../services/salesService', () => ({ amendDailySales: serviceMocks.amendDailySales }));

const record = {
  id: '2026-09-01_staff-a',
  dateKey: '2026-09-01',
  staffUid: 'staff-a',
  staffNameSnapshot: 'Staff A',
  branchId: '010',
  items: [{ productId: 'bcel', productNameSnapshot: 'BCEL One', quantity: 2 }],
};
const products = [{ id: 'bcel', name: 'BCEL One', sortOrder: 1 }];

describe('SalesCorrectionSheet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    serviceMocks.amendDailySales.mockResolvedValue({});
  });

  it('requires a correction reason and submits audited items with a UUID', async () => {
    render(<SalesCorrectionSheet record={record} products={products} onClose={vi.fn()} />);
    const user = userEvent.setup();
    await user.clear(screen.getByLabelText('ເຫດຜົນການແກ້ໄຂ'));
    await user.click(screen.getByRole('button', { name: 'ຢືນຢັນການແກ້ໄຂ' }));
    expect(screen.getByRole('alert')).toHaveTextContent('ກະລຸນາລະບຸເຫດຜົນ');
    expect(serviceMocks.amendDailySales).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText('ເຫດຜົນການແກ້ໄຂ'), 'ກວດແກ້ຈາກໃບສະຫຼຸບ');
    await user.click(screen.getByRole('button', { name: 'ຢືນຢັນການແກ້ໄຂ' }));
    expect(serviceMocks.amendDailySales).toHaveBeenCalledWith({
      dailySalesId: '2026-09-01_staff-a',
      reason: 'ກວດແກ້ຈາກໃບສະຫຼຸບ',
      mutationId: expect.stringMatching(/^[0-9a-f-]{36}$/),
      items: [{ productId: 'bcel', quantity: 2 }],
    });
  });

  it('reuses the same mutation UUID after a network failure and preserves inputs', async () => {
    serviceMocks.amendDailySales.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({});
    render(<SalesCorrectionSheet record={record} products={products} onClose={vi.fn()} />);
    const user = userEvent.setup();
    await user.clear(screen.getByLabelText('ຈຳນວນ BCEL One'));
    await user.type(screen.getByLabelText('ຈຳນວນ BCEL One'), '4');
    await user.type(screen.getByLabelText('ເຫດຜົນການແກ້ໄຂ'), 'ກວດແກ້');
    await user.click(screen.getByRole('button', { name: 'ຢືນຢັນການແກ້ໄຂ' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('ບໍ່ສາມາດແກ້ໄຂຍອດ');
    await user.click(screen.getByRole('button', { name: 'ຢືນຢັນການແກ້ໄຂ' }));
    expect(serviceMocks.amendDailySales).toHaveBeenCalledTimes(2);
    expect(serviceMocks.amendDailySales.mock.calls[1][0].mutationId).toBe(serviceMocks.amendDailySales.mock.calls[0][0].mutationId);
    expect(serviceMocks.amendDailySales.mock.calls[1][0].items).toEqual([{ productId: 'bcel', quantity: 4 }]);
  });

  it('shows immutable date, staff, and branch context without editable controls', () => {
    render(<SalesCorrectionSheet record={record} products={products} onClose={vi.fn()} />);
    expect(screen.getByText(/2026-09-01/)).toBeInTheDocument();
    expect(screen.getByText(/Staff A/)).toBeInTheDocument();
    expect(screen.queryByLabelText('ວັນທີ')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('ພະນັກງານ')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('ສາຂາ')).not.toBeInTheDocument();
  });
});
