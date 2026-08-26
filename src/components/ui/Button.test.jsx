import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Button from './Button';

describe('Button', () => {
  it('uses a safe primary button default', () => {
    render(<Button variant="primary">ບັນທຶກ</Button>);

    const button = screen.getByRole('button', { name: 'ບັນທຶກ' });
    expect(button).toHaveAttribute('type', 'button');
    expect(button).toHaveClass('ui-button--primary');
  });

  it('exposes busy state while preventing repeated actions', () => {
    render(<Button busy>ກຳລັງບັນທຶກ</Button>);

    expect(screen.getByRole('button', { name: 'ກຳລັງບັນທຶກ' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'ກຳລັງບັນທຶກ' })).toHaveAttribute('aria-busy', 'true');
  });
});
