import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ActivityForm from './ActivityForm';

const users = [{ uid: 'u1', name: 'One' }, { uid: 'u2', name: 'Two' }];
const customers = [{ id: 'c1', name: 'Customer', phone: '020' }];

describe('ActivityForm relationships', () => {
  it('requires a customer for Customer Meeting and supports multiple staff', () => {
    render(<ActivityForm type="customer_visit" customers={customers} users={users} currentUid="u1" onSubmit={vi.fn()} />);
    expect(screen.getByLabelText(/ລູກຄ້າ/)).toBeRequired();
    expect(screen.getAllByRole('checkbox')).toHaveLength(3);
  });

  it('keeps customer optional for Appointment', () => {
    render(<ActivityForm type="appointment" customers={customers} users={users} currentUid="u1" onSubmit={vi.fn()} />);
    expect(screen.getByLabelText(/ລູກຄ້າ/)).not.toBeRequired();
  });

  it('preserves product and service values while editing under the Lao label', () => {
    render(<ActivityForm type="customer_visit" initial={{ productServices: ['Coffee', 'Tea'] }} customers={customers} users={users} currentUid="u1" onSubmit={vi.fn()} />);
    expect(screen.getByLabelText(/ສິນຄ້າ \/ ບໍລິການ/)).toHaveValue('Coffee, Tea');
  });

  it('reads a legacy visit purpose into the one Customer Meeting purpose field', () => {
    render(<ActivityForm type="customer_visit" initial={{ visitPurpose: 'legacy purpose' }} customers={customers} users={users} currentUid="u1" onSubmit={vi.fn()} />);

    expect(screen.getByLabelText('ຈຸດປະສົງການນັດພົບ')).toHaveValue('legacy purpose');
    expect(screen.queryByLabelText('ຈຸດປະສົງ')).not.toBeInTheDocument();
  });

  it('submits Customer Meeting purpose without the legacy field', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<ActivityForm type="customer_visit" initial={{ title: 'Meeting', customerId: 'c1', startAt: '2026-08-25T09:00', endAt: '2026-08-25T10:00', visitPurpose: 'legacy purpose' }} customers={customers} users={users} currentUid="u1" onSubmit={onSubmit} />);

    const purpose = screen.getByLabelText('ຈຸດປະສົງການນັດພົບ');
    await user.clear(purpose);
    await user.type(purpose, 'ສະເໜີສິນຄ້າ');
    await user.click(screen.getByRole('button', { name: 'ບັນທຶກກິດຈະກຳ' }));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      type: 'customer_visit',
      purpose: 'ສະເໜີສິນຄ້າ',
    }));
    expect(onSubmit.mock.calls[0][0]).not.toHaveProperty('visitPurpose');
  });

  it('keeps one general purpose label for Appointment', () => {
    render(<ActivityForm type="appointment" customers={customers} users={users} currentUid="u1" onSubmit={vi.fn()} />);

    expect(screen.getByLabelText('ຈຸດປະສົງ')).toBeInTheDocument();
    expect(screen.queryByLabelText('ຈຸດປະສົງການນັດພົບ')).not.toBeInTheDocument();
  });

  it('shows all Customer Meeting fields in natural Lao', () => {
    render(<ActivityForm type="customer_visit" customers={customers} users={users} currentUid="u1" onSubmit={vi.fn()} />);

    expect(screen.getByText('ນັດພົບລູກຄ້າ')).toBeInTheDocument();
    expect(screen.getByLabelText('ຈຸດປະສົງການນັດພົບ')).toBeInTheDocument();
    expect(screen.getByLabelText('ບັນທຶກກ່ອນນັດພົບ')).toBeInTheDocument();
    expect(screen.getByLabelText('ບັນທຶກການນັດພົບ')).toBeInTheDocument();
    expect(screen.getByLabelText('ຜົນການນັດພົບ')).toBeInTheDocument();
    expect(screen.getByText('ຕ້ອງຕິດຕາມຕໍ່')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'ວາງແຜນ' })).toHaveValue('planned');
    expect(screen.queryByText(/Visit Purpose|Product \/ Service|Pre-visit|Visit Notes|Result|Follow-up/)).not.toBeInTheDocument();
  });
});
