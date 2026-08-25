const ACTIVITY_TYPES = new Set(['appointment', 'event', 'customer_visit']);
const ACTIVITY_STATUSES = new Set(['planned', 'confirmed', 'in_progress', 'completed', 'cancelled']);
const BRANCH_IDS = new Set(['010','019','020','030','040','050','060','070','080','090','110','120','130','140','150','160','170','180','190','200','210','220']);
const BRANCH_LABELS = new Map([
  ['010','010 - ສຳນັກງານໃຫຍ່'],['019','019 - ສາຂາ ໂພນໂຮງ'],['020','020 - ສາຂາ ຄຳມ່ວນ'],['030','030 - ສາຂາ ສະຫວັນນະເຂດ'],['040','040 - ສາຂາ ຈຳປາສັກ'],['050','050 - ສາຂາ ຫຼວງພະບາງ'],['060','060 - ສາຂາ ອຸດົມໄຊ'],['070','070 - ສາຂາ ຫຼວງນ້ຳທາ'],['080','080 - ສາຂາ ອັດຕະປື'],['090','090 - ສາຂາ ນະຄອນຫຼວງ'],['110','110 - ສາຂາ ບໍ່ແກ້ວ'],['120','120 - ສາຂາ ໄຊຍະບູລີ'],['130','130 - ສາຂາ ຊຽງຂວາງ'],['140','140 - ສາຂາ ວັງວຽງ'],['150','150 - ສາຂາ ບໍລິຄຳໄຊ'],['160','160 - ສາຂາ ດົງໂດກ'],['170','170 - ສາຂາ ຫົວພັນ'],['180','180 - ສາຂາ ຜົ້ງສາລີ'],['190','190 - ສາຂາ ເຊກອງ'],['200','200 - ສາຂາ ສາລະວັນ'],['210','210 - ສາຂາ ໄຊສົມບູນ'],['220','220 - ສາຂາ ໄຊເສດຖາ'],
]);

export function branchLabel(branchId) {
  const label=BRANCH_LABELS.get(branchId); if(!label) throw new Error('Invalid branch'); return label;
}

function asDate(value) {
  if (value?.toDate) return value.toDate();
  return value instanceof Date ? value : new Date(value);
}

export function assertKnownRoleAndBranch(role, branchId) {
  if (!['admin','branch_manager','staff'].includes(role)) throw new Error('Invalid role');
  if (role !== 'admin' && !BRANCH_IDS.has(branchId)) throw new Error('Invalid branch');
}

export function assertValidAssignees(ids, users, branchId, allowCrossBranch = false) {
  if (!Array.isArray(ids) || ids.length === 0 || new Set(ids).size !== ids.length) throw new Error('Invalid assignee list');
  const byId = new Map(users.map((user) => [user.uid, user]));
  const invalid = ids.filter((uid) => {
    const user = byId.get(uid);
    return !user || user.accountStatus !== 'approved' || (!allowCrossBranch && user.branchId !== branchId);
  });
  if (invalid.length) throw new Error('Invalid assignee branch or account state');
}

export function validateActivityInput(activity) {
  if (!ACTIVITY_TYPES.has(activity?.type)) throw new Error('Invalid activity type');
  if (!activity?.title?.trim()) throw new Error('Activity title required');
  if (!BRANCH_IDS.has(activity?.branchId)) throw new Error('Known branch required');
  if (!ACTIVITY_STATUSES.has(activity?.status)) throw new Error('Invalid activity status');
  if (activity.type === 'customer_visit' && !activity.customerId) throw new Error('Customer Visit requires a customer');
  const startAt = asDate(activity.startAt); const endAt = asDate(activity.endAt);
  if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime()) || endAt < startAt) throw new Error('Invalid activity time range');
  if (!Array.isArray(activity.assignedStaffIds)) throw new Error('Assignee list required');
  return true;
}

export function isTrashExpired(deletedAt, now = new Date()) {
  const value = asDate(deletedAt);
  return !Number.isNaN(value.getTime()) && now.getTime() - value.getTime() >= 30 * 86_400_000;
}

export function trashExpiresAt(deletedAt = new Date()) {
  return new Date(asDate(deletedAt).getTime() + 30 * 86_400_000);
}
