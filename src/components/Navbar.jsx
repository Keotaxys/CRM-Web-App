import { useNavigate } from 'react-router-dom';
import { branchName } from '../branches/branches';
import { useAuth } from '../auth/useAuth';

export default function Navbar({ title, showBack = false }) {
  const navigate = useNavigate();
  const { claims, logout } = useAuth();
  const branch = claims.role === 'admin' ? 'Admin · ທຸກສາຂາ' : branchName(claims.branchId);
  return <header className="app-header">
    <div className="flex items-center gap-3 min-w-0">
      {showBack ? <button aria-label="Back" className="icon-button" onClick={() => navigate(-1)}>←</button> : <div className="brand-mark">CRM</div>}
      <div className="min-w-0"><h1 className="text-lg font-extrabold text-slate-800 truncate">{title}</h1><p className="text-[10px] text-teal-700 font-bold truncate">{branch}</p></div>
    </div>
    <button className="btn-ghost text-xs" onClick={logout}>ອອກລະບົບ</button>
  </header>;
}
