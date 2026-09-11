# Daily Product Sales Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ສ້າງລະບົບບັນທຶກຈຳນວນຜະລິດຕະພັນປະຈຳວັນຕາມພະນັກງານ/ສາຂາ, ລາຍງານຫຼາຍຊ່ວງເວລາ, audit ການແກ້ຍ້ອນຫຼັງ ແລະ Excel export 3 ແຜ່ນງານ.

**Architecture:** ໃຊ້ deterministic Firestore document ໜຶ່ງອັນຕໍ່ `dateKey + staffUid`; direct client writes ຖືກປະຕິເສດ ແລະທຸກ mutation ຜ່ານ callable Functions. Client query ຕາມ role scope ແລະ date range, aggregate ດ້ວຍ pure domain functions, ແລ້ວໃຊ້ aggregation result ດຽວກັນສຳລັບ UI ແລະ Excel.

**Tech Stack:** React 19, React Router 7, Firebase Web SDK 12, Cloud Functions v2 / Node 22, Firestore Rules Emulator, Vitest 4, Node test runner, ExcelJS 4.4.0 loaded with dynamic import.

**Spec:** `docs/superpowers/specs/2026-09-11-daily-product-sales-tracking-design.md`

## Global Constraints

- ເກັບສະເພາະຈຳນວນຜະລິດຕະພັນ; ບໍ່ເກັບລາຄາ, ລາຍຮັບ, ຕົ້ນທຶນ, ກຳໄລ, ສະຕັອກ, ການຊຳລະ ຫຼືໃບບິນ.
- ທຸກ date boundary ໃຊ້ `Asia/Vientiane`; ອາທິດແມ່ນວັນຈັນ–ວັນອາທິດ.
- ບໍ່ມີ daily document ໃຫ້ລາຍງານຄິດເປັນ 0; UI ຫ້າມອ້າງວ່າພະນັກງານສົ່ງລາຍງານ 0.
- Staff ອ່ານ/Export ຂອງຕົນ, Branch Manager ສະເພາະສາຂາ, Admin ທຸກສາຂາ.
- Pending, Disabled ແລະ Anonymous ບໍ່ມີ CRM sales access.
- Direct client writes ໄປ `salesProducts`, `dailySales` ແລະ revision subcollections ຕ້ອງຖືກປະຕິເສດ.
- Admin ບໍ່ມີ daily self-entry ເພາະ canonical Admin ມີ `branchId=null`.
- Product catalog ບໍ່ມີ hard delete; ໃຊ້ `active=false`.
- ExcelJS ຕ້ອງ pin ທີ່ `4.4.0`, MIT, ແລະ load ສະເພາະເມື່ອ Export.
- ບໍ່ປ່ຽນ Customer, Activity, Auth/PWA, Storage Rules ຫຼື image flow ນອກຂອບເຂດ.
- ບໍ່ແຕະ, pop ຫຼື drop stash ເກົ່າ.
- ບໍ່ deploy ຫຼື mutate production ຈົນກວ່າມີການອະນຸມັດ production ແຍກ.
- ກ່ອນລົງມື ໃຊ້ `superpowers:using-git-worktrees` ເພື່ອສ້າງ isolated branch `codex/daily-sales-tracking` ຈາກ current reviewed `main`.

---

## File Structure

### Backend

- `functions/src/salesDomain.js` — Laos date key, deterministic IDs, product-name normalization, item validation ແລະ typed operation errors.
- `functions/src/salesAdmin.js` — product catalog mutations, daily self-save, manager/admin amendment ແລະ immutable revision transactions.
- `functions/src/index.js` — register four callable Functions.
- `functions/test/salesDomain.test.js` — pure validation/date/idempotency tests.
- `functions/test/salesProductAdmin.test.js` — Admin-only catalog operation tests.
- `functions/test/salesAdmin.test.js` — daily save/amend/security/partial-failure tests with transaction fakes.

### Firestore access

- `firestore.rules` — approved role-scoped reads and server-only writes.
- `firestore.indexes.json` — exact staff/date, branch/date ແລະ active-product indexes.
- `tests/rules/firestore.rules.test.js` — full sales actor/query/direct-write matrix.

### Frontend domain and data access

- `src/sales/salesModel.js` — normalize catalog/daily documents and form quantities.
- `src/sales/salesModel.test.js` — normalization and deterministic form payload tests.
- `src/sales/salesReport.js` — date presets, aggregation, percentages and deterministic ranking.
- `src/sales/salesReport.test.js` — day/week/month/year/custom range and aggregation tests.
- `src/services/salesService.js` — role-scoped Firestore subscriptions and callable wrappers.
- `src/services/salesService.test.js` — exact query/callable payload tests.

### Frontend UI and export

- `src/sales/SalesPage.jsx` / `.test.jsx` — role-aware tab composition.
- `src/sales/DailySalesForm.jsx` / `.test.jsx` — today-only self-entry.
- `src/sales/SalesReportPanel.jsx` / `.test.jsx` — date/filter/report rendering.
- `src/sales/SalesCorrectionSheet.jsx` / `.test.jsx` — reason-required manager/admin amendments.
- `src/sales/SalesProductAdmin.jsx` / `.test.jsx` — Admin catalog management.
- `src/sales/salesExport.js` / `.test.js` — ExcelJS workbook generation and download.
- `src/App.jsx` — lazy `/sales` route.
- `src/pages/Home.jsx` / `.test.jsx` — sales quick link.
- `src/pages/Profile.jsx` / `.test.jsx` — “ເພີ່ມເຕີມ” sales menu entry.
- `src/styles/screens.css` / `src/styles/screens.test.js` — responsive sales layouts and 360px contract.

### Deployment evidence

- `docs/deployment/production-checklist.md` — sales-specific backend-first gates.
- `docs/deployment/production-runbook.md` — exact callable/index/rules/frontend rollout and rollback evidence.

---

### Task 1: Server Sales Domain

**Files:**
- Create: `functions/src/salesDomain.js`
- Create: `functions/test/salesDomain.test.js`

**Interfaces:**
- Produces: `SalesOperationError`, `laosSalesDateKey(now)`, `dailySalesDocumentId(dateKey, uid)`, `normalizeSalesProductName(name)`, `validateSalesItems(items, catalogById, existingItems)`.
- Consumes: standard `Date`, arrays/maps; no Firebase dependency.

- [ ] **Step 1: Write failing server-domain tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  dailySalesDocumentId,
  laosSalesDateKey,
  normalizeSalesProductName,
  validateSalesItems,
} from '../src/salesDomain.js';

test('uses the Laos day at the UTC boundary', () => {
  assert.equal(laosSalesDateKey(new Date('2026-09-10T17:00:00Z')), '2026-09-11');
});

test('builds one stable document id per day and uid', () => {
  assert.equal(dailySalesDocumentId('2026-09-11', 'staff_A-1'), '2026-09-11_staff_A-1');
  assert.throws(() => dailySalesDocumentId('11-09-2026', 'staff_A-1'), /date/i);
  assert.throws(() => dailySalesDocumentId('2026-09-11', '../admin'), /uid/i);
});

