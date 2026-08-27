import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AppShell from './AppShell';

vi.mock('react-router-dom', () => ({
  Outlet: () => <main data-testid="route-content">Route content</main>,
}));
vi.mock('./BottomNav', () => ({ default: () => <nav data-testid="bottom-nav" /> }));
vi.mock('./QuickCreate', () => ({ default: () => <button data-testid="quick-create">Create</button> }));

describe('AppShell', () => {
  it('keeps routed content and global controls inside the mobile shell composition', () => {
    const { container } = render(<AppShell />);

    expect(container.firstChild).toHaveClass('app-shell', 'app-shell--mobile-nav');
    expect(screen.getByTestId('route-content').parentElement).toHaveClass('app-shell__content');
    expect(screen.getByTestId('quick-create')).toBeInTheDocument();
    expect(screen.getByTestId('bottom-nav')).toBeInTheDocument();
  });
});
