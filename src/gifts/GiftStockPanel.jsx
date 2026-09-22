import { useEffect, useMemo, useRef, useState } from 'react';
import { adjustGiftStock, setGiftLowStockThreshold, subscribeActiveGiftItems, subscribeGiftStocks } from '../services/giftService';
import { giftCallableMessage } from './giftErrors';
import { giftStockDisplay, isLowGiftStock } from './giftModel';
import Button from '../components/ui/Button';
import CustomSelect from '../components/ui/CustomSelect';
import GlassCard from '../components/ui/GlassCard';
import Input from '../components/ui/Input';
import Textarea from '../components/ui/Textarea';
import { giftLabel } from './giftLabels';

const uuid = () => globalThis.crypto.randomUUID();
const currentActor = (identity) => ({ role: identity?.claims?.role ?? identity?.role, branchId: identity?.claims?.branchId ?? identity?.branchId });
const branchFor = (identity, effectiveBranchId) => currentActor(identity).role === 'admin' ? effectiveBranchId : currentActor(identity).branchId;

export default function GiftStockPanel({ identity, effectiveBranchId, giftFilterId = '', onClearGiftFilter }) {
  const branchId = branchFor(identity, effectiveBranchId); const [catalog, setCatalog] = useState([]); const [stocks, setStocks] = useState([]);
  const [thresholds, setThresholds] = useState({}); const [giftId, setGiftId] = useState(''); const [deltaUnits, setDeltaUnits] = useState(''); const [reason, setReason] = useState('');
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const adjustmentId = useRef(uuid());
  useEffect(() => { if (!branchId) return undefined; let live = true; const stopCatalog = subscribeActiveGiftItems((items) => live && setCatalog(items), () => live && setError(giftCallableMessage())); const stopStocks = subscribeGiftStocks(identity, { branchId }, (items) => { if (!live) return; setStocks(items); setThresholds(Object.fromEntries(items.map((item) => [item.giftId, String(item.lowStockThresholdUnits ?? 0)]))); }, () => live && setError(giftCallableMessage())); return () => { live = false; stopCatalog?.(); stopStocks?.(); }; }, [branchId, identity]);
  const gifts = useMemo(() => Object.fromEntries(catalog.map((item) => [item.id, item])), [catalog]);
  const updateThreshold = async (stock) => { const value = thresholds[stock.giftId] ?? ''; if (!/^\d+$/.test(value)) { setError('ຈຳນວນເຕືອນສະຕັອກຕ້ອງເປັນຈຳນວນເຕັມບວກ'); return; } setBusy(true); setError(''); try { await setGiftLowStockThreshold({ branchId, giftId: stock.giftId, lowStockThresholdUnits: value }); } catch (failure) { setError(giftCallableMessage(failure)); } finally { setBusy(false); } };
  const adjust = async (event) => { event.preventDefault(); if (!giftId || !/^-?[1-9]\d*$/.test(deltaUnits)) { setError('ຈຳນວນປັບຕ້ອງເປັນຈຳນວນເຕັມທີ່ບໍ່ເປັນສູນ'); return; } if (!reason.trim()) { setError('ກະລຸນາລະບຸເຫດຜົນການປັບ'); return; } setBusy(true); setError(''); try { await adjustGiftStock({ adjustmentId: adjustmentId.current, branchId, reason: reason.trim(), items: [{ giftId, deltaUnits }] }); adjustmentId.current = uuid(); setDeltaUnits(''); setReason(''); } catch (failure) { setError(giftCallableMessage(failure)); } finally { setBusy(false); } };
  const visibleStocks = stocks.filter((stock) => !giftFilterId || stock.giftId === giftFilterId);
  return <GlassCard as="section" padded><h2>{giftLabel('stock')}</h2>
    {giftFilterId ? <div className="gift-actions"><p>ຕົວກອງ: {giftFilterId}</p><Button variant="neutral" onClick={onClearGiftFilter}>ເບິ່ງທັງໝົດ</Button></div> : null}
    {visibleStocks.map((stock) => {
      const gift = gifts[stock.giftId]; if (!gift) return null;
      return <div key={stock.giftId} className={isLowGiftStock(stock) ? 'gift-stock--low' : ''}>
        <strong>{gift.name}</strong><p>{giftStockDisplay(stock.currentUnits, gift)}</p>
        {isLowGiftStock(stock) ? <small>{giftLabel('lowStock')}</small> : null}
        <Input id={`gift-threshold-${stock.giftId}`} label={giftLabel('lowStockThreshold')} type="number" min="0" step="1" value={thresholds[stock.giftId] ?? ''} disabled={busy} onChange={(event) => /^\d*$/.test(event.target.value) && setThresholds((current) => ({ ...current, [stock.giftId]: event.target.value }))} />
        <Button variant="secondary" disabled={busy} onClick={() => updateThreshold(stock)}>{giftLabel('updateThreshold')}</Button>
      </div>;
    })}
    <form className="form-stack" onSubmit={adjust}>
      <CustomSelect id="gift-adjustment-item" label={giftLabel('adjustmentItem')} value={giftId} disabled={busy} onChange={setGiftId} placeholder="ເລືອກ" options={catalog.map((gift) => ({ value: gift.id, label: gift.name }))} />
      <Input id="gift-adjustment-units" label={giftLabel('adjustmentUnits')} type="text" inputMode="numeric" value={deltaUnits} disabled={busy} onChange={(event) => /^-?\d*$/.test(event.target.value) && setDeltaUnits(event.target.value)} />
      <Textarea id="gift-adjustment-reason" label={giftLabel('adjustmentReason')} value={reason} disabled={busy} onChange={(event) => setReason(event.target.value)} />
      {error ? <div role="alert" className="error-banner">{error}</div> : null}
      <Button type="submit" busy={busy} disabled={!branchId}>{giftLabel('adjustStock')}</Button>
    </form>
  </GlassCard>;
}
