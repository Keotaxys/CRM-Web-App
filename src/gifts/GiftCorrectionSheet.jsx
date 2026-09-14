import { useMemo, useRef, useState } from 'react';
import { amendGiftDistribution, cancelGiftDistribution } from '../services/giftService';
import { giftCallableMessage } from './giftErrors';
import { giftLineTotal } from './giftModel';
import Button from '../components/ui/Button';
import ModalSheet from '../components/ui/ModalSheet';
import Textarea from '../components/ui/Textarea';

const makeUuid = () => globalThis.crypto.randomUUID();

export default function GiftCorrectionSheet({ distribution, gifts = [], onClose, onSuccess }) {
  const giftMap = useMemo(() => Object.fromEntries(gifts.map((gift) => [gift.id, gift])), [gifts]);
  const [mode, setMode] = useState('amend');
  const [rows, setRows] = useState(() => (distribution.items ?? []).map((item) => ({ ...item, packs: String(item.packs), looseUnits: String(item.looseUnits) })));
  const [reason, setReason] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const mutationIdRef = useRef(makeUuid()); const submittingRef = useRef(false);
  const oldTotal = Number(distribution.totalUnits ?? (distribution.items ?? []).reduce((total, item) => total + Number(item.totalUnits ?? 0), 0));
  const newTotal = rows.reduce((total, item) => { try { return total + giftLineTotal({ packs: item.packs, looseUnits: item.looseUnits }, giftMap[item.giftId]); } catch { return total; } }, 0);
  const setAction = (next) => { if (next !== mode) { setMode(next); mutationIdRef.current = makeUuid(); setError(''); } };
  const update = (giftId, field, value) => { if (/^\d*$/.test(value)) setRows((current) => current.map((item) => item.giftId === giftId ? { ...item, [field]: value } : item)); };
  const submit = async (event) => {
    event.preventDefault(); if (submittingRef.current) return;
    const cleanReason = reason.trim(); if (!cleanReason) { setError('ກະລຸນາລະບຸເຫດຜົນການແກ້ໄຂ'); return; }
    const items = rows.map((item) => ({ giftId: item.giftId, packs: Number(item.packs), looseUnits: Number(item.looseUnits) }));
    if (mode === 'amend' && (!items.length || items.some((item) => !Number.isSafeInteger(item.packs) || !Number.isSafeInteger(item.looseUnits) || item.packs < 0 || item.looseUnits < 0 || (!item.packs && !item.looseUnits)))) { setError('ຈຳນວນຕ້ອງເປັນຈຳນວນເຕັມບວກ'); return; }
    submittingRef.current = true; setBusy(true); setError('');
    try {
      const values = { distributionId: distribution.id, mutationId: mutationIdRef.current, expectedVersion: distribution.version, reason: cleanReason, branchId: distribution.branchId };
      if (mode === 'cancel') await cancelGiftDistribution(values);
      else await amendGiftDistribution({ ...values, recipientType: distribution.recipientType, customerId: distribution.customerId ?? null, campaignId: distribution.campaignId ?? null, items, note: distribution.note ?? '' });
      mutationIdRef.current = makeUuid(); onSuccess?.(); onClose?.();
    } catch (failure) { setError(giftCallableMessage(failure)); }
    finally { submittingRef.current = false; setBusy(false); }
  };
  const close = () => { mutationIdRef.current = null; onClose?.(); };
  return <ModalSheet open onClose={close} title="ແກ້ໄຂການແຈກເຄື່ອງ" description={`${distribution.branchId} · ${distribution.id}`} mobileSheet footer={<><Button variant="neutral" onClick={close}>ຍົກເລີກ</Button><Button type="submit" form="gift-correction-form" busy={busy}>{mode === 'cancel' ? 'ຢືນຢັນການຍົກເລີກ' : 'ຢືນຢັນການແກ້ໄຂ'}</Button></>}>
    <form id="gift-correction-form" className="form-stack" onSubmit={submit}>
      <div className="chip-row"><Button variant="neutral" aria-pressed={mode === 'amend'} onClick={() => setAction('amend')}>ແກ້ໄຂລາຍການ</Button><Button variant="neutral" aria-pressed={mode === 'cancel'} onClick={() => setAction('cancel')}>ຍົກເລີກລາຍການ</Button></div>
      <p>ຈຳນວນເກົ່າ: {oldTotal} · ຈຳນວນໃໝ່: {mode === 'cancel' ? 0 : newTotal}</p>
      {mode === 'amend' ? rows.map((item) => <div key={item.giftId}><strong>{giftMap[item.giftId]?.name ?? item.giftId}</strong><label>ຈຳນວນຫໍ່<input aria-label={`ຈຳນວນຫໍ່ ${item.giftId}`} type="number" min="0" value={item.packs} onChange={(event) => update(item.giftId, 'packs', event.target.value)} /></label><label>ຈຳນວນຊິ້ນ<input aria-label={`ຈຳນວນຊິ້ນ ${item.giftId}`} type="number" min="0" value={item.looseUnits} onChange={(event) => update(item.giftId, 'looseUnits', event.target.value)} /></label></div>) : null}
      <Textarea id="gift-correction-reason" label="ເຫດຜົນການແກ້ໄຂ" aria-required="true" value={reason} disabled={busy} onChange={(event) => setReason(event.target.value)} />
      {error ? <div className="error-banner" role="alert">{error}</div> : null}
    </form>
  </ModalSheet>;
}
