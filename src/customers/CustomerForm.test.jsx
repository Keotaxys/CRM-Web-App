import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import CustomerForm from './CustomerForm';

describe('CustomerForm image and branch policy', () => {
  it('uses two accessible camera controls while preserving the two CRM file slots', async () => {
    const user = userEvent.setup();
    const { container } = render(<CustomerForm onSubmit={vi.fn()} />);
    const inputs = container.querySelectorAll('input[type="file"]');

    expect(inputs).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'ເລືອກຮູບລູກຄ້າ' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ເລືອກຮູບຮ້ານ ຫຼື ສະຖານທີ່' })).toBeInTheDocument();

    await user.upload(inputs[0], new File(['photo'], 'customer.webp', { type: 'image/webp' }));
    expect(screen.getByText('customer.webp')).toBeInTheDocument();
  });

  it('shows branch selection only for an Admin creating a customer', () => {
    const { rerender } = render(<CustomerForm onSubmit={vi.fn()} />);
    expect(screen.queryByText('ສາຂາ')).not.toBeInTheDocument();
    rerender(<CustomerForm onSubmit={vi.fn()} admin />);
    expect(screen.getByText('ສາຂາ')).toBeInTheDocument();
  });
});

describe('CustomerForm location actions', () => {
  it('fills a Google Maps URL from the current browser location and opens that location', async () => {
    const user = userEvent.setup();
    const locationProvider = {
      getCurrentPosition: vi.fn((onSuccess) => onSuccess({
        coords: { latitude: 17.975706, longitude: 102.633104 },
      })),
    };
    render(<CustomerForm onSubmit={vi.fn()} locationProvider={locationProvider} />);

    await user.click(screen.getByRole('button', { name: 'ໃຊ້ຕຳແໜ່ງປັດຈຸບັນ' }));

    const expectedUrl = 'https://www.google.com/maps?q=17.975706,102.633104';
    expect(screen.getByLabelText('ລິ້ງແຜນທີ່ / ພິກັດ GPS')).toHaveValue(expectedUrl);
    expect(screen.getByRole('link', { name: 'ເປີດແຜນທີ່' })).toHaveAttribute('href', expectedUrl);
    expect(screen.getByRole('status')).toHaveTextContent('ດຶງຕຳແໜ່ງປັດຈຸບັນແລ້ວ');
  });

  it('explains in Lao when location permission is denied', async () => {
    const user = userEvent.setup();
    const locationProvider = {
      getCurrentPosition: vi.fn((_, onError) => onError({ code: 1 })),
    };
    render(<CustomerForm onSubmit={vi.fn()} locationProvider={locationProvider} />);

    await user.click(screen.getByRole('button', { name: 'ໃຊ້ຕຳແໜ່ງປັດຈຸບັນ' }));

    expect(screen.getByRole('alert')).toHaveTextContent('ກະລຸນາອະນຸຍາດໃຫ້ເຂົ້າເຖິງຕຳແໜ່ງ');
  });

  it('explains in Lao when browser geolocation is unavailable', async () => {
    const user = userEvent.setup();
    render(<CustomerForm onSubmit={vi.fn()} locationProvider={null} />);

    await user.click(screen.getByRole('button', { name: 'ໃຊ້ຕຳແໜ່ງປັດຈຸບັນ' }));

    expect(screen.getByRole('alert')).toHaveTextContent('ອຸປະກອນນີ້ບໍ່ຮອງຮັບການດຶງຕຳແໜ່ງ');
  });

  it('handles a browser location failure without breaking the form', async () => {
    const user = userEvent.setup();
    const locationProvider = {
      getCurrentPosition: vi.fn(() => { throw new Error('blocked by browser'); }),
    };
    render(<CustomerForm onSubmit={vi.fn()} locationProvider={locationProvider} />);

    await user.click(screen.getByRole('button', { name: 'ໃຊ້ຕຳແໜ່ງປັດຈຸບັນ' }));

    expect(screen.getByRole('alert')).toHaveTextContent('ບໍ່ສາມາດຫາຕຳແໜ່ງປັດຈຸບັນໄດ້');
    expect(screen.getByRole('button', { name: 'ໃຊ້ຕຳແໜ່ງປັດຈຸບັນ' })).toBeEnabled();
  });
});
