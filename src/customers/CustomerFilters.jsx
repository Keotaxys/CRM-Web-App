import { CUSTOMER_STATUSES, PRIORITIES } from '../shared/constants';

export default function CustomerFilters({ filters, onChange }) {
  return <section className="filter-panel"><label className="search-box"><span className="material-symbols-outlined">search</span><input aria-label="Search customers" placeholder="ຄົ້ນຫາຊື່, ເບີໂທ, ທີ່ຢູ່..." value={filters.search} onChange={(event) => onChange({ ...filters, search: event.target.value })}/></label>
    <div className="chip-row">{['ທັງໝົດ', ...CUSTOMER_STATUSES].map((status) => <button key={status} className={filters.status === status ? 'chip active' : 'chip'} onClick={() => onChange({ ...filters, status })}>{status}</button>)}</div>
    <div className="chip-row">{['ທັງໝົດ', ...PRIORITIES].map((priority) => <button key={priority} className={filters.priority === priority ? 'chip active' : 'chip'} onClick={() => onChange({ ...filters, priority })}>{priority}</button>)}</div>
  </section>;
}
