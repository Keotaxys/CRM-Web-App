import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Input from './Input';
import Textarea from './Textarea';

describe('form controls', () => {
  it('connects an input error to its label and accessible description', () => {
    render(<Input id="name" label="ຊື່" error="ຕ້ອງລະບຸ" value="" onChange={() => {}} />);

    const input = screen.getByLabelText('ຊື່');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('ຕ້ອງລະບຸ');
  });

  it('connects a textarea hint to its accessible description', () => {
    render(<Textarea id="note" label="ໝາຍເຫດ" hint="ບໍ່ບັງຄັບ" value="" onChange={() => {}} />);

    expect(screen.getByLabelText('ໝາຍເຫດ')).toHaveAccessibleDescription('ບໍ່ບັງຄັບ');
  });

  it('supports a Lao accessible name without rendering a visible utility label', () => {
    render(<Input id="search" ariaLabel="ຄົ້ນຫາລູກຄ້າ" placeholder="ຄົ້ນຫາ..." value="" onChange={() => {}} />);

    expect(screen.getByRole('textbox', { name: 'ຄົ້ນຫາລູກຄ້າ' })).toBeInTheDocument();
    expect(document.querySelector('label[for="search"]')).not.toBeInTheDocument();
  });
});
