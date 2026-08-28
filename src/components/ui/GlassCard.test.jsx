import { readFileSync } from 'node:fs';
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

  it('adds padding only when the shared padded surface is requested', () => {
    const { rerender } = render(<GlassCard aria-label="ຟອມ" padded>ເນື້ອຫາ</GlassCard>);

    expect(screen.getByLabelText('ຟອມ')).toHaveClass('ui-glass-card--padded');
    expect(readFileSync('src/styles/components.css', 'utf8')).toMatch(/\.ui-glass-card--padded\s*\{[^}]*padding:\s*clamp\(/s);

    rerender(<GlassCard aria-label="ຮູບພາບ">ເນື້ອຫາ</GlassCard>);
    expect(screen.getByLabelText('ຮູບພາບ')).not.toHaveClass('ui-glass-card--padded');
  });
});
