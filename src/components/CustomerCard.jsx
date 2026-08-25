import { Link } from 'react-router-dom';
import { CUSTOMER_STATUSES } from '../shared/constants';
import { customerQuickActions } from '../shared/quickActions';
import ManagedImage from './ManagedImage';

const statusClass = { 'ໃໝ່': 'status-new', 'ຕິດຕາມຕໍ່': 'status-follow', 'ດຳເນີນການແລ້ວ': 'status-progress', 'ຈັດສົ່ງແລ້ວ': 'status-done' };

export default function CustomerCard({ customer, onStatusChange }) {
  const actions = customerQuickActions(customer);
  return <article className="customer-card">
    <Link to={`/customers/${customer.id}`} className="customer-image-wrap">
      <ManagedImage storagePath={customer.imageStoragePath} legacyUrl={customer.imageUrl} alt={customer.name} fallback={<div className="image-placeholder"><span className="material-symbols-outlined">person</span></div>}/>
      {customer.priority !== 'ທົ່ວໄປ' && <span className={`priority priority-${customer.priority === 'VIP' ? 'vip' : 'urgent'}`}>{customer.priority}</span>}
    </Link>
    <div className="p-4"><Link to={`/customers/${customer.id}`}><h2 className="font-extrabold truncate">{customer.name}</h2><p className="muted text-xs mt-1 truncate">{customer.phone}</p></Link>
      <select aria-label={`Status for ${customer.name}`} value={customer.status} onChange={(event) => onStatusChange(customer.id, event.target.value)} className={`status-select ${statusClass[customer.status] || ''}`}>{CUSTOMER_STATUSES.map((status) => <option key={status}>{status}</option>)}</select>
      <div className="quick-actions">{actions.call && <a href={actions.call} aria-label="Call"><span className="material-symbols-outlined">call</span></a>}{actions.whatsapp && <a href={actions.whatsapp} target="_blank" rel="noreferrer" aria-label="WhatsApp"><strong>WA</strong></a>}{actions.map && <a href={actions.map} target="_blank" rel="noreferrer" aria-label="Map"><span className="material-symbols-outlined">location_on</span></a>}</div>
    </div>
  </article>;
}
