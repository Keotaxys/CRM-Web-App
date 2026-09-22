import { useEffect, useId, useRef, useState } from 'react';
import { branchName } from '../branches/branches';
import { cancelGiftAllocation, confirmGiftAllocation, createGiftAllocation, receiveGiftStock, subscribeActiveGiftItems, subscribeGiftAllocations } from '../services/giftService';
import { giftCallableMessage } from './giftErrors';
import GiftItemRows, { validateGiftItemRows } from './GiftItemRows';
import Button from '../components/ui/Button';
import GlassCard from '../components/ui/GlassCard';
import Input from '../components/ui/Input';
import ModalSheet from '../components/ui/ModalSheet';
import Textarea from '../components/ui/Textarea';
import { giftLabel } from './giftLabels';

const uuid = () => globalThis.crypto.randomUUID();
const actor = (identity) => ({ role: identity?.claims?.role ?? identity?.role, branchId: identity?.claims?.branchId ?? identity?.branchId });
const branchFor = (identity, effective) => actor(identity).role === 'admin' ? effective : actor(identity).branchId;
const firstRow = () => [{ key: 1, giftId: '', packs: '0', looseUnits: '0' }];

export default function GiftInboundPanel({ identity, effectiveBranchId }) {
  const formId = useId();
  const [cancelReason, setCancelReason] = useState('');
  const actionSubmitting = useRef(false);
  const actionAttempted = useRef(false);
  const branchId = branchFor(identity, effectiveBranchId); const admin = actor(identity).role === 'admin'; const [catalog, setCatalog] = useState([]); const [allocations, setAllocations] = useState({ pending: [], confirmed: [], cancelled: [] }); const [rows, setRows] = useState(firstRow); const [allocationRows, setAllocationRows] = useState(firstRow); const [source, setSource] = useState(''); const [reference, setReference] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const [pendingAction, setPendingAction] = useState(null); const receiptId = useRef(uuid()); const allocationId = useRef(uuid()); const mutationId = useRef(uuid());
  useEffect(() => { if (!branchId) return undefined; let live = true; setAllocations({ pending: [], confirmed: [], cancelled: [] }); const stopCatalog = subscribeActiveGiftItems((items) => live && setCatalog(items), () => live && setError(giftCallableMessage())); const stopPending = subscribeGiftAllocations(identity, { branchId, status: 'pending' }, (items) => live && setAllocations((current) => ({ ...current, pending: items })), () => live && setError(giftCallableMessage())); const stopConfirmed = subscribeGiftAllocations(identity, { branchId, status: 'confirmed' }, (items) => live && setAllocations((current) => ({ ...current, confirmed: items })), () => live && setError(giftCallableMessage())); const stopCancelled = subscribeGiftAllocations(identity, { branchId, status: 'cancelled' }, (items) => live && setAllocations((current) => ({ ...current, cancelled: items })), () => live && setError(giftCallableMessage())); return () => { live = false; stopCatalog?.(); stopPending?.(); stopConfirmed?.(); stopCancelled?.(); }; }, [branchId, identity]);
  const submitReceipt = async (event) => { event.preventDefault(); const result = validateGiftItemRows(rows, catalog); if (!source.trim()) { setError('ກະລຸນາລະບຸແຫຼ່ງຮັບເຂົ້າ'); return; } if (result.error) { setError(result.error); return; } setBusy(true); setError(''); try { await receiveGiftStock({ receiptId: receiptId.current, branchId, source: source.trim(), reference: reference.trim(), items: result.items }); receiptId.current = uuid(); setRows(firstRow()); setSource(''); setReference(''); } catch (failure) { setError(giftCallableMessage(failure)); } finally { setBusy(false); } };
  const submitAllocation = async () => { const result = validateGiftItemRows(allocationRows, catalog); if (!source.trim()) { setError('ກະລຸນາລະບຸແຫຼ່ງສ້າງລາຍການໂອນ'); return; } if (result.error) { setError(result.error); return; } setBusy(true); setError(''); try { await createGiftAllocation({ allocationId: allocationId.current, targetBranchId: branchId, source: source.trim(), reference: reference.trim(), items: result.items }); allocationId.current = uuid(); setAllocationRows(firstRow()); } catch (failure) { setError(giftCallableMessage(failure)); } finally { setBusy(false); } };
  const openAction = (type, allocation) => {
    mutationId.current = uuid(); actionAttempted.current = false;
    setCancelReason(''); setError(''); setPendingAction({ type, allocation });
  };
  const closeAction = () => { if (!busy) setPendingAction(null); };
  const changeReason = (value) => {
    if (actionAttempted.current) { mutationId.current = uuid(); actionAttempted.current = false; }
    setCancelReason(value);
  };
  const confirmAction = async () => {
    if (!pendingAction || actionSubmitting.current) return;
    if (pendingAction.type === 'cancel' && !cancelReason.trim()) {
      setError('ກະລຸນາລະບຸເຫດຜົນການຍົກເລີກ'); return;
    }
    actionSubmitting.current = true; actionAttempted.current = true; setBusy(true); setError('');
    try {
      const request = { allocationId: pendingAction.allocation.id, mutationId: mutationId.current };
      if (pendingAction.type === 'confirm') await confirmGiftAllocation(request);
      else await cancelGiftAllocation({ ...request, reason: cancelReason });
      setPendingAction(null);
    } catch (failure) { setError(giftCallableMessage(failure)); }
    finally { actionSubmitting.current = false; setBusy(false); }
  };
  const cancelling = pendingAction?.type === 'cancel';
  const selected = pendingAction?.allocation;
  return <GlassCard as="section" padded className="gift-inbound-panel">
    <h2>{giftLabel('receiveStock')}</h2>
    <form className="form-stack gift-form" onSubmit={submitReceipt}>
      <Input id={`${formId}-source`} label={giftLabel('receiptSource')} value={source} disabled={busy} onChange={(event) => setSource(event.target.value)} />
      <Input id={`${formId}-reference`} label={giftLabel('receiptReference')} value={reference} disabled={busy} onChange={(event) => setReference(event.target.value)} />
      <GiftItemRows catalog={catalog} rows={rows} onChange={setRows} maxRows={25} disabled={busy} />
      <Button type="submit" busy={busy} disabled={!branchId}>{giftLabel('receiveStock')}</Button>
    </form>
    {admin ? <section><h3>{giftLabel('allocation')}</h3>
      <GiftItemRows catalog={catalog} rows={allocationRows} onChange={setAllocationRows} maxRows={25} disabled={busy} />
      <Button disabled={busy || !branchId} onClick={submitAllocation}>{giftLabel('createAllocation')}</Button>
    </section> : null}
    <section><h3>{giftLabel('pendingAllocation')}</h3>{allocations.pending.map((allocation) => <div className="gift-actions" key={allocation.id} role="group" aria-label={`${giftLabel('allocation')} ${allocation.reference || allocation.id}`}>
      <div><strong>{allocation.source}</strong><p>{allocation.reference || '—'} · {allocation.id}</p><small>{branchName(allocation.targetBranchId) || allocation.targetBranchId}</small></div>
      <Button disabled={busy} onClick={() => openAction('confirm', allocation)}>{giftLabel('confirmAllocation')}</Button>
      {admin ? <Button variant="neutral" disabled={busy} onClick={() => openAction('cancel', allocation)}>{giftLabel('cancelAllocation')}</Button> : null}
    </div>)}</section>
    <section><h3>{giftLabel('confirmedAllocation')}</h3>{allocations.confirmed.map((allocation) => <div key={allocation.id}><strong>{allocation.source}</strong><Button disabled>{giftLabel('confirmedAllocation')}</Button></div>)}</section>
    <section><h3>{giftLabel('cancelledAllocation')}</h3>{allocations.cancelled.map((allocation) => <div key={allocation.id}><strong>{allocation.source}</strong><Button disabled>{giftLabel('cancelledAllocation')}</Button></div>)}</section>
    {error && !pendingAction ? <div role="alert" className="error-banner">{error}</div> : null}
    <ModalSheet open={Boolean(pendingAction)} onClose={closeAction} title={cancelling ? giftLabel('cancelAllocation') : giftLabel('confirmAllocation')} footer={<>
      <Button variant="neutral" disabled={busy} onClick={closeAction}>{giftLabel('back')}</Button>
      <Button busy={busy} onClick={confirmAction}>{cancelling ? giftLabel('cancelAllocation') : giftLabel('confirm')}</Button>
    </>}>
      {selected ? <>
        <dl><dt>{giftLabel('targetBranch')}</dt><dd>{branchName(selected.targetBranchId) || selected.targetBranchId}</dd>
          <dt>{giftLabel('reference')}</dt><dd>{selected.reference || '—'}</dd><dt>{giftLabel('allocation')}</dt><dd>{selected.id}</dd></dl>
        <ul>{selected.items.map((item) => <li key={item.giftId} aria-label={item.giftNameSnapshot}>
          <strong>{item.giftNameSnapshot}</strong><p>{item.packs} ຫໍ່ × {item.unitsPerPackSnapshot} ຊິ້ນ + {item.looseUnits} ຊິ້ນ = {item.totalUnits} ຊິ້ນ</p>
        </li>)}</ul>
        <p>{giftLabel('total')}: {selected.items.reduce((sum, item) => sum + item.totalUnits, 0)} ຊິ້ນ</p>
      </> : null}
      <p>{cancelling ? giftLabel('cancelNoStock') : giftLabel('confirmUpdatesStock')}</p>
      {cancelling ? <Textarea id={`${formId}-cancel-reason`} label={giftLabel('cancellationReason')} aria-required="true" value={cancelReason} disabled={busy} onChange={(event) => changeReason(event.target.value)} /> : null}
      {error ? <div role="alert" className="error-banner">{error}</div> : null}
    </ModalSheet>
  </GlassCard>;
}
