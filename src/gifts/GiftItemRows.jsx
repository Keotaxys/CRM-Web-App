import { useMemo, useRef } from 'react';
import { giftLineTotal, giftStockDisplay } from './giftModel';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

const emptyRow = (key) => ({ key, giftId: '', packs: '0', looseUnits: '0' });

// Shared with submit handlers so every pack/unit workflow has one validation rule.
// eslint-disable-next-line react-refresh/only-export-components
export function validateGiftItemRows(rows) {
  if (!Array.isArray(rows) || rows.length < 1 || rows.length > 25) return { error: 'Gift items must contain 1 to 25 rows' };
  const seen = new Set(); const items = [];
  for (const row of rows) {
    if (!row.giftId) continue;
    if (seen.has(row.giftId)) return { error: 'ລາຍການເຄື່ອງແຈກຊ້ຳ' };
    seen.add(row.giftId);
    const packs = Number(row.packs); const looseUnits = Number(row.looseUnits);
    if (!/^\d+$/.test(row.packs) || !/^\d+$/.test(row.looseUnits)
      || !Number.isSafeInteger(packs) || !Number.isSafeInteger(looseUnits)
      || (!packs && !looseUnits)) return { error: 'ຈຳນວນຕ້ອງເປັນຈຳນວນເຕັມບວກ' };
    items.push({ giftId: row.giftId, packs, looseUnits });
  }
  return items.length ? { items } : { error: 'ກະລຸນາເລືອກເຄື່ອງແຈກ' };
}

function validQuantity(value) { return /^\d*$/.test(value); }
function visibleTotal(row, gift) {
  try { return giftLineTotal(row, gift); } catch { return null; }
}

export default function GiftItemRows({ catalog = [], rows, onChange, showStock = false, stocks = {}, maxRows = 25, disabled = false, onValidationIssue }) {
  const nextKey = useRef(Math.max(0, ...rows.map((row) => Number(row.key) || 0)));
  const byId = useMemo(() => Object.fromEntries(catalog.map((item) => [item.id, item])), [catalog]);
  const duplicates = new Set(rows.filter((row) => row.giftId).map((row) => row.giftId).filter((id, index, ids) => ids.indexOf(id) !== index));
  const update = (key, change) => onChange(rows.map((row) => row.key === key ? { ...row, ...change } : row));
  const select = (key, giftId) => {
    const next = rows.map((row) => row.key === key ? { ...row, giftId, packs: giftId ? '1' : '0' } : row);
    onChange(next);
    onValidationIssue?.(giftId && next.some((row) => row.key !== key && row.giftId === giftId) ? 'ລາຍການເຄື່ອງແຈກຊ້ຳ' : '');
  };
  const add = () => { if (rows.length >= maxRows) return; nextKey.current += 1; onChange([...rows, emptyRow(nextKey.current)]); };
  const remove = (key) => onChange(rows.length === 1 ? [emptyRow(key)] : rows.filter((row) => row.key !== key));
  return <div className="gift-item-rows">
    {rows.map((row, index) => {
      const gift = byId[row.giftId]; const total = gift ? visibleTotal(row, gift) : null; const stock = stocks[row.giftId];
      return <div key={row.key} className="gift-distribution-row">
        <label>ເຄື່ອງແຈກ<select aria-label="ເຄື່ອງແຈກ" value={row.giftId} disabled={disabled} onChange={(event) => select(row.key, event.target.value)}><option value="">ເລືອກ</option>{catalog.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <Input id={`gift-packs-${row.key}`} label="ຈຳນວນຫໍ່" type="number" min="0" step="1" inputMode="numeric" disabled={!gift || disabled} value={row.packs} onChange={(event) => validQuantity(event.target.value) && update(row.key, { packs: event.target.value })} />
        <Input id={`gift-units-${row.key}`} label="ຈຳນວນຊິ້ນ" type="number" min="0" step="1" inputMode="numeric" disabled={!gift || disabled} value={row.looseUnits} onChange={(event) => validQuantity(event.target.value) && update(row.key, { looseUnits: event.target.value })} />
        {showStock && gift && stock ? <small>{giftStockDisplay(stock.currentUnits, gift)}</small> : null}
        {gift ? <small>ລວມ: {total ?? '—'}</small> : null}
        {gift && total === null ? <small className="error-banner">ຈຳນວນຕ້ອງເປັນຈຳນວນເຕັມ</small> : null}
        {duplicates.has(row.giftId) ? <small className="error-banner">ລາຍການເຄື່ອງແຈກຊ້ຳ</small> : null}
        {rows.length > 1 ? <Button variant="neutral" disabled={disabled} aria-label={`ລຶບແຖວ ${index + 1}`} onClick={() => remove(row.key)}>×</Button> : null}
      </div>;
    })}
    <Button variant="secondary" disabled={disabled || rows.length >= maxRows} onClick={add}>ເພີ່ມເຄື່ອງແຈກ</Button>
  </div>;
}
