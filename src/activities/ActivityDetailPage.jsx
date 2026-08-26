import { useEffect, useState } from 'react'; import { Link, useNavigate, useParams } from 'react-router-dom'; import Navbar from '../components/Navbar'; import { cancelActivity, completeFollowUp, getActivity, trashActivity } from '../services/activitiesService'; import { getCustomer } from '../services/customersService'; import { useAuth } from '../auth/useAuth'; import { canEditActivity, canTrashActivity } from '../shared/permissions'; import { formatDateTime, fromLaosDateTimeInput } from '../shared/dateTime';
import { activityStatusLabel, activityTypeLabel } from '../shared/constants';
import DateField from '../components/ui/DateField'; import StatusBadge from '../components/ui/StatusBadge';
import ContactActions from '../components/ContactActions';

export default function ActivityDetailPage() {
  const { id } = useParams(); const navigate = useNavigate(); const identity = useAuth(); const [activity, setActivity] = useState(null); const [linkedCustomer, setLinkedCustomer] = useState(null); const [error, setError] = useState(''); const [nextAction, setNextAction] = useState(''); const [nextDate, setNextDate] = useState('');
  useEffect(() => { getActivity(id).then((item) => item ? setActivity(item) : setError('ບໍ່ພົບກິດຈະກຳ')).catch(() => setError('ໂຫຼດບໍ່ສຳເລັດ')); }, [id]);
  useEffect(() => {
    if (!activity?.customerId) return undefined;
    let active = true;
    getCustomer(activity.customerId).then((customer) => { if (active) setLinkedCustomer(customer); }).catch(() => { if (active) setLinkedCustomer(null); });
    return () => { active = false; };
  }, [activity?.customerId]);
  if (error) return <><Navbar title="ກິດຈະກຳ" showBack/><div className="page-state">{error}</div></>; if (!activity) return <div className="page-state">ກຳລັງໂຫຼດ...</div>;
  const actor = { uid: identity.user.uid, role: identity.claims.role, branchId: identity.claims.branchId, accountStatus: identity.claims.accountStatus };
  const cancel = async () => { await cancelActivity(id); setActivity({ ...activity, status: 'cancelled' }); };
  const trash = async () => { if (window.confirm('ຍ້າຍໄປ Trash?')) { await trashActivity(id); navigate('/activities'); } };
  const follow = async () => { await completeFollowUp(id); setActivity({ ...activity, followUpCompletedAt: new Date() }); };
  const reschedule = async () => { if (!nextAction || !nextDate) return; const followUpDate = fromLaosDateTimeInput(nextDate); await completeFollowUp(id, { nextAction, followUpDate: followUpDate.toISOString() }); setActivity({ ...activity, nextAction, followUpDate, followUpCompletedAt: null }); setNextAction(''); setNextDate(''); };
  return <><Navbar title={activity.title} showBack/><main className="page-content narrow space-y-4"><section className="panel"><div className="flex justify-between gap-3"><div><span className="eyebrow">{activityTypeLabel(activity.type)}</span><h1 className="text-2xl font-extrabold mt-1">{activity.title}</h1></div><StatusBadge kind="activity" value={activity.status} label={activityStatusLabel(activity.status)}/></div>
    <div className="detail-list mt-5"><p><span>ເລີ່ມ</span><strong>{formatDateTime(activity.startAt)}</strong></p><p><span>ສິ້ນສຸດ</span><strong>{formatDateTime(activity.endAt)}</strong></p><p><span>ສະຖານທີ່</span><strong>{activity.location || '—'}</strong></p><p><span>ຈຸດປະສົງ</span><strong>{activity.purpose || activity.visitPurpose || '—'}</strong></p><p><span>ຜູ້ຮັບຜິດຊອບ</span><strong>{activity.assignedStaffIds.length} ຄົນ</strong></p><p><span>ໝາຍເຫດ</span><strong>{activity.note || activity.visitNotes || '—'}</strong></p></div>
    {activity.customerId && <section className="linked-customer-card mt-4"><h2>ລູກຄ້າ</h2>{linkedCustomer && <><strong>{linkedCustomer.name}</strong><ContactActions customer={linkedCustomer} size="large" showLabels className="mt-3" /></>}<Link className="btn-secondary inline-block mt-3" to={`/customers/${activity.customerId}`}>ເບິ່ງລູກຄ້າ</Link></section>}{activity.followUpRequired && !activity.followUpCompletedAt && <div className="follow-panel mt-4"><strong>ຂັ້ນຕອນຕໍ່ໄປ: {activity.nextAction}</strong><p>{formatDateTime(activity.followUpDate)}</p><button className="btn-primary mt-3" onClick={follow}>ໝາຍວ່າຕິດຕາມສຳເລັດ</button><div className="form-grid mt-3"><input aria-label="ຂັ້ນຕອນຕໍ່ໄປໃໝ່" placeholder="ຂັ້ນຕອນຕໍ່ໄປໃໝ່" value={nextAction} onChange={(event) => setNextAction(event.target.value)}/><DateField id="activity-reschedule-date" type="datetime-local" label="ວັນທີຕິດຕາມໃໝ່" value={nextDate} onChange={(event) => setNextDate(event.target.value)}/></div><button className="btn-secondary mt-2" disabled={!nextAction || !nextDate} onClick={reschedule}>ກຳນົດຕິດຕາມໃໝ່</button></div>}
    <div className="flex flex-wrap gap-2 mt-5">{canEditActivity(actor, activity) && <><Link className="btn-primary" to={`/activities/${id}/edit`}>ແກ້ໄຂ</Link>{activity.status !== 'cancelled' && <button className="btn-ghost" onClick={cancel}>ຍົກເລີກ</button>}</>}{canTrashActivity(actor, activity) && <button className="btn-danger" onClick={trash}>ຍ້າຍໄປຖັງຂີ້ເຫຍື້ອ</button>}</div>
  </section></main></>;
}
