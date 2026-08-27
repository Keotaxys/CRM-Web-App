import { CUSTOMER_STATUSES, PRIORITIES } from '../shared/constants';
import Button from '../components/ui/Button';
import GlassCard from '../components/ui/GlassCard';
import Input from '../components/ui/Input';

export default function CustomerFilters({ filters, onChange }) {
  return <GlassCard as="section" className="filter-panel"><Input id="customer-search" ariaLabel="ຄົ້ນຫາລູກຄ້າ" placeholder="ຄົ້ນຫາຊື່, ເບີໂທ, ທີ່ຢູ່..." value={filters.search} onChange={(event) => onChange({ ...filters, search: event.target.value })}/>
    <div className="chip-row">{['ທັງໝົດ', ...CUSTOMER_STATUSES].map((status) => <Button key={status} variant="neutral" className={filters.status === status ? 'chip active' : 'chip'} onClick={() => onChange({ ...filters, status })}>{status}</Button>)}</div>
    <div className="chip-row">{['ທັງໝົດ', ...PRIORITIES].map((priority) => <Button key={priority} variant="neutral" className={filters.priority === priority ? 'chip active' : 'chip'} onClick={() => onChange({ ...filters, priority })}>{priority}</Button>)}</div>
  </GlassCard>;
}
