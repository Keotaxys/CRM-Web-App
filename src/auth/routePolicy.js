export function routeForAuthState(state, adminOnly = false, claims = {}) {
  if (state === 'anonymous') return '/login';
  if (state === 'pending') return '/pending';
  if (state === 'disabled') return '/disabled';
  if (state !== 'approved') return '/login';
  if (adminOnly && claims.role !== 'admin') return '/';
  return null;
}
