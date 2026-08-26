import { Link } from 'react-router-dom';
import { CUSTOMER_STATUSES } from '../shared/constants';
import { customerQuickActions } from '../shared/quickActions';
import ManagedImage from './ManagedImage';
import CustomSelect from './ui/CustomSelect';
import GlassCard from './ui/GlassCard';

const statusOptions = CUSTOMER_STATUSES.map((value) => ({ value, label: value }));

export default function CustomerCard({ customer, onStatusChange }) {
  const actions = customerQuickActions(customer);
  return <GlassCard as="article" className="customer-card">
    <Link to={`/customers/${customer.id}`} className="customer-image-wrap">
      <ManagedImage storagePath={customer.imageStoragePath} legacyUrl={customer.imageUrl} alt={customer.name} fallback={<div className="image-placeholder"><span className="material-symbols-outlined">person</span></div>}/>
      {customer.priority !== 'ທົ່ວໄປ' && <span className={`priority priority-${customer.priority === 'VIP' ? 'vip' : 'urgent'}`}>{customer.priority}</span>}
    </Link>
    <div className="p-4"><Link to={`/customers/${customer.id}`}><h2 className="font-extrabold truncate">{customer.name}</h2><p className="muted text-xs mt-1 truncate">{customer.phone}</p></Link>
      <CustomSelect id={`customer-${customer.id}-status`} label={`Status for ${customer.name}`} value={customer.status} onChange={(nextValue) => onStatusChange(customer.id, nextValue)} options={statusOptions} compact />
      <div className="quick-actions">{actions.call && <a href={actions.call} aria-label="Call"><span className="material-symbols-outlined">call</span></a>}{actions.whatsapp && <a href={actions.whatsapp} target="_blank" rel="noreferrer" aria-label="WhatsApp"><strong>WA</strong></a>}{actions.map && <a href={actions.map} target="_blank" rel="noreferrer" aria-label="Map"><span className="material-symbols-outlined">location_on</span></a>}</div>
    </div>
  </GlassCard>;
}
