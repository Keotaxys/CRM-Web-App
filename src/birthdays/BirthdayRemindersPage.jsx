import { Link } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { branchName } from '../branches/branches';
import Navbar from '../components/Navbar';
import Button from '../components/ui/Button';
import GlassCard from '../components/ui/GlassCard';
import { useBirthdayReminders } from './useBirthdayReminders';

const groups = [
  ['today', 'ວັນເກີດມື້ນີ້'],
  ['week', 'ເຫຼືອ 1–7 ມື້'],
  ['fortnight', 'ເຫຼືອ 8–14 ມື້'],
];

function remainingLabel(daysRemaining) {
  return daysRemaining === 0
    ? 'ຮອດວັນເກີດມື້ນີ້'
    : `ເຫຼືອ ${daysRemaining} ມື້`;
}

function ReminderCard({
  admin,
  acknowledging,
  onAcknowledge,
  reminder,
}) {
  const { customer } = reminder;

  return <GlassCard as="article" padded className="birthday-reminder-card">
    <div className="birthday-reminder-card__body">
      <div className="birthday-reminder-card__icon" aria-hidden="true"><span className="material-symbols-outlined">cake</span></div>
      <div className="birthday-reminder-card__details"><h3>{customer.name}</h3><p>{customer.birthDate} · {remainingLabel(reminder.daysRemaining)}</p>{admin && <p>{branchName(customer.branchId)}</p>}</div>
    </div>
    <div className="birthday-reminder-card__actions"><Link className="ui-button ui-button--neutral ui-button--sm" to={`/customers/${customer.id}`} aria-label={`ເບິ່ງ ${customer.name}`}>ເບິ່ງລູກຄ້າ</Link><Button size="sm" busy={acknowledging} onClick={() => onAcknowledge(reminder)}>{acknowledging ? 'ກຳລັງບັນທຶກ...' : 'ອວຍພອນແລ້ວ'}</Button></div>
  </GlassCard>;
}

export default function BirthdayRemindersPage() {
  const { claims } = useAuth();
  const {
    acknowledgingIds,
    acknowledgeGreeting,
    error,
    loading,
    reminders,
  } = useBirthdayReminders();
  const admin = claims.role === 'admin';

  return <><Navbar title="ວັນເກີດ VIP"/><main className="page-content birthday-reminders-page"><GlassCard as="section" padded className="birthday-reminders-intro"><div><span className="eyebrow">VIP CARE</span><h2>ກຽມອວຍພອນລູກຄ້າລ່ວງໜ້າ</h2><p>ລາຍການຈະເລີ່ມສະແດງກ່ອນວັນເກີດ 14 ມື້</p></div></GlassCard>{error && <div className="error-banner" role="alert">{error}</div>}{loading && <div className="page-state">ກຳລັງໂຫຼດວັນເກີດ...</div>}{!loading && reminders.length === 0 && <div className="page-state">ບໍ່ມີວັນເກີດ VIP ໃນ 14 ມື້ຂ້າງໜ້າ</div>}{!loading && groups.map(([group, label]) => {
    const items = reminders.filter((reminder) => reminder.group === group);
    if (!items.length) return null;
    return <section className="birthday-reminder-group" key={group}><div className="section-heading"><h2>{label}</h2><span>{items.length}</span></div><div className="birthday-reminder-list">{items.map((reminder) => <ReminderCard key={`${reminder.customerId}:${reminder.occurrenceYear}`} admin={admin} reminder={reminder} acknowledging={acknowledgingIds.has(reminder.customerId)} onAcknowledge={acknowledgeGreeting}/>)}</div></section>;
  })}</main></>;
}
