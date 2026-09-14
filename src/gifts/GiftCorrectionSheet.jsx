import { useMemo, useRef, useState } from 'react';
import { amendGiftDistribution, cancelGiftDistribution } from '../services/giftService';
import { giftCallableMessage } from './giftErrors';
import { giftLineTotal } from './giftModel';
import Button from '../components/ui/Button';
import ModalSheet from '../components/ui/ModalSheet';
import Textarea from '../components/ui/Textarea';

const makeUuid = () => globalThis.crypto.randomUUID();
function validDraftLine(item) {
  if (!/^\d+$/.test(item.packs) || !/^\d+$/.test(item.looseUnits)) return false;
  const packs = Number(item.packs); const looseUnits = Number(item.looseUnits);
  return Number.isSafeInteger(packs) && Number.isSafeInteger(looseUnits)
    && packs >= 0 && looseUnits >= 0 && (packs > 0 || looseUnits > 0);
}

export default function GiftCorrectionSheet({ distribution, gifts = [], onClose, onSuccess }) {
  const giftMap = useMemo(() => Object.fromEntries(gifts.map((gift) => [gift.id, gift])), [gifts]);
  const [mode, setMode] = useState('amend');
  const [rows, setRows] = useState(() => (distribution.items ?? []).map((item) => ({ ...item, packs: String(item.packs), looseUnits: String(item.looseUnits) })));
  const [reason, setReason] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const mutationIdRef = useRef(makeUuid()); const submittingRef = useRef(false); const attemptedRef = useRef(false);
  const metadataReady = (distribution.items ?? []).every((item) => Boolean(giftMap[item.giftId]));
  const draftTotalsReady = metadataReady && rows.length > 0 && rows.every(validDraftLine);
  const confirmationReady = metadataReady && (mode === 'cancel' || draftTotalsReady);
  const oldTotal = Number(distribution.totalUnits ?? (distribution.items ?? []).reduce((total, item) => total + Number(item.totalUnits ?? 0), 0));
  const newTotal = draftTotalsReady ? rows.reduce((total, item) => total + giftLineTotal({ packs: item.packs, looseUnits: item.looseUnits }, giftMap[item.giftId]), 0) : null;
  const beginNewIntent = () => { if (attemptedRef.current) { mutationIdRef.current = makeUuid(); attemptedRef.current = false; } };
  const setAction = (next) => { if (busy || next === mode) return; beginNewIntent(); setMode(next); setError(''); };
  const update = (giftId, field, value) => { if (/^\d*$/.test(value)) { beginNewIntent(); setRows((current) => current.map((item) => item.giftId === giftId ? { ...item, [field]: value } : item)); } };
  const updateReason = (value) => { beginNewIntent(); setReason(value); };
  const submit = async (event) => {
    event.preventDefault(); if (submittingRef.current || !confirmationReady) return;
    const cleanReason = reason.trim(); if (!cleanReason) { setError('ກະລຸນາລະບຸເຫດຜົນການແກ້ໄຂ'); return; }
    const items = rows.map((item) => ({ giftId: item.giftId, packs: Number(item.packs), looseUnits: Number(item.looseUnits) }));
    if (mode === 'amend' && (!items.length || items.some((item) => !Number.isSafeInteger(item.packs) || !Number.isSafeInteger(item.looseUnits) || item.packs < 0 || item.looseUnits < 0 || (!item.packs && !item.looseUnits)))) { setError('ຈຳນວນຕ້ອງເປັນຈຳນວນເຕັມບວກ'); return; }
    submittingRef.current = true; attemptedRef.current = true; setBusy(true); setError('');
    try {
      const values = { distributionId: distribution.id, mutationId: mutationIdRef.current, expectedVersion: distribution.version, reason: cleanReason, branchId: distribution.branchId };
      if (mode === 'cancel') await cancelGiftDistribution(values);
      else await amendGiftDistribution({ ...values, recipientType: distribution.recipientType, customerId: distribution.customerId ?? null, campaignId: distribution.campaignId ?? null, items, note: distribution.note ?? '' });
      mutationIdRef.current = makeUuid(); attemptedRef.current = false; onSuccess?.(); onClose?.();
    } catch (failure) { setError(giftCallableMessage(failure)); }
    finally { submittingRef.current = false; setBusy(false); }
  };
  const close = () => { if (busy) return; mutationIdRef.current = null; onClose?.(); };
  return <ModalSheet open onClose={close} title="ແກ້ໄຂການແຈກເຄື່ອງ" description={`${distribution.branchId} · ${distribution.id}`} mobileSheet footer={<><Button variant="neutral" disabled={busy} onClick={close}>ຍົກເລີກ</Button><Button type="submit" form="gift-correction-form" busy={busy} disabled={!confirmationReady}>{mode === 'cancel' ? 'ຢືນຢັນການຍົກເລີກ' : 'ຢືນຢັນການແກ້ໄຂ'}</Button></>}>
    <form id="gift-correction-form" className="form-stack" onSubmit={submit}>
      <div className="chip-row"><Button variant="neutral" disabled={busy} aria-pressed={mode === 'amend'} onClick={() => setAction('amend')}>ແກ້ໄຂລາຍການ</Button><Button variant="neutral" disabled={busy} aria-pressed={mode === 'cancel'} onClick={() => setAction('cancel')}>ຍົກເລີກລາຍການ</Button></div>
      {!metadataReady ? <p role="status">ກຳລັງໂຫຼດຂໍ້ມູນເຄື່ອງແຈກ...</p> : mode === 'amend' && !draftTotalsReady ? <p role="status">ຈຳນວນຕ້ອງເປັນຈຳນວນເຕັມບວກ</p> : <p>ຈຳນວນເກົ່າ: {oldTotal} · ຈຳນວນໃໝ່: {mode === 'cancel' ? 0 : newTotal}</p>}
      {mode === 'amend' ? rows.map((item) => <div key={item.giftId}><strong>{giftMap[item.giftId]?.name ?? item.giftId}</strong><label>ຈຳນວນຫໍ່<input aria-label={`ຈຳນວນຫໍ່ ${item.giftId}`} type="number" min="0" disabled={busy || !metadataReady} value={item.packs} onChange={(event) => update(item.giftId, 'packs', event.target.value)} /></label><label>ຈຳນວນຊິ້ນ<input aria-label={`ຈຳນວນຊິ້ນ ${item.giftId}`} type="number" min="0" disabled={busy || !metadataReady} value={item.looseUnits} onChange={(event) => update(item.giftId, 'looseUnits', event.target.value)} /></label></div>) : null}
      <Textarea id="gift-correction-reason" label="ເຫດຜົນການແກ້ໄຂ" aria-required="true" value={reason} disabled={busy || !metadataReady} onChange={(event) => updateReason(event.target.value)} />
      {error ? <div className="error-banner" role="alert">{error}</div> : null}
    </form>
  </ModalSheet>;
}
