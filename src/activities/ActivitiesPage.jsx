import { useEffect, useMemo, useState } from 'react';
import Navbar from '../components/Navbar';
import ActivityCard from './ActivityCard';
import { useAuth } from '../auth/useAuth';
import { subscribeActivities } from '../services/activitiesService';
import {
  ACTIVITY_STATUSES,
  ACTIVITY_TYPES,
  activityStatusLabel,
  activityTypeLabel,
} from '../shared/constants';
import { subscribeAssignableUsers } from '../services/usersService';
import {
  isLaosDayWithinInclusiveRange,
  laosDayKey,
  laosTodayKey,
} from '../shared/dateTime';
import CustomSelect from '../components/ui/CustomSelect';
import SearchableSelect from '../components/ui/SearchableSelect';
import DateField from '../components/ui/DateField';
import GlassCard from '../components/ui/GlassCard';

const DATE_MODES = [
  ['today', 'ມື້ນີ້'],
  ['all', 'ທັງໝົດ'],
  ['custom', 'ກຳນົດເອງ'],
];

export default function ActivitiesPage() {
  const identity = useAuth();
  const [activities, setActivities] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState(() => {
    const today = laosTodayKey();
    return {
      type: 'all',
      scope: 'branch',
      staff: 'all',
      status: 'all',
      dateMode: 'today',
      dateFrom: today,
      dateTo: today,
    };
  });

  useEffect(() => subscribeActivities(identity, (items) => { setActivities(items); setLoading(false); }, (reason) => { console.error(reason); setError('ບໍ່ສາມາດໂຫຼດກິດຈະກຳ'); setLoading(false); }), [identity]);
  useEffect(() => subscribeAssignableUsers(identity, setUsers, (reason) => console.error(reason)), [identity]);

  const rangeInvalid = filters.dateMode === 'custom'
    && (!filters.dateFrom || !filters.dateTo || filters.dateFrom > filters.dateTo);

  const shown = useMemo(() => activities.filter((item) => {
    const matchesDate = filters.dateMode === 'all'
      || (filters.dateMode === 'today' && laosDayKey(item.startAt) === laosTodayKey())
      || (filters.dateMode === 'custom'
        && isLaosDayWithinInclusiveRange(item.startAt, filters.dateFrom, filters.dateTo));

    return matchesDate
      && (filters.type === 'all' || item.type === filters.type)
      && (filters.status === 'all' || item.status === filters.status)
      && (filters.scope === 'branch' || item.assignedStaffIds.includes(identity.user.uid))
      && (filters.staff === 'all' || item.assignedStaffIds.includes(filters.staff));
  }), [activities, filters, identity.user.uid]);

  const scopeOptions = [
    { value: 'branch', label: 'ກິດຈະກຳຂອງສາຂາ' },
    { value: 'mine', label: 'ກິດຈະກຳຂອງຂ້ອຍ' },
  ];
  const statusOptions = [
    { value: 'all', label: 'ທຸກສະຖານະ' },
    ...ACTIVITY_STATUSES.map((status) => ({ value: status, label: activityStatusLabel(status) })),
  ];
  const staffOptions = [
    { value: 'all', label: 'ພະນັກງານທັງໝົດ' },
    ...users.map((user) => ({
      value: user.uid,
      label: user.name || user.email,
      searchText: `${user.name || ''} ${user.email || ''}`,
    })),
  ];

  const setDateMode = (dateMode) => setFilters((current) => ({
    ...current,
    dateMode,
    dateFrom: current.dateFrom || laosTodayKey(),
    dateTo: current.dateTo || laosTodayKey(),
  }));

  return <>
    <Navbar title="ກິດຈະກຳ"/>
    <main className="page-content">
      <GlassCard as="section" className="filter-panel">
        <div className="chip-row">
          {[
            ['all', 'ທັງໝົດ'],
            ...Object.values(ACTIVITY_TYPES).map((type) => [type, activityTypeLabel(type)]),
          ].map(([value, label]) => (
            <button type="button" key={value} className={filters.type === value ? 'chip active' : 'chip'} onClick={() => setFilters({ ...filters, type: value })}>{label}</button>
          ))}
        </div>
        <div className="form-grid">
          <CustomSelect id="activities-scope" label="ຂອບເຂດກິດຈະກຳ" value={filters.scope} options={scopeOptions} onChange={(scope) => setFilters({ ...filters, scope })}/>
          <CustomSelect id="activities-status" label="ສະຖານະກິດຈະກຳ" value={filters.status} options={statusOptions} onChange={(status) => setFilters({ ...filters, status })}/>
          <SearchableSelect id="activities-staff" label="ພະນັກງານຮັບຜິດຊອບ" value={filters.staff} options={staffOptions} onChange={(staff) => setFilters({ ...filters, staff })} searchPlaceholder="ຄົ້ນຫາພະນັກງານ"/>
        </div>
        <div className="activity-date-filter">
          <span className="ui-field__label">ຊ່ວງວັນທີ</span>
          <div className="chip-row" role="group" aria-label="ຕົວກອງວັນທີ">
            {DATE_MODES.map(([value, label]) => (
              <button type="button" key={value} className={filters.dateMode === value ? 'chip active' : 'chip'} onClick={() => setDateMode(value)}>{label}</button>
            ))}
          </div>
          {filters.dateMode === 'custom' && <div className="form-grid activity-date-range">
            <DateField id="activities-date-from" type="date" label="ຈາກວັນທີ" value={filters.dateFrom} max={filters.dateTo} onChange={(event) => setFilters({ ...filters, dateFrom: event.target.value })}/>
            <DateField id="activities-date-to" type="date" label="ເຖິງວັນທີ" value={filters.dateTo} min={filters.dateFrom} onChange={(event) => setFilters({ ...filters, dateTo: event.target.value })}/>
          </div>}
          {rangeInvalid && <p className="ui-field__error" role="alert">ກະລຸນາເລືອກຊ່ວງວັນທີໃຫ້ຖືກຕ້ອງ</p>}
        </div>
      </GlassCard>
      {error && <div className="error-banner" role="alert">{error}</div>}
      {loading
        ? <div className="page-state">ກຳລັງໂຫຼດ...</div>
        : <section className="activity-list">
          {shown.map((item) => <ActivityCard key={item.id} activity={item}/>) }
          {!shown.length && <div className="page-state">ບໍ່ພົບກິດຈະກຳ</div>}
        </section>}
    </main>
  </>;
}
