import test from 'node:test'; import assert from 'node:assert/strict';
import { assertValidAssignees, isTrashExpired, validateActivityInput } from '../src/validators.js';

test('assignees must be approved and same branch unless admin', () => {
  const users = [{ uid: 'a', accountStatus: 'approved', branchId: '010' }, { uid: 'b', accountStatus: 'approved', branchId: '019' }];
  assert.doesNotThrow(() => assertValidAssignees(['a'], users, '010', false));
  assert.throws(() => assertValidAssignees(['b'], users, '010', false), /assignee/i);
  assert.doesNotThrow(() => assertValidAssignees(['b'], users, '010', true));
});

test('customer visit customer requirement is enforced', () => {
  assert.throws(() => validateActivityInput({ type: 'customer_visit', title: 'Visit', branchId: '010', status: 'planned', startAt: new Date(), endAt: new Date(Date.now() + 1000), assignedStaffIds: [] }), /customer/i);
});

test('trash expires after 30 days', () => {
  const now = new Date('2026-08-25T00:00:00Z');
  assert.equal(isTrashExpired(new Date('2026-07-25T00:00:00Z'), now), true);
  assert.equal(isTrashExpired(new Date('2026-08-01T00:00:00Z'), now), false);
});
