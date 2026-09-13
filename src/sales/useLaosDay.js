import { useEffect, useState } from 'react';
import { laosTodayKey } from '../shared/dateTime';

export function useLaosDay() {
  const [day, setDay] = useState(() => laosTodayKey());
  useEffect(() => {
    const refresh = () => setDay(laosTodayKey());
    const timer = window.setInterval(refresh, 1000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);
  return day;
}
