import { useEffect, useMemo, useRef, useState } from 'react';
import { subscribeCustomers } from '../services/customersService';
import { recordGiftDistribution, subscribeActiveGiftItems, subscribeGiftCampaigns, subscribeGiftStocks } from '../services/giftService';
import { giftLineTotal, giftStockDisplay } from './giftModel';
import { giftCallableMessage } from './giftErrors';
import { laosTodayKey } from '../shared/dateTime';
import Button from '../components/ui/Button';
import GlassCard from '../components/ui/GlassCard';
import Input from '../components/ui/Input';
import Textarea from '../components/ui/Textarea';

const MAX_ROWS = 25;
const emptyRow = (key) => ({ key, giftId: '', packs: '0', looseUnits: '0' });
const makeUuid = () => globalThis.crypto.randomUUID();
const actor = (identity) => ({ uid: identity?.user?.uid ?? identity?.uid, role: identity?.claims?.role ?? identity?.role, branchId: identity?.claims?.branchId ?? identity?.branchId, accountStatus: identity?.claims?.accountStatus ?? identity?.accountStatus });
const compareGifts = (left, right) => Number(left.sortOrder ?? 0) - Number(right.sortOrder ?? 0) || String(left.name ?? '').localeCompare(String(right.name ?? '')) || String(left.id).localeCompare(String(right.id));

function scopedCustomerIdentity(identity, branchId) {
  const current = actor(identity);
  if (current.role !== 'admin') return identity;
  return { ...identity, user: identity?.user ?? { uid: current.uid }, claims: { ...(identity?.claims ?? {}), role: 'branch_manager', branchId, accountStatus: current.accountStatus } };
}

function isWholeNonnegative(value) { return /^\d*$/.test(value); }

