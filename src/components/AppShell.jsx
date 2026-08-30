import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import BottomNav from './BottomNav';
import QuickCreate from './QuickCreate';

export default function AppShell() {
  useEffect(() => {
    const lockClass = 'app-viewport--locked';
    document.documentElement.classList.add(lockClass);
    document.body.classList.add(lockClass);

    return () => {
      document.documentElement.classList.remove(lockClass);
      document.body.classList.remove(lockClass);
    };
  }, []);

  return <div className="app-shell app-shell--mobile-nav"><div className="app-shell__content"><Outlet/></div><QuickCreate/><BottomNav/></div>;
}
