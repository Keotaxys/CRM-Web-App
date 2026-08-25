import test from 'node:test';
import assert from 'node:assert/strict';
import { syncLegacyCustomerOperation } from '../src/legacyWebhook.js';

const actor = { uid: 'admin-uid', role: 'admin', branchId: null };

function servicesFor(customer = {}) {
  const writes = [];
  const snapshot = {
    id: 'customer-1',
    exists: true,
    data: () => ({
      name: 'Customer',
      phone: '020',
      address: 'Vientiane',
      priority: 'VIP',
      status: 'ໃໝ່',
      branch: '020 - ສາຂາ ຄຳມ່ວນ',
      branchId: '020',
      note: 'Note',
      createdAt: null,
      ...customer,
    }),
  };
  return {
    services: { db: { doc: () => ({ get: async () => snapshot, set: async (value) => writes.push(value), update: async (value) => writes.push(value) }) } },
    writes,
  };
}

test('legacy webhook rejects a missing secret without making a network call', async () => {
  const fetchImpl = () => { throw new Error('network must not be called'); };
  await assert.rejects(
    () => syncLegacyCustomerOperation(servicesFor().services, actor, { customerId: 'customer-1', reason: 'created' }, '', { fetchImpl }),
    /secret is not configured/i,
  );
});

test('legacy webhook sends the established payload plus the caller reason and accepts 2xx', async () => {
  let request;
  const fetchImpl = async (url, options) => { request = { url, options }; return { ok: true, status: 204 }; };
  const { services, writes } = servicesFor();

  const result = await syncLegacyCustomerOperation(services, actor, { customerId: 'customer-1', reason: 'status_changed' }, 'https://stub.invalid/webhook', { fetchImpl });

  assert.deepEqual(result, { id: 'customer-1', synced: true });
  assert.equal(request.url, 'https://stub.invalid/webhook');
  assert.equal(request.options.method, 'POST');
  assert.equal(request.options.headers['content-type'], 'application/json');
  assert.deepEqual(JSON.parse(request.options.body), {
    id: 'customer-1',
    name: 'Customer',
    phone: '020',
    address: 'Vientiane',
    priority: 'VIP',
    status: 'ໃໝ່',
    branch: '020 - ສາຂາ ຄຳມ່ວນ',
    note: 'Note',
    createdAt: '',
    reason: 'status_changed',
  });
  assert.ok(request.options.signal instanceof AbortSignal);
  assert.deepEqual(writes, []);
});

test('legacy webhook rejects non-2xx responses', async () => {
  const fetchImpl = async () => ({ ok: false, status: 503 });
  await assert.rejects(
    () => syncLegacyCustomerOperation(servicesFor().services, actor, { customerId: 'customer-1', reason: 'updated' }, 'https://stub.invalid/webhook', { fetchImpl }),
    /rejected request \(503\)/i,
  );
});

test('legacy webhook converts network failure into a controlled error', async () => {
  const fetchImpl = async () => { throw new TypeError('socket closed'); };
  await assert.rejects(
    () => syncLegacyCustomerOperation(servicesFor().services, actor, { customerId: 'customer-1', reason: 'updated' }, 'https://stub.invalid/webhook', { fetchImpl }),
    /request failed: socket closed/i,
  );
});

test('legacy webhook aborts at the finite timeout instead of hanging', async () => {
  const fetchImpl = async (_url, { signal }) => new Promise((resolve, reject) => {
    signal.addEventListener('abort', () => { const error = new Error('aborted'); error.name = 'AbortError'; reject(error); }, { once: true });
  });
  await assert.rejects(
    () => syncLegacyCustomerOperation(servicesFor().services, actor, { customerId: 'customer-1', reason: 'created' }, 'https://stub.invalid/webhook', { fetchImpl, timeoutMs: 5 }),
    /timed out/i,
  );
});
