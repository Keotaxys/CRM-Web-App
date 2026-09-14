import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import GiftItemRows from './GiftItemRows';

describe('GiftItemRows', () => {
  it('limits rows to 25 and rejects fractional quantities while displaying stock', async () => {
    const user = userEvent.setup(); const onChange = vi.fn();
    render(<GiftItemRows catalog={[{ id: 'umbrella', name: 'Umbrella', unitsPerPack: 10, packLabel: 'pack', unitLabel: 'unit' }]} rows={[{ key: 1, giftId: 'umbrella', packs: '1', looseUnits: '0' }]} onChange={onChange} showStock stocks={{ umbrella: { currentUnits: 17 } }} maxRows={1} />);
    expect(screen.getByText('1 pack 7 unit')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ເພີ່ມເຄື່ອງແຈກ' })).toBeDisabled();
    await user.clear(screen.getByLabelText('ຈຳນວນຫໍ່'));
    await user.type(screen.getByLabelText('ຈຳນວນຫໍ່'), '1.5');
    expect(onChange.mock.calls.flat()).not.toContainEqual([{ key: 1, giftId: 'umbrella', packs: '1.5', looseUnits: '0' }]);
  });
});
