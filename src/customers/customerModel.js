import { branchIdFromLegacy, branchName } from '../branches/branches';
import {
  CUSTOMER_STATUSES,
  PRIORITIES,
  RECORD_STATES,
} from '../shared/constants';

const editableFields = new Set([
  'name',
  'phone',
  'address',
  'priority',
  'note',
  'gps',
  'location',
  'imageUrl',
  'placeImageUrl',
  'imageStoragePath',
  'placeImageStoragePath',
  'birthDate',
]);

export function normalizeCustomer(customer) {
  if (!customer) return null;

  return {
    ...customer,
    birthDate: customer.birthDate ?? null,
    branchId: customer.branchId || branchIdFromLegacy(customer.branch),
    recordState: customer.recordState || RECORD_STATES.ACTIVE,
    location: customer.location ?? null,
    priority: customer.priority || PRIORITIES[0],
    status: customer.status || CUSTOMER_STATUSES[0],
  };
}

export function customerCreatePayload(values, actor, timestamp) {
  const status = CUSTOMER_STATUSES.includes(values.status)
    ? values.status
    : CUSTOMER_STATUSES[0];

  const priority = PRIORITIES.includes(values.priority)
    ? values.priority
    : PRIORITIES[0];

  return {
    name: values.name?.trim() ?? '',
    phone: values.phone?.trim() ?? '',
    address: values.address?.trim() ?? '',
    status,
    priority,
    branchId: actor.branchId,
    branch: branchName(actor.branchId),
    note: values.note?.trim() ?? '',
    gps: values.gps?.trim() ?? '',
    location: values.location ?? null,
    birthDate: values.birthDate ?? null,
    imageUrl: values.imageUrl ?? '',
    placeImageUrl: values.placeImageUrl ?? '',
    imageStoragePath: values.imageStoragePath ?? null,
    placeImageStoragePath: values.placeImageStoragePath ?? null,
    statusTimestamps: values.statusTimestamps ?? {
      [status]: timestamp,
    },
    recordState: RECORD_STATES.ACTIVE,
    createdBy: actor.uid,
    createdAt: timestamp,
    updatedBy: actor.uid,
    updatedAt: timestamp,
    archivedBy: null,
    archivedAt: null,
    deletedBy: null,
    deletedAt: null,
  };
}

export function customerUpdatePayload(values, actor, timestamp) {
  const payload = {};

  for (const [key, value] of Object.entries(values)) {
    if (editableFields.has(key)) {
      payload[key] = value;
    }
  }

  payload.updatedBy = actor.uid;
  payload.updatedAt = timestamp;

  return payload;
}
