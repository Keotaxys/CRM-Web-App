import { Outlet } from 'react-router-dom';
import BottomNav from './BottomNav';
import QuickCreate from './QuickCreate';

export default function AppShell() {
  return <div className="app-shell"><Outlet/><QuickCreate/><BottomNav/></div>;
}
