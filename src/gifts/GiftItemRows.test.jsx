import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import GiftItemRows, { validateGiftItemRows } from './GiftItemRows';

describe('GiftItemRows', () => {
  it('keeps simultaneous editor control IDs and label associations unique', () => {
    const props = { catalog: [{ id: 'umbrella', name: 'Umbrella', unitsPerPack: 10 }],
      rows: [{ key: 1, giftId: 'umbrella', packs: '1', looseUnits: '0' }], onChange: () => {} };
    const { container } = render(<><GiftItemRows {...props} /><GiftItemRows {...props} /></>);
    const controls = [...container.querySelectorAll('input[id],button[id]')];
    expect(new Set(controls.map((control) => control.id)).size).toBe(controls.length);
    for (const label of container.querySelectorAll('label[for]')) {
      expect(label.control?.closest('.gift-distribution-row')).toBe(label.closest('.gift-distribution-row'));
    }
    expect(screen.getAllByRole('combobox', { name: 'ເຄື່ອງແຈກ' })).toHaveLength(2);
  });
  it('uses the shared custom selector for gift choices', () => {
    render(<GiftItemRows catalog={[{ id: 'umbrella', name: 'Umbrella', unitsPerPack: 10 }]} rows={[{ key: 1, giftId: '', packs: '0', looseUnits: '0' }]} onChange={() => {}} />);

    expect(screen.getByRole('combobox', { name: 'ເຄື່ອງແຈກ' }).tagName).toBe('BUTTON');
  });

  it('limits rows to 25 and rejects fractional quantities while displaying stock', async () => {
    const user = userEvent.setup(); const onChange = vi.fn();
    render(<GiftItemRows catalog={[{ id: 'umbrella', name: 'Umbrella', unitsPerPack: 10, packLabel: 'pack', unitLabel: 'unit' }]} rows={[{ key: 1, giftId: 'umbrella', packs: '1', looseUnits: '0' }]} onChange={onChange} showStock stocks={{ umbrella: { currentUnits: 17 } }} maxRows={1} />);
    expect(screen.getByText('1 pack 7 unit')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ເພີ່ມເຄື່ອງແຈກ' })).toBeDisabled();
    await user.clear(screen.getByLabelText('ຈຳນວນຫໍ່'));
    await user.type(screen.getByLabelText('ຈຳນວນຫໍ່'), '1.5');
    expect(onChange.mock.calls.flat()).not.toContainEqual([{ key: 1, giftId: 'umbrella', packs: '1.5', looseUnits: '0' }]);
  });

  it('rejects duplicate, zero, and overflow totals before a shared-row workflow submits', () => {
    const catalog = [
      { id: 'a', name: 'A', unitsPerPack: 5000000000000000 },
      { id: 'b', name: 'B', unitsPerPack: 5000000000000000 },
    ];
    expect(validateGiftItemRows([{ key: 1, giftId: 'a', packs: '1', looseUnits: '0' }, { key: 2, giftId: 'b', packs: '1', looseUnits: '0' }], catalog)).toHaveProperty('error');
    expect(validateGiftItemRows([{ key: 1, giftId: 'a', packs: '0', looseUnits: '0' }], catalog)).toHaveProperty('error');
    expect(validateGiftItemRows([{ key: 1, giftId: 'a', packs: '1', looseUnits: '0' }, { key: 2, giftId: 'a', packs: '1', looseUnits: '0' }], catalog)).toHaveProperty('error');
  });

  it('accepts exactly 25 positive rows when their total remains safe', () => {
    const catalog = Array.from({ length: 25 }, (_, index) => ({ id: `gift-${index}`, name: `Gift ${index}`, unitsPerPack: 1 }));
    const rows = catalog.map((gift, index) => ({ key: index + 1, giftId: gift.id, packs: '1', looseUnits: '0' }));
    expect(validateGiftItemRows(rows, catalog)).toMatchObject({ items: expect.any(Array) });
  });
});