export default function GiftDistributionForm({ identity, effectiveBranchId }) {
  const current = actor(identity);
  const branchId = effectiveBranchId ?? current.branchId;
  const [gifts, setGifts] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [recipientType, setRecipientType] = useState('');
  const [recipientId, setRecipientId] = useState('');
  const [rows, setRows] = useState(() => [emptyRow(1)]);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const nextRowRef = useRef(1);
  const operationIdRef = useRef(makeUuid());
  const submittingRef = useRef(false);

  useEffect(() => {
    if (!branchId) return undefined;
    let live = true;
    const stopItems = subscribeActiveGiftItems((next) => { if (live) setGifts([...next].sort(compareGifts)); }, () => live && setError(giftCallableMessage()));
    const stopStocks = subscribeGiftStocks(identity, { branchId }, (next) => { if (live) setStocks(next); }, () => live && setError(giftCallableMessage()));
    const stopCampaigns = subscribeGiftCampaigns(identity, { branchId, active: true }, (next) => { if (live) setCampaigns(next.filter((item) => item.active)); }, () => live && setError(giftCallableMessage()));
    const stopCustomers = subscribeCustomers(scopedCustomerIdentity(identity, branchId), (next) => { if (live) setCustomers(next.filter((item) => item.branchId === branchId && item.recordState === 'active')); }, () => live && setError(giftCallableMessage()));
    return () => { live = false; stopItems?.(); stopStocks?.(); stopCampaigns?.(); stopCustomers?.(); };
  }, [branchId, identity]);

  const giftsById = useMemo(() => Object.fromEntries(gifts.map((gift) => [gift.id, gift])), [gifts]);
  const stocksByGift = useMemo(() => Object.fromEntries(stocks.map((stock) => [stock.giftId, stock])), [stocks]);
  const recipientOptions = recipientType === 'customer' ? customers : campaigns;
  const updateRow = (key, change) => setRows((currentRows) => currentRows.map((row) => row.key === key ? { ...row, ...change } : row));
  const updateQuantity = (key, field, value) => { if (isWholeNonnegative(value)) updateRow(key, { [field]: value }); };
  const selectGift = (key, giftId) => {
    updateRow(key, { giftId, packs: giftId ? '1' : '0' });
    const duplicate = rows.some((row) => row.key !== key && row.giftId === giftId && giftId);
    setError(duplicate ? 'ລາຍການເຄື່ອງແຈກຊ້ຳ' : '');
  };
  const addRow = () => { if (rows.length >= MAX_ROWS) return; nextRowRef.current += 1; setRows((currentRows) => [...currentRows, emptyRow(nextRowRef.current)]); };
  const removeRow = (key) => setRows((currentRows) => currentRows.length === 1 ? [emptyRow(key)] : currentRows.filter((row) => row.key !== key));
  const reset = () => { nextRowRef.current += 1; setRows([emptyRow(nextRowRef.current)]); setRecipientType(''); setRecipientId(''); setNote(''); setError(''); };

  const submit = async (event) => {
    event.preventDefault();
    if (submittingRef.current || !branchId) return;
    if (!['customer', 'campaign'].includes(recipientType) || !recipientId) { setError('ກະລຸນາເລືອກ ລູກຄ້າ ຫຼື Campaign ຢ່າງໃດໜຶ່ງ'); return; }
    const seen = new Set();
    const items = [];
    for (const row of rows) {
      if (!row.giftId) continue;
      if (seen.has(row.giftId)) { setError('ລາຍການເຄື່ອງແຈກຊ້ຳ'); return; }
      seen.add(row.giftId);
      const packs = Number(row.packs); const looseUnits = Number(row.looseUnits);
      if (!Number.isSafeInteger(packs) || !Number.isSafeInteger(looseUnits) || packs < 0 || looseUnits < 0 || (!packs && !looseUnits)) { setError('ຈຳນວນຕ້ອງເປັນຈຳນວນເຕັມບວກ'); return; }
      items.push({ giftId: row.giftId, packs, looseUnits });
    }
    if (!items.length) { setError('ກະລຸນາເລືອກເຄື່ອງແຈກ'); return; }
    submittingRef.current = true; setBusy(true); setError('');
    try {
      await recordGiftDistribution({ distributionId: operationIdRef.current, expectedDateKey: laosTodayKey(), branchId, recipientType, customerId: recipientType === 'customer' ? recipientId : null, campaignId: recipientType === 'campaign' ? recipientId : null, items, note });
      operationIdRef.current = makeUuid(); reset();
    } catch (failure) { setError(giftCallableMessage(failure)); }
    finally { submittingRef.current = false; setBusy(false); }
  };

  return <GlassCard as="section" padded><h2>ແຈກເຄື່ອງ</h2><form className="form-stack" onSubmit={submit}>
    <label>ປະເພດຜູ້ຮັບ<select aria-label="ປະເພດຜູ້ຮັບ" value={recipientType} disabled={busy} onChange={(event) => { setRecipientType(event.target.value); setRecipientId(''); }}><option value="">ເລືອກ</option><option value="customer">ລູກຄ້າ</option><option value="campaign">Campaign</option></select></label>
    <label>ຜູ້ຮັບ<select aria-label="ຜູ້ຮັບ" value={recipientId} disabled={!recipientType || busy} onChange={(event) => setRecipientId(event.target.value)}><option value="">ເລືອກ</option>{recipientOptions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    {rows.map((row, index) => { const gift = giftsById[row.giftId]; const stock = stocksByGift[row.giftId]; return <div key={row.key} className="gift-distribution-row">
      <label>ເຄື່ອງແຈກ<select aria-label="ເຄື່ອງແຈກ" value={row.giftId} disabled={busy} onChange={(event) => selectGift(row.key, event.target.value)}><option value="">ເລືອກ</option>{gifts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <Input id={`gift-packs-${row.key}`} label="ຈຳນວນຫໍ່" type="number" min="0" step="1" inputMode="numeric" disabled={!gift || busy} value={row.packs} onChange={(event) => updateQuantity(row.key, 'packs', event.target.value)} />
      <Input id={`gift-units-${row.key}`} label="ຈຳນວນຊິ້ນ" type="number" min="0" step="1" inputMode="numeric" disabled={!gift || busy} value={row.looseUnits} onChange={(event) => updateQuantity(row.key, 'looseUnits', event.target.value)} />
      {gift && stock ? <small>{giftStockDisplay(stock.currentUnits, gift)}</small> : null}
      {gift ? <small>ລວມ: {giftLineTotal({ packs: row.packs, looseUnits: row.looseUnits }, gift)}</small> : null}
      {rows.length > 1 ? <Button variant="neutral" disabled={busy} aria-label={`ລຶບແຖວ ${index + 1}`} onClick={() => removeRow(row.key)}>×</Button> : null}
    </div>; })}
    <Button variant="secondary" disabled={busy || rows.length >= MAX_ROWS} onClick={addRow}>ເພີ່ມເຄື່ອງແຈກ</Button>
    <Textarea id="gift-distribution-note" label="ໝາຍເຫດ" value={note} disabled={busy} onChange={(event) => setNote(event.target.value)} />
    {error ? <div className="error-banner" role="alert">{error}</div> : null}
    <Button type="submit" busy={busy} disabled={!branchId}>ບັນທຶກ</Button>
  </form></GlassCard>;
}