test('normalizes product names for uniqueness', () => {
  assert.equal(normalizeSalesProductName('  BCEL   One  '), 'bcel one');
  assert.throws(() => normalizeSalesProductName('   '), /name/i);
});

test('accepts unique positive integer items and computes their total', () => {
  const catalog = new Map([
    ['bcel', { id: 'bcel', name: 'BCEL One', active: true }],
    ['ibank', { id: 'ibank', name: 'iBank', active: true }],
  ]);
  assert.deepEqual(validateSalesItems([
    { productId: 'bcel', quantity: 2 },
    { productId: 'ibank', quantity: 3 },
  ], catalog, []), {
    items: [
      { productId: 'bcel', productNameSnapshot: 'BCEL One', quantity: 2 },
      { productId: 'ibank', productNameSnapshot: 'iBank', quantity: 3 },
    ],
    totalQuantity: 5,
  });
});

test('fails closed for duplicate, decimal, negative, unknown, or newly increased inactive items', () => {
  const catalog = new Map([
    ['active', { id: 'active', name: 'Active', active: true }],
    ['closed', { id: 'closed', name: 'Closed', active: false }],
  ]);
  assert.throws(() => validateSalesItems([{ productId: 'active', quantity: 1 }, { productId: 'active', quantity: 2 }], catalog, []), /duplicate/i);
  assert.throws(() => validateSalesItems([{ productId: 'active', quantity: 1.5 }], catalog, []), /integer/i);
  assert.throws(() => validateSalesItems([{ productId: 'active', quantity: -1 }], catalog, []), /integer/i);
  assert.throws(() => validateSalesItems([{ productId: 'missing', quantity: 1 }], catalog, []), /product/i);
  assert.throws(() => validateSalesItems([{ productId: 'closed', quantity: 2 }], catalog, [{ productId: 'closed', quantity: 1 }]), /inactive/i);
  assert.equal(validateSalesItems([{ productId: 'closed', quantity: 1 }], catalog, [{ productId: 'closed', quantity: 1 }]).totalQuantity, 1);
});
```

- [ ] **Step 2: Run tests and verify RED**

Run: `node --test functions/test/salesDomain.test.js`

Expected: FAIL because `functions/src/salesDomain.js` does not exist.

- [ ] **Step 3: Implement the pure domain contract**

```js
export class SalesOperationError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'SalesOperationError';
    this.code = code;
  }
}

const UID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const laosDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Vientiane', year: 'numeric', month: '2-digit', day: '2-digit',
});

