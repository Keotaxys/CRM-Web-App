import { Link } from 'react-router-dom';
import { formatDateTime } from '../shared/dateTime';

const icons = { appointment: 'event', event: 'campaign', customer_visit: 'handshake' };
const labels = { appointment: 'ນັດໝາຍ', event: 'ກິດຈະກຳ', customer_visit: 'ຢ້ຽມລູກຄ້າ' };

export default function ActivityCard({ activity }) {
  return <Link className="activity-card" to={`/activities/${activity.id}`}>
    <div className={`activity-icon ${activity.type}`}><span className="material-symbols-outlined">{icons[activity.type]}</span></div>
    <div className="min-w-0 flex-1"><div className="flex gap-2 items-center"><span className="eyebrow">{labels[activity.type]}</span>{activity.followUpRequired && !activity.followUpCompletedAt && <span className="follow-badge">Follow-up</span>}</div><h2 className="font-extrabold truncate mt-1">{activity.title}</h2><p className="muted text-xs mt-1">{formatDateTime(activity.startAt)} · {activity.location || 'ບໍ່ລະບຸສະຖານທີ່'}</p><p className="muted text-xs mt-1">ຜູ້ຮັບຜິດຊອບ {activity.assignedStaffIds?.length || 0} ຄົນ</p></div>
    <span className={`activity-status ${activity.status}`}>{activity.status}</span>
  </Link>;
}
