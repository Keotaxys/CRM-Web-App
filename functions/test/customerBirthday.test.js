import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as customerAdmin from '../src/customerAdmin.js';

const staff = {
  uid: 'staff-a',
  role: 'staff',
  branchId: '010',
  accountStatus: 'approved',
};

const fixedNow = new Date('2026-09-09T12:00:00+07:00');

function getOperation() {
  assert.equal(
    typeof customerAdmin.acknowledgeBirthdayGreetingOperation,
    'function',
  );
  return customerAdmin.acknowledgeBirthdayGreetingOperation;
}

function makeServices(customerOverrides = {}) {
  const writes = [];
  const customer = {
    branchId: '010',
    recordState: 'active',
    priority: 'VIP',
    birthDate: '15-09-1990',
    ...customerOverrides,
  };
  const ref = {
    id: 'c1',
  };
  const snapshot = {
    exists: true,
    id: 'c1',
    data: () => customer,
  };

  return {
    services: {
      db: {
        doc(path) {
          assert.equal(path, 'customers/c1');
          return ref;
        },
        async runTransaction(callback) {
          return callback({
            async get(target) {
              assert.equal(target, ref);
              return snapshot;
            },
            update(target, value) {
              assert.equal(target, ref);
              writes.push(value);
            },
          });
        },
      },
      now: () => fixedNow,
    },
    writes,
  };
}

test('acknowledges an eligible own-branch VIP occurrence with server audit fields', async () => {
  const { services, writes } = makeServices();

  const result = await getOperation()(services, staff, { id: 'c1' });

  assert.deepEqual(result, {
    id: 'c1',
    occurrenceYear: 2026,
    acknowledged: true,
  });
  assert.equal(writes.length, 1);
  assert.equal(writes[0].birthdayGreeting.occurrenceYear, 2026);
  assert.equal(writes[0].birthdayGreeting.acknowledgedBy, 'staff-a');
  assert.ok(writes[0].birthdayGreeting.acknowledgedAt);
});

test('allows Admin across branches but denies a cross-branch Staff actor', async () => {
  const denied = makeServices({ branchId: '019' });
  await assert.rejects(
    () => getOperation()(denied.services, staff, { id: 'c1' }),
    /Cross-branch/,
  );
  assert.equal(denied.writes.length, 0);

  const allowed = makeServices({ branchId: '019' });
  await getOperation()(
    allowed.services,
    { ...staff, uid: 'admin', role: 'admin', branchId: null },
    { id: 'c1' },
  );
  assert.equal(allowed.writes[0].birthdayGreeting.acknowledgedBy, 'admin');
});

test('fails closed for ineligible or out-of-window customers', async () => {
  for (const overrides of [
    { priority: 'ທົ່ວໄປ' },
    { recordState: 'archived' },
    { birthDate: null },
    { birthDate: '31-02-1990' },
    { birthDate: '01-01-1990' },
  ]) {
    const { services, writes } = makeServices(overrides);
    await assert.rejects(
      () => getOperation()(services, staff, { id: 'c1' }),
      /eligible birthday reminder/,
    );
    assert.equal(writes.length, 0);
  }
});

test('same occurrence acknowledgement is idempotent', async () => {
  const { services, writes } = makeServices({
    birthdayGreeting: {
      occurrenceYear: 2026,
      acknowledgedBy: 'staff-b',
    },
  });

  const result = await getOperation()(services, staff, { id: 'c1' });

  assert.deepEqual(result, {
    id: 'c1',
    occurrenceYear: 2026,
    acknowledged: false,
  });
  assert.equal(writes.length, 0);
});

test('index exposes birthday acknowledgement through the authenticated wrapper', async () => {
  const source = await readFile(
    new URL('../src/index.js', import.meta.url),
    'utf8',
  );

  assert.match(source, /acknowledgeBirthdayGreetingOperation/);
  assert.match(
    source,
    /export const acknowledgeBirthdayGreeting\s*=\s*callable\(acknowledgeBirthdayGreetingOperation\)/,
  );
});
