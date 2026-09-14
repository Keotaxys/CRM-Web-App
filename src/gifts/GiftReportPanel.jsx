import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/useAuth';
import { branchName } from '../branches/branches';
import Button from '../components/ui/Button';
import CustomSelect from '../components/ui/CustomSelect';
import DateField from '../components/ui/DateField';
import GlassCard from '../components/ui/GlassCard';
import SearchableSelect from '../components/ui/SearchableSelect';
import {
  subscribeActiveGiftItems,
  subscribeGiftMovements,
  subscribeGiftStocks,
} from '../services/giftService';
import { subscribeAssignableUsers } from '../services/usersService';
import { useLaosDay } from '../sales/useLaosDay';
import { downloadGiftWorkbook } from './giftExport';
import { buildGiftReport, giftDateRange } from './giftReport';

const PRESETS = [
  ['today', 'ມື້ນີ້'],
  ['week', 'ອາທິດນີ້'],
  ['month', 'ເດືອນນີ້'],
  ['year', 'ປີນີ້'],
  ['custom', 'ກຳນົດເອງ'],
];
const MOVEMENT_TYPES = [
  'receive', 'allocation_receive', 'distribute',
  'distribution_amend', 'distribution_cancel', 'adjust',
];
const DISTRIBUTION_TYPES = new Set(['distribute', 'distribution_amend', 'distribution_cancel']);
const EMPTY_FILTERS = {
  giftId: '', staffUid: '', customerId: '', campaignId: '', movementType: '',
};

function uniqueOptions(rows, idField, nameFields) {
  const labels = new Map();
  for (const row of rows) {
    const id = row?.[idField];
    if (!id) continue;
    const name = nameFields.map((field) => row?.[field]).find(Boolean) ?? id;
    labels.set(id, name);
  }
  return [...labels.entries()]
    .sort(([leftId], [rightId]) => leftId.localeCompare(rightId))
    .map(([value, label]) => ({ value, label }));
}

function allOption(options) {
  return [{ value: '', label: 'ທັງໝົດ' }, ...options];
}

function ReportTable({ title, columns, children }) {
  return <div className="sales-report-table-wrap" role="region" aria-label={title} tabIndex={0}>
    <table>
      <thead><tr>{columns.map((column) => <th key={column} scope="col">{column}</th>)}</tr></thead>
      <tbody>{children}</tbody>
    </table>
  </div>;
}

function SummaryTable({ title, rows, idField, nameField }) {
  if (!rows.length) return null;
  return <GlassCard as="section" padded>
    <h2>{title}</h2>
    <ReportTable title={title} columns={[title, 'ຍອດແຈກ']}>
      {rows.map((row) => <tr key={row[idField]}>
        <td>{row[nameField] || row[idField]}</td><td>{row.distributedUnits}</td>
      </tr>)}
    </ReportTable>
  </GlassCard>;
}

