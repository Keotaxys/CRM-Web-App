import { useEffect, useId, useRef, useState } from 'react';
import { subscribeActiveGiftItems, subscribeGiftDistributions } from '../services/giftService';
import { useLaosDay } from '../sales/useLaosDay';
import Button from '../components/ui/Button';
import DateField from '../components/ui/DateField';
import GlassCard from '../components/ui/GlassCard';
import GiftCorrectionSheet from './GiftCorrectionSheet';
import { giftDateRange } from './giftReport';
import { giftCallableMessage } from './giftErrors';

export default function GiftDistributionHistory({ identity, effectiveBranchId }) {
  const uid = identity?.user?.uid ?? identity?.uid;
  const role = identity?.claims?.role ?? identity?.role;
  const ownBranch = identity?.claims?.branchId ?? identity?.branchId;
  const branchId = role === 'admin' ? effectiveBranchId : ownBranch;
  const today = useLaosDay();
  const controlId = useId();
  const [dates, setDates] = useState({});
  const startKey = dates.startKey ?? today;
  const endKey = dates.endKey ?? today;
  const [refresh, setRefresh] = useState(0);
  const [history, setHistory] = useState({});
  const [catalog, setCatalog] = useState({});
  const [selected, setSelected] = useState(null);
  const reloadId = useRef(null);
  const catalogKey = `${uid}|${role}`;
  let validRange = true;
  try { giftDateRange('custom', today, { startKey, endKey }); } catch { validRange = false; }
  const queryKey = `${uid}|${role}|${branchId}|${startKey}|${endKey}|${refresh}`;

  useEffect(() => {
    let live = true;
    const stop = subscribeActiveGiftItems((items) => {
      if (live) setCatalog({ key: catalogKey, items, ready: true, error: false });
    }, () => { if (live) setCatalog({ key: catalogKey, items: [], ready: false, error: true }); });
    return () => { live = false; stop?.(); };
  }, [catalogKey, identity]);

  useEffect(() => {
    if (!validRange || !branchId || !uid || !['staff', 'branch_manager', 'admin'].includes(role)) return undefined;
    let live = true;
    const stop = subscribeGiftDistributions(identity, { branchId, startKey, endKey }, (items) => {
      if (!live) return;
      const rows = items.filter((item) => item.branchId === branchId
        && (role !== 'staff' || item.createdBy === uid)
        && item.dateKey >= startKey && item.dateKey <= endKey);
      setHistory({ key: queryKey, rows, error: '' });
      if (reloadId.current) {
        const latest = rows.find((item) => item.id === reloadId.current);
        reloadId.current = null;
        setSelected(latest?.status === 'active' && (role !== 'staff' || latest.dateKey === today) ? latest : null);
      }
    }, (error) => {
      if (live) { setHistory({ key: queryKey, rows: [], error: giftCallableMessage(error) }); setSelected(null); }
    });
    return () => { live = false; stop?.(); };
  }, [identity, uid, role, branchId, startKey, endKey, queryKey, validRange, today]);

  const current = history.key === queryKey && validRange ? history : { rows: [] };
  const currentCatalog = catalog.key === catalogKey ? catalog : { items: [], ready: false, error: false };
  const changeDate = (field, value) => { setSelected(null); setDates((previous) => ({ ...previous, [field]: value })); };
  const reload = () => { reloadId.current = selected.id; setSelected(null); setRefresh((value) => value + 1); };
  return <GlassCard as="section" padded className="gift-distribution-history">
    <h2>ປະຫວັດການແຈກ</h2>
    <div className="form-stack">
      <DateField id={`${controlId}-start`} label="ວັນທີເລີ່ມປະຫວັດ" value={startKey} onChange={(event) => changeDate('startKey', event.target.value)} />
      <DateField id={`${controlId}-end`} label="ວັນທີສິ້ນສຸດປະຫວັດ" value={endKey} onChange={(event) => changeDate('endKey', event.target.value)} />
    </div>
    {!validRange ? <p role="alert">ຊ່ວງວັນທີບໍ່ຖືກຕ້ອງ</p> : current.error ? <p role="alert">{current.error}</p>
      : history.key !== queryKey ? <p role="status">ກຳລັງໂຫຼດ...</p> : !current.rows.length ? <p>ບໍ່ມີລາຍການ</p> : null}
    {currentCatalog.error ? <p role="alert">{giftCallableMessage()}</p> : null}
    {current.rows.map((item) => <div key={item.id} role="group" aria-label={`ການແຈກ ${item.id}`}>
      <h3>{item.customerNameSnapshot || item.campaignNameSnapshot || item.customerId || item.campaignId}</h3>
      <p>{item.dateKey} · {item.branchId} · {item.id} · {item.status}</p>
      <ul>{item.items.map((line) => <li key={line.giftId}>{line.giftNameSnapshot || line.giftId}: {line.totalUnits}</li>)}</ul>
      <Button variant="neutral" aria-label={`ແກ້ໄຂ ${item.id}`} disabled={item.status !== 'active' || (role === 'staff' && item.dateKey !== today)} onClick={() => setSelected(item)}>ແກ້ໄຂ / ຍົກເລີກ</Button>
    </div>)}
    {selected && current.rows.some((item) => item.id === selected.id) ? <GiftCorrectionSheet key={`${selected.id}:${selected.version}`} distribution={selected} gifts={currentCatalog.items} catalogReady={currentCatalog.ready}
      onClose={() => setSelected(null)} onReload={reload} onSuccess={() => setRefresh((value) => value + 1)} /> : null}
  </GlassCard>;
}
