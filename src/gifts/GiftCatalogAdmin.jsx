import { useEffect, useState } from 'react';
import { createGiftItem, subscribeAllGiftItems, updateGiftItem } from '../services/giftService';
import { giftCallableMessage } from './giftErrors';
import Button from '../components/ui/Button';
import GlassCard from '../components/ui/GlassCard';
import Input from '../components/ui/Input';
import { giftLabel } from './giftLabels';

const blank = { name: '', unitLabel: '', packLabel: '', unitsPerPack: '1', sortOrder: '0', active: true };
export default function GiftCatalogAdmin({ identity }) {
  const role = identity?.claims?.role ?? identity?.role;
  const [items, setItems] = useState([]); const [draft, setDraft] = useState(blank); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  useEffect(() => (role === 'admin' ? subscribeAllGiftItems(identity, setItems, () => setError(giftCallableMessage())) : undefined), [identity, role]);
  const set = (field, value) => setDraft((current) => ({ ...current, [field]: value }));
  const submit = async (event) => { event.preventDefault(); setBusy(true); setError(''); try { if (draft.id) await updateGiftItem(draft.id, draft); else await createGiftItem(draft); setDraft(blank); } catch (failure) { setError(giftCallableMessage(failure)); } finally { setBusy(false); } };
  if (role !== 'admin') return null;
  return <GlassCard as="section" padded><h2>ລາຍການເຄື່ອງແຈກ</h2><form className="form-stack" onSubmit={submit}><Input id="gift-name" label={giftLabel('name')} value={draft.name} disabled={busy} onChange={(event) => set('name', event.target.value)} /><Input id="gift-unit-label" label={giftLabel('unitLabel')} value={draft.unitLabel} disabled={busy} onChange={(event) => set('unitLabel', event.target.value)} /><Input id="gift-pack-label" label={giftLabel('packLabel')} value={draft.packLabel} disabled={busy} onChange={(event) => set('packLabel', event.target.value)} /><Input id="gift-units-per-pack" label={giftLabel('unitsPerPack')} type="number" min="1" step="1" value={draft.unitsPerPack} disabled={busy} onChange={(event) => set('unitsPerPack', event.target.value)} /><Input id="gift-sort-order" label={giftLabel('sortOrder')} type="number" step="1" value={draft.sortOrder} disabled={busy} onChange={(event) => set('sortOrder', event.target.value)} /><label className="gift-checkbox-row"><input className="gift-checkbox" aria-label={giftLabel('active')} type="checkbox" checked={draft.active} disabled={busy} onChange={(event) => set('active', event.target.checked)} /> {giftLabel(draft.active ? 'active' : 'inactive')}</label>{error ? <div className="error-banner" role="alert">{error}</div> : null}<Button type="submit" busy={busy}>{giftLabel('saveItem')}</Button></form><section>{items.map((item) => <div key={item.id}><strong>{item.name}</strong> <small>{giftLabel(item.active ? 'active' : 'inactive')}</small><Button variant="neutral" disabled={busy} onClick={() => setDraft({ ...item, unitsPerPack: String(item.unitsPerPack), sortOrder: String(item.sortOrder) })}>{giftLabel('edit')}</Button></div>)}</section></GlassCard>;
}
