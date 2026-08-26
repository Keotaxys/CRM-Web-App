import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import CustomSelect from './CustomSelect';

const options = [
  { value: 'planned', label: 'ວາງແຜນ' },
  { value: 'in_progress', label: 'ກຳລັງດຳເນີນ' },
  { value: 'completed', label: 'ສຳເລັດແລ້ວ' },
];

describe('CustomSelect', () => {
  it('opens a portal listbox and selects an option with the mouse', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<CustomSelect id="status" label="ສະຖານະ" value="planned" options={options} onChange={onChange} />);

    const trigger = screen.getByRole('combobox', { name: 'ສະຖານະ' });
    await user.click(trigger);
    const listbox = screen.getByRole('listbox');
    expect(listbox).toHaveAttribute('id', 'status-listbox');
    expect(listbox.parentElement?.parentElement).toBe(document.body);
    await user.click(screen.getByRole('option', { name: 'ກຳລັງດຳເນີນ' }));

    expect(onChange).toHaveBeenCalledWith('in_progress');
    expect(trigger).toHaveFocus();
  });

  it('navigates enabled options by keyboard and closes without changing value', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<CustomSelect id="status" label="ສະຖານະ" value="planned" options={options} onChange={onChange} />);

    const trigger = screen.getByRole('combobox', { name: 'ສະຖານະ' });
    trigger.focus();
    await user.keyboard('{ArrowDown}{End}{Enter}');
    expect(onChange).toHaveBeenCalledWith('completed');

    await user.keyboard('{ArrowDown}{Escape}');
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(trigger).toHaveFocus();
  });

  it('closes from an outside pointer event without mutating the selection', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<><CustomSelect id="status" label="ສະຖານະ" value="planned" options={options} onChange={onChange} /><button type="button">outside</button></>);

    await user.click(screen.getByRole('combobox', { name: 'ສະຖານະ' }));
    fireEvent.pointerDown(screen.getByRole('button', { name: 'outside' }));

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('does not open or select when disabled', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<CustomSelect id="status" label="ສະຖານະ" value="planned" options={options} onChange={onChange} disabled />);

    await user.click(screen.getByRole('combobox', { name: 'ສະຖານະ' }));

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('selects once for a touch-equivalent pointer and click sequence', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<CustomSelect id="status" label="ສະຖານະ" value="planned" options={options} onChange={onChange} />);

    await user.click(screen.getByRole('combobox', { name: 'ສະຖານະ' }));
    const option = screen.getByRole('option', { name: 'ກຳລັງດຳເນີນ' });
    fireEvent.pointerDown(option, { pointerType: 'touch' });
    await user.click(option);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('in_progress');
  });
});
