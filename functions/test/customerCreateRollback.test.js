import test from 'node:test';
import assert from 'node:assert/strict';
import { Timestamp } from 'firebase-admin/firestore';
import * as customerAdmin from '../src/customerAdmin.js';

const actor = {
  uid: 'u1',
  role: 'staff',
  branchId: '010',
  accountStatus: 'approved',
};

const NOW = new Date('2035-01-02T10:00:00.000Z');

function getOperation() {
  assert.equal(
    typeof customerAdmin.rollbackCustomerCreateOperation,
    'function',
    'rollbackCustomerCreateOperation must be exported',
  );

  return customerAdmin.rollbackCustomerCreateOperation;
}

function makeServices({
  customer = {
    branchId: '010',
    createdBy: 'u1',
    createdAt: Timestamp.fromDate(new Date(NOW.getTime() - 60_000)),
    recordState: 'active',
    updatedBy: 'u1',
    updatedAt: Timestamp.fromDate(new Date(NOW.getTime() - 60_000)),
    imageStoragePath: null,
    placeImageStoragePath: null,
  },
  relatedActivities = false,
} = {}) {
  const deletedObjects = [];
  let customerDeleted = false;
  const customerRef = {
    id: 'c1',
    async get() {
      return {
        exists: true,
        data: () => customer,
      };
    },
    async delete() {
      customerDeleted = true;
    },
  };

  const services = {
    now: () => new Date(NOW),
    db: {
      doc(path) {
        assert.equal(path, 'customers/c1');
        return customerRef;
      },
      collection(name) {
        assert.equal(name, 'activities');
        return {
          where(field, operator, value) {
            assert.equal(field, 'customerId');
            assert.equal(operator, '==');
            assert.equal(value, 'c1');
            return {
              limit(limit) {
                assert.equal(limit, 1);
                return {
                  async get() {
                    return { empty: !relatedActivities };
                  },
                };
              },
            };
          },
        };
      },
    },
    bucket: {
      file(path) {
        return {
          async delete(options) {
            assert.deepEqual(options, { ignoreNotFound: true });
            deletedObjects.push(path);
          },
        };
      },
    },
  };

  return {
    deletedObjects,
    services,
    wasCustomerDeleted: () => customerDeleted,
  };
}

test('rolls back a recent unfinalized customer created by the same actor', async () => {
  const context = makeServices();

  const result = await getOperation()(context.services, actor, { id: 'c1' });

  assert.deepEqual(context.deletedObjects.sort(), [
    'customers/c1/customer-photo',
    'customers/c1/place-photo',
  ]);
  assert.equal(context.wasCustomerDeleted(), true);
  assert.deepEqual(result, {
    id: 'c1',
    deletedObjects: 2,
    rolledBack: true,
  });
});

test('refuses rollback when the caller did not create the customer', async () => {
  const context = makeServices({
    customer: {
      branchId: '010',
      createdBy: 'another-user',
      createdAt: Timestamp.fromDate(new Date(NOW.getTime() - 60_000)),
      recordState: 'active',
      imageStoragePath: null,
      placeImageStoragePath: null,
    },
  });

  await assert.rejects(
    () => getOperation()(context.services, actor, { id: 'c1' }),
    /creator/i,
  );

  assert.equal(context.wasCustomerDeleted(), false);
  assert.deepEqual(context.deletedObjects, []);
});

test('refuses rollback after the customer has been finalized with a managed image path', async () => {
  const context = makeServices({
    customer: {
      branchId: '010',
      createdBy: 'u1',
      createdAt: Timestamp.fromDate(new Date(NOW.getTime() - 60_000)),
      recordState: 'active',
      imageStoragePath: 'customers/c1/customer-photo',
      placeImageStoragePath: null,
    },
  });

  await assert.rejects(
    () => getOperation()(context.services, actor, { id: 'c1' }),
    /finalized/i,
  );

  assert.equal(context.wasCustomerDeleted(), false);
});

test('refuses rollback after the short recovery window', async () => {
  const oldCustomer = makeServices({
    customer: {
      branchId: '010',
      createdBy: 'u1',
      createdAt: Timestamp.fromDate(new Date(NOW.getTime() - 16 * 60_000)),
      recordState: 'active',
      imageStoragePath: null,
      placeImageStoragePath: null,
    },
  });

  await assert.rejects(
    () => getOperation()(oldCustomer.services, actor, { id: 'c1' }),
    /window/i,
  );
});

test('refuses rollback after related activity exists', async () => {
  const relatedCustomer = makeServices({ relatedActivities: true });

  await assert.rejects(
    () => getOperation()(relatedCustomer.services, actor, { id: 'c1' }),
    /related activities/i,
  );
});

test('refuses rollback after the customer document has been edited', async () => {
  const context = makeServices({
    customer: {
      branchId: '010',
      createdBy: 'u1',
      createdAt: Timestamp.fromDate(new Date(NOW.getTime() - 60_000)),
      updatedBy: 'u1',
      updatedAt: Timestamp.fromDate(new Date(NOW.getTime() - 30_000)),
      recordState: 'active',
      imageStoragePath: null,
      placeImageStoragePath: null,
    },
  });

  await assert.rejects(
    () => getOperation()(context.services, actor, { id: 'c1' }),
    /edited/i,
  );

  assert.equal(context.wasCustomerDeleted(), false);
});

test('refuses rollback after the customer leaves the active state', async () => {
  const timestamp = Timestamp.fromDate(new Date(NOW.getTime() - 60_000));
  const context = makeServices({
    customer: {
      branchId: '010',
      createdBy: 'u1',
      createdAt: timestamp,
      updatedBy: 'u1',
      updatedAt: timestamp,
      recordState: 'archived',
      imageStoragePath: null,
      placeImageStoragePath: null,
    },
  });

  await assert.rejects(
    () => getOperation()(context.services, actor, { id: 'c1' }),
    /active/i,
  );

  assert.equal(context.wasCustomerDeleted(), false);
});
