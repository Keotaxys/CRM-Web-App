import { FOLLOW_UP_BUCKETS } from './constants';

function toDate(value) {
  if (value?.toDate) return value.toDate();
  return value instanceof Date ? value : new Date(value);
}

function localDayNumber(value, utcOffsetHours) {
  return Math.floor((toDate(value).getTime() + utcOffsetHours * 60 * 60 * 1000) / 86_400_000);
}

export function bucketFollowUp(activity, now = new Date(), utcOffsetHours = 7) {
  if (!activity?.followUpRequired || activity.followUpCompletedAt || !activity.followUpDate) return null;
  const followUpDay = localDayNumber(activity.followUpDate, utcOffsetHours);
  const today = localDayNumber(now, utcOffsetHours);
  if (followUpDay < today) return FOLLOW_UP_BUCKETS.OVERDUE;
  if (followUpDay === today) return FOLLOW_UP_BUCKETS.TODAY;
  return FOLLOW_UP_BUCKETS.UPCOMING;
}
