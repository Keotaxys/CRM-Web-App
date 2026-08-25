const branches = [
  ['010', '010 - ສຳນັກງານໃຫຍ່'], ['019', '019 - ສາຂາ ໂພນໂຮງ'],
  ['020', '020 - ສາຂາ ຄຳມ່ວນ'], ['030', '030 - ສາຂາ ສະຫວັນນະເຂດ'],
  ['040', '040 - ສາຂາ ຈຳປາສັກ'], ['050', '050 - ສາຂາ ຫຼວງພະບາງ'],
  ['060', '060 - ສາຂາ ອຸດົມໄຊ'], ['070', '070 - ສາຂາ ຫຼວງນ້ຳທາ'],
  ['080', '080 - ສາຂາ ອັດຕະປື'], ['090', '090 - ສາຂາ ນະຄອນຫຼວງ'],
  ['110', '110 - ສາຂາ ບໍ່ແກ້ວ'], ['120', '120 - ສາຂາ ໄຊຍະບູລີ'],
  ['130', '130 - ສາຂາ ຊຽງຂວາງ'], ['140', '140 - ສາຂາ ວັງວຽງ'],
  ['150', '150 - ສາຂາ ບໍລິຄຳໄຊ'], ['160', '160 - ສາຂາ ດົງໂດກ'],
  ['170', '170 - ສາຂາ ຫົວພັນ'], ['180', '180 - ສາຂາ ຜົ້ງສາລີ'],
  ['190', '190 - ສາຂາ ເຊກອງ'], ['200', '200 - ສາຂາ ສາລະວັນ'],
  ['210', '210 - ສາຂາ ໄຊສົມບູນ'], ['220', '220 - ສາຂາ ໄຊເສດຖາ'],
];

const byValue = new Map(branches.flatMap(([id, label]) => [[id, id], [label, id]]));
const recordStates = new Set(['active', 'archived', 'trashed']);
const accountStatuses = new Set(['pending', 'approved', 'disabled']);

export function legacyBranchId(value) {
  return typeof value === 'string' ? byValue.get(value.trim()) ?? null : null;
}

export function migrateCustomer(customer) {
  const patch = {};
  const conflicts = [];
  if (customer.branchId && !legacyBranchId(customer.branchId)) conflicts.push('invalid_existing_branch');
  else if (!customer.branchId) {
    const branchId = legacyBranchId(customer.branch);
    if (branchId) patch.branchId = branchId;
    else conflicts.push('unknown_branch');
  }
  if (!customer.recordState) patch.recordState = 'active';
  else if (!recordStates.has(customer.recordState)) conflicts.push('invalid_record_state');
  return { id: customer.id, patch, conflicts };
}

export function migrateUser(user) {
  const patch = {};
  const conflicts = [];
  if (user.branch === 'Admin' || user.role === 'admin') {
    conflicts.push('legacy_admin_requires_verified_uid');
    return { uid: user.uid, patch, conflicts };
  }
  if (user.branchId && !legacyBranchId(user.branchId)) {
    conflicts.push('invalid_existing_branch');
    return { uid: user.uid, patch, conflicts };
  }
  if (user.role && user.role !== 'staff') {
    conflicts.push('unverified_privileged_role');
    return { uid: user.uid, patch, conflicts };
  }
  const branchId = user.branchId || legacyBranchId(user.branch);
  if (!branchId) {
    conflicts.push('unknown_branch');
    return { uid: user.uid, patch, conflicts };
  }
  if (!user.role) patch.role = 'staff';
  if (!user.branchId) patch.branchId = branchId;
  if (!user.accountStatus) patch.accountStatus = 'approved';
  else if (!accountStatuses.has(user.accountStatus)) conflicts.push('invalid_account_status');
  return { uid: user.uid, patch, conflicts };
}

export function analyzeSnapshot(snapshot) {
  const customers = snapshot.customers ?? [];
  const users = snapshot.users ?? [];
  const customerMigrations = customers.map(migrateCustomer);
  const userMigrations = users.map(migrateUser);
  const migrationConflicts = [...customerMigrations, ...userMigrations].flatMap((item) => item.conflicts);
  const report = {
    customerCount: customers.length,
    userCount: users.length,
    existingBranchCodes: [...new Set([
      ...customers.map((item) => item.branchId || legacyBranchId(item.branch)),
      ...users.map((item) => item.branchId || legacyBranchId(item.branch)),
    ].filter(Boolean))].sort(),
    customersNeedingBranchId: customers.filter((item) => !item.branchId).length,
    usersNeedingBranchId: users.filter((item) => !item.branchId).length,
    usersNeedingAccessFields: users.filter((item) => !item.branchId || !item.role || !item.accountStatus).length,
    legacyGpsCount: customers.filter((item) => Boolean(item.gps)).length,
    legacyImageCount: customers.filter((item) => Boolean(item.imageUrl || item.placeImageUrl)).length,
    missingFieldCounts: {
      customerStatus: customers.filter((item) => !item.status).length,
      customerCreatedAt: customers.filter((item) => !item.createdAt).length,
    },
    conflictCounts: {
      unknownCustomerBranch: customerMigrations.filter((item) => item.conflicts.includes('unknown_branch')).length,
      unknownUserBranch: userMigrations.filter((item) => item.conflicts.includes('unknown_branch')).length,
      legacyAdmin: userMigrations.filter((item) => item.conflicts.includes('legacy_admin_requires_verified_uid')).length,
      unverifiedPrivilegedRole: userMigrations.filter((item) => item.conflicts.includes('unverified_privileged_role')).length,
      invalidExistingBranch: [...customerMigrations, ...userMigrations].filter((item) => item.conflicts.includes('invalid_existing_branch')).length,
      invalidRecordState: customerMigrations.filter((item) => item.conflicts.includes('invalid_record_state')).length,
      invalidAccountStatus: userMigrations.filter((item) => item.conflicts.includes('invalid_account_status')).length,
    },
    storageObjectCount: snapshot.storageObjects?.length ?? 0,
    migrationConflictCount: migrationConflicts.length,
  };
  if (Array.isArray(snapshot.authUsers)) {
    const authIds=new Set(snapshot.authUsers.map((item)=>item.uid));const userIds=new Set(users.map((item)=>item.uid));
    report.authUserCount=snapshot.authUsers.length;
    report.authUsersMissingProfile=snapshot.authUsers.filter((item)=>!userIds.has(item.uid)).length;
    report.userDocumentsMissingAuth=users.filter((item)=>!authIds.has(item.uid)).length;
  }
  return report;
}

function storagePathFromUrl(value) {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    const encodedPath = url.pathname.match(/\/o\/([^/]+)$/)?.[1];
    return encodedPath ? decodeURIComponent(encodedPath) : null;
  } catch { return null; }
}

export function auditStorageObjects(customers, objectPaths) {
  const referenced = new Set();
  for (const customer of customers) {
    for (const field of ['imageStoragePath', 'placeImageStoragePath']) if (customer[field]) referenced.add(customer[field]);
    for (const field of ['imageUrl', 'placeImageUrl', 'photoURL']) { const path = storagePathFromUrl(customer[field]); if (path) referenced.add(path); }
  }
  const potentialOrphanPaths = objectPaths.filter((path) => !referenced.has(path)).sort();
  return { objectCount: objectPaths.length, referencedObjectCount: objectPaths.length - potentialOrphanPaths.length, potentialOrphanCount: potentialOrphanPaths.length, potentialOrphanPaths };
}
