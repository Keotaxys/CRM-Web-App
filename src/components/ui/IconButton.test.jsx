import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import IconButton from './IconButton';

describe('IconButton', () => {
  it('renders a labeled link when a destination exists', () => {
    render(<IconButton label="ໂທຫາ" href="tel:+8562012345678">☎</IconButton>);

    expect(screen.getByRole('link', { name: 'ໂທຫາ' })).toHaveAttribute('href', 'tel:+8562012345678');
  });

  it('renders a safe labeled button when no destination exists', () => {
    render(<IconButton label="ປິດ" tone="teal" type="submit">×</IconButton>);

    const button = screen.getByRole('button', { name: 'ປິດ' });
    expect(button).toHaveAttribute('type', 'button');
    expect(button).toHaveClass('ui-icon-button--teal');
  });
});
