import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { getCustomer, archiveCustomer } from '../services/customersService';
import { subscribeActivities } from '../services/activitiesService';
import { transferCustomer, trashCustomer } from '../services/adminService';
import { useAuth } from '../auth/useAuth';
import { canTrashCustomer } from '../shared/permissions';
import { formatDateTime } from '../shared/dateTime';
import { activityStatusLabel, activityTypeLabel } from '../shared/constants';
import ManagedImage from '../components/ManagedImage';
import ContactActions from '../components/ContactActions';
import Button from '../components/ui/Button';
import CustomSelect from '../components/ui/CustomSelect';
import StatusBadge from '../components/ui/StatusBadge';
import { BRANCHES, branchName } from '../branches/branches';

const transferBranchOptions = (branchId) => BRANCHES.filter((branch) => branch.id !== branchId).map((branch) => ({ value: branch.id, label: branch.label }));

export default function CustomerDetailPage() {
  const { id } = useParams(); const navigate = useNavigate(); const identity = useAuth(); const [customer, setCustomer] = useState(null); const [activities, setActivities] = useState([]); const [error, setError] = useState(''); const [actionError, setActionError] = useState(''); const [targetBranch, setTargetBranch] = useState('');
  const actor = { uid: identity.user.uid, role: identity.claims.role, branchId: identity.claims.branchId, accountStatus: identity.claims.accountStatus };
  useEffect(() => { getCustomer(id).then((item) => item ? setCustomer(item) : setError('ບໍ່ພົບລູກຄ້າ')).catch(() => setError('ບໍ່ສາມາດໂຫຼດລູກຄ້າ')); }, [id]);
  useEffect(() => subscribeActivities(identity, setActivities, (reason) => console.error(reason), { customerId: id }), [id, identity]);
  if (error) return <><Navbar title="ລາຍລະອຽດ" showBack/><div className="page-state error-banner" role="alert">{error}</div></>;
  if (!customer) return <div className="page-state">ກຳລັງໂຫຼດ...</div>;
  const archive = async () => { if (window.confirm('Archive ລູກຄ້ານີ້?')) { await archiveCustomer(id, identity); navigate('/customers'); } };
  const trash = async () => { if (window.confirm('ຍ້າຍລູກຄ້າໄປ Trash?')) { await trashCustomer(id); navigate('/customers'); } };
  const transfer = async () => {
    if (!targetBranch || targetBranch === customer.branchId || !window.confirm(`Transfer to ${branchName(targetBranch)}?`)) return;
    try { setActionError(''); await transferCustomer(id, targetBranch); setCustomer({ ...customer, branchId: targetBranch, branch: branchName(targetBranch) }); setTargetBranch(''); }
    catch (reason) { console.error(reason); setActionError(reason.message || 'Transfer failed'); }
  };
  return <><Navbar title={customer.name} showBack/><main className="page-content narrow space-y-4">{actionError && <div className="error-banner" role="alert">{actionError}</div>}
    <section className="panel customer-profile"><div className="detail-photos"><div><ManagedImage storagePath={customer.imageStoragePath} legacyUrl={customer.imageUrl} alt="Customer" fallback={<div className="image-placeholder">ບໍ່ມີຮູບ</div>}/><span>ຮູບລູກຄ້າ</span></div><div><ManagedImage storagePath={customer.placeImageStoragePath} legacyUrl={customer.placeImageUrl} alt="Place" fallback={<div className="image-placeholder">ບໍ່ມີຮູບ</div>}/><span>ຮູບຮ້ານ</span></div></div>
      <div className="detail-list"><p><span>ເບີໂທ</span><strong>{customer.phone}</strong></p><p><span>ທີ່ຢູ່</span><strong>{customer.address || '—'}</strong></p><p><span>ສະຖານະ</span><strong>{customer.status}</strong></p><p><span>ຄວາມສຳຄັນ</span><strong>{customer.priority}</strong></p><p><span>ໝາຍເຫດ</span><strong>{customer.note || '—'}</strong></p></div>
      <ContactActions customer={customer} size="large" showLabels className="mt-4" />
      <div className="flex flex-wrap gap-2 mt-4"><Link className="btn-primary" to={`/customers/${id}/edit`}>ແກ້ໄຂ</Link><Link className="btn-secondary" to={`/activities/new/customer_visit?customerId=${id}`}>ສ້າງນັດພົບລູກຄ້າ</Link><button className="btn-ghost" onClick={archive}>ເກັບເຂົ້າຄັງ</button>{canTrashCustomer(actor, customer) && <button className="btn-danger" onClick={trash}>ຍ້າຍໄປຖັງຂີ້ເຫຍື້ອ</button>}</div>
      {identity.claims.role === 'admin' && <div className="form-grid mt-4"><CustomSelect id="transfer-branch" label="Transfer branch" value={targetBranch} onChange={setTargetBranch} options={transferBranchOptions(customer.branchId)} placeholder="— Select —"/><Button variant="secondary" type="button" disabled={!targetBranch} onClick={transfer}>Transfer customer</Button></div>}
    </section>
    <section className="panel"><div className="section-heading"><h2>ກິດຈະກຳ & ປະຫວັດນັດພົບ</h2><span>{activities.length}</span></div>{activities.length ? <div className="activity-list compact">{activities.map((activity) => <Link to={`/activities/${activity.id}`} key={activity.id} className="activity-row"><div><strong>{activity.title}</strong><p>{activityTypeLabel(activity.type)} · {formatDateTime(activity.startAt)}</p></div><StatusBadge kind="activity" value={activity.status} label={activityStatusLabel(activity.status)}/></Link>)}</div> : <p className="muted py-6 text-center">ຍັງບໍ່ມີກິດຈະກຳ</p>}</section>
  </main></>;
}
