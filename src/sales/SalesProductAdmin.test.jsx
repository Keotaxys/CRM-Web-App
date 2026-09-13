import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import SalesProductAdmin from './SalesProductAdmin';
const mocks = vi.hoisted(() => ({
  update: vi.fn(),
  subscribe: vi.fn((onData) => { onData([{ id: 'bcel', name: 'BCEL One', sortOrder: 1, active: true }]); return vi.fn(); }),
}));
vi.mock('../services/salesService', () => ({ subscribeAllSalesProducts: mocks.subscribe, createSalesProduct: vi.fn(), updateSalesProduct: mocks.update }));

it.each([true, false])('preserves active=%s when editing catalog name and order', async (active) => {
  mocks.update.mockReset().mockResolvedValue({});
  mocks.subscribe.mockImplementation((onData) => { onData([{ id: 'bcel', name: 'BCEL One', sortOrder: 1, active }]); return vi.fn(); });
  render(<SalesProductAdmin />);
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'ແກ້ໄຂ' }));
  await user.clear(screen.getByLabelText('ຊື່'));
  await user.type(screen.getByLabelText('ຊື່'), 'Renamed');
  await user.clear(screen.getByLabelText('ລຳດັບ'));
  await user.type(screen.getByLabelText('ລຳດັບ'), '20');
  await user.click(screen.getByRole('button', { name: 'ບັນທຶກ' }));
  expect(mocks.update).toHaveBeenCalledWith('bcel', { name: 'Renamed', sortOrder: 20, active });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

it('shows duplicate-name errors in Lao inside the dialog and keeps the draft', async () => {
  mocks.update.mockRejectedValue({ code: 'functions/already-exists', message: 'English backend error' });
  render(<SalesProductAdmin />);
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'ແກ້ໄຂ' }));
  await user.type(screen.getByLabelText('ຊື່'), ' draft');
  await user.click(screen.getByRole('button', { name: 'ບັນທຶກ' }));
  expect(within(screen.getByRole('dialog')).getByRole('alert')).toHaveTextContent('ຊື່ຜະລິດຕະພັນນີ້ມີແລ້ວ');
  expect(screen.getByLabelText('ຊື່')).toHaveValue('BCEL One draft');
});

it('maps catalog toggle errors to Lao without exposing backend text', async () => {
  mocks.subscribe.mockImplementation((onData) => {
    onData([{ id: 'bcel', name: 'BCEL One', sortOrder: 1, active: true }]);
    return vi.fn();
  });
  mocks.update.mockRejectedValue({ code: 'functions/permission-denied', message: 'English backend error' });
  render(<SalesProductAdmin />);
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'ປິດນຳໃຊ້ BCEL One' }));
  await user.click(screen.getByRole('button', { name: 'ຢືນຢັນປິດນຳໃຊ້' }));
  expect(screen.getByRole('alert')).toHaveTextContent('ທ່ານບໍ່ມີສິດຈັດການຜະລິດຕະພັນ');
  expect(screen.getByRole('alert')).not.toHaveTextContent('English backend error');
});

describe('SalesProductAdmin', () => { it('shows catalog controls without delete', () => { render(<SalesProductAdmin />); expect(screen.getByText('BCEL One')).toBeInTheDocument(); expect(screen.queryByRole('button', { name: /ລຶບ/ })).not.toBeInTheDocument(); }); });
