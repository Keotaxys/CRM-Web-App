import { NavLink } from 'react-router-dom';

const items = [
  ['/', 'home', 'ໜ້າຫຼັກ'],
  ['/customers', 'groups', 'ລູກຄ້າ'],
  ['/activities', 'task_alt', 'ກິດຈະກຳ'],
  ['/calendar', 'calendar_month', 'ປະຕິທິນ'],
  ['/profile', 'more_horiz', 'ເພີ່ມເຕີມ'],
];

export default function BottomNav() {
  return <nav className="bottom-nav" aria-label="Main navigation">
    {items.map(([to, icon, label]) => <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
      <span className="material-symbols-outlined" aria-hidden="true">{icon}</span><span className="bottom-nav-item__label">{label}</span>
    </NavLink>)}
  </nav>;
}
