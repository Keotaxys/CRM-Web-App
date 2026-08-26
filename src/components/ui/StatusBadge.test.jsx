import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import StatusBadge from './StatusBadge';

describe('StatusBadge', () => {
  it('keeps stored values in data attributes while showing the display label', () => {
    const ref = createRef();
    render(<StatusBadge ref={ref} kind="activity" value="in_progress" label="ກຳລັງດຳເນີນ" />);

    const badge = screen.getByText('ກຳລັງດຳເນີນ');
    expect(ref.current).toBe(badge);
    expect(badge).toHaveAttribute('data-kind', 'activity');
    expect(badge).toHaveAttribute('data-status', 'in_progress');
  });
});
