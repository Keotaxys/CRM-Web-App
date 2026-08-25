import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { getCustomer, archiveCustomer } from '../services/customersService';
import { subscribeActivities } from '../services/activitiesService';
import { trashCustomer } from '../services/adminService';
import { useAuth } from '../auth/useAuth';
import { customerQuickActions } from '../shared/quickActions';
import { canTrashCustomer } from '../shared/permissions';
import { formatDateTime } from '../shared/dateTime';

export default function CustomerDetailPage() {
  const { id } = useParams(); const navigate = useNavigate(); const identity = useAuth(); const [customer, setCustomer] = useState(null); const [activities, setActivities] = useState([]); const [error, setError] = useState('');
  const actor = { uid: identity.user.uid, role: identity.claims.role, branchId: identity.claims.branchId, accountStatus: identity.claims.accountStatus };
  useEffect(() => { getCustomer(id).then((item) => item ? setCustomer(item) : setError('ບໍ່ພົບລູກຄ້າ')).catch(() => setError('ບໍ່ສາມາດໂຫຼດລູກຄ້າ')); }, [id]);
  useEffect(() => subscribeActivities(identity, setActivities, (reason) => console.error(reason), { customerId: id }), [id, identity]);
  if (error) return <><Navbar title="ລາຍລະອຽດ" showBack/><div className="page-state">{error}</div></>;
  if (!customer) return <div className="page-state">ກຳລັງໂຫຼດ...</div>;
  const actions = customerQuickActions(customer);
  const archive = async () => { if (window.confirm('Archive ລູກຄ້ານີ້?')) { await archiveCustomer(id, identity); navigate('/customers'); } };
  const trash = async () => { if (window.confirm('ຍ້າຍລູກຄ້າໄປ Trash?')) { await trashCustomer(id); navigate('/customers'); } };
  return <><Navbar title={customer.name} showBack/><main className="page-content narrow space-y-4">
    <section className="panel customer-profile"><div className="detail-photos"><div>{customer.imageUrl ? <img src={customer.imageUrl} alt="Customer"/> : <div className="image-placeholder">ບໍ່ມີຮູບ</div>}<span>ຮູບລູກຄ້າ</span></div><div>{customer.placeImageUrl ? <img src={customer.placeImageUrl} alt="Place"/> : <div className="image-placeholder">ບໍ່ມີຮູບ</div>}<span>ຮູບຮ້ານ</span></div></div>
      <div className="detail-list"><p><span>ເບີໂທ</span><strong>{customer.phone}</strong></p><p><span>ທີ່ຢູ່</span><strong>{customer.address || '—'}</strong></p><p><span>ສະຖານະ</span><strong>{customer.status}</strong></p><p><span>ຄວາມສຳຄັນ</span><strong>{customer.priority}</strong></p><p><span>ໝາຍເຫດ</span><strong>{customer.note || '—'}</strong></p></div>
      <div className="quick-actions large">{actions.call && <a href={actions.call}>ໂທ</a>}{actions.whatsapp && <a href={actions.whatsapp} target="_blank" rel="noreferrer">WhatsApp</a>}{actions.map && <a href={actions.map} target="_blank" rel="noreferrer">ແຜນທີ່</a>}</div>
      <div className="flex flex-wrap gap-2 mt-4"><Link className="btn-primary" to={`/customers/${id}/edit`}>ແກ້ໄຂ</Link><Link className="btn-secondary" to={`/activities/new/customer_visit?customerId=${id}`}>ສ້າງ Customer Visit</Link><button className="btn-ghost" onClick={archive}>Archive</button>{canTrashCustomer(actor, customer) && <button className="btn-danger" onClick={trash}>Trash</button>}</div>
    </section>
    <section className="panel"><div className="section-heading"><h2>ກິດຈະກຳ & ປະຫວັດຢ້ຽມ</h2><span>{activities.length}</span></div>{activities.length ? <div className="activity-list compact">{activities.map((activity) => <Link to={`/activities/${activity.id}`} key={activity.id} className="activity-row"><div><strong>{activity.title}</strong><p>{activity.type} · {formatDateTime(activity.startAt)}</p></div><span className={`activity-status ${activity.status}`}>{activity.status}</span></Link>)}</div> : <p className="muted py-6 text-center">ຍັງບໍ່ມີກິດຈະກຳ</p>}</section>
  </main></>;
}
