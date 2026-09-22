import { describe, expect, it } from 'vitest';
import { recordGiftDistributionOperation as record, amendGiftDistributionOperation as amend,
  cancelGiftDistributionOperation as cancel } from '../../functions/src/giftDistribution.js';
import { receiveGiftStockOperation as receive } from '../../functions/src/giftInventory.js';
import { fakeGiftFirestore } from '../../functions/test/helpers/fakeGiftFirestore.js';
import { buildGiftReport } from './giftReport';

const staff = { uid: 'staff-a', role: 'staff', branchId: '010', accountStatus: 'approved' };
const manager = { uid: 'manager-a', role: 'branch_manager', branchId: '010', accountStatus: 'approved' };
const now = new Date('2026-09-14T05:00:00Z');
const uuid = (number) => `550e8400-e29b-41d4-a716-44665544000${number}`;
const gift = { id: 'umbrella', name: 'Umbrella', active: true, unitsPerPack: 10 };
const recipient = (type, suffix) => ({
  recipientType: type, customerId: type === 'customer' ? `customer-${suffix}` : null,
  campaignId: type === 'campaign' ? `campaign-${suffix}` : null,
});
const entries = (state, collection) => [...state.documents]
  .filter(([path]) => path.startsWith(`${collection}/`) && !path.slice(collection.length + 1).includes('/'))
  .map(([path, value]) => ({ ...value, id: path.split('/').at(-1) }));

describe('distribution operations to recipient reports', () => {
  for (const [from, to] of [['customer', 'customer'], ['customer', 'campaign'],
    ['campaign', 'customer'], ['campaign', 'campaign']]) {
    it.each([5, 8, 2])(`${from} A → ${to} B attributes %i units and cancellation to the correct recipient`, async (quantity) => {
      const state = fakeGiftFirestore({
        'users/staff-a': staff, 'users/manager-a': manager, 'giftItems/umbrella': gift,
        'customers/customer-a': { name: 'Customer A', branchId: '010', recordState: 'active' },
        'customers/customer-b': { name: 'Customer B', branchId: '010', recordState: 'active' },
        'giftCampaigns/campaign-a': { name: 'Campaign A', branchId: '010', active: true },
        'giftCampaigns/campaign-b': { name: 'Campaign B', branchId: '010', active: true },
      });
      await receive(state.services, manager, { receiptId: uuid(0), branchId: '010', source: 'HQ',
        items: [{ giftId: 'umbrella', packs: 2, looseUnits: 0 }] }, now);
      await record(state.services, staff, { distributionId: uuid(1), branchId: '010',
        expectedDateKey: '2026-09-14', ...recipient(from, 'a'),
        items: [{ giftId: 'umbrella', packs: 0, looseUnits: 5 }] }, now);
      const request = { distributionId: uuid(1), mutationId: uuid(2), expectedVersion: 1,
        branchId: '010', reason: 'Correct recipient', ...recipient(to, 'b'),
        items: [{ giftId: 'umbrella', packs: 0, looseUnits: quantity }] };
      await amend(state.services, manager, request, now);
      const report = (filters = {}) => buildGiftReport({ gifts: [gift],
        stocks: entries(state, 'branchGiftStocks'), movements: entries(state, 'giftStockMovements'), filters });
      expect(report({ [`${from}Id`]: `${from}-a` }).distributedUnits).toBe(0);
      expect(report({ [`${to}Id`]: `${to}-b` }).distributedUnits).toBe(quantity);
      expect(report().staff).toEqual([expect.objectContaining({ staffUid: 'staff-a', distributedUnits: quantity })]);
      const beforeRetry = structuredClone([...state.documents]);
      await amend(state.services, manager, request, now);
      expect([...state.documents]).toEqual(beforeRetry);
      const amendedMovements = entries(state, 'giftStockMovements').filter((row) => row.operationId === uuid(2));
      expect(amendedMovements).toEqual([
        expect.objectContaining({ id: `${uuid(2)}_umbrella_1_reverse`, deltaUnits: 5,
          [`${from}Id`]: `${from}-a`, actorUid: 'manager-a', distributionOwnerUid: 'staff-a' }),
        expect.objectContaining({ id: `${uuid(2)}_umbrella_2_replace`, deltaUnits: -quantity,
          [`${to}Id`]: `${to}-b`, actorUid: 'manager-a', distributionOwnerUid: 'staff-a' }),
      ]);
      await cancel(state.services, manager, { distributionId: uuid(1), mutationId: uuid(3),
        expectedVersion: 2, branchId: '010', reason: 'Returned' }, now);
      expect(report({ [`${from}Id`]: `${from}-a` }).distributedUnits).toBe(0);
      expect(report({ [`${to}Id`]: `${to}-b` }).distributedUnits).toBe(0);
      expect(report().distributedUnits).toBe(0);
      let balance = 0;
      for (const movement of entries(state, 'giftStockMovements')) {
        expect(movement.balanceBeforeUnits).toBe(balance);
        balance += movement.deltaUnits;
        expect(movement.balanceAfterUnits).toBe(balance);
      }
      expect(balance).toBe(20);
      expect(state.documents.get('branchGiftStocks/010_umbrella').currentUnits).toBe(balance);
      const revision = state.documents.get(`giftDistributions/${uuid(1)}/revisions/${uuid(2)}`);
      expect(revision.previousRecipient[`${from}Id`]).toBe(`${from}-a`);
      expect(revision.nextRecipient[`${to}Id`]).toBe(`${to}-b`);
    });
  }
});
