import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const serviceMocks = vi.hoisted(() => ({
  deleteManagedImage: vi.fn(),
  updatePersonalProfile: vi.fn().mockResolvedValue(undefined),
  uploadManagedImage: vi.fn().mockResolvedValue({ path: 'profiles/u1/avatar' }),
}));

vi.mock('../components/Navbar', () => ({ default: () => null }));
vi.mock('../components/ManagedImage', () => ({ default: () => <div>avatar</div> }));
vi.mock('../auth/useAuth', () => ({
  useAuth: () => ({
    user: { uid: 'u1' },
    claims: { role: 'staff', branchId: '010' },
    profile: { name: 'ສົມພອນ', phone: '020' },
    refreshProfile: vi.fn().mockResolvedValue(undefined),
  }),
}));
vi.mock('../services/imageService', () => ({
  deleteManagedImage: serviceMocks.deleteManagedImage,
  uploadManagedImage: serviceMocks.uploadManagedImage,
}));
vi.mock('../services/profileService', () => ({
  updatePersonalProfile: serviceMocks.updatePersonalProfile,
}));

import Profile from './Profile';

describe('Profile photo control', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    serviceMocks.updatePersonalProfile.mockResolvedValue(undefined);
  });

  it('uses an accessible camera control and preserves the selected file for upload', async () => {
    const user = userEvent.setup();
    const { container } = render(<Profile />);
    const file = new File(['avatar'], 'profile.png', { type: 'image/png' });

    expect(screen.getByRole('button', { name: 'ເລືອກຮູບໂປຣໄຟລ໌' })).toBeInTheDocument();
    await user.upload(container.querySelector('input[type="file"]'), file);
    expect(screen.getByText('profile.png')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'ບັນທຶກ' }));
    expect(serviceMocks.uploadManagedImage).toHaveBeenCalledWith('profiles/u1/avatar', file);
    expect(container.querySelector('section')).toHaveClass('ui-glass-card--padded');
  });

  it('announces a successful save with the teal status presentation', async () => {
    const user = userEvent.setup();
    render(<Profile />);

    await user.click(screen.getByRole('button', { name: 'ບັນທຶກ' }));

    const feedback = await screen.findByRole('status');
    expect(feedback).toHaveTextContent('ບັນທຶກໂປຣໄຟລ໌ແລ້ວ');
    expect(feedback).toHaveClass('status-message');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('announces a failed save with the Orange error presentation', async () => {
    const user = userEvent.setup();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    serviceMocks.updatePersonalProfile.mockRejectedValueOnce(new Error('save failed'));
    render(<Profile />);

    await user.click(screen.getByRole('button', { name: 'ບັນທຶກ' }));

    const feedback = await screen.findByRole('alert');
    expect(feedback).toHaveTextContent('ບັນທຶກບໍ່ສຳເລັດ');
    expect(feedback).toHaveClass('error-banner');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    consoleError.mockRestore();
  });

  it('offers the gift management destination from the More profile page', () => {
    render(<Profile />);
    expect(screen.getByRole('link', { name: 'ເຄື່ອງແຈກ' })).toHaveAttribute('href', '/gifts');
  });
});