export function laosSalesDateKey(now = new Date()) {
  const parts = Object.fromEntries(laosDateFormatter.formatToParts(now).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function dailySalesDocumentId(dateKey, uid) {
  if (!DATE_KEY_PATTERN.test(dateKey)) throw new SalesOperationError('invalid-argument', 'Invalid sales date');
  if (!UID_PATTERN.test(uid)) throw new SalesOperationError('invalid-argument', 'Invalid staff uid');
  return `${dateKey}_${uid}`;
}

export function normalizeSalesProductName(name) {
  const normalized = String(name ?? '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('en-US');
  if (!normalized) throw new SalesOperationError('invalid-argument', 'Product name required');
  return normalized;
}
```

Implement `validateSalesItems` to return only `quantity > 0`, reject duplicate IDs, require safe string IDs and nonnegative integers, preserve an existing inactive quantity only when it does not increase, and derive every snapshot name from `catalogById`.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `node --test functions/test/salesDomain.test.js`

Expected: all tests in `salesDomain.test.js` PASS.

- [ ] **Step 5: Commit**

```powershell
git add functions/src/salesDomain.js functions/test/salesDomain.test.js
git diff --cached --check
git commit -m "feat: add daily sales server domain"
```

---

### Task 2: Trusted Product Catalog Administration

**Files:**
- Create: `functions/src/salesAdmin.js`
- Create: `functions/test/salesProductAdmin.test.js`
- Modify: `functions/src/index.js`

**Interfaces:**
- Consumes: `assertAdmin(actor)`, `normalizeSalesProductName(name)`, Firestore `db`.
- Produces: `createSalesProductOperation({ db }, actor, data)` and `updateSalesProductOperation({ db }, actor, data)`; callables `createSalesProduct` and `updateSalesProduct`.

- [ ] **Step 1: Write failing catalog-operation tests**

Cover these exact cases in `salesProductAdmin.test.js`:

```js
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
```

The test helper must expose an in-memory query result and transaction writes so duplicate-name and audit behavior are asserted without production access.

- [ ] **Step 2: Run tests and verify RED**

Run: `node --test functions/test/salesProductAdmin.test.js`

Expected: FAIL because the catalog operations and callables are absent.

- [ ] **Step 3: Implement catalog operations and register callables**

Implement transaction-backed name uniqueness:

```js
export async function createSalesProductOperation({ db }, actor, data) {
  assertAdmin(actor);
  const name = String(data?.name ?? '').trim().replace(/\s+/g, ' ');
  const normalizedName = normalizeSalesProductName(name);
  const sortOrder = Number(data?.sortOrder ?? 0);
  if (!Number.isInteger(sortOrder)) throw new SalesOperationError('invalid-argument', 'Product sort order must be an integer');
  const ref = db.collection('salesProducts').doc();
  await db.runTransaction(async (transaction) => {
    const duplicate = await transaction.get(db.collection('salesProducts').where('normalizedName', '==', normalizedName).limit(1));
    if (!duplicate.empty) throw new SalesOperationError('already-exists', 'Product name already exists');
    transaction.create(ref, {
      schemaVersion: 1, name, normalizedName, active: true, sortOrder,
      createdBy: actor.uid, createdAt: FieldValue.serverTimestamp(),
      updatedBy: actor.uid, updatedAt: FieldValue.serverTimestamp(),
    });
  });
  return { id: ref.id, name, active: true, sortOrder };
}
```

`updateSalesProductOperation` must validate a safe product ID, load the document, reject missing products, query duplicate normalized names excluding the current ID, and update only `name`, `normalizedName`, `sortOrder`, `active`, `updatedBy`, `updatedAt`.

Register in `functions/src/index.js`:

```js
export const createSalesProduct = callable(createSalesProductOperation);
export const updateSalesProduct = callable(updateSalesProductOperation);
```

Extend `callable` so a caught `SalesOperationError.code` in the approved callable error-code allowlist is preserved as `HttpsError`; do not change existing message-based mappings for older operations.

- [ ] **Step 4: Run catalog and complete Functions suites**

Run:

```powershell
node --test functions/test/salesProductAdmin.test.js
npm.cmd run test:functions
npm.cmd --prefix functions run lint
```

Expected: focused tests PASS; existing Functions tests and lint remain PASS.

- [ ] **Step 5: Commit**

```powershell
git add functions/src/index.js functions/src/salesAdmin.js functions/test/salesProductAdmin.test.js
git diff --cached --check
git commit -m "feat: add sales product administration"
```

---

### Task 3: Daily Save and Audited Amendment Operations

**Files:**
- Modify: `functions/src/salesAdmin.js`
- Create: `functions/test/salesAdmin.test.js`
- Modify: `functions/src/index.js`

**Interfaces:**
- Consumes: Task 1 domain functions and Firestore transaction API.
- Produces: `saveDailySalesOperation`, `amendDailySalesOperation`; callables `saveDailySales`, `amendDailySales`.

- [ ] **Step 1: Write failing daily-save tests**

Use an in-memory transaction fake that records `get`, `set`, and `create` operations. Prove:

```js
test('staff saves exactly one Laos-today document for self and claim branch', async () => {
  const now = new Date('2026-09-10T17:30:00Z');
  const result = await saveDailySalesOperation(servicesWithCatalog(), staffA, {
    items: [{ productId: 'bcel', quantity: 2 }],
  }, now);
  assert.equal(result.id, '2026-09-11_staff-a');
  assert.equal(result.totalQuantity, 2);
  assert.equal(write.path, 'dailySales/2026-09-11_staff-a');
  assert.equal(write.value.staffUid, 'staff-a');
  assert.equal(write.value.branchId, '010');
});

test('retry updates the deterministic document without creating a duplicate', async () => {
  await saveDailySalesOperation(services, staffA, { items: [{ productId: 'bcel', quantity: 2 }] }, now);
  await saveDailySalesOperation(services, staffA, { items: [{ productId: 'bcel', quantity: 3 }] }, now);
  assert.deepEqual([...documents.keys()], ['dailySales/2026-09-11_staff-a']);
  assert.equal(documents.get('dailySales/2026-09-11_staff-a').totalQuantity, 3);
});

test('admin pending disabled and forged identity fields fail closed', async () => {
  await assert.rejects(() => saveDailySalesOperation(services, admin, { items: [] }, now), /branch account/i);
  await assert.rejects(() => saveDailySalesOperation(services, pending, { items: [] }, now), /approved/i);
  await assert.rejects(() => saveDailySalesOperation(services, staffA, { staffUid: 'staff-b', branchId: '019', items: [] }, now), /identity/i);
});
```

- [ ] **Step 2: Write failing amendment/idempotency tests**

Prove manager same-branch success, manager cross-branch denial, Admin success, reason required, protected identity fields unchanged, atomic revision, and same `mutationId` retry:

```js
test('manager amendment atomically updates own-branch daily sales and creates one immutable revision', async () => {
  const result = await amendDailySalesOperation(servicesWithExistingDaily('010'), managerA, {
    dailySalesId: '2026-09-01_staff-a',
    mutationId: '550e8400-e29b-41d4-a716-446655440000',
    reason: 'ແກ້ຕາມໃບສະຫຼຸບທີມ',
    items: [{ productId: 'bcel', quantity: 4 }],
  });
  assert.equal(result.totalQuantity, 4);
  assert.equal(revisions.size, 1);
  assert.equal([...revisions.values()][0].previousTotalQuantity, 2);
  assert.equal([...revisions.values()][0].nextTotalQuantity, 4);
});

test('amendment retry with one mutation id is idempotent and conflicting reuse fails', async () => {
  await amendDailySalesOperation(services, managerA, payload);
  await amendDailySalesOperation(services, managerA, payload);
  assert.equal(revisions.size, 1);
  await assert.rejects(() => amendDailySalesOperation(services, managerA, { ...payload, items: [{ productId: 'bcel', quantity: 99 }] }), /mutation/i);
});
```

- [ ] **Step 3: Run focused tests and verify RED**

Run: `node --test functions/test/salesAdmin.test.js`

Expected: FAIL because daily operations are not implemented.

- [ ] **Step 4: Implement transactional save and amendment**

`saveDailySalesOperation` must:

```js
export async function saveDailySalesOperation({ db }, actor, data, now = new Date()) {
  if (!['staff', 'branch_manager'].includes(actor?.role) || !actor.branchId) {
    throw new SalesOperationError('permission-denied', 'Approved branch account required');
  }
  if ('staffUid' in (data ?? {}) || 'branchId' in (data ?? {}) || 'dateKey' in (data ?? {})) {
    throw new SalesOperationError('invalid-argument', 'Sales identity fields are server controlled');
  }
  const dateKey = laosSalesDateKey(now);
  const ref = db.doc(`dailySales/${dailySalesDocumentId(dateKey, actor.uid)}`);
  const savedTotalQuantity = await db.runTransaction(async (transaction) => {
    const [profile, existing, catalog] = await loadSalesContext(transaction, db, actor.uid, ref);
    assertApprovedMatchingProfile(actor, profile);
    const normalized = validateSalesItems(data?.items, catalog, existing?.items ?? []);
    transaction.set(ref, dailySalesWrite(actor, profile, dateKey, existing, normalized), { merge: true });
    return normalized.totalQuantity;
  });
  return { id: ref.id, dateKey, totalQuantity: savedTotalQuantity };
}
```

`amendDailySalesOperation` must validate UUID `mutationId`, nonempty reason, existing target document, role/branch access, and preserve `dateKey`, `staffUid`, `staffNameSnapshot`, `branchId`, `createdBy`, `createdAt`. Hash canonical amendment input with SHA-256; use `revisions/{mutationId}` and store `requestDigest`. Inside one transaction: if revision exists with matching digest, return its stored result; if digest differs, fail; otherwise update daily and create revision.

- [ ] **Step 5: Register callables and verify GREEN**

```js
export const saveDailySales = callable(saveDailySalesOperation);
export const amendDailySales = callable(amendDailySalesOperation);
```

Run:

```powershell
node --test functions/test/salesAdmin.test.js
npm.cmd run test:functions
npm.cmd --prefix functions run lint
```

Expected: focused and complete Functions suites PASS; lint PASS.

- [ ] **Step 6: Commit**

```powershell
git add functions/src/index.js functions/src/salesAdmin.js functions/test/salesAdmin.test.js
git diff --cached --check
git commit -m "feat: add trusted daily sales writes"
```

---

### Task 4: Firestore Rules and Required Indexes

**Files:**
- Modify: `firestore.rules`
- Modify: `firestore.indexes.json`
- Modify: `tests/rules/firestore.rules.test.js`

**Interfaces:**
- Consumes: collections and fields defined by Tasks 1–3.
- Produces: client read policy and query contracts used by `salesService.js`.

- [ ] **Step 1: Seed sales fixtures and write failing actor-matrix tests**

Add fixtures under disabled security rules:

```js
await setDoc(doc(context.firestore(), 'salesProducts/bcel'), { name: 'BCEL One', active: true, sortOrder: 10 });
await setDoc(doc(context.firestore(), 'dailySales/2026-09-11_staff-a'), { dateKey: '2026-09-11', staffUid: 'staff-a', branchId: '010', items: [], totalQuantity: 0 });
await setDoc(doc(context.firestore(), 'dailySales/2026-09-11_staff-b'), { dateKey: '2026-09-11', staffUid: 'staff-b', branchId: '019', items: [], totalQuantity: 0 });
await setDoc(doc(context.firestore(), 'dailySales/2026-09-11_staff-a/revisions/change-1'), { changedBy: 'manager-a', changedAt: new Date() });
```

Add tests for Anonymous/Pending/Disabled denial; Staff A own success and Staff B denial; Manager A branch success and Manager B denial; Admin both branches success; revision scope; product reads; and all direct creates/updates/deletes denied.

Add query tests using exact constraints:

```js
const staffQuery = query(collection(staffDb, 'dailySales'), where('staffUid', '==', 'staff-a'), where('dateKey', '>=', '2026-09-01'), where('dateKey', '<=', '2026-09-30'), orderBy('dateKey', 'desc'));
await assertSucceeds(getDocs(staffQuery));
await assertFails(getDocs(query(collection(staffDb, 'dailySales'), where('branchId', '==', '010'))));
```

- [ ] **Step 2: Run Rules tests and verify RED**

Run:

```powershell
$env:PATH='C:\Program Files\Android\Android Studio\jbr\bin;' + $env:PATH
npm.cmd run test:rules
```

Expected: new sales reads fail because the collections fall through to deny-all.

- [ ] **Step 3: Add least-privilege sales Rules**

Add helpers and matches without changing Customer/Activity/User behavior:

```rules
function ownSales(data) {
  return approved() && request.auth.token.role == 'staff' && data.staffUid == request.auth.uid;
}
function managerSales(data) {
  return manager() && data.branchId == request.auth.token.branchId;
}
function salesRead(data) {
  return admin() || ownSales(data) || managerSales(data);
}

match /salesProducts/{productId} {
  allow read: if approved();
  allow create, update, delete: if false;
}

match /dailySales/{dailySalesId} {
  allow read: if salesRead(resource.data);
  allow create, update, delete: if false;

  match /revisions/{revisionId} {
    allow read: if salesRead(get(/databases/$(database)/documents/dailySales/$(dailySalesId)).data);
    allow create, update, delete: if false;
  }
}
```

Extend `ownSales` to accept Branch Manager reading their own document while `managerSales` already authorizes own branch. Staff must never gain same-branch team visibility.

- [ ] **Step 4: Add only required composite indexes**

Append:

```json
{ "collectionGroup": "dailySales", "queryScope": "COLLECTION", "fields": [ { "fieldPath": "staffUid", "order": "ASCENDING" }, { "fieldPath": "dateKey", "order": "DESCENDING" } ] },
{ "collectionGroup": "dailySales", "queryScope": "COLLECTION", "fields": [ { "fieldPath": "branchId", "order": "ASCENDING" }, { "fieldPath": "dateKey", "order": "DESCENDING" } ] },
{ "collectionGroup": "salesProducts", "queryScope": "COLLECTION", "fields": [ { "fieldPath": "active", "order": "ASCENDING" }, { "fieldPath": "sortOrder", "order": "ASCENDING" } ] }
```

- [ ] **Step 5: Run Rules suite and verify GREEN**

Run: `npm.cmd run test:rules`

Expected: complete Firestore and Storage Rules suites PASS; no preexisting actor test regresses.

- [ ] **Step 6: Commit**

```powershell
git add firestore.rules firestore.indexes.json tests/rules/firestore.rules.test.js
git diff --cached --check
git commit -m "feat: secure daily sales data access"
```

---

### Task 5: Frontend Sales Model and Report Domain

**Files:**
- Create: `src/sales/salesModel.js`
- Create: `src/sales/salesModel.test.js`
- Create: `src/sales/salesReport.js`
- Create: `src/sales/salesReport.test.js`

**Interfaces:**
- Produces: `normalizeSalesProduct`, `normalizeDailySales`, `salesItemsFromQuantities`, `salesDateRange`, `buildSalesReport`.
- Consumes: Firestore-like timestamps and `laosTodayKey` from `src/shared/dateTime.js`.
- `buildSalesReport(records, products)` returns this exact shared UI/export shape:

```js
{
  totalQuantity: 0,
  products: [{ productId, name, totalQuantity, percentage, rank, sortOrder }],
  staff: [{ staffUid, staffName, branchId, productTotals, totalQuantity }],
  branches: [{ branchId, productTotals, totalQuantity }],
  days: [{ dateKey, totalQuantity, rows: [{ staffUid, staffName, branchId, items, totalQuantity }] }],
}
```

`productTotals` is a plain `{ [productId]: integer }` object and every returned array has a documented deterministic tie-breaker.

- [ ] **Step 1: Write failing normalization tests**

```js
expect(normalizeSalesProduct({ id: 'bcel', name: 'BCEL One', active: true, sortOrder: 10 })).toEqual({ id: 'bcel', name: 'BCEL One', active: true, sortOrder: 10 });
expect(normalizeDailySales({ id: 'd1', dateKey: '2026-09-11', staffUid: 'u1', branchId: '010', items: [{ productId: 'bcel', productNameSnapshot: 'BCEL One', quantity: 2 }] }).totalQuantity).toBe(2);
expect(salesItemsFromQuantities({ bcel: '2', ibank: '', sms: '0' })).toEqual([{ productId: 'bcel', quantity: 2 }]);
expect(() => salesItemsFromQuantities({ bcel: '1.5' })).toThrow(/integer/i);
```

- [ ] **Step 2: Write failing date-range and aggregation tests**

Use anchor `2026-09-09` and prove:

```js
expect(salesDateRange('today', '2026-09-09')).toEqual({ startKey: '2026-09-09', endKey: '2026-09-09' });
expect(salesDateRange('week', '2026-09-09')).toEqual({ startKey: '2026-09-07', endKey: '2026-09-13' });
expect(salesDateRange('month', '2026-09-09')).toEqual({ startKey: '2026-09-01', endKey: '2026-09-30' });
expect(salesDateRange('year', '2026-09-09')).toEqual({ startKey: '2026-01-01', endKey: '2026-12-31' });
expect(salesDateRange('custom', '2026-09-09', { startKey: '2026-08-31', endKey: '2026-09-02' })).toEqual({ startKey: '2026-08-31', endKey: '2026-09-02' });
```

Build a mixed-branch/mixed-product fixture and assert `buildSalesReport` returns exact `totalQuantity`, product totals/percentages/ranks, staff totals, branch totals, and day totals. Add zero-total, renamed snapshot, leap-day, month-boundary, and ranking-tie assertions.

- [ ] **Step 3: Run focused tests and verify RED**

Run: `npm.cmd test -- src/sales/salesModel.test.js src/sales/salesReport.test.js`

Expected: FAIL because sales domain modules do not exist.

- [ ] **Step 4: Implement normalization and aggregation**

Use date-only UTC arithmetic to avoid browser timezone drift:

```js
function parseKey(key) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key ?? '');
  if (!match) throw new Error('Valid YYYY-MM-DD date required');
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  if (date.toISOString().slice(0, 10) !== key) throw new Error('Valid YYYY-MM-DD date required');
  return date;
}

export function salesDateRange(preset, anchorKey, custom = {}) {
  const anchor = parseKey(anchorKey);
  if (preset === 'today') return { startKey: anchorKey, endKey: anchorKey };
  if (preset === 'week') {
    const mondayOffset = (anchor.getUTCDay() + 6) % 7;
    return { startKey: shiftKey(anchorKey, -mondayOffset), endKey: shiftKey(anchorKey, 6 - mondayOffset) };
  }
  if (preset === 'month') return monthRange(anchor);
  if (preset === 'year') return yearRange(anchor);
  return validatedCustomRange(custom.startKey, custom.endKey);
}
```

`buildSalesReport(records, products)` must perform one pass over records and items, key groups by stable IDs, return the exact shape above, divide percentages only when total is positive, and use the latest in-range snapshot by `dateKey` for summary labels. Sort products by total descending, then `sortOrder`, then `productId`; staff and branches by total descending, then stable ID; days by `dateKey` descending and each day's rows by `staffUid`.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run: `npm.cmd test -- src/sales/salesModel.test.js src/sales/salesReport.test.js`

Expected: both files PASS.

- [ ] **Step 6: Commit**

```powershell
git add src/sales/salesModel.js src/sales/salesModel.test.js src/sales/salesReport.js src/sales/salesReport.test.js
git diff --cached --check
git commit -m "feat: add daily sales reporting domain"
```

---

### Task 6: Role-Scoped Sales Service

**Files:**
- Create: `src/services/salesService.js`
- Create: `src/services/salesService.test.js`

**Interfaces:**
- Consumes: Firebase `db`, `functions`, `normalizeSalesProduct`, `normalizeDailySales`.
- Produces: `subscribeActiveSalesProducts`, `subscribeAllSalesProducts`, `subscribeDailySales`, `saveDailySales`, `amendDailySales`, `createSalesProduct`, `updateSalesProduct`.

- [ ] **Step 1: Write failing query and callable tests**

Mock Firestore/Functions exactly as existing services do. Assert:

```js
subscribeActiveSalesProducts(onData, onError);
expect(where).toHaveBeenCalledWith('active', '==', true);
expect(orderBy).toHaveBeenCalledWith('sortOrder', 'asc');

subscribeAllSalesProducts(onData, onError);
expect(where).not.toHaveBeenCalledWith('active', '==', expect.anything());
expect(orderBy).toHaveBeenCalledWith('sortOrder', 'asc');

subscribeDailySales(staffIdentity, range, onData, onError);
expect(where).toHaveBeenCalledWith('staffUid', '==', 'staff-a');
expect(where).toHaveBeenCalledWith('dateKey', '>=', '2026-09-01');
expect(where).toHaveBeenCalledWith('dateKey', '<=', '2026-09-30');
expect(orderBy).toHaveBeenCalledWith('dateKey', 'desc');

subscribeDailySales(managerIdentity, range, onData, onError);
expect(where).toHaveBeenCalledWith('branchId', '==', '010');

subscribeDailySales(adminIdentity, range, onData, onError);
expect(where).not.toHaveBeenCalledWith('staffUid', '==', expect.anything());
expect(where).not.toHaveBeenCalledWith('branchId', '==', expect.anything());

await saveDailySales([{ productId: 'bcel', quantity: 2 }]);
expect(callable).toHaveBeenCalledWith({ items: [{ productId: 'bcel', quantity: 2 }] });
```

Assert `amendDailySales` sends exactly `dailySalesId`, stable `mutationId`, `reason`, `items`; product mutations call the exact callable names.

- [ ] **Step 2: Run focused test and verify RED**

Run: `npm.cmd test -- src/services/salesService.test.js`

Expected: FAIL because the service does not exist.

- [ ] **Step 3: Implement exact role-scoped queries**

```js
export function subscribeDailySales(identity, { startKey, endKey }, onData, onError) {
  const constraints = [];
  if (identity.claims.role === 'staff') constraints.push(where('staffUid', '==', identity.user.uid));
  else if (identity.claims.role === 'branch_manager') constraints.push(where('branchId', '==', identity.claims.branchId));
  else if (identity.claims.role !== 'admin') throw new Error('Approved sales actor required');
  constraints.push(where('dateKey', '>=', startKey), where('dateKey', '<=', endKey), orderBy('dateKey', 'desc'));
  return onSnapshot(query(collection(db, 'dailySales'), ...constraints), (snapshot) => {
    onData(snapshot.docs.map((item) => normalizeDailySales({ id: item.id, ...item.data() })));
  }, onError);
}
```

`subscribeActiveSalesProducts` queries `active == true` then orders by `sortOrder`; `subscribeAllSalesProducts` orders all catalog documents by `sortOrder` for Admin catalog management. Historical report/correction labels still prefer immutable item snapshots so later renames do not rewrite history. Callable wrappers return `.data` and never add identity/date/branch fields client-side.

- [ ] **Step 4: Run focused and service suites**

Run:

```powershell
npm.cmd test -- src/services/salesService.test.js src/services/queryScope.test.js
npm.cmd run lint
```

Expected: focused tests and lint PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/services/salesService.js src/services/salesService.test.js
git diff --cached --check
git commit -m "feat: add role scoped sales service"
```

---

### Task 7: Today Entry Form and Role-Aware Sales Page

**Files:**
- Create: `src/sales/DailySalesForm.jsx`
- Create: `src/sales/DailySalesForm.test.jsx`
- Create: `src/sales/SalesPage.jsx`
- Create: `src/sales/SalesPage.test.jsx`

**Interfaces:**
- Consumes: `useAuth`, `subscribeActiveSalesProducts`, `subscribeDailySales`, `saveDailySales`, `salesItemsFromQuantities`, `laosTodayKey`.
- Produces: today-only entry UI and shared page tab shell used by later tasks.

- [ ] **Step 1: Write failing daily-form tests**

Assert active products render in sort order, inactive historical product renders only when already saved, `−`/`+` and numeric input remain whole/nonnegative, existing today values load, Admin form is absent, double submit calls once, success is announced, and error preserves quantities.

```jsx
await user.click(screen.getByRole('button', { name: 'ເພີ່ມ BCEL One' }));
await user.click(screen.getByRole('button', { name: 'ບັນທຶກຍອດມື້ນີ້' }));
await user.click(screen.getByRole('button', { name: 'ບັນທຶກຍອດມື້ນີ້' }));
expect(serviceMocks.saveDailySales).toHaveBeenCalledTimes(1);
expect(serviceMocks.saveDailySales).toHaveBeenCalledWith([{ productId: 'bcel', quantity: 1 }]);
expect(await screen.findByRole('status')).toHaveTextContent('ບັນທຶກຍອດຂາຍແລ້ວ');
```

- [ ] **Step 2: Write failing SalesPage role tests**

```jsx
expect(renderSalesPage('staff').getByRole('button', { name: 'ບັນທຶກມື້ນີ້' })).toBeInTheDocument();
expect(renderSalesPage('branch_manager').getByRole('button', { name: 'ບັນທຶກມື້ນີ້' })).toBeInTheDocument();
expect(renderSalesPage('admin').queryByRole('button', { name: 'ບັນທຶກມື້ນີ້' })).not.toBeInTheDocument();
expect(renderSalesPage('admin').getByRole('button', { name: 'ຈັດການຜະລິດຕະພັນ' })).toBeInTheDocument();
```

- [ ] **Step 3: Run focused tests and verify RED**

Run: `npm.cmd test -- src/sales/DailySalesForm.test.jsx src/sales/SalesPage.test.jsx`

Expected: FAIL because UI modules do not exist.

- [ ] **Step 4: Implement today form and tab shell**

Use controlled quantity strings so clearing an input is possible; convert only on save. Add a synchronous ref guard before awaiting:

```js
const submittingRef = useRef(false);
const submit = async (event) => {
  event.preventDefault();
  if (submittingRef.current) return;
  submittingRef.current = true;
  setBusy(true);
  setFeedback(null);
  try {
    await saveDailySales(salesItemsFromQuantities(quantities));
    setFeedback({ kind: 'success', text: 'ບັນທຶກຍອດຂາຍແລ້ວ' });
  } catch (error) {
    setFeedback({ kind: 'error', text: salesErrorMessage(error) });
  } finally {
    submittingRef.current = false;
    setBusy(false);
  }
};
```

Do not optimistically mark saved. Preserve values on failure. Use existing `Navbar`, `GlassCard`, `Button`, accessible Lao labels, and no native visible `<select>`.

- [ ] **Step 5: Run focused and source-guard tests**

Run:

```powershell
npm.cmd test -- src/sales/DailySalesForm.test.jsx src/sales/SalesPage.test.jsx src/test/uiSourceGuard.test.js
npm.cmd run lint
```

Expected: tests and lint PASS.

- [ ] **Step 6: Commit**

```powershell
git add src/sales/DailySalesForm.jsx src/sales/DailySalesForm.test.jsx src/sales/SalesPage.jsx src/sales/SalesPage.test.jsx
git diff --cached --check
git commit -m "feat: add daily sales entry"
```

---

### Task 8: Role-Scoped Report UI

**Files:**
- Create: `src/sales/SalesReportPanel.jsx`
- Create: `src/sales/SalesReportPanel.test.jsx`
- Modify: `src/sales/SalesPage.jsx`
- Modify: `src/sales/SalesPage.test.jsx`

**Interfaces:**
- Consumes: `salesDateRange`, `buildSalesReport`, `subscribeDailySales`, `subscribeAllSalesProducts`, `subscribeAssignableUsers`, `DateField`, `CustomSelect`, `SearchableSelect`.
- Produces: current report result and filters; exposes `onExport(report, metadata)` and `onCorrect(record)` callbacks.

- [ ] **Step 1: Write failing report UI tests**

Prove preset ranges, Monday–Sunday labels, custom DateField range, totals, product ranking, role-specific filters, empty successful state, and query error state.

```jsx
await user.click(screen.getByRole('button', { name: 'ອາທິດນີ້' }));
expect(serviceMocks.subscribeDailySales).toHaveBeenLastCalledWith(
  identity,
  { startKey: '2026-09-07', endKey: '2026-09-13' },
  expect.any(Function),
  expect.any(Function),
);
expect(screen.getByText('BCEL One')).toBeInTheDocument();
expect(screen.getByText('5')).toBeInTheDocument();
```

For Staff, assert no branch/team selector. For Manager, assert same-branch staff selector only. For Admin, assert branch and staff selectors. Assert missing successful data renders `ຍອດລວມ 0`, while subscription failure renders an alert and does not render zero as a successful result.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `npm.cmd test -- src/sales/SalesReportPanel.test.jsx src/sales/SalesPage.test.jsx`

Expected: FAIL because report UI is absent.

- [ ] **Step 3: Implement report filters and rendering**

Keep raw records and derive filtered records/report with `useMemo`. Changing a product/staff/branch filter must not resubscribe; only date range or identity scope resubscribes. Render summary cards, product table, team table, Admin branch table, and daily table from one `buildSalesReport` result.

Custom range uses two existing `DateField` controls and refuses reversed/incomplete ranges before querying. Every filter option uses stable IDs as stored values and Lao display labels.

- [ ] **Step 4: Run focused integration tests**

Run:

```powershell
npm.cmd test -- src/sales/SalesReportPanel.test.jsx src/sales/SalesPage.test.jsx src/components/ui/DateField.test.jsx src/components/ui/CustomSelect.test.jsx src/components/ui/SearchableSelect.test.jsx
npm.cmd run lint
```

Expected: report and shared control tests PASS; lint PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/sales/SalesReportPanel.jsx src/sales/SalesReportPanel.test.jsx src/sales/SalesPage.jsx src/sales/SalesPage.test.jsx
git diff --cached --check
git commit -m "feat: add branch scoped sales reports"
```

---

### Task 9: Audited Historical Correction UI

**Files:**
- Create: `src/sales/SalesCorrectionSheet.jsx`
- Create: `src/sales/SalesCorrectionSheet.test.jsx`
- Modify: `src/sales/SalesReportPanel.jsx`
- Modify: `src/sales/SalesReportPanel.test.jsx`

**Interfaces:**
- Consumes: selected normalized daily record, catalog, `amendDailySales`.
- Produces: reason-required manager/admin correction workflow with stable `mutationId` retry.

- [ ] **Step 1: Write failing correction tests**

```jsx
await user.click(screen.getByRole('button', { name: 'ແກ້ໄຂຍອດ 2026-09-01 Staff A' }));
await user.clear(screen.getByLabelText('ເຫດຜົນການແກ້ໄຂ'));
await user.click(screen.getByRole('button', { name: 'ຢືນຢັນການແກ້ໄຂ' }));
expect(screen.getByRole('alert')).toHaveTextContent('ກະລຸນາລະບຸເຫດຜົນ');

await user.type(screen.getByLabelText('ເຫດຜົນການແກ້ໄຂ'), 'ກວດແກ້ຈາກໃບສະຫຼຸບ');
await user.click(screen.getByRole('button', { name: 'ຢືນຢັນການແກ້ໄຂ' }));
expect(serviceMocks.amendDailySales).toHaveBeenCalledWith(expect.objectContaining({
  dailySalesId: '2026-09-01_staff-a',
  reason: 'ກວດແກ້ຈາກໃບສະຫຼຸບ',
  mutationId: expect.stringMatching(/^[0-9a-f-]{36}$/),
}));
```

Assert Staff never sees correction controls; Manager sees only records already returned by branch-scoped query; Admin sees all returned records. Simulate one network failure then retry and assert the same `mutationId` is reused.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `npm.cmd test -- src/sales/SalesCorrectionSheet.test.jsx src/sales/SalesReportPanel.test.jsx`

Expected: FAIL because the correction sheet does not exist.

- [ ] **Step 3: Implement correction sheet**

Use existing `ModalSheet`, controlled quantities, required `Textarea`, and `crypto.randomUUID()` created when the sheet opens. Clear `mutationId` only after a confirmed success or cancel; preserve it on retry. Do not allow editing date, staff, or branch fields.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `npm.cmd test -- src/sales/SalesCorrectionSheet.test.jsx src/sales/SalesReportPanel.test.jsx src/components/ui/ModalSheet.test.jsx`

Expected: correction and modal tests PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/sales/SalesCorrectionSheet.jsx src/sales/SalesCorrectionSheet.test.jsx src/sales/SalesReportPanel.jsx src/sales/SalesReportPanel.test.jsx
git diff --cached --check
git commit -m "feat: audit historical sales corrections"
```

---

### Task 10: Excel Export

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src/sales/salesExport.js`
- Create: `src/sales/salesExport.test.js`
- Modify: `src/sales/SalesReportPanel.jsx`
- Modify: `src/sales/SalesReportPanel.test.jsx`

**Interfaces:**
- Consumes: exact `buildSalesReport` result and current report metadata.
- Produces: `sanitizeSpreadsheetText`, `buildSalesWorkbook(ExcelJS, report, metadata)`, `downloadSalesWorkbook(report, metadata)`.

- [ ] **Step 1: Install pinned ExcelJS dependency**

Run: `npm.cmd install --save-exact exceljs@4.4.0`

Expected: `package.json` contains `"exceljs": "4.4.0"`; root lockfile changes; no unrelated dependency upgrade command is run.

- [ ] **Step 2: Write failing workbook tests**

```js
import ExcelJS from 'exceljs';
import { buildSalesWorkbook, sanitizeSpreadsheetText } from './salesExport';

it('builds exactly three approved sheets from the shared report result', () => {
  const workbook = buildSalesWorkbook(ExcelJS, reportFixture, metadataFixture);
  expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual([
    'ສະຫຼຸບຜະລິດຕະພັນ',
    'ສະຫຼຸບທີມງານ',
    'ລາຍລະອຽດລາຍວັນ',
  ]);
  expect(workbook.getWorksheet('ສະຫຼຸບຜະລິດຕະພັນ').getCell('B6').value).toBe(reportFixture.products[0].totalQuantity);
});

it('prevents spreadsheet formula injection', () => {
  expect(sanitizeSpreadsheetText('=HYPERLINK("bad")')).toBe('\'=HYPERLINK("bad")');
  expect(sanitizeSpreadsheetText('+123')).toBe("'+123");
  expect(sanitizeSpreadsheetText('BCEL One')).toBe('BCEL One');
});
```

Add tests for metadata, empty report, role-scope fixture, exact filename, and daily sheet rows.

- [ ] **Step 3: Run export tests and verify RED**

Run: `npm.cmd test -- src/sales/salesExport.test.js`

Expected: FAIL because export module does not exist.

- [ ] **Step 4: Implement workbook builder and lazy download**

```js
export function sanitizeSpreadsheetText(value) {
  const text = String(value ?? '');
  return /^[=+\-@]/.test(text.trimStart()) ? `'${text}` : text;
}

export async function downloadSalesWorkbook(report, metadata) {
  const excelModule = await import('exceljs');
  const ExcelJS = excelModule.default ?? excelModule;
  const workbook = buildSalesWorkbook(ExcelJS, report, metadata);
  const bytes = await workbook.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([bytes], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = salesExportFilename(metadata.startKey, metadata.endKey);
  anchor.click();
  URL.revokeObjectURL(url);
}
```

Build all sheets from the passed report only; do not fetch inside the export module. Apply readable headers, frozen rows, column widths, integer formats and percent formats. Sanitize every non-system text cell.

- [ ] **Step 5: Connect Export button and test failures**

`SalesReportPanel` passes the already filtered report plus metadata. Disable while generating, announce success, and show an alert on export failure without re-querying or altering data.

Run:

```powershell
npm.cmd test -- src/sales/salesExport.test.js src/sales/SalesReportPanel.test.jsx
npm.cmd run build
```

Expected: tests PASS; build output contains ExcelJS in a lazy chunk rather than the entry chunk.

- [ ] **Step 6: Commit**

```powershell
git add package.json package-lock.json src/sales/salesExport.js src/sales/salesExport.test.js src/sales/SalesReportPanel.jsx src/sales/SalesReportPanel.test.jsx
git diff --cached --check
git commit -m "feat: export sales reports to Excel"
```

---

### Task 11: Admin Product Catalog UI

**Files:**
- Create: `src/sales/SalesProductAdmin.jsx`
- Create: `src/sales/SalesProductAdmin.test.jsx`
- Modify: `src/sales/SalesPage.jsx`
- Modify: `src/sales/SalesPage.test.jsx`

**Interfaces:**
- Consumes: `subscribeAllSalesProducts`, `createSalesProduct`, `updateSalesProduct`, existing form controls.
- Produces: Admin-only create/rename/reorder/activate/deactivate UI with no delete action.

- [ ] **Step 1: Write failing catalog UI tests**

Assert Admin can create, edit sort order, rename and deactivate with confirmation; duplicate/permission/server errors appear; inactive rows remain visible; no delete action exists; Staff/Manager never render the tab.

```jsx
expect(screen.queryByRole('button', { name: /ລຶບ/ })).not.toBeInTheDocument();
await user.click(screen.getByRole('button', { name: 'ປິດນຳໃຊ້ BCEL One' }));
expect(screen.getByRole('dialog', { name: 'ຢືນຢັນປິດຜະລິດຕະພັນ' })).toBeInTheDocument();
await user.click(screen.getByRole('button', { name: 'ຢືນຢັນປິດນຳໃຊ້' }));
expect(serviceMocks.updateSalesProduct).toHaveBeenCalledWith('bcel', expect.objectContaining({ active: false }));
```

- [ ] **Step 2: Run focused tests and verify RED**

Run: `npm.cmd test -- src/sales/SalesProductAdmin.test.jsx src/sales/SalesPage.test.jsx`

Expected: FAIL because Admin catalog UI is absent.

- [ ] **Step 3: Implement Admin catalog UI**

Use `ModalSheet` for create/edit, `Input` for name and integer sort order, `Button` for activate/deactivate, and a confirmation sheet before deactivation. Keep disabled products in the list with a Lao status badge. Never render or call a hard-delete function.

- [ ] **Step 4: Run focused and source-guard tests**

Run:

```powershell
npm.cmd test -- src/sales/SalesProductAdmin.test.jsx src/sales/SalesPage.test.jsx src/test/uiSourceGuard.test.js
npm.cmd run lint
```

Expected: tests and lint PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/sales/SalesProductAdmin.jsx src/sales/SalesProductAdmin.test.jsx src/sales/SalesPage.jsx src/sales/SalesPage.test.jsx
git diff --cached --check
git commit -m "feat: manage sales product catalog"
```

---

### Task 12: Route, Navigation, and Responsive Presentation

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/pages/Home.jsx`
- Modify: `src/pages/Home.test.jsx`
- Modify: `src/pages/Profile.jsx`
- Modify: `src/pages/Profile.test.jsx`
- Modify: `src/styles/screens.css`
- Modify: `src/styles/screens.test.js`
- Modify: `src/test/uiSourceGuard.test.js`

**Interfaces:**
- Consumes: `SalesPage` from earlier tasks.
- Produces: protected lazy route, Home/Profile entry points, mobile/desktop layout contracts.

- [ ] **Step 1: Write failing route/navigation tests**

Add assertions that:

- `App.jsx` lazy-loads `/sales` inside the approved protected shell.
- Home contains a quick link named `ຍອດຂາຍມື້ນີ້` to `/sales`.
- Profile contains a More-menu link named `ຍອດຂາຍ ແລະລາຍງານ` to `/sales`.
- `BottomNav.test.jsx` remains unchanged and still has exactly five destinations.

```jsx
expect(screen.getByRole('link', { name: 'ຍອດຂາຍມື້ນີ້' })).toHaveAttribute('href', '/sales');
expect(screen.getByRole('link', { name: 'ຍອດຂາຍ ແລະລາຍງານ' })).toHaveAttribute('href', '/sales');
```

- [ ] **Step 2: Write failing responsive CSS contract tests**

Extend `screens.test.js` to require `.sales-entry-grid`, `.sales-report-table-wrap`, `.sales-tabs`, and a `@media (max-width: 430px)` rule that collapses sales summary/filter grids to `minmax(0, 1fr)`. Extend source guard to confirm no visible native `<select>` is introduced and sales tables are inside an overflow wrapper rather than widening the page.

- [ ] **Step 3: Run focused tests and verify RED**

Run: `npm.cmd test -- src/pages/Home.test.jsx src/pages/Profile.test.jsx src/styles/screens.test.js src/test/uiSourceGuard.test.js src/components/BottomNav.test.jsx`

Expected: new sales route/link/style assertions FAIL; BottomNav baseline remains PASS.

- [ ] **Step 4: Implement route and entry links**

Add:

```jsx
const SalesPage = lazy(() => import('./sales/SalesPage'));
```

and inside the existing protected AppShell route:

```jsx
<Route path="sales" element={<SalesPage />} />
```

Use React Router `Link` in Home/Profile; do not use raw full-page navigation. Keep `BottomNav.jsx` unchanged.

- [ ] **Step 5: Add feature-owned responsive CSS**

Add only `.sales-*` rules to `screens.css`: tab overflow, quantity row/grid, summary grid, table overflow, sticky table headers, disabled product state, 360px single-column form/filter layout, and touch targets at least `var(--touch-target)`. Reuse existing color/radius/shadow tokens.

- [ ] **Step 6: Run UI integration tests and build**

Run:

```powershell
npm.cmd test -- src/pages/Home.test.jsx src/pages/Profile.test.jsx src/styles/screens.test.js src/test/uiSourceGuard.test.js src/components/BottomNav.test.jsx src/sales
npm.cmd run lint
npm.cmd run build
```

Expected: all selected tests, lint and build PASS; Bottom Navigation remains five items; no horizontal-overflow guard fails.

- [ ] **Step 7: Commit**

```powershell
git add src/App.jsx src/pages/Home.jsx src/pages/Home.test.jsx src/pages/Profile.jsx src/pages/Profile.test.jsx src/styles/screens.css src/styles/screens.test.js src/test/uiSourceGuard.test.js
git diff --cached --check
git commit -m "feat: add sales tracking navigation"
```

---

### Task 13: Deployment Documentation and Full Verification

**Files:**
- Modify: `docs/deployment/production-checklist.md`
- Modify: `docs/deployment/production-runbook.md`

**Interfaces:**
- Consumes: final callable names, indexes, Rules and frontend route.
- Produces: human-executable backend-first rollout/rollback checklist; no production mutation in this task.

- [ ] **Step 1: Update production checklist with exact sales gates**

Document these commands as future approval-gated actions:

```powershell
firebase.cmd deploy --only functions:createSalesProduct,functions:updateSalesProduct,functions:saveDailySales,functions:amendDailySales --project crm-web-app-97b91
firebase.cmd deploy --only firestore:indexes --project crm-web-app-97b91
firebase.cmd deploy --only firestore:rules --project crm-web-app-97b91
git push origin main
```

Require waiting for all three new indexes (`dailySales staff/date`, `dailySales branch/date`, `salesProducts active/sortOrder`) to reach READY before frontend rollout. Require capturing previous Functions inventory, prior Rules source/ruleset, index inventory, current `main`, Vercel deployment ID and rollback alias before mutation.

- [ ] **Step 2: Add acceptance and rollback matrix**

Acceptance must cover:

- Staff save/retry/own report/export/cross-user denial.
- Branch Manager own save, branch report/export, same-branch correction with audit, cross-branch denial.
- Admin all-branch report/export/catalog/correction and no self-entry.
- Anonymous/Pending/Disabled denial.
- Daily/Mon–Sun weekly/monthly/yearly/custom-range totals.
- Excel 3-sheet totals matching UI.
- 360px iPhone and desktop behavior.

Rollback must restore frontend and Rules/Functions from captured versions without deleting `salesProducts`, `dailySales` or revisions. Data removal requires separate human review.

- [ ] **Step 3: Run complete fresh verification**

Run:

```powershell
npm.cmd run lint
npm.cmd test
npm.cmd run test:functions
$env:PATH='C:\Program Files\Android\Android Studio\jbr\bin;' + $env:PATH
npm.cmd run test:rules
npm.cmd run build
git diff --check
git status --short
```

Expected:

- Root Vitest: all files/tests PASS.
- Functions: all Node tests PASS.
- Firestore and Storage Rules emulator tests PASS.
- Root and Functions lint PASS (run `npm.cmd --prefix functions run lint` if not already included by the root lint configuration).
- Production build exits 0; ExcelJS is a lazy chunk.
- `git diff --check` exits 0.
- Working tree contains only the two intended deployment documentation files before the final docs commit.

- [ ] **Step 4: Review the complete branch diff**

Run:

```powershell
git diff main...HEAD --stat
git diff main...HEAD -- firestore.rules firestore.indexes.json functions/src functions/test src/sales src/services/salesService.js src/App.jsx src/pages/Home.jsx src/pages/Profile.jsx src/styles/screens.css package.json docs/deployment
git stash list
```

Confirm no Customer/Activity/Auth/PWA/Storage Rules behavior changed, no secrets or PII logs exist, no visible native `<select>` was introduced, no product hard-delete exists, every direct sales write is denied, and the preexisting stash still exists unchanged.

- [ ] **Step 5: Commit deployment documentation**

```powershell
git add docs/deployment/production-checklist.md docs/deployment/production-runbook.md
git diff --cached --check
git commit -m "docs: add daily sales deployment gates"
git status --short
```

Expected: clean feature branch with focused commits. Stop before merge, push, Firebase deployment, product seeding or production data mutation and present integration/deployment choices to the user.
