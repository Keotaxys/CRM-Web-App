import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createSalesProductOperation,
  updateSalesProductOperation,
} from '../src/salesAdmin.js';

const admin = { uid: 'admin-a', role: 'admin', branchId: null, accountStatus: 'approved' };
const staff = { uid: 'staff-a', role: 'staff', branchId: '010', accountStatus: 'approved' };

function productServices(initialProducts) {
  const products = new Map(initialProducts.map((product, index) => [product.id ?? `existing-${index}`, { ...product }]));
  const writes = [];
  let nextId = 1;

  const refFor = (id) => ({ id, path: `salesProducts/${id}`, kind: 'document' });
  const collection = {
    doc(id) {
      return refFor(id ?? `product-${nextId++}`);
    },
    where(field, operator, value) {
      assert.equal(field, 'normalizedName');
      assert.equal(operator, '==');
      return {
        kind: 'query',
        value,
        limit(count) {
          assert.equal(count, 1);
          return this;
        },
      };
    },
  };

  const db = {
    collection(name) {
      assert.equal(name, 'salesProducts');
      return collection;
    },
    doc(path) {
      assert.match(path, /^salesProducts\/[A-Za-z0-9_-]+$/);
      return refFor(path.split('/')[1]);
    },
    async runTransaction(callback) {
      return callback({
        async get(target) {
          if (target.kind === 'query') {
            const docs = [...products.entries()]
              .filter(([, product]) => product.normalizedName === target.value)
              .map(([id, product]) => ({ id, exists: true, data: () => ({ ...product }) }));
            return { empty: docs.length === 0, docs };
          }
          const value = products.get(target.id);
          return { id: target.id, exists: Boolean(value), data: () => value && ({ ...value }) };
        },
        create(ref, value) {
          assert.equal(products.has(ref.id), false);
          writes.push({ type: 'create', path: ref.path, value });
          products.set(ref.id, { ...value });
        },
        update(ref, value) {
          assert.equal(products.has(ref.id), true);
          writes.push({ type: 'update', path: ref.path, value });
          products.set(ref.id, { ...products.get(ref.id), ...value });
        },
      });
    },
  };

  return { services: { db }, products, writes };
}

test('admin creates a normalized active product with server-owned audit fields', async () => {
  const { services, writes } = productServices([]);
  const result = await createSalesProductOperation(services, admin, { name: ' BCEL  One ', sortOrder: 10 });
  assert.equal(result.name, 'BCEL One');
  assert.equal(writes[0].value.normalizedName, 'bcel one');
  assert.equal(writes[0].value.active, true);
  assert.equal(writes[0].value.createdBy, admin.uid);
});

test('catalog administration is admin-only and duplicate names fail closed', async () => {
  await assert.rejects(() => createSalesProductOperation(productServices([]).services, staff, { name: 'BCEL One' }), /Admin/i);
  await assert.rejects(() => createSalesProductOperation(productServices([{ normalizedName: 'bcel one' }]).services, admin, { name: ' BCEL ONE ' }), /exists/i);
});

test('update changes only name sort order and active state without hard deletion', async () => {
  const { services, writes } = productServices([{ id: 'bcel', name: 'BCEL One', normalizedName: 'bcel one', active: true }]);
  await updateSalesProductOperation(services, admin, { productId: 'bcel', name: 'BCEL One Mobile', sortOrder: 20, active: false });
  assert.deepEqual(Object.keys(writes[0].value).sort(), ['active', 'name', 'normalizedName', 'sortOrder', 'updatedAt', 'updatedBy'].sort());
});

test('update rejects unsafe or missing products and duplicate names owned by another product', async () => {
  const existing = [
    { id: 'bcel', name: 'BCEL One', normalizedName: 'bcel one', active: true },
    { id: 'ibank', name: 'iBank', normalizedName: 'ibank', active: true },
  ];
  await assert.rejects(() => updateSalesProductOperation(productServices(existing).services, admin, {
    productId: '../bcel', name: 'Safe', sortOrder: 0, active: true,
  }), /product id/i);
  await assert.rejects(() => updateSalesProductOperation(productServices(existing).services, admin, {
    productId: 'missing', name: 'Safe', sortOrder: 0, active: true,
  }), /not found/i);
  await assert.rejects(() => updateSalesProductOperation(productServices(existing).services, admin, {
    productId: 'ibank', name: ' BCEL ONE ', sortOrder: 0, active: true,
  }), /exists/i);
});

test('catalog sort order and active state require their exact server contract types', async () => {
  await assert.rejects(() => createSalesProductOperation(productServices([]).services, admin, {
    name: 'BCEL One', sortOrder: 1.5,
  }), /integer/i);
  await assert.rejects(() => updateSalesProductOperation(productServices([
    { id: 'bcel', name: 'BCEL One', normalizedName: 'bcel one', active: true },
  ]).services, admin, {
    productId: 'bcel', name: 'BCEL One', sortOrder: 1, active: 'false',
  }), /active/i);
});
