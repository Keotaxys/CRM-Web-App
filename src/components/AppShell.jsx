import { Outlet } from 'react-router-dom';
import BottomNav from './BottomNav';
import QuickCreate from './QuickCreate';

export default function AppShell() {
  return <div className="app-shell app-shell--mobile-nav"><div className="app-shell__content"><Outlet/></div><QuickCreate/><BottomNav/></div>;
}
