export const BRANCHES = Object.freeze([
  { id: '010', label: '010 - ສຳນັກງານໃຫຍ່' },
  { id: '019', label: '019 - ສາຂາ ໂພນໂຮງ' },
  { id: '020', label: '020 - ສາຂາ ຄຳມ່ວນ' },
  { id: '030', label: '030 - ສາຂາ ສະຫວັນນະເຂດ' },
  { id: '040', label: '040 - ສາຂາ ຈຳປາສັກ' },
  { id: '050', label: '050 - ສາຂາ ຫຼວງພະບາງ' },
  { id: '060', label: '060 - ສາຂາ ອຸດົມໄຊ' },
  { id: '070', label: '070 - ສາຂາ ຫຼວງນ້ຳທາ' },
  { id: '080', label: '080 - ສາຂາ ອັດຕະປື' },
  { id: '090', label: '090 - ສາຂາ ນະຄອນຫຼວງ' },
  { id: '110', label: '110 - ສາຂາ ບໍ່ແກ້ວ' },
  { id: '120', label: '120 - ສາຂາ ໄຊຍະບູລີ' },
  { id: '130', label: '130 - ສາຂາ ຊຽງຂວາງ' },
  { id: '140', label: '140 - ສາຂາ ວັງວຽງ' },
  { id: '150', label: '150 - ສາຂາ ບໍລິຄຳໄຊ' },
  { id: '160', label: '160 - ສາຂາ ດົງໂດກ' },
  { id: '170', label: '170 - ສາຂາ ຫົວພັນ' },
  { id: '180', label: '180 - ສາຂາ ຜົ້ງສາລີ' },
  { id: '190', label: '190 - ສາຂາ ເຊກອງ' },
  { id: '200', label: '200 - ສາຂາ ສາລະວັນ' },
  { id: '210', label: '210 - ສາຂາ ໄຊສົມບູນ' },
  { id: '220', label: '220 - ສາຂາ ໄຊເສດຖາ' },
]);

const branchById = new Map(BRANCHES.map((branch) => [branch.id, branch]));
const branchByLabel = new Map(BRANCHES.map((branch) => [branch.label, branch]));

export function branchIdFromLegacy(value) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return branchById.get(normalized)?.id ?? branchByLabel.get(normalized)?.id ?? null;
}

export function branchName(branchId) {
  return branchById.get(branchId)?.label ?? '';
}

export function isKnownBranch(branchId) {
  return branchById.has(branchId);
}
