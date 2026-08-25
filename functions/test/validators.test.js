import test from 'node:test'; import assert from 'node:assert/strict';
import { assertActiveCustomerRelationship, assertAssigneeIds, assertValidAssignees, isTrashExpired, validateActivityInput } from '../src/validators.js';

test('assignees must be approved and in the activity branch for every actor', () => {
  const users = [{ uid: 'a', accountStatus: 'approved', branchId: '010' }, { uid: 'b', accountStatus: 'approved', branchId: '019' }];
  assert.doesNotThrow(() => assertValidAssignees(['a'], users, '010'));
  assert.throws(() => assertValidAssignees(['b'], users, '010'), /assignee/i);
  assert.throws(() => assertAssigneeIds(['../escape']), /assignee/i);
  assert.throws(() => assertAssigneeIds(Array.from({ length: 26 }, (_, index) => `u${index}`)), /assignee/i);
});

test('follow-up requires a valid date and action on a Customer Visit', () => {
  const base = { type: 'customer_visit', title: 'Visit', branchId: '010', status: 'planned', customerId: 'c1', startAt: new Date(), endAt: new Date(Date.now() + 1000), assignedStaffIds: ['a'], followUpRequired: true };
  assert.throws(() => validateActivityInput(base), /follow-up/i);
  assert.doesNotThrow(() => validateActivityInput({ ...base, followUpDate: new Date(Date.now() + 2000), nextAction: 'Call' }));
});

test('customer visit customer requirement is enforced', () => {
  assert.throws(() => validateActivityInput({ type: 'customer_visit', title: 'Visit', branchId: '010', status: 'planned', startAt: new Date(), endAt: new Date(Date.now() + 1000), assignedStaffIds: [] }), /customer/i);
});

test('null activity and follow-up timestamps are rejected', () => {
  const base = { type: 'appointment', title: 'Meeting', branchId: '010', status: 'planned', startAt: null, endAt: null, assignedStaffIds: ['a'] };
  assert.throws(() => validateActivityInput(base), /time range/i);
  assert.throws(() => validateActivityInput({ ...base, type: 'customer_visit', customerId: 'c1', startAt: new Date(), endAt: new Date(Date.now() + 1000), followUpRequired: true, followUpDate: null, nextAction: 'Call' }), /follow-up/i);
});

test('activity relationships require an active same-branch customer', () => {
  assert.doesNotThrow(() => assertActiveCustomerRelationship({ recordState:'active',branchId:'010' },'010'));
  assert.throws(() => assertActiveCustomerRelationship({ recordState:'archived',branchId:'010' },'010'),/active/i);
  assert.throws(() => assertActiveCustomerRelationship({ recordState:'active',branchId:'019' },'010'),/branch/i);
});

test('trash expires after 30 days', () => {
  const now = new Date('2026-08-25T00:00:00Z');
  assert.equal(isTrashExpired(new Date('2026-07-25T00:00:00Z'), now), true);
  assert.equal(isTrashExpired(new Date('2026-08-01T00:00:00Z'), now), false);
});
