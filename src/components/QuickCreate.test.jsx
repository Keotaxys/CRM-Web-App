import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import QuickCreate from './QuickCreate';

function LocationProbe() {
  return <output aria-label="current-path">{useLocation().pathname}</output>;
}

function renderQuickCreate() {
  return render(<MemoryRouter initialEntries={['/']}><QuickCreate /><LocationProbe /></MemoryRouter>);
}

describe('QuickCreate', () => {
  it('uses a Lao accessible name for the floating create action', () => {
    renderQuickCreate();
    expect(screen.getByRole('button', { name: 'ສ້າງລາຍການໃໝ່' })).toBeInTheDocument();
  });

  it.each([
    ['ລູກຄ້າ', '/customers/new'],
    ['ນັດໝາຍ', '/activities/new/appointment'],
    ['ກິດຈະກຳ', '/activities/new/event'],
    ['ນັດພົບລູກຄ້າ', '/activities/new/customer_visit'],
  ])('closes before navigating from %s', async (choice, expectedPath) => {
    const user = userEvent.setup();
    const { container } = renderQuickCreate();
    await user.click(container.querySelector('.quick-create'));

    await user.click(screen.getByRole('button', { name: choice }));

    expect(screen.queryByRole('heading', { name: 'ສ້າງໃໝ່' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('current-path')).toHaveTextContent(expectedPath);
  });

  it('keeps the explicit close action', async () => {
    const user = userEvent.setup();
    const { container } = renderQuickCreate();
    await user.click(container.querySelector('.quick-create'));
    await user.click(screen.getByRole('button', { name: 'ປິດ' }));
    expect(screen.queryByRole('heading', { name: 'ສ້າງໃໝ່' })).not.toBeInTheDocument();
  });

  it('opens an accessible dialog and restores focus after Escape', async () => {
    const user = userEvent.setup();
    renderQuickCreate();
    const launcher = screen.getByRole('button', { name: 'ສ້າງລາຍການໃໝ່' });

    await user.click(launcher);
    expect(screen.getByRole('dialog', { name: 'ສ້າງໃໝ່' })).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(launcher).toHaveFocus();
  });
});
