import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/useAuth';
import { BRANCHES, branchName } from '../branches/branches';
import { useLaosDay } from './useLaosDay';
import { subscribeAllSalesProducts, subscribeDailySales } from '../services/salesService';
import { subscribeAssignableUsers } from '../services/usersService';
import Button from '../components/ui/Button';
import CustomSelect from '../components/ui/CustomSelect';
import DateField from '../components/ui/DateField';
import GlassCard from '../components/ui/GlassCard';
import SearchableSelect from '../components/ui/SearchableSelect';
import { buildSalesReport, salesDateRange } from './salesReport';
import SalesCorrectionSheet from './SalesCorrectionSheet';
import { downloadSalesWorkbook } from './salesExport';

const PRESETS = [
  ['today', 'ມື້ນີ້'],
  ['week', 'ອາທິດນີ້'],
  ['month', 'ເດືອນນີ້'],
  ['year', 'ປີນີ້'],
  ['custom', 'ກຳນົດເອງ'],
];

function ReportTable({ title, columns, children }) {
  return (
    <div className="sales-report-table-wrap" role="region" aria-label={title} tabIndex={0}>
      <table>
        <thead><tr>{columns.map((column) => <th key={column} scope="col">{column}</th>)}</tr></thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export default function SalesReportPanel({ onExport, onCorrect } = {}) {
  const identity = useAuth();
  const role = identity.claims.role;
  const todayKey = useLaosDay();
  const [preset, setPreset] = useState('today');
  const [custom, setCustom] = useState({ startKey: '', endKey: '' });
  const [records, setRecords] = useState([]);
  const [products, setProducts] = useState([]);
  const [users, setUsers] = useState([]);
  const [filters, setFilters] = useState({ productId: '', staffUid: '', branchId: '' });
  const [queryFailureKey, setQueryFailureKey] = useState('');
  const [completedRangeKey, setCompletedRangeKey] = useState('');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [exportFeedback, setExportFeedback] = useState('');

  const rangeState = useMemo(() => {
    if (preset === 'custom' && (!custom.startKey || !custom.endKey)) {
      return { range: null, error: 'ກະລຸນາເລືອກວັນທີໃຫ້ຄົບ' };
    }
    try {
      return { range: salesDateRange(preset, todayKey, custom), error: '' };
    } catch {
      return { range: null, error: 'ຊ່ວງວັນທີບໍ່ຖືກຕ້ອງ' };
    }
  }, [custom, preset, todayKey]);
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
  const metadata = rangeState.range ? {
    ...rangeState.range, preset, filters,
    scope: role === 'staff' ? `ຂອງຕົນ ${identity.user.uid}`
      : role === 'branch_manager' ? `ສາຂາ ${identity.claims.branchId} ${branchName(identity.claims.branchId)}` : 'ທຸກສາຂາ',
    exporter: identity.profile?.name || identity.user.displayName || identity.user.uid,
    filterLabels: {
      product: productOptions.find((option) => option.value === filters.productId)?.label ?? filters.productId,
      staff: staffOptions.find((option) => option.value === filters.staffUid)?.label ?? filters.staffUid,
      branch: branchOptions.find((option) => option.value === filters.branchId)?.label ?? filters.branchId,
    },
  } : null;
  const queryError = Boolean(queryFailureKey && (queryFailureKey === '*' || queryFailureKey === rangeKey));
  const loaded = Boolean(rangeKey && completedRangeKey === rangeKey);
  const exportReport = async () => {
    setExporting(true); setExportFeedback('');
    try {
      const exportMetadata = { ...metadata, generatedAt: new Date() };
      await (onExport ? onExport(report, exportMetadata) : downloadSalesWorkbook(report, exportMetadata));
      setExportFeedback('ສົ່ງອອກ Excel ສຳເລັດ');
    }
    catch (error) { console.error(error); setExportFeedback('ສົ່ງອອກບໍ່ສຳເລັດ'); }
    finally { setExporting(false); }
  };

  return <section className="form-stack sales-report" aria-label="ລາຍງານຍອດຂາຍ">
    <GlassCard padded className="filter-panel">
      <div className="chip-row sales-tabs">
        {PRESETS.map(([value, label]) => <Button key={value} variant="neutral" aria-pressed={preset === value} onClick={() => setPreset(value)}>{label}</Button>)}
      </div>
      {preset === 'custom' ? <div className="form-grid">
        <DateField id="sales-start" label="ເລີ່ມວັນທີ" value={custom.startKey} onChange={(event) => setCustom((current) => ({ ...current, startKey: event.target.value }))} />
        <DateField id="sales-end" label="ສິ້ນສຸດວັນທີ" value={custom.endKey} onChange={(event) => setCustom((current) => ({ ...current, endKey: event.target.value }))} />
      </div> : null}
      {rangeState.error ? <div className="error-banner" role="alert">{rangeState.error}</div> : null}
      <div className="form-grid sales-filter-grid">
        <CustomSelect id="sales-product" label="ຜະລິດຕະພັນ" value={filters.productId} options={productOptions} onChange={(productId) => setFilters((current) => ({ ...current, productId }))} />
        {role === 'admin' ? <CustomSelect id="sales-branch" label="ສາຂາ" value={filters.branchId} options={branchOptions} onChange={(branchId) => setFilters((current) => ({ ...current, branchId, staffUid: '' }))} /> : null}
        {role !== 'staff' ? <SearchableSelect id="sales-staff" label="ພະນັກງານ" value={filters.staffUid} options={staffOptions} onChange={(staffUid) => setFilters((current) => ({ ...current, staffUid }))} searchPlaceholder="ຄົ້ນຫາພະນັກງານ" /> : null}
      </div>
    </GlassCard>
    {queryError ? <div className="error-banner" role="alert">ບໍ່ສາມາດໂຫຼດລາຍງານ</div> : null}
    {!queryError && loaded && rangeState.range ? <>
      <div className="summary-grid sales-summary-grid">
        <GlassCard padded><span>ຍອດລວມ {report.totalQuantity}</span></GlassCard>
        <GlassCard padded><span>{rangeState.range.startKey} – {rangeState.range.endKey}</span></GlassCard>
      </div>
      <Button variant="secondary" busy={exporting} onClick={exportReport}>ສົ່ງອອກ Excel</Button>
      {exportFeedback ? <p role={exportFeedback.includes('ບໍ່') ? 'alert' : 'status'} className={exportFeedback.includes('ບໍ່') ? 'error-banner' : 'status-message'}>{exportFeedback}</p> : null}
      <GlassCard as="section" padded>
        <h2>ອັນດັບຜະລິດຕະພັນ</h2>
        <ReportTable title="ອັນດັບຜະລິດຕະພັນ" columns={['ອັນດັບ', 'ຜະລິດຕະພັນ', 'ຍອດ', 'ເປີເຊັນ']}>
          {report.products.map((product) => <tr key={product.productId}>
            <td>{product.totalQuantity > 0 ? product.rank : '—'}</td><td>{product.name}</td><td>{product.totalQuantity}</td>
            <td>{product.percentage.toFixed(2)}%</td>
          </tr>)}
        </ReportTable>
      </GlassCard>
      <GlassCard as="section" padded>
        <h2>ຍອດຕາມພະນັກງານ</h2>
        <ReportTable title="ຍອດຕາມພະນັກງານ" columns={['ພະນັກງານ', 'ຍອດ']}>
          {report.staff.map((staff) => <tr key={staff.staffUid}><td>{staff.staffName}</td><td>{staff.totalQuantity}</td></tr>)}
        </ReportTable>
      </GlassCard>
      {role === 'admin' ? <GlassCard as="section" padded>
        <h2>ຍອດຕາມສາຂາ</h2>
        <ReportTable title="ຍອດຕາມສາຂາ" columns={['ສາຂາ', 'ຍອດ']}>
          {report.branches.map((branch) => <tr key={branch.branchId}>
            <td>{branchName(branch.branchId) || branch.branchId}</td><td>{branch.totalQuantity}</td>
          </tr>)}
        </ReportTable>
      </GlassCard> : null}
      <GlassCard as="section" padded>
        <h2>ຍອດປະຈຳວັນ</h2>
        <ReportTable title="ຍອດປະຈຳວັນ" columns={['ວັນທີ', 'ພະນັກງານ', 'ຍອດ', 'ການແກ້ໄຂ']}>
          {report.days.flatMap((day) => day.rows.map((row) => {
            const record = records.find((item) => item.id === row.id);
            return (
              <tr key={`${day.dateKey}-${row.staffUid}`}>
                <td>{day.dateKey}</td>
                <td>{row.staffName}</td>
                <td>{row.totalQuantity}</td>
                <td>{role !== 'staff' ? (
                  <Button
                    variant="neutral"
                    onClick={() => {
                      if (!record) return;
                      setSelectedRecord(record);
                      onCorrect?.(record);
                    }}
                  >
                    ແກ້ໄຂຍອດ {day.dateKey} {row.staffName}
                  </Button>
                ) : null}</td>
              </tr>
            );
          }))}
        </ReportTable>
      </GlassCard>
    </> : null}
    {selectedRecord ? <SalesCorrectionSheet record={selectedRecord} products={products} onClose={() => setSelectedRecord(null)} /> : null}
  </section>;
}
