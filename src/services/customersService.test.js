import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  callable: vi.fn(),
  httpsCallable: vi.fn(),
  updateDoc: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  onSnapshot: vi.fn(),
  query: vi.fn(),
  serverTimestamp: vi.fn(),
  setDoc: vi.fn(),
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

import { changeCustomerStatus } from './customersService';

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
      {
        user: { uid: 'u1' },
        claims: {
          role: 'staff',
          branchId: '010',
          accountStatus: 'approved',
        },
      },
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
