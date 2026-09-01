import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  callable: vi.fn(),
  collection: vi.fn(),
  doc: vi.fn(),
  httpsCallable: vi.fn(),
  serverTimestamp: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  collection: mocks.collection,
  doc: mocks.doc,
  getDoc: vi.fn(),
  onSnapshot: vi.fn(),
  query: vi.fn(),
  serverTimestamp: mocks.serverTimestamp,
  setDoc: mocks.setDoc,
  updateDoc: mocks.updateDoc,
  where: vi.fn(),
}));

vi.mock('firebase/functions', () => ({
  httpsCallable: mocks.httpsCallable,
}));

vi.mock('../firebase/config', () => ({
  db: {},
  functions: { region: 'asia-southeast1' },
}));

import {
  changeCustomerStatus,
  createCustomer,
  reserveCustomerId,
  rollbackCustomerCreate,
} from './customersService';

const identity = {
  user: { uid: 'u1' },
  claims: {
    role: 'staff',
    branchId: '010',
    accountStatus: 'approved',
  },
};

describe('customersService create lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.collection.mockReturnValue({ path: 'customers' });
    mocks.doc.mockImplementation((...args) => (
      args.length === 1
        ? { id: 'reserved-customer', path: 'customers/reserved-customer' }
        : { id: args[2], path: `customers/${args[2]}` }
    ));
    mocks.serverTimestamp.mockReturnValue('NOW');
    mocks.setDoc.mockResolvedValue(undefined);
  });

  it('reserves a stable customer id without writing a Firestore document', () => {
    expect(reserveCustomerId()).toBe('reserved-customer');
    expect(mocks.collection).toHaveBeenCalledWith({}, 'customers');
    expect(mocks.setDoc).not.toHaveBeenCalled();
  });

  it('creates the customer at the reserved id after preprocessing completes', async () => {
    const id = await createCustomer(
      { name: 'Customer', phone: '020', status: 'ໃໝ່' },
      identity,
      'reserved-customer',
    );

    expect(mocks.doc).toHaveBeenCalledWith({}, 'customers', 'reserved-customer');
    expect(mocks.setDoc).toHaveBeenCalledWith(
      { id: 'reserved-customer', path: 'customers/reserved-customer' },
      expect.objectContaining({
        name: 'Customer',
        createdBy: 'u1',
        branchId: '010',
      }),
    );
    expect(id).toBe('reserved-customer');
  });

  it('calls the trusted rollback endpoint for a failed new-customer flow', async () => {
    mocks.httpsCallable.mockReturnValue(mocks.callable);
    mocks.callable.mockResolvedValue({ data: { id: 'c1', rolledBack: true } });

    const result = await rollbackCustomerCreate('c1');

    expect(mocks.httpsCallable).toHaveBeenCalledWith(
      { region: 'asia-southeast1' },
      'rollbackCustomerCreate',
    );
    expect(mocks.callable).toHaveBeenCalledWith({ id: 'c1' });
    expect(result).toEqual({ id: 'c1', rolledBack: true });
  });
});

describe('customersService.changeCustomerStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.httpsCallable.mockReturnValue(mocks.callable);
    mocks.callable.mockResolvedValue({
      data: {
        id: 'c1',
        status: 'ດຳເນີນການແລ້ວ',
        syncedActivityId: 'a1',
      },
    });
  });

  it('uses the trusted changeCustomerStatus callable instead of direct Firestore update', async () => {
    const result = await changeCustomerStatus(
      'c1',
      'ດຳເນີນການແລ້ວ',
      identity,
    );

    expect(mocks.httpsCallable).toHaveBeenCalledWith(
      { region: 'asia-southeast1' },
      'changeCustomerStatus',
    );

    expect(mocks.callable).toHaveBeenCalledWith({
      id: 'c1',
      status: 'ດຳເນີນການແລ້ວ',
    });

    expect(mocks.updateDoc).not.toHaveBeenCalled();

    expect(result).toEqual({
      id: 'c1',
      status: 'ດຳເນີນການແລ້ວ',
      syncedActivityId: 'a1',
    });
  });
});
