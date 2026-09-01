import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import CameraUpload from './CameraUpload';

describe('CameraUpload', () => {
  it('opens the image picker from the camera action and preserves accepted image types', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <CameraUpload
        label="ຮູບລູກຄ້າ"
        actionLabel="ເລືອກຮູບລູກຄ້າ"
        changeActionLabel="ປ່ຽນຮູບລູກຄ້າ"
        file={null}
        onChange={vi.fn()}
      />,
    );
    const input = container.querySelector('input[type="file"]');
    const clickSpy = vi.spyOn(input, 'click');

    expect(input).toHaveAttribute('accept', 'image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif');
    await user.click(screen.getByRole('button', { name: 'ເລືອກຮູບລູກຄ້າ' }));
    expect(clickSpy).toHaveBeenCalledOnce();
  });

  it('announces the selected filename and changes the accessible action name', () => {
    const file = new File(['photo'], 'customer.webp', { type: 'image/webp' });
    render(
      <CameraUpload
        label="ຮູບລູກຄ້າ"
        actionLabel="ເລືອກຮູບລູກຄ້າ"
        changeActionLabel="ປ່ຽນຮູບລູກຄ້າ"
        file={file}
        onChange={vi.fn()}
      />,
    );

    const button = screen.getByRole('button', { name: 'ປ່ຽນຮູບລູກຄ້າ' });
    const filename = screen.getByText('customer.webp');
    expect(filename).toHaveAttribute('aria-live', 'polite');
    expect(button).toHaveAttribute('aria-describedby', filename.id);
  });
});
