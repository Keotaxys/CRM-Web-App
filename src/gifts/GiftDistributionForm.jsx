import { useEffect, useMemo, useRef, useState } from 'react';
import { subscribeCustomers } from '../services/customersService';
import { recordGiftDistribution, subscribeActiveGiftItems, subscribeGiftCampaigns, subscribeGiftStocks } from '../services/giftService';
import GiftItemRows, { validateGiftItemRows } from './GiftItemRows';
import { giftCallableMessage } from './giftErrors';
import { laosTodayKey } from '../shared/dateTime';
import Button from '../components/ui/Button';
import GlassCard from '../components/ui/GlassCard';
import Input from '../components/ui/Input';
import SearchableSelect from '../components/ui/SearchableSelect';
import Textarea from '../components/ui/Textarea';

const emptyRow = (key) => ({ key, giftId: '', packs: '0', looseUnits: '0' });
const makeUuid = () => globalThis.crypto.randomUUID();
const actor = (identity) => ({ uid: identity?.user?.uid ?? identity?.uid, role: identity?.claims?.role ?? identity?.role, branchId: identity?.claims?.branchId ?? identity?.branchId, accountStatus: identity?.claims?.accountStatus ?? identity?.accountStatus });
const compareGifts = (left, right) => Number(left.sortOrder ?? 0) - Number(right.sortOrder ?? 0) || String(left.name ?? '').localeCompare(String(right.name ?? '')) || String(left.id).localeCompare(String(right.id));

function scopedCustomerIdentity(identity, branchId) {
  const current = actor(identity);
  if (current.role !== 'admin') return identity;
  return { ...identity, user: identity?.user ?? { uid: current.uid }, claims: { ...(identity?.claims ?? {}), role: 'branch_manager', branchId, accountStatus: current.accountStatus } };
}


export default function GiftDistributionForm({ identity, effectiveBranchId }) {
  const current = actor(identity);
  const branchId = effectiveBranchId ?? current.branchId;
  const [gifts, setGifts] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [recipientType, setRecipientType] = useState('');
  const [recipientId, setRecipientId] = useState('');
  const [rows, setRows] = useState(() => [emptyRow(makeUuid())]);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
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

  const stocksByGift = useMemo(() => Object.fromEntries(stocks.map((stock) => [stock.giftId, stock])), [stocks]);
  const recipientOptions = (recipientType === 'customer' ? customers : campaigns).map((item) => ({
    value: item.id, label: item.name, searchText: item.name,
  }));
  const reset = () => { setRows([emptyRow(makeUuid())]); setRecipientType(''); setRecipientId(''); setNote(''); setError(''); };

  const submit = async (event) => {
    event.preventDefault();
    if (submittingRef.current || !branchId) return;
    if (!['customer', 'campaign'].includes(recipientType) || !recipientId) { setError('ກະລຸນາເລືອກ ລູກຄ້າ ຫຼື Campaign ຢ່າງໃດໜຶ່ງ'); return; }
    const result = validateGiftItemRows(rows, gifts);
    if (result.error) { setError(result.error); return; }
    submittingRef.current = true; setBusy(true); setError('');
    try {
      await recordGiftDistribution({ distributionId: operationIdRef.current, expectedDateKey: laosTodayKey(), branchId, recipientType, customerId: recipientType === 'customer' ? recipientId : null, campaignId: recipientType === 'campaign' ? recipientId : null, items: result.items, note });
      operationIdRef.current = makeUuid(); reset();
    } catch (failure) { setError(giftCallableMessage(failure)); }
    finally { submittingRef.current = false; setBusy(false); }
  };

  return <GlassCard as="section" padded className="gift-distribution-form"><h2>ແຈກເຄື່ອງ</h2><form className="form-stack gift-form" onSubmit={submit}>
    <label>ປະເພດຜູ້ຮັບ<select aria-label="ປະເພດຜູ້ຮັບ" value={recipientType} disabled={busy} onChange={(event) => { setRecipientType(event.target.value); setRecipientId(''); }}><option value="">ເລືອກ</option><option value="customer">ລູກຄ້າ</option><option value="campaign">Campaign</option></select></label>
    {recipientType ? <SearchableSelect id="gift-recipient" label="ຜູ້ຮັບ" value={recipientId} options={recipientOptions} placeholder="ເລືອກຜູ້ຮັບ" disabled={busy} onChange={setRecipientId} /> : null}
    <GiftItemRows catalog={gifts} rows={rows} onChange={setRows} onValidationIssue={setError} showStock stocks={stocksByGift} maxRows={25} disabled={busy} />
    <Textarea id="gift-distribution-note" label="ໝາຍເຫດ" value={note} disabled={busy} onChange={(event) => setNote(event.target.value)} />
    {error ? <div className="error-banner" role="alert">{error}</div> : null}
    <Button type="submit" busy={busy} disabled={!branchId}>ບັນທຶກ</Button>
  </form></GlassCard>;
}
