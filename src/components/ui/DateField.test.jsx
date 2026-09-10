import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import DateField from './DateField';

describe('DateField', () => {
  it('opens a custom calendar instead of the native browser picker', async () => {
    const user = userEvent.setup();

    render(
      <DateField
        id="due"
        type="date"
        label="ວັນທີ"
        value="2026-08-26"
        onChange={vi.fn()}
      />,
    );

    const input = screen.getByLabelText('ວັນທີ');

    expect(input).toHaveAttribute('type', 'text');
    expect(input).toHaveAttribute('readonly');
    expect(input).toHaveValue('26/08/2026');

    await user.click(
      screen.getByRole('button', {
        name: 'ເປີດປະຕິທິນ ວັນທີ',
      }),
    );

    expect(
      screen.getByRole('dialog', {
        name: 'ເລືອກວັນທີ ວັນທີ',
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByText('ສິງຫາ 2026'),
    ).toBeInTheDocument();
  });

  it('selects a date and keeps the existing YYYY-MM-DD value contract', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <DateField
        id="due"
        type="date"
        label="ວັນທີ"
        value="2026-08-26"
        onChange={onChange}
      />,
    );

    await user.click(
      screen.getByRole('button', {
        name: 'ເປີດປະຕິທິນ ວັນທີ',
      }),
    );

    await user.click(
      screen.getByRole('button', {
        name: 'ເລືອກ 2026-08-27',
      }),
    );

    await user.click(
      screen.getByRole('button', {
        name: 'ຢືນຢັນ',
      }),
    );

    expect(onChange).toHaveBeenCalledOnce();

    expect(
      onChange.mock.calls[0][0].target.value,
    ).toBe('2026-08-27');

    expect(
      screen.queryByRole('dialog'),
    ).not.toBeInTheDocument();
  });

  it('supports datetime-local with custom date and 24-hour time controls', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <DateField
        id="start"
        type="datetime-local"
        label="ເລີ່ມ"
        value="2026-08-26T09:00"
        onChange={onChange}
      />,
    );

    expect(
      screen.getByLabelText('ເລີ່ມ'),
    ).toHaveValue('26/08/2026 09:00');

    await user.click(
      screen.getByRole('button', {
        name: 'ເປີດປະຕິທິນ ເລີ່ມ',
      }),
    );

    expect(
      screen.getByRole('dialog', {
        name: 'ເລືອກວັນທີ ແລະ ເວລາ ເລີ່ມ',
      }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', {
        name: 'ເລືອກ 2026-08-27',
      }),
    );

    const hourInput =
      screen.getByLabelText('ຊົ່ວໂມງ');

    const minuteInput =
      screen.getByLabelText('ນາທີ');

    await user.clear(hourInput);
    await user.type(hourInput, '14');

    await user.clear(minuteInput);
    await user.type(minuteInput, '35');

    await user.click(
      screen.getByRole('button', {
        name: 'ຢືນຢັນ',
      }),
    );

    expect(onChange).toHaveBeenCalledOnce();

    expect(
      onChange.mock.calls[0][0].target.value,
    ).toBe('2026-08-27T14:35');
  });

  it('moves between calendar months with custom navigation controls', async () => {
    const user = userEvent.setup();

    render(
      <DateField
        id="due"
        type="date"
        label="ວັນທີ"
        value="2026-08-26"
        onChange={vi.fn()}
      />,
    );

    await user.click(
      screen.getByRole('button', {
        name: 'ເປີດປະຕິທິນ ວັນທີ',
      }),
    );

    expect(
      screen.getByText('ສິງຫາ 2026'),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', {
        name: 'ເດືອນຖັດໄປ',
      }),
    );

    expect(
      screen.getByText('ກັນຍາ 2026'),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', {
        name: 'ເດືອນກ່ອນໜ້າ',
      }),
    );

    expect(
      screen.getByText('ສິງຫາ 2026'),
    ).toBeInTheDocument();
  });

  it('jumps directly to a distant month and year without changing the date value contract', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <DateField
        id="birth-date"
        type="date"
        label="ວັນເກີດ"
        value="2025-11-23"
        max="2026-09-10"
        onChange={onChange}
      />,
    );

    await user.click(
      screen.getByRole('button', {
        name: 'ເປີດປະຕິທິນ ວັນເກີດ',
      }),
    );

    await user.click(
      screen.getByRole('button', {
        name: 'ເລືອກເດືອນ ແລະ ປີ ພະຈິກ 2025',
      }),
    );

    const yearList =
      screen.getByRole('listbox', {
        name: 'ປີ',
      });

    expect(yearList).toContainElement(
      screen.getByRole('option', {
        name: '1900',
      }),
    );

    expect(
      screen.queryByRole('option', {
        name: '2027',
      }),
    ).not.toBeInTheDocument();

    await user.click(
      screen.getByRole('option', {
        name: '1985',
      }),
    );

    await user.click(
      screen.getByRole('button', {
        name: 'ເລືອກເດືອນ ມິຖຸນາ',
      }),
    );

    expect(
      screen.getByRole('button', {
        name: 'ເລືອກເດືອນ ແລະ ປີ ມິຖຸນາ 1985',
      }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', {
        name: 'ເລືອກ 1985-06-15',
      }),
    );

    await user.click(
      screen.getByRole('button', {
        name: 'ຢືນຢັນ',
      }),
    );

    expect(
      onChange.mock.calls[0][0].target.value,
    ).toBe('1985-06-15');
  });

  it('keeps month and year navigation inside the configured date bounds', async () => {
    const user = userEvent.setup();

    render(
      <DateField
        id="birth-date"
        type="date"
        label="ວັນເກີດ"
        value="2026-09-10"
        min="1900-01-01"
        max="2026-09-10"
        onChange={vi.fn()}
      />,
    );

    await user.click(
      screen.getByRole('button', {
        name: 'ເປີດປະຕິທິນ ວັນເກີດ',
      }),
    );

    expect(
      screen.getByRole('button', {
        name: 'ເດືອນຖັດໄປ',
      }),
    ).toBeDisabled();

    await user.click(
      screen.getByRole('button', {
        name: 'ເລືອກເດືອນ ແລະ ປີ ກັນຍາ 2026',
      }),
    );

    expect(
      screen.getByRole('button', {
        name: 'ເລືອກເດືອນ ຕຸລາ',
      }),
    ).toBeDisabled();

    await user.click(
      screen.getByRole('option', {
        name: '1900',
      }),
    );

    await user.click(
      screen.getByRole('button', {
        name: 'ເລືອກເດືອນ ມັງກອນ',
      }),
    );

    expect(
      screen.getByRole('button', {
        name: 'ເດືອນກ່ອນໜ້າ',
      }),
    ).toBeDisabled();
  });

  it('does not change the value when the custom picker is cancelled', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <DateField
        id="due"
        type="date"
        label="ວັນທີ"
        value="2026-08-26"
        onChange={onChange}
      />,
    );

    await user.click(
      screen.getByRole('button', {
        name: 'ເປີດປະຕິທິນ ວັນທີ',
      }),
    );

    await user.click(
      screen.getByRole('button', {
        name: 'ເລືອກ 2026-08-27',
      }),
    );

    await user.click(
      screen.getByRole('button', {
        name: 'ຍົກເລີກ',
      }),
    );

    expect(onChange).not.toHaveBeenCalled();

    expect(
      screen.queryByRole('dialog'),
    ).not.toBeInTheDocument();
  });

  it('respects min and max dates in the custom calendar', async () => {
    const user = userEvent.setup();

    render(
      <DateField
        id="due"
        type="date"
        label="ວັນທີ"
        value="2026-08-26"
        min="2026-08-25"
        max="2026-08-27"
        onChange={vi.fn()}
      />,
    );

    await user.click(
      screen.getByRole('button', {
        name: 'ເປີດປະຕິທິນ ວັນທີ',
      }),
    );

    expect(
      screen.getByRole('button', {
        name: 'ເລືອກ 2026-08-24',
      }),
    ).toBeDisabled();

    expect(
      screen.getByRole('button', {
        name: 'ເລືອກ 2026-08-25',
      }),
    ).not.toBeDisabled();

    expect(
      screen.getByRole('button', {
        name: 'ເລືອກ 2026-08-27',
      }),
    ).not.toBeDisabled();

    expect(
      screen.getByRole('button', {
        name: 'ເລືອກ 2026-08-28',
      }),
    ).toBeDisabled();
  });

  it('connects hint and error to the visible custom date field', () => {
    render(
      <DateField
        id="due"
        type="date"
        label="ວັນທີ"
        value="2026-08-26"
        onChange={vi.fn()}
        hint="ເລືອກວັນທີ"
        error="ຈຳເປັນ"
      />,
    );

    const input =
      screen.getByLabelText('ວັນທີ');

    expect(input).toHaveAttribute(
      'aria-describedby',
      'due-hint due-error',
    );

    expect(input).toHaveAttribute(
      'aria-invalid',
      'true',
    );
  });

  it('does not open the custom picker when disabled', async () => {
    const user = userEvent.setup();

    render(
      <DateField
        id="due"
        type="date"
        label="ວັນທີ"
        value="2026-08-26"
        onChange={vi.fn()}
        disabled
      />,
    );

    const button =
      screen.getByRole('button', {
        name: 'ເປີດປະຕິທິນ ວັນທີ',
      });

    expect(button).toBeDisabled();

    await user.click(button);

    expect(
      screen.queryByRole('dialog'),
    ).not.toBeInTheDocument();
  });
});
