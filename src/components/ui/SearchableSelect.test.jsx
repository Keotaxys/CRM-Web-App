import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import SearchableSelect from './SearchableSelect';

const searchPlaceholder = 'ຄົ້ນຫາຊື່ ຫຼື ເບີໂທ';
const options = [
  { value: 'c1', label: 'ຮ້ານ ກ · 020 1111', searchText: 'ຮ້ານ ກ 020 1111' },
  { value: 'c2', label: 'ຮ້ານ ຂ · 020 2222', searchText: 'ຮ້ານ ຂ 020 2222' },
  { value: 'c3', label: 'ຮ້ານ ຄ · 020 3333', disabled: true },
];

describe('SearchableSelect', () => {
  it('filters options from its one combobox input', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SearchableSelect id="customer" label="ລູກຄ້າ" value="" options={options} onChange={onChange} searchPlaceholder={searchPlaceholder} />);

    const input = screen.getByRole('combobox', { name: 'ລູກຄ້າ' });
    await user.click(input);
    await user.type(screen.getByPlaceholderText(searchPlaceholder), '2222');

    expect(screen.queryByRole('option', { name: /1111/ })).not.toBeInTheDocument();
    expect(screen.getByRole('option', { name: /2222/ })).toBeInTheDocument();
    expect(screen.getAllByRole('combobox')).toHaveLength(1);

    await user.clear(input);
    await user.type(input, 'ຮ້ານ ຂ');
    expect(screen.getByRole('option', { name: /2222/ })).toBeInTheDocument();
  });

  it('exposes the controlled listbox relationships and required selection state', async () => {
    const user = userEvent.setup();
    render(<SearchableSelect id="customer" label="ລູກຄ້າ" value="c1" options={options} onChange={() => {}} searchPlaceholder={searchPlaceholder} required />);

    const input = screen.getByRole('combobox', { name: 'ລູກຄ້າ' });
    expect(input).toHaveAttribute('aria-expanded', 'false');
    expect(input).toHaveAttribute('aria-controls', 'customer-listbox');
    expect(input).toHaveAttribute('aria-required', 'true');
    expect(input).toHaveAttribute('aria-autocomplete', 'list');
    await user.click(input);

    expect(input).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('option', { name: /1111/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('option', { name: /3333/ })).toHaveAttribute('aria-disabled', 'true');
  });

  it('skips disabled options and supports Home and End keyboard navigation', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SearchableSelect id="customer" label="ລູກຄ້າ" value="c1" options={options} onChange={onChange} searchPlaceholder={searchPlaceholder} />);

    const input = screen.getByRole('combobox', { name: 'ລູກຄ້າ' });
    input.focus();
    await user.keyboard('{ArrowDown}{End}{Enter}');
    expect(onChange).toHaveBeenCalledWith('c2');

    await user.keyboard('{ArrowDown}{Home}{Enter}');
    expect(onChange).toHaveBeenLastCalledWith('c1');
  });

  it('selects the active option with Space', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SearchableSelect id="customer" label="ລູກຄ້າ" value="c1" options={options} onChange={onChange} searchPlaceholder={searchPlaceholder} />);

    const input = screen.getByRole('combobox', { name: 'ລູກຄ້າ' });
    input.focus();
    await user.keyboard('{ArrowDown}{ArrowDown} ');

    expect(onChange).toHaveBeenCalledWith('c2');
  });

  it('announces the approved Lao empty state without creating a selectable option', async () => {
    const user = userEvent.setup();
    render(<SearchableSelect id="customer" label="ລູກຄ້າ" value="" options={options} onChange={() => {}} searchPlaceholder={searchPlaceholder} />);

    await user.click(screen.getByRole('combobox', { name: 'ລູກຄ້າ' }));
    await user.type(screen.getByPlaceholderText(searchPlaceholder), '9999');

    expect(screen.getByRole('status')).toHaveTextContent('ບໍ່ພົບລາຍການ');
    expect(screen.queryAllByRole('option')).toHaveLength(0);
  });

  it('closes on Tab and Escape without changing the value', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SearchableSelect id="customer" label="ລູກຄ້າ" value="c1" options={options} onChange={onChange} searchPlaceholder={searchPlaceholder} />);

    const input = screen.getByRole('combobox', { name: 'ລູກຄ້າ' });
    input.focus();
    await user.keyboard('{ArrowDown}{Tab}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();

    input.focus();
    await user.keyboard('{ArrowDown}{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
    expect(input).toHaveFocus();
  });
});
