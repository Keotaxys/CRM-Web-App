import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

const authMocks = vi.hoisted(() => ({
  login: vi.fn(),
  loginWithGoogle: vi.fn().mockRejectedValue(new Error('popup blocked')),
  register: vi.fn(),
}));

vi.mock('../auth/useAuth', () => ({
  useAuth: () => ({
    ...authMocks,
    state: 'anonymous',
    loading: false,
  }),
}));

import Login from './Login';

describe('Login feedback', () => {
  it('announces Google sign-in failure with the Orange error presentation', async () => {
    const user = userEvent.setup();
    const { container } = render(<MemoryRouter><Login /></MemoryRouter>);

    expect(screen.getByRole('button', { name: 'ສ້າງບັນຊີໃໝ່' })).toHaveClass('ui-button--neutral');
    expect(container.querySelector('.ui-button--ghost')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Google Sign-In' }));

    const feedback = await screen.findByRole('alert');
    expect(feedback).toHaveTextContent('Google Sign-In ບໍ່ສຳເລັດ');
    expect(feedback).toHaveClass('error-banner');
  });
});
