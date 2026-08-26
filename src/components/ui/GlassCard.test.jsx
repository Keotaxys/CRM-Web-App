import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import GlassCard from './GlassCard';

describe('GlassCard', () => {
  it('preserves the requested semantic element and visual variant', () => {
    render(<GlassCard as="section" variant="raised" aria-label="ຂໍ້ມູນລູກຄ້າ">ເນື້ອຫາ</GlassCard>);

    const card = screen.getByRole('region', { name: 'ຂໍ້ມູນລູກຄ້າ' });
    expect(card).toHaveClass('ui-glass-card', 'ui-glass-card--raised');
    expect(card).toHaveTextContent('ເນື້ອຫາ');
  });
});