export default function GiftReportPanel({ effectiveBranchId: branchOverride, onExport } = {}) {
  const identity = useAuth();
  const role = identity?.claims?.role;
  const currentUid = identity?.user?.uid;
  const effectiveBranchId = role === 'admin' ? branchOverride : identity?.claims?.branchId;
  const canViewInbound = role !== 'staff';
  const todayKey = useLaosDay();
  const [preset, setPreset] = useState('today');
  const [custom, setCustom] = useState({ startKey: '', endKey: '' });
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [gifts, setGifts] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [movements, setMovements] = useState([]);
  const [users, setUsers] = useState([]);
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  const [stocksLoaded, setStocksLoaded] = useState(false);
  const [usersLoaded, setUsersLoaded] = useState(role === 'staff');
  const [completedRangeKey, setCompletedRangeKey] = useState('');
  const [errors, setErrors] = useState({ catalog: false, stocks: false, users: false, movements: '' });
  const [exporting, setExporting] = useState(false);
  const [exportFeedback, setExportFeedback] = useState('');

  const rangeState = useMemo(() => {
    if (preset === 'custom' && (!custom.startKey || !custom.endKey)) {
      return { range: null, error: 'ກະລຸນາເລືອກວັນທີໃຫ້ຄົບ' };
    }
    try {
      return { range: giftDateRange(preset, todayKey, custom), error: '' };
    } catch {
      return { range: null, error: 'ຊ່ວງວັນທີບໍ່ຖືກຕ້ອງ' };
    }
  }, [custom, preset, todayKey]);
  const rangeKey = rangeState.range
    ? `${rangeState.range.startKey}|${rangeState.range.endKey}|${effectiveBranchId ?? ''}` : '';

  useEffect(() => {
    let live = true;
    setCatalogLoaded(false);
    setErrors((current) => ({ ...current, catalog: false }));
    const stopCatalog = subscribeActiveGiftItems((next) => {
      if (!live) return;
      setGifts(next);
      setCatalogLoaded(true);
    }, () => {
      if (!live) return;
      setCatalogLoaded(true);
      setErrors((current) => ({ ...current, catalog: true }));
    });
    let stopUsers;
    if (role === 'staff') {
      setUsers([]);
      setUsersLoaded(true);
    } else {
      setUsersLoaded(false);
      setErrors((current) => ({ ...current, users: false }));
      stopUsers = subscribeAssignableUsers(identity, (next) => {
        if (!live) return;
        setUsers(next);
        setUsersLoaded(true);
      }, () => {
        if (!live) return;
        setUsersLoaded(true);
        setErrors((current) => ({ ...current, users: true }));
      });
    }
    return () => {
      live = false;
      stopCatalog?.();
      stopUsers?.();
    };
  }, [identity, role]);

  useEffect(() => {
    if (!effectiveBranchId) return undefined;
    let live = true;
    setStocksLoaded(false);
    setErrors((current) => ({ ...current, stocks: false }));
    const stop = subscribeGiftStocks(identity, { branchId: effectiveBranchId }, (next) => {
      if (!live) return;
      setStocks(next);
      setStocksLoaded(true);
    }, () => {
      if (!live) return;
      setStocksLoaded(true);
      setErrors((current) => ({ ...current, stocks: true }));
    });
    return () => {
      live = false;
      stop?.();
    };
  }, [effectiveBranchId, identity]);

  useEffect(() => {
    if (!rangeState.range || !effectiveBranchId) return undefined;
    let live = true;
    const subscriptionKey = rangeKey;
    setCompletedRangeKey('');
    setErrors((current) => ({ ...current, movements: '' }));
    const options = { ...rangeState.range, branchId: effectiveBranchId };
    const stop = subscribeGiftMovements(identity, options, (next) => {
      if (!live) return;
      setMovements(next);
      setCompletedRangeKey(subscriptionKey);
    }, () => {
      if (!live) return;
      setCompletedRangeKey(subscriptionKey);
      setErrors((current) => ({ ...current, movements: subscriptionKey }));
    });
    return () => {
      live = false;
      stop?.();
    };
  }, [effectiveBranchId, identity, rangeKey, rangeState.range]);

  const userNameById = useMemo(() => new Map(users.map((user) => [
    user.uid, user.name ?? user.displayName ?? user.uid,
  ])), [users]);
  const namedMovements = useMemo(() => movements.map((movement) => ({
    ...movement,
    actorNameSnapshot: movement.actorNameSnapshot ?? userNameById.get(movement.actorUid),
    distributionOwnerNameSnapshot: movement.distributionOwnerNameSnapshot
      ?? userNameById.get(movement.distributionOwnerUid),
  })), [movements, userNameById]);

  const reportState = useMemo(() => {
    if (!rangeState.range || !effectiveBranchId) return { report: null, error: false };
    try {
      return {
        report: buildGiftReport({
          movements: namedMovements,
          stocks,
          gifts,
          filters: {
            ...filters,
            ...rangeState.range,
            branchId: effectiveBranchId,
            staffUid: role === 'staff' ? currentUid : filters.staffUid,
            canViewInbound,
          },
        }),
        error: false,
      };
    } catch {
      return { report: null, error: true };
    }
  }, [canViewInbound, currentUid, effectiveBranchId, filters, gifts, namedMovements, rangeState.range, role, stocks]);

  const giftOptions = allOption(gifts.map((gift) => ({ value: gift.id, label: gift.name ?? gift.id })));
  const branchUsers = users.filter((user) => user.branchId === effectiveBranchId);
  const staffOptions = allOption(branchUsers.map((user) => ({
    value: user.uid, label: user.name ?? user.displayName ?? user.uid,
  })));
  const customerOptions = allOption(uniqueOptions(
    namedMovements, 'customerId', ['customerNameSnapshot', 'customerName'],
  ));
  const campaignOptions = allOption(uniqueOptions(
    namedMovements, 'campaignId', ['campaignNameSnapshot', 'campaignName'],
  ));
  const visibleMovementTypes = canViewInbound
    ? MOVEMENT_TYPES : MOVEMENT_TYPES.filter((type) => DISTRIBUTION_TYPES.has(type));
  const movementOptions = allOption(visibleMovementTypes.map((value) => ({ value, label: value })));
  const queryError = errors.catalog || errors.stocks || errors.users
    || Boolean(errors.movements && errors.movements === rangeKey) || reportState.error;
  const loaded = Boolean(effectiveBranchId && rangeKey && catalogLoaded && stocksLoaded
    && usersLoaded && completedRangeKey === rangeKey);
  const report = reportState.report;

  const metadata = rangeState.range ? {
    ...rangeState.range,
    preset,
    filters: {
      ...filters,
      branchId: effectiveBranchId,
      staffUid: role === 'staff' ? currentUid : filters.staffUid,
    },
    scope: role === 'staff' ? `ຂອງຕົນ ${currentUid}` : `ສາຂາ ${branchName(effectiveBranchId) || effectiveBranchId}`,
    exportedBy: identity?.profile?.name || identity?.user?.displayName || currentUid,
  } : null;

  const exportReport = async () => {
    if (!report || !metadata) return;
    setExporting(true);
    setExportFeedback('');
    try {
      const exportMetadata = { ...metadata, generatedAt: new Date() };
      await (onExport
        ? onExport(report, exportMetadata)
        : downloadGiftWorkbook(report, exportMetadata));
      setExportFeedback('ສົ່ງອອກ Excel ສຳເລັດ');
    } catch (error) {
      console.error(error);
      setExportFeedback('ສົ່ງອອກບໍ່ສຳເລັດ');
    } finally {
      setExporting(false);
    }
  };

  if (role === 'admin' && !effectiveBranchId) {
    return <div className="error-banner" role="alert">ກະລຸນາເລືອກສາຂາ</div>;
  }

  return <section className="form-stack sales-report" aria-label="ລາຍງານເຄື່ອງແຈກ">
    <GlassCard padded className="filter-panel">
      <div className="chip-row sales-tabs">
        {PRESETS.map(([value, label]) => <Button
          key={value} variant="neutral" aria-pressed={preset === value}
          onClick={() => setPreset(value)}
        >{label}</Button>)}
      </div>
      {preset === 'custom' ? <div className="form-grid">
        <DateField id="gift-report-start" label="ເລີ່ມວັນທີ" value={custom.startKey}
          onChange={(event) => setCustom((current) => ({ ...current, startKey: event.target.value }))} />
        <DateField id="gift-report-end" label="ສິ້ນສຸດວັນທີ" value={custom.endKey}
          onChange={(event) => setCustom((current) => ({ ...current, endKey: event.target.value }))} />
      </div> : null}
      {rangeState.error ? <div className="error-banner" role="alert">{rangeState.error}</div> : null}
      <div className="form-grid sales-filter-grid">
        <CustomSelect id="gift-report-gift" label="ເຄື່ອງແຈກ" value={filters.giftId}
          options={giftOptions} onChange={(giftId) => setFilters((current) => ({ ...current, giftId }))} />
        {role === 'admin' ? <CustomSelect id="gift-report-branch" label="ສາຂາ"
          value={effectiveBranchId} options={[{
            value: effectiveBranchId, label: branchName(effectiveBranchId) || effectiveBranchId,
          }]} onChange={() => {}} disabled /> : null}
        {role !== 'staff' ? <SearchableSelect id="gift-report-staff" label="ພະນັກງານ"
          value={filters.staffUid} options={staffOptions}
          onChange={(staffUid) => setFilters((current) => ({ ...current, staffUid }))} /> : null}
        <SearchableSelect id="gift-report-customer" label="ລູກຄ້າ" value={filters.customerId}
          options={customerOptions}
          onChange={(customerId) => setFilters((current) => ({ ...current, customerId }))} />
        <SearchableSelect id="gift-report-campaign" label="Campaign" value={filters.campaignId}
          options={campaignOptions}
          onChange={(campaignId) => setFilters((current) => ({ ...current, campaignId }))} />
        <CustomSelect id="gift-report-movement" label="movement type" value={filters.movementType}
          options={movementOptions}
          onChange={(movementType) => setFilters((current) => ({ ...current, movementType }))} />
      </div>
    </GlassCard>

    {queryError ? <div className="error-banner" role="alert">ບໍ່ສາມາດໂຫຼດລາຍງານ</div> : null}
    {!queryError && rangeState.range && !loaded
      ? <p role="status">ກຳລັງໂຫຼດລາຍງານ</p> : null}
    {!queryError && loaded && report ? <>
      <div className="summary-grid sales-summary-grid">
        {report.canViewInbound ? <GlassCard padded><span>ຍອດຮັບ {report.receivedUnits}</span></GlassCard> : null}
        <GlassCard padded><span>ຍອດແຈກ {report.distributedUnits}</span></GlassCard>
        <GlassCard padded><span>Stock ປັດຈຸບັນ {report.currentUnits}</span></GlassCard>
        <GlassCard padded><span>low-stock {report.lowStockCount}</span></GlassCard>
        <GlassCard padded><span>{rangeState.range.startKey} – {rangeState.range.endKey}</span></GlassCard>
      </div>
      <Button variant="secondary" busy={exporting} onClick={exportReport}>ສົ່ງອອກ Excel</Button>
      {exportFeedback ? <p
        role={exportFeedback.includes('ບໍ່') ? 'alert' : 'status'}
        className={exportFeedback.includes('ບໍ່') ? 'error-banner' : 'status-message'}
      >{exportFeedback}</p> : null}

      <SummaryTable title="ສະຫຼຸບຕາມ gift" rows={report.gifts}
        idField="giftId" nameField="giftName" />
      <SummaryTable title="ສະຫຼຸບຕາມ branch" rows={report.branches}
        idField="branchId" nameField="branchName" />
      <SummaryTable title="ສະຫຼຸບຕາມ staff" rows={report.staff}
        idField="staffUid" nameField="staffName" />
      <SummaryTable title="ສະຫຼຸບຕາມ customer" rows={report.customers}
        idField="customerId" nameField="customerName" />
      <SummaryTable title="ສະຫຼຸບຕາມ Campaign" rows={report.campaigns}
        idField="campaignId" nameField="campaignName" />
      <GlassCard as="section" padded>
        <h2>ລາຍການເຄື່ອນໄຫວ</h2>
        {report.movements.length ? <ReportTable
          title="ລາຍການເຄື່ອນໄຫວ"
          columns={['ວັນທີ', 'movement type', 'gift', 'delta', 'ສາຂາ', 'ຜູ້ແຈກ', 'actor', 'ຜູ້ຮັບ', 'ເຫດຜົນ']}
        >
          {report.movements.map((row) => <tr key={row.id}>
            <td>{row.dateKey}</td><td>{row.movementType}</td><td>{row.giftName}</td>
            <td>{row.deltaUnits}</td><td>{row.branchId}</td>
            <td>{row.distributionOwnerName || '—'}</td><td>{row.actorName || '—'}</td>
            <td>{row.recipientName || '—'}</td><td>{row.reason || '—'}</td>
          </tr>)}
        </ReportTable> : <p>ບໍ່ມີລາຍການເຄື່ອນໄຫວ</p>}
      </GlassCard>
    </> : null}
  </section>;
}
