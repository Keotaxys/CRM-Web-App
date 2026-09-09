import { Link, useNavigate } from 'react-router-dom';
import { branchName } from '../branches/branches';
import { useAuth } from '../auth/useAuth';
import { useBirthdayReminders } from '../birthdays/useBirthdayReminders';
import Button from './ui/Button';
import IconButton from './ui/IconButton';

export default function Navbar({ title, showBack = false }) {
  const navigate = useNavigate();
  const { claims, logout } = useAuth();
  const { count } = useBirthdayReminders();
  const branch = claims.role === 'admin' ? 'ຜູ້ບໍລິຫານ · ທຸກສາຂາ' : branchName(claims.branchId);
  return <header className="app-header">
    <div className="flex items-center gap-3 min-w-0">
      {showBack ? <IconButton label="Back" tone="neutral" onClick={() => navigate(-1)}><span className="material-symbols-outlined" aria-hidden="true">arrow_back</span></IconButton> : <div className="brand-mark">CRM</div>}
      <div className="min-w-0"><h1 className="text-lg font-extrabold text-slate-800 truncate">{title}</h1><p className="text-[10px] text-teal-700 font-bold truncate">{branch}</p></div>
    </div>
    <div className="app-header-actions"><Link className="birthday-notification-link" to="/birthdays" aria-label={`ແຈ້ງເຕືອນວັນເກີດ ${count} ລາຍການ`}><span className="material-symbols-outlined" aria-hidden="true">notifications</span>{count > 0 && <span className="birthday-notification-count" data-testid="birthday-reminder-count">{count > 99 ? '99+' : count}</span>}</Link><Button variant="neutral" size="sm" className="text-xs" onClick={logout}>ອອກລະບົບ</Button></div>
  </header>;
}
