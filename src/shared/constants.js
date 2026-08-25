export const ROLES = Object.freeze({
  ADMIN: 'admin',
  BRANCH_MANAGER: 'branch_manager',
  STAFF: 'staff',
});

export const ACCOUNT_STATUSES = Object.freeze({
  PENDING: 'pending',
  APPROVED: 'approved',
  DISABLED: 'disabled',
});

export const ACTIVITY_TYPES = Object.freeze({
  APPOINTMENT: 'appointment',
  EVENT: 'event',
  CUSTOMER_VISIT: 'customer_visit',
});

export const ACTIVITY_STATUSES = Object.freeze([
  'planned',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
]);

export const CUSTOMER_STATUSES = Object.freeze([
  'ໃໝ່',
  'ຕິດຕາມຕໍ່',
  'ດຳເນີນການແລ້ວ',
  'ຈັດສົ່ງແລ້ວ',
]);

export const PRIORITIES = Object.freeze(['ທົ່ວໄປ', 'ດ່ວນ', 'VIP']);

export const RECORD_STATES = Object.freeze({
  ACTIVE: 'active',
  ARCHIVED: 'archived',
  TRASHED: 'trashed',
});

export const FOLLOW_UP_BUCKETS = Object.freeze({
  OVERDUE: 'overdue',
  TODAY: 'today',
  UPCOMING: 'upcoming',
});
