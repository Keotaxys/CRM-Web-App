import { useContext } from 'react';
import { BirthdayRemindersContext } from './BirthdayRemindersContext';

export function useBirthdayReminders() {
  const value = useContext(BirthdayRemindersContext);

  if (!value) {
    throw new Error(
      'useBirthdayReminders must be used inside BirthdayRemindersProvider',
    );
  }

  return value;
}
