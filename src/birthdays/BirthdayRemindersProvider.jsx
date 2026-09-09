import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useAuth } from '../auth/useAuth';
import {
  acknowledgeBirthdayGreeting,
  subscribeCustomers,
} from '../services/customersService';
import {
  birthdayReminderFor,
  sortBirthdayReminders,
} from '../shared/birthday';
import {
  laosTodayKey,
  millisecondsUntilNextLaosDay,
} from '../shared/dateTime';
import { BirthdayRemindersContext } from './BirthdayRemindersContext';

function reminderKey(reminder) {
  return `${reminder.customerId}:${reminder.occurrenceYear}`;
}

export default function BirthdayRemindersProvider({ children }) {
  const identity = useAuth();
  const [customers, setCustomers] = useState([]);
  const [todayKey, setTodayKey] = useState(() => laosTodayKey());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hiddenKeys, setHiddenKeys] = useState(() => new Set());
  const [acknowledgingIds, setAcknowledgingIds] = useState(
    () => new Set(),
  );

  useEffect(() => subscribeCustomers(
    identity,
    (items) => {
      setCustomers(items);
      setLoading(false);
      setError('');
    },
    () => {
      setError('ບໍ່ສາມາດໂຫຼດລາຍການວັນເກີດໄດ້');
      setLoading(false);
    },
  ), [identity]);

  useEffect(() => {
    let timerId;

    const refreshDay = () => {
      setTodayKey(laosTodayKey());
    };
    const scheduleNextDay = () => {
      timerId = globalThis.setTimeout(() => {
        refreshDay();
        scheduleNextDay();
      }, millisecondsUntilNextLaosDay() + 50);
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        refreshDay();
      }
    };

    scheduleNextDay();
    window.addEventListener('focus', refreshDay);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      globalThis.clearTimeout(timerId);
      window.removeEventListener('focus', refreshDay);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  const reminders = useMemo(() => sortBirthdayReminders(
    customers
      .map((customer) => birthdayReminderFor(customer, todayKey))
      .filter(Boolean)
      .filter((reminder) => !hiddenKeys.has(reminderKey(reminder))),
  ), [customers, hiddenKeys, todayKey]);

  const acknowledgeGreeting = useCallback(async (reminder) => {
    if (!reminder?.customerId) {
      return false;
    }

    setError('');
    setAcknowledgingIds((current) => new Set(current).add(
      reminder.customerId,
    ));

    try {
      await acknowledgeBirthdayGreeting(reminder.customerId);
      setHiddenKeys((current) => new Set(current).add(
        reminderKey(reminder),
      ));
      return true;
    }
    catch {
      setError('ບໍ່ສາມາດຢືນຢັນການອວຍພອນໄດ້');
      return false;
    }
    finally {
      setAcknowledgingIds((current) => {
        const next = new Set(current);
        next.delete(reminder.customerId);
        return next;
      });
    }
  }, []);

  const value = useMemo(() => ({
    acknowledgingIds,
    acknowledgeGreeting,
    count: reminders.length,
    error,
    loading,
    reminders,
    todayKey,
  }), [
    acknowledgingIds,
    acknowledgeGreeting,
    error,
    loading,
    reminders,
    todayKey,
  ]);

  return <BirthdayRemindersContext.Provider value={value}>
    {children}
  </BirthdayRemindersContext.Provider>;
}
