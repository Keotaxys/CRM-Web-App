import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import GiftCatalogAdmin from './GiftCatalogAdmin';

const service = vi.hoisted(() => ({ subscribeAllGiftItems: vi.fn(), createGiftItem: vi.fn(), updateGiftItem: vi.fn() }));
vi.mock('../services/giftService', () => service);
const admin = { uid: 'admin-1', role: 'admin', accountStatus: 'approved' };

describe('GiftCatalogAdmin', () => {
  beforeEach(() => { vi.clearAllMocks(); service.subscribeAllGiftItems.mockImplementation((_identity, onData) => { onData([{ id: 'umbrella', name: 'Umbrella', active: false, unitLabel: 'unit', packLabel: 'pack', unitsPerPack: 10, sortOrder: 1 }]); return vi.fn(); }); });

  it('shows catalog controls to Admin with editable catalog fields and no delete action', () => {
    render(<GiftCatalogAdmin identity={admin} />);
    ['ຊື່ລາຍການ', 'ຫົວໜ່ວຍ', 'ຫົວໜ່ວຍຫໍ່', 'ຈຳນວນຊິ້ນຕໍ່ຫໍ່', 'ລຳດັບສະແດງ', 'ໃຊ້ງານ'].forEach((label) => expect(screen.getByLabelText(label)).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
  });

  it('does not expose catalog controls outside an Admin page', () => {
    render(<GiftCatalogAdmin identity={{ uid: 'staff-1', role: 'staff', branchId: '010', accountStatus: 'approved' }} />);
    expect(screen.queryByLabelText('ຊື່ລາຍການ')).not.toBeInTheDocument();
    expect(service.subscribeAllGiftItems).not.toHaveBeenCalled();
  });
});
