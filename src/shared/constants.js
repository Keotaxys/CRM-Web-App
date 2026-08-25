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

const ACTIVITY_TYPE_LABELS = Object.freeze({
  appointment: 'ນັດໝາຍ',
  event: 'ກິດຈະກຳ',
  customer_visit: 'ການຢ້ຽມລູກຄ້າ',
});

const ACTIVITY_STATUS_LABELS = Object.freeze({
  planned: 'ວາງແຜນ',
  confirmed: 'ຢືນຢັນແລ້ວ',
  in_progress: 'ກຳລັງດຳເນີນ',
  completed: 'ສຳເລັດແລ້ວ',
  cancelled: 'ຍົກເລີກ',
});

const ROLE_LABELS = Object.freeze({
  admin: 'ຜູ້ບໍລິຫານລະບົບ',
  branch_manager: 'ຫົວໜ້າສາຂາ',
  staff: 'ພະນັກງານ',
});

const ACCOUNT_STATUS_LABELS = Object.freeze({
  pending: 'ລໍຖ້າອະນຸມັດ',
  approved: 'ອະນຸມັດແລ້ວ',
  disabled: 'ປິດໃຊ້ງານ',
});

const FOLLOW_UP_BUCKET_LABELS = Object.freeze({
  overdue: 'ເກີນກຳນົດ',
  today: 'ມື້ນີ້',
  upcoming: 'ກຳລັງຈະຮອດ',
});

const displayLabel = (labels, value) => labels[value] ?? 'ບໍ່ລະບຸ';
export const activityTypeLabel = (value) => displayLabel(ACTIVITY_TYPE_LABELS, value);
export const activityStatusLabel = (value) => displayLabel(ACTIVITY_STATUS_LABELS, value);
export const roleLabel = (value) => displayLabel(ROLE_LABELS, value);
export const accountStatusLabel = (value) => displayLabel(ACCOUNT_STATUS_LABELS, value);
export const followUpBucketLabel = (value) => displayLabel(FOLLOW_UP_BUCKET_LABELS, value);

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
