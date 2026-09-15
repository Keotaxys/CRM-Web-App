import { Link } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { useBirthdayReminders } from '../birthdays/useBirthdayReminders';
import Navbar from '../components/Navbar';
import Button from '../components/ui/Button';
import GlassCard from '../components/ui/GlassCard';
import { useGiftLowStock } from '../gifts/useGiftLowStock';

function BirthdayCard({ reminder, acknowledging, onAcknowledge }) {
  const { customer } = reminder;
  return <GlassCard as="article" padded className="birthday-reminder-card">
    <div className="birthday-reminder-card__body"><div className="birthday-reminder-card__icon" aria-hidden="true"><span className="material-symbols-outlined">cake</span></div><div className="birthday-reminder-card__details"><h3>{customer.name}</h3><p>{customer.birthDate}</p></div></div>
    <div className="birthday-reminder-card__actions"><Link className="ui-button ui-button--neutral ui-button--sm" to={`/customers/${customer.id}`} aria-label={`ເບິ່ງ ${customer.name}`}>ເບິ່ງລູກຄ້າ</Link><Button size="sm" busy={acknowledging} onClick={() => onAcknowledge(reminder)}>{acknowledging ? 'ກຳລັງບັນທຶກ...' : 'ອວຍພອນແລ້ວ'}</Button></div>
  </GlassCard>;
}

function LowStockCard({ item }) {
  const giftName = item.gift?.name ?? item.giftId;
  return <GlassCard as="article" padded className="gift-low-stock-card">
    <div><h3>{giftName}</h3><p>ຍັງເຫຼືອ {item.currentUnits} · ຂັ້ນຕ່ຳ {item.lowStockThresholdUnits}</p></div>
    <Link className="ui-button ui-button--neutral ui-button--sm" to={`/gifts?tab=stock&branchId=${item.branchId}&giftId=${item.giftId}`} aria-label={`ເບິ່ງສະຕັອກ ${giftName}`}>ເບິ່ງສະຕັອກ</Link>
  </GlassCard>;
}

export default function NotificationCenterPage() {
  const { claims } = useAuth();
  const birthdays = useBirthdayReminders();
  const gifts = useGiftLowStock();
  const mayViewGiftStock = claims.role === 'branch_manager' || claims.role === 'admin';

  return <><Navbar title="ແຈ້ງເຕືອນ"/><main className="page-content notification-center-page">
    {birthdays.error && <div className="error-banner" role="alert">{birthdays.error}</div>}
    {gifts.error && mayViewGiftStock && <div className="error-banner" role="alert">{gifts.error}</div>}
    <section className="birthday-reminder-group"><div className="section-heading"><h2>ວັນເກີດ VIP</h2><span>{birthdays.count}</span></div>
      {birthdays.loading ? <div className="page-state">ກຳລັງໂຫຼດວັນເກີດ...</div> : birthdays.reminders.map((reminder) => <BirthdayCard key={`${reminder.customerId}:${reminder.occurrenceYear}`} reminder={reminder} acknowledging={birthdays.acknowledgingIds.has(reminder.customerId)} onAcknowledge={birthdays.acknowledgeGreeting}/>)}
    </section>
    {mayViewGiftStock && <section className="birthday-reminder-group"><div className="section-heading"><h2>ສະຕັອກໃກ້ໝົດ</h2><span>{gifts.count}</span></div>
      {gifts.loading ? <div className="page-state">ກຳລັງໂຫຼດສະຕັອກ...</div> : gifts.items.map((item) => <LowStockCard key={`${item.branchId}:${item.giftId}`} item={item}/>)}
    </section>}
  </main></>;
}
