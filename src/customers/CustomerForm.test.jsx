import { readFileSync } from 'node:fs';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import CustomerForm from './CustomerForm';

const screensCss = readFileSync('src/styles/screens.css', 'utf8');

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
    expect(container.querySelector('form')).toHaveClass('ui-glass-card--padded');
  });

  it('shows branch selection only for an Admin creating a customer', () => {
    const { rerender } = render(<CustomerForm onSubmit={vi.fn()} />);
    expect(screen.queryByText('ສາຂາ')).not.toBeInTheDocument();
    rerender(<CustomerForm onSubmit={vi.fn()} admin />);
    expect(screen.getByRole('combobox', { name: 'ສາຂາ' })).toBeInTheDocument();
  });

  it('submits the exact selected status, priority, and branch values', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<CustomerForm onSubmit={onSubmit} admin />);

    const [branch, status, priority] = screen.getAllByRole('combobox');
    await user.click(branch);
    await user.click(screen.getByRole('option', { name: /020/ }));
    await user.click(status);
    await user.click(screen.getByRole('option', { name: 'ຕິດຕາມຕໍ່' }));
    await user.click(priority);
    await user.click(screen.getByRole('option', { name: 'VIP' }));
    await user.type(screen.getByRole('textbox', { name: 'ຊື່ລູກຄ້າ' }), 'Test Customer');
    await user.type(screen.getByRole('textbox', { name: 'ເບີໂທ' }), '02055551234');
    await user.click(screen.getByRole('button', { name: 'ບັນທຶກ' }));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ branchId: '020', status: 'ຕິດຕາມຕໍ່', priority: 'VIP' }), expect.any(Object));
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
    expect(screen.getByRole('link', { name: 'ເປີດແຜນທີ່' })).toHaveClass('ui-button--neutral');
    expect(screen.getByRole('link', { name: 'ເປີດແຜນທີ່' })).not.toHaveClass('ui-button--ghost');
    expect(screensCss).toMatch(/\.location-actions\s+\.ui-button[^}]*gap:\s*7px/s);
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
