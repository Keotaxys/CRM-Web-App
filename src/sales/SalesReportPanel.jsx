import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/useAuth';
import { BRANCHES, branchName } from '../branches/branches';
import { laosTodayKey } from '../shared/dateTime';
import { subscribeAllSalesProducts, subscribeDailySales } from '../services/salesService';
import { subscribeAssignableUsers } from '../services/usersService';
import Button from '../components/ui/Button';
import CustomSelect from '../components/ui/CustomSelect';
import DateField from '../components/ui/DateField';
import GlassCard from '../components/ui/GlassCard';
import SearchableSelect from '../components/ui/SearchableSelect';
import { buildSalesReport, salesDateRange } from './salesReport';
import SalesCorrectionSheet from './SalesCorrectionSheet';

const PRESETS = [
  ['today', 'ມື້ນີ້'],
  ['week', 'ອາທິດນີ້'],
  ['month', 'ເດືອນນີ້'],
  ['year', 'ປີນີ້'],
  ['custom', 'ກຳນົດເອງ'],
];

export default function SalesReportPanel({ onExport, onCorrect } = {}) {
  const identity = useAuth();
  const role = identity.claims.role;
  const [preset, setPreset] = useState('today');
  const [custom, setCustom] = useState({ startKey: '', endKey: '' });
  const [records, setRecords] = useState([]);
  const [products, setProducts] = useState([]);
  const [users, setUsers] = useState([]);
  const [filters, setFilters] = useState({ productId: '', staffUid: '', branchId: '' });
  const [queryFailureKey, setQueryFailureKey] = useState('');
  const [completedRangeKey, setCompletedRangeKey] = useState('');
  const [selectedRecord, setSelectedRecord] = useState(null);

  const rangeState = useMemo(() => {
    if (preset === 'custom' && (!custom.startKey || !custom.endKey)) {
      return { range: null, error: 'ກະລຸນາເລືອກວັນທີໃຫ້ຄົບ' };
    }
    try {
      return { range: salesDateRange(preset, laosTodayKey(), custom), error: '' };
    } catch {
      return { range: null, error: 'ຊ່ວງວັນທີບໍ່ຖືກຕ້ອງ' };
    }
  }, [custom, preset]);
  const rangeKey = rangeState.range ? `${rangeState.range.startKey}|${rangeState.range.endKey}` : '';

  useEffect(() => {
    const unsubscribeProducts = subscribeAllSalesProducts(setProducts, () => setQueryFailureKey('*'));
    const unsubscribeUsers = role === 'staff' ? undefined : subscribeAssignableUsers(identity, setUsers, () => setQueryFailureKey('*'));
    return () => {
      unsubscribeProducts?.();
      unsubscribeUsers?.();
    };
  }, [identity, role]);

  useEffect(() => {
    if (!rangeState.range) return undefined;
    const subscriptionRangeKey = rangeKey;
    return subscribeDailySales(identity, rangeState.range, (nextRecords) => {
      setRecords(nextRecords);
      setCompletedRangeKey(subscriptionRangeKey);
      setQueryFailureKey((current) => current === '*' ? current : '');
    }, () => {
      setCompletedRangeKey(subscriptionRangeKey);
      setQueryFailureKey(subscriptionRangeKey);
    });
  }, [identity, rangeKey, rangeState.range]);

  const filteredRecords = useMemo(() => records
    .filter((record) => !filters.branchId || record.branchId === filters.branchId)
    .filter((record) => !filters.staffUid || record.staffUid === filters.staffUid)
    .map((record) => filters.productId ? {
      ...record,
      items: record.items.filter((item) => item.productId === filters.productId),
    } : record)
    .filter((record) => !filters.productId || record.items.length > 0), [filters, records]);
  const report = useMemo(() => buildSalesReport(filteredRecords, products), [filteredRecords, products]);

  const productOptions = [{ value: '', label: 'ທັງໝົດ' }, ...products.map((product) => ({ value: product.id, label: product.name }))];
  const availableUsers = users
    .filter((user) => role !== 'branch_manager' || user.branchId === identity.claims.branchId)
    .filter((user) => !filters.branchId || user.branchId === filters.branchId);
  const staffOptions = [{ value: '', label: 'ທັງໝົດ' }, ...availableUsers.map((user) => ({ value: user.uid, label: user.name ?? user.displayName ?? user.uid }))];
  const branchOptions = [{ value: '', label: 'ທັງໝົດ' }, ...BRANCHES.map((branch) => ({ value: branch.id, label: branch.label }))];
  const metadata = rangeState.range ? { ...rangeState.range, preset, filters } : null;
  const queryError = Boolean(queryFailureKey && (queryFailureKey === '*' || queryFailureKey === rangeKey));
  const loaded = Boolean(rangeKey && completedRangeKey === rangeKey);

  return <section className="form-stack" aria-label="ລາຍງານຍອດຂາຍ">
    <GlassCard padded className="filter-panel">
      <div className="chip-row">
        {PRESETS.map(([value, label]) => <Button key={value} variant="neutral" aria-pressed={preset === value} onClick={() => setPreset(value)}>{label}</Button>)}
      </div>
      {preset === 'custom' ? <div className="form-grid">
        <DateField id="sales-start" label="ເລີ່ມວັນທີ" value={custom.startKey} onChange={(event) => setCustom((current) => ({ ...current, startKey: event.target.value }))} />
        <DateField id="sales-end" label="ສິ້ນສຸດວັນທີ" value={custom.endKey} onChange={(event) => setCustom((current) => ({ ...current, endKey: event.target.value }))} />
      </div> : null}
      {rangeState.error ? <div className="error-banner" role="alert">{rangeState.error}</div> : null}
      <div className="form-grid">
        <CustomSelect id="sales-product" label="ຜະລິດຕະພັນ" value={filters.productId} options={productOptions} onChange={(productId) => setFilters((current) => ({ ...current, productId }))} />
        {role === 'admin' ? <CustomSelect id="sales-branch" label="ສາຂາ" value={filters.branchId} options={branchOptions} onChange={(branchId) => setFilters((current) => ({ ...current, branchId, staffUid: '' }))} /> : null}
        {role !== 'staff' ? <SearchableSelect id="sales-staff" label="ພະນັກງານ" value={filters.staffUid} options={staffOptions} onChange={(staffUid) => setFilters((current) => ({ ...current, staffUid }))} searchPlaceholder="ຄົ້ນຫາພະນັກງານ" /> : null}
      </div>
    </GlassCard>
    {queryError ? <div className="error-banner" role="alert">ບໍ່ສາມາດໂຫຼດລາຍງານ</div> : null}
    {!queryError && loaded && rangeState.range ? <>
      <div className="summary-grid">
        <GlassCard padded><span>ຍອດລວມ {report.totalQuantity}</span></GlassCard>
        <GlassCard padded><span>{rangeState.range.startKey} – {rangeState.range.endKey}</span></GlassCard>
      </div>
      {onExport ? <Button variant="secondary" onClick={() => onExport(report, metadata)}>ສົ່ງອອກ Excel</Button> : null}
      <GlassCard as="section" padded>
        <h2>ອັນດັບຜະລິດຕະພັນ</h2>
        <table><thead><tr><th>ອັນດັບ</th><th>ຜະລິດຕະພັນ</th><th>ຍອດ</th></tr></thead><tbody>
          {report.products.map((product) => <tr key={product.productId}><td>{product.rank}</td><td>{product.name}</td><td>{product.totalQuantity}</td></tr>)}
        </tbody></table>
      </GlassCard>
      <GlassCard as="section" padded>
        <h2>ຍອດຕາມພະນັກງານ</h2>
        <table><tbody>{report.staff.map((staff) => <tr key={staff.staffUid}><td>{staff.staffName}</td><td>{staff.totalQuantity}</td></tr>)}</tbody></table>
      </GlassCard>
      {role === 'admin' ? <GlassCard as="section" padded><h2>ຍອດຕາມສາຂາ</h2><table><tbody>{report.branches.map((branch) => <tr key={branch.branchId}><td>{branchName(branch.branchId) || branch.branchId}</td><td>{branch.totalQuantity}</td></tr>)}</tbody></table></GlassCard> : null}
      <GlassCard as="section" padded>
        <h2>ຍອດປະຈຳວັນ</h2>
        <table><tbody>{report.days.flatMap((day) => day.rows.map((row) => {
          const record = filteredRecords.find((item) => item.dateKey === day.dateKey && item.staffUid === row.staffUid);
          return <tr key={`${day.dateKey}-${row.staffUid}`}><td>{day.dateKey}</td><td>{row.staffName}</td><td>{row.totalQuantity}</td><td>{role !== 'staff' ? <Button variant="neutral" onClick={() => { setSelectedRecord(record); onCorrect?.(record); }}>ແກ້ໄຂຍອດ {day.dateKey} {row.staffName}</Button> : null}</td></tr>;
        }))}</tbody></table>
      </GlassCard>
    </> : null}
    {selectedRecord ? <SalesCorrectionSheet record={selectedRecord} products={products} onClose={() => setSelectedRecord(null)} /> : null}
  </section>;
}
