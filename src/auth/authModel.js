export function deriveAuthState(user, profile, claims = {}) {
  if (!user) return 'anonymous';
  if (profile?.accountStatus === 'disabled' || claims?.accountStatus === 'disabled') return 'disabled';
  if (profile?.accountStatus === 'approved' && claims?.accountStatus === 'approved'
    && profile.role === claims.role && profile.branchId === (claims.role === 'admin' ? null : claims.branchId)) return 'approved';
  return 'pending';
}

export function pendingProfilePayload(user, values = {}, timestamp = new Date()) {
  return {
    name: values.name?.trim() ?? '',
    email: user.email ?? null,
    phone: values.phone?.trim() ?? '',
    photoURL: values.photoURL ?? user.photoURL ?? '',
    photoStoragePath: values.photoStoragePath ?? '',
    role: null,
    branchId: null,
    accountStatus: 'pending',
    createdAt: timestamp,
    updatedAt: timestamp,
    approvedAt: null,
    approvedBy: null,
  };
}

export function personalProfilePayload(values, timestamp) {
  return {
    name: values.name?.trim() ?? '',
    phone: values.phone?.trim() ?? '',
    photoURL: values.photoURL ?? '',
    photoStoragePath: values.photoStoragePath ?? '',
    updatedAt: timestamp,
  };
}
