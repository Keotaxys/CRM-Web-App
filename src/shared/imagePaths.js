function safeId(value, field) {
  if (typeof value !== 'string' || !value.trim() || value.includes('/')) {
    throw new Error(`${field} must be a non-empty path-safe ID`);
  }
  return value.trim();
}

export function customerImagePath(customerId, slot) {
  const id = safeId(customerId, 'customerId');
  const filename = { customer: 'customer-photo', place: 'place-photo' }[slot];
  if (!filename) throw new Error('Unsupported customer image slot');
  return `customers/${id}/${filename}`;
}

export function profileImagePath(uid) {
  return `profiles/${safeId(uid, 'uid')}/avatar`;
}
