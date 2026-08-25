import { beforeEach, describe, expect, it, vi } from 'vitest';

const firebaseMocks = vi.hoisted(() => ({
  callable: vi.fn(),
  httpsCallable: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({ collection: vi.fn(), onSnapshot: vi.fn(), orderBy: vi.fn(), query: vi.fn(), where: vi.fn() }));
vi.mock('firebase/functions', () => ({ httpsCallable: firebaseMocks.httpsCallable }));
vi.mock('../firebase/config', () => ({ db: {}, functions: { region: 'asia-southeast1' } }));

import { reactivateUser } from './adminService';

describe('Admin callable service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    firebaseMocks.callable.mockResolvedValue({ data: { uid: 'target', accountStatus: 'approved' } });
    firebaseMocks.httpsCallable.mockReturnValue(firebaseMocks.callable);
  });

  it('invokes the trusted reactivateUser callable with access selections', async () => {
    await expect(reactivateUser('target', 'staff', '020')).resolves.toEqual({ uid: 'target', accountStatus: 'approved' });
    expect(firebaseMocks.httpsCallable).toHaveBeenCalledWith({ region: 'asia-southeast1' }, 'reactivateUser');
    expect(firebaseMocks.callable).toHaveBeenCalledWith({ uid: 'target', role: 'staff', branchId: '020' });
  });
});
