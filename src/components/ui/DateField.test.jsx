import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import DateField from './DateField';

const originalShowPicker = HTMLInputElement.prototype.showPicker;

afterEach(() => {
  if (originalShowPicker) HTMLInputElement.prototype.showPicker = originalShowPicker;
  else delete HTMLInputElement.prototype.showPicker;
});

describe('DateField', () => {
  it('keeps the native datetime input and opens its supported picker', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const showPicker = vi.fn();
    HTMLInputElement.prototype.showPicker = showPicker;

    render(<DateField id="start" type="datetime-local" label="ເລີ່ມ" value="2026-08-26T09:00" onChange={onChange} />);

    expect(screen.getByLabelText('ເລີ່ມ')).toHaveAttribute('type', 'datetime-local');
    expect(screen.getByLabelText('ເລີ່ມ')).toHaveValue('2026-08-26T09:00');
    await user.click(screen.getByRole('button', { name: 'ເປີດປະຕິທິນ ເລີ່ມ' }));

    expect(showPicker).toHaveBeenCalledOnce();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('focuses the native date input when showPicker is unavailable', async () => {
    const user = userEvent.setup();
    delete HTMLInputElement.prototype.showPicker;

    render(<DateField id="due" type="date" label="ວັນທີ" value="2026-08-26" onChange={vi.fn()} />);

    const input = screen.getByLabelText('ວັນທີ');
    await user.click(screen.getByRole('button', { name: 'ເປີດປະຕິທິນ ວັນທີ' }));

    expect(input).toHaveFocus();
  });

  it('connects its hint and error to the native input', () => {
    render(<DateField id="due" type="date" label="ວັນທີ" value="2026-08-26" onChange={vi.fn()} hint="ເລືອກວັນທີ" error="ຈຳເປັນ" />);

    expect(screen.getByLabelText('ວັນທີ')).toHaveAttribute('aria-describedby', 'due-hint due-error');
    expect(screen.getByLabelText('ວັນທີ')).toHaveAttribute('aria-invalid', 'true');
  });
});
