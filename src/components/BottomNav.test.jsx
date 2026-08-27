import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import BottomNav from './BottomNav';

describe('BottomNav', () => {
  it('keeps the complete five-destination navigation set and marks the current page', () => {
    render(<MemoryRouter initialEntries={['/activities']}><BottomNav /></MemoryRouter>);

    const destinations = [
      ['ໜ້າຫຼັກ', '/'],
      ['ລູກຄ້າ', '/customers'],
      ['ກິດຈະກຳ', '/activities'],
      ['ປະຕິທິນ', '/calendar'],
      ['ເພີ່ມເຕີມ', '/profile'],
    ];
    const navigation = screen.getByRole('navigation', { name: 'Main navigation' });

    expect(screen.getAllByRole('link')).toHaveLength(destinations.length);
    destinations.forEach(([label, href]) => {
      const link = screen.getByRole('link', { name: label });
      expect(link).toHaveAttribute('href', href);
      expect(link).toHaveClass('bottom-nav-item');
    });
    expect(screen.getByRole('link', { name: 'ກິດຈະກຳ' })).toHaveAttribute('aria-current', 'page');
    expect(navigation).toHaveClass('bottom-nav');
  });
});
