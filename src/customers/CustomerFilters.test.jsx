import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CustomerFilters from './CustomerFilters';

describe('CustomerFilters labels', () => {
  it('uses a Lao accessible search name without showing the legacy English label', () => {
    const { container } = render(<CustomerFilters filters={{ search: '', status: 'ທັງໝົດ', priority: 'ທັງໝົດ' }} onChange={vi.fn()} />);

    expect(screen.getByRole('textbox', { name: 'ຄົ້ນຫາລູກຄ້າ' })).toBeInTheDocument();
    expect(screen.queryByText('Search customers')).not.toBeInTheDocument();
    expect(container.querySelector('.ui-button--ghost')).not.toBeInTheDocument();
    expect(screen.getAllByRole('button')[0]).toHaveClass('ui-button--neutral');
  });
});
