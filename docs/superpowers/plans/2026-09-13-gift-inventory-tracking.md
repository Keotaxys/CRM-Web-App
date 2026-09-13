# Gift Inventory Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ສ້າງລະບົບ Stock ເຄື່ອງແຈກແຍກຕາມສາຂາ ທີ່ບັນທຶກການຮັບ/ຈັດສັນ/ແຈກ/ປັບຍອດແບບກວດສອບຍ້ອນຫຼັງໄດ້, ມີລາຍງານ ແລະ Export Excel.

**Architecture:** ການປ່ຽນ Stock ທັງໝົດຜ່ານ Firebase callable Functions ແລະ Firestore transactions; client ບໍ່ຂຽນ Stock, movement ຫຼື revision ໂດຍກົງ. `branchGiftStocks` ເກັບຍອດປັດຈຸບັນສຳລັບອ່ານໄວ ແລະ `giftStockMovements` ເປັນ append-only ledger ສຳລັບ audit/reconciliation. Frontend ໃຊ້ role-scoped subscriptions, pure report model ແລະ ExcelJS ແບບ dynamic import ຕາມ pattern ຂອງ Daily Sales.

**Tech Stack:** React 19, React Router 7, Firebase Web SDK 12, Cloud Functions v2/Node.js 22, Firestore, Firebase Emulator Suite, Vitest 4, Node test runner, ExcelJS 4.4, CSS ຂອງ CRM ປັດຈຸບັນ.

**Spec:** `docs/superpowers/specs/2026-09-13-gift-inventory-tracking-design.md`

## Global Constraints

- ໃຊ້ເຂດເວລາ `Asia/Vientiane`; ອາທິດເລີ່ມວັນຈັນ.
- ຄ່າ Stock ເກັບເປັນຈຳນວນອັນແບບ integer; `totalUnits = packs * unitsPerPackSnapshot + looseUnits`.
- Stock ຕິດລົບບໍ່ໄດ້ ແລະ multi-item operation ຕ້ອງ all-or-nothing.
- ຕໍ່ receipt/allocation/distribution ຮອງຮັບສູງສຸດ 25 gift rows ແລະ gift ID ບໍ່ຊ້ຳ.
- Client ສົ່ງ stable UUID; server ກວດ payload SHA-256 digest ເພື່ອ retry ບໍ່ສ້າງຍອດຊ້ຳ.
- Actor UID, role, branch, date key ແລະ timestamps ເປັນ server-controlled fields.
- Admin ທີ່ເຮັດວຽກໃຫ້ສາຂາຍັງຖືກບັນທຶກເປັນ Admin; ບໍ່ມີ impersonation.
- Anonymous, Pending ແລະ Disabled ບໍ່ມີສິດຕໍ່ gift data.
- Staff ຂ້າມສາຂາບໍ່ໄດ້; Branch Manager ຂ້າມສາຂາບໍ່ໄດ້; Admin ເຮັດໄດ້ທຸກສາຂາ.
- ບໍ່ມີ hard delete ສຳລັບ catalog, Campaign, receipt, allocation, distribution, revision ຫຼື movement.
- ບໍ່ນຳເຂົ້າ Notion data; ບໍ່ເກັບລາຄາ/ຕົ້ນທຶນ; ບໍ່ເພີ່ມ barcode, image ຫຼື external notification.
- ບໍ່ປ່ຽນ Customer, Activity, Birthday Reminder, Daily Sales, Auth ຫຼື Storage contract ນອກຈາກ read-only integration ທີ່ລະບຸໃນແຜນນີ້.
- ພັດທະນາໃນ branch/worktree `codex/gift-inventory-tracking`; ບໍ່ລົງມືໂດຍກົງໃນ `main`.
- ທຸກ implementation task ໃຊ້ RED → GREEN → subsystem verification → focused commit.
- ບໍ່ Deploy production ຈົນກວ່າ full verification, independent review ແລະການອະນຸມັດ production mutation ແບບຊັດເຈນ.

---

## File and Responsibility Map

### Backend

- `functions/src/giftDomain.js`: error type, Laos date, UUID/digest, ID, pack/unit, item-row and access validation.
- `functions/src/giftCatalog.js`: gift catalog and Campaign operations.
- `functions/src/giftInventory.js`: threshold, direct receipt, allocation confirmation/cancellation and stock adjustment operations.
- `functions/src/giftDistribution.js`: create/amend/cancel distribution and movement deltas.
- `functions/src/index.js`: callable exports and `GiftOperationError` mapping.
- `functions/test/helpers/fakeGiftFirestore.js`: transaction-capable in-memory test double used only by gift operation tests.
- `functions/test/giftDomain.test.js`: pure validation/idempotency tests.
- `functions/test/giftCatalog.test.js`: catalog/Campaign authorization and uniqueness tests.
- `functions/test/giftInventory.test.js`: inbound/allocation/adjustment tests.
- `functions/test/giftDistribution.test.js`: distribution/concurrency/reversal tests.

### Security and indexes

- `firestore.rules`: gift read scopes and deny-all direct writes.
- `firestore.indexes.json`: only indexes required by actual gift queries.
- `tests/rules/firestore.rules.test.js`: complete gift actor/query/direct-document matrix.

### Client domain and data access

- `src/gifts/giftModel.js`: normalization, pack display, form-line conversion and low-stock predicate.
- `src/gifts/giftReport.js`: date ranges, filtering, grouping and reconciliation-ready report totals.
- `src/gifts/giftExport.js`: three-sheet Excel workbook.
- `src/gifts/giftErrors.js`: callable error-code to Lao UI message mapping.
- `src/shared/spreadsheet.js`: shared spreadsheet text sanitization used by Sales and Gifts.
- `src/services/giftService.js`: Firestore subscriptions and callable wrappers.
- Matching `*.test.js` files: unit and service-contract coverage.

### Client UI

- `src/gifts/GiftsPage.jsx`: role-aware tabs and branch selection.
- `src/gifts/GiftDistributionForm.jsx`: Customer/Campaign recipient and compact multi-gift rows.
- `src/gifts/GiftCorrectionSheet.jsx`: amend/cancel flow with reason and expected version.
- `src/gifts/GiftStockPanel.jsx`: current stock, thresholds and low-stock state.
- `src/gifts/GiftInboundPanel.jsx`: direct receipt and allocation/confirmation UI.
- `src/gifts/GiftCatalogAdmin.jsx`: Admin catalog UI.
- `src/gifts/GiftCampaignAdmin.jsx`: branch-scoped Campaign UI.
- `src/gifts/GiftReportPanel.jsx`: filters, KPI summaries, movement list and export action.
- Matching `*.test.jsx` files: behavior, role visibility and accessibility.

### Notifications, navigation and styling

- `src/gifts/GiftLowStockProvider.jsx`, `GiftLowStockContext.js`, `useGiftLowStock.js`: live role-scoped low-stock count/list.
- `src/notifications/NotificationCenterPage.jsx`: Birthday + low-stock notification list.
- `src/App.jsx`: lazy routes and provider wiring.
- `src/App.test.jsx`: route/provider smoke tests for Gifts and Notifications.
- `src/components/Navbar.jsx`: combined bell count and notification-center link.
- `src/pages/Profile.jsx`: “ເຄື່ອງແຈກ” entry in the existing More/Profile page.
- `src/styles/screens.css`, `src/styles/screens.test.js`: responsive gift layouts.
- Existing matching tests: routing, bell count and navigation regressions.

### Rollout evidence

- `docs/deployment/gift-inventory-rollout.md`: exact backend-first deployment, verification, rollback and acceptance checklist.

---

### Task 1: Create the shared gift domain contract

**Files:**
- Create: `functions/src/giftDomain.js`
- Create: `functions/test/giftDomain.test.js`

**Interfaces:**
- Produces: `GiftOperationError`, `laosGiftDateKey(now)`, `normalizeGiftName(name)`, `assertUuid(value, label)`, `assertDocumentId(value, label)`, `giftStockId(branchId, giftId)`, `giftRequestDigest(value)`, `normalizeGiftLines(lines, catalogById)`, `giftMovementId(operationId, giftId)`.
- `normalizeGiftLines` returns `{ items, totalUnits }`; every item contains `giftId`, `giftNameSnapshot`, `packs`, `looseUnits`, `unitsPerPackSnapshot`, `totalUnits`.

- [ ] **Step 1: Write failing validation and normalization tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertDocumentId,
  giftMovementId,
  giftRequestDigest,
  giftStockId,
  laosGiftDateKey,
  normalizeGiftName,
  normalizeGiftLines,
} from '../src/giftDomain.js';

const catalog = new Map([['umbrella', {
  id: 'umbrella', name: 'ຄັນຮົ່ມ', active: true, unitsPerPack: 10,
}]]);

test('normalizes packs and loose units into base units', () => {
  assert.deepEqual(normalizeGiftLines([
    { giftId: 'umbrella', packs: 2, looseUnits: 5 },
  ], catalog), {
    items: [{ giftId: 'umbrella', giftNameSnapshot: 'ຄັນຮົ່ມ', packs: 2,
      looseUnits: 5, unitsPerPackSnapshot: 10, totalUnits: 25 }],
    totalUnits: 25,
  });
});

test('rejects duplicate gifts invalid integers inactive gifts and more than 25 rows', () => {
  assert.throws(() => normalizeGiftLines([
    { giftId: 'umbrella', packs: 0, looseUnits: 1 },
    { giftId: 'umbrella', packs: 0, looseUnits: 1 },
  ], catalog), /Duplicate gift/i);
  assert.throws(() => normalizeGiftLines([
    { giftId: 'umbrella', packs: 0.5, looseUnits: 0 },
  ], catalog), /integer/i);
  assert.throws(() => normalizeGiftLines(Array.from({ length: 26 }, (_, index) => ({
    giftId: `gift-${index}`, packs: 0, looseUnits: 1,
  })), new Map(Array.from({ length: 26 }, (_, index) => [`gift-${index}`, {
    id: `gift-${index}`, name: `Gift ${index}`, active: true, unitsPerPack: 1,
  }]))), /25/i);
});

test('date ids and digest are deterministic', () => {
  assert.equal(laosGiftDateKey(new Date('2026-09-13T17:30:00Z')), '2026-09-14');
  assert.equal(giftStockId('020', 'umbrella'), '020_umbrella');
  assert.equal(giftMovementId('550e8400-e29b-41d4-a716-446655440000', 'umbrella'),
    '550e8400-e29b-41d4-a716-446655440000_umbrella');
  assert.equal(giftRequestDigest({ b: 2, a: 1 }), giftRequestDigest({ a: 1, b: 2 }));
});

test('normalizes gift names and rejects blank names or invalid document ids', () => {
  assert.deepEqual(normalizeGiftName('  BCEL   One  '), {
    name: 'BCEL One', normalizedName: 'bcel one',
  });
  assert.throws(() => normalizeGiftName('   '), /required/i);
  assert.throws(() => assertDocumentId('bad/id', 'Gift'), /invalid/i);
});
```

- [ ] **Step 2: Run the focused test and confirm RED**

Run: `node --test functions/test/giftDomain.test.js`

Expected: FAIL because `functions/src/giftDomain.js` does not exist.

- [ ] **Step 3: Implement deterministic domain helpers**

```js
import { createHash } from 'node:crypto';

export class GiftOperationError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'GiftOperationError';
    this.code = code;
  }
}

const ID = /^[A-Za-z0-9_-]{1,128}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const formatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Vientiane', year: 'numeric', month: '2-digit', day: '2-digit',
});

export function laosGiftDateKey(now = new Date()) {
  const parts = Object.fromEntries(formatter.formatToParts(now)
    .map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function assertUuid(value, label = 'Operation') {
  if (typeof value !== 'string' || !UUID.test(value)) {
    throw new GiftOperationError('invalid-argument', `${label} id must be a UUID`);
  }
  return value;
}

export function assertDocumentId(value, label = 'Document') {
  if (typeof value !== 'string' || !ID.test(value)) {
    throw new GiftOperationError('invalid-argument', `${label} id is invalid`);
  }
  return value;
}

export function normalizeGiftName(value) {
  if (typeof value !== 'string') {
    throw new GiftOperationError('invalid-argument', 'Gift name is required');
  }
  const name = value.trim().replace(/\s+/g, ' ');
  if (!name) throw new GiftOperationError('invalid-argument', 'Gift name is required');
  return { name, normalizedName: name.toLocaleLowerCase('lo-LA') };
}

export function giftStockId(branchId, giftId) {
  if (!ID.test(branchId ?? '') || !ID.test(giftId ?? '')) {
    throw new GiftOperationError('invalid-argument', 'Invalid gift stock identity');
  }
  return `${branchId}_${giftId}`;
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort()
      .map((key) => [key, canonicalize(value[key])]));
  }
  return value;
}

export function giftRequestDigest(value) {
  return createHash('sha256').update(JSON.stringify(canonicalize(value))).digest('hex');
}

export function giftMovementId(operationId, giftId) {
  return `${assertUuid(operationId)}_${assertDocumentId(giftId, 'Gift')}`;
}

export function normalizeGiftLines(lines, catalogById) {
  if (!Array.isArray(lines) || lines.length < 1 || lines.length > 25) {
    throw new GiftOperationError('invalid-argument', 'Gift items must contain 1 to 25 rows');
  }
  if (!(catalogById instanceof Map)) {
    throw new GiftOperationError('failed-precondition', 'Gift catalog unavailable');
  }
  const seen = new Set();
  const items = lines.map((line) => {
    const giftId = assertDocumentId(line?.giftId, 'Gift');
    if (seen.has(giftId)) throw new GiftOperationError('invalid-argument', 'Duplicate gift id');
    seen.add(giftId);
    const packs = Number(line?.packs ?? 0);
    const looseUnits = Number(line?.looseUnits ?? 0);
    if (!Number.isInteger(packs) || packs < 0 || !Number.isInteger(looseUnits) || looseUnits < 0) {
      throw new GiftOperationError('invalid-argument', 'Gift quantities must be nonnegative integers');
    }
    const gift = catalogById.get(giftId);
    if (!gift?.active || !Number.isInteger(gift.unitsPerPack) || gift.unitsPerPack < 1) {
      throw new GiftOperationError('failed-precondition', 'Active gift with valid pack size required');
    }
    const totalUnits = packs * gift.unitsPerPack + looseUnits;
    if (totalUnits < 1) throw new GiftOperationError('invalid-argument', 'Gift row quantity required');
    return {
      giftId, giftNameSnapshot: gift.name, packs, looseUnits,
      unitsPerPackSnapshot: gift.unitsPerPack, totalUnits,
    };
  });
  return { items, totalUnits: items.reduce((sum, item) => sum + item.totalUnits, 0) };
}
```

Keep error codes stable: blank names and invalid document IDs must fail with `invalid-argument`.

- [ ] **Step 4: Run the focused test and confirm GREEN**

Run: `node --test functions/test/giftDomain.test.js`

Expected: all gift-domain tests PASS.

- [ ] **Step 5: Run Functions lint and commit**

Run: `npm.cmd --prefix functions run lint`

```powershell
git add functions/src/giftDomain.js functions/test/giftDomain.test.js
git diff --cached --check
git commit -m "feat: define gift inventory domain contract"
```

---

### Task 2: Implement catalog and Campaign administration

**Files:**
- Create: `functions/src/giftCatalog.js`
- Create: `functions/test/giftCatalog.test.js`
- Create: `functions/test/helpers/fakeGiftFirestore.js`

**Interfaces:**
- Consumes: `GiftOperationError`, `normalizeGiftName`, `giftRequestDigest` from Task 1; `assertAdmin`, `assertBranchAccess`, `profileMatchesActor` from `functions/src/authz.js`.
- Produces: `createGiftItemOperation`, `updateGiftItemOperation`, `createGiftCampaignOperation`, `updateGiftCampaignOperation`.

Use these exact actor fixtures in operation tests:

```js
const admin = { uid: 'admin-a', role: 'admin', branchId: null, accountStatus: 'approved' };
const managerA = { uid: 'manager-a', role: 'branch_manager', branchId: '010', accountStatus: 'approved' };
const staffA = { uid: 'staff-a', role: 'staff', branchId: '010', accountStatus: 'approved' };
```

- [ ] **Step 1: Build the reusable transaction test double**

Create `fakeGiftFirestore(initialDocuments)` that returns `{ services, documents, writes }`. Define the private `createDatabase(documents, writes)` in the same file before the exported helper. `services.db` must implement `doc`, `collection`, `runTransaction`; the transaction must stage `create`, `set`, `update`, `delete` and apply them only after the callback succeeds. Its references expose stable `.path` values, snapshots expose `exists` plus `data()`, and query doubles support the equality filters used by catalog tests. If the callback throws, discard every staged write and leave `documents`/`writes` unchanged.

```js
function createDatabase(documents, writes) {
  // Return the in-memory doc/collection/query/transaction adapters described
  // above. Keep this helper private to the test double and deterministic.
}

export function fakeGiftFirestore(initialDocuments = {}) {
  const documents = new Map(Object.entries(initialDocuments));
  const writes = [];
  return { services: { db: createDatabase(documents, writes) }, documents, writes };
}
```

- [ ] **Step 2: Write RED tests for role scope, uniqueness and deactivation**

```js
test('Admin creates one normalized active gift and reserves its name', async () => {
  const state = fakeGiftFirestore({
    'users/admin-a': { role: 'admin', branchId: null, accountStatus: 'approved' },
  });
  const result = await createGiftItemOperation(state.services, admin, {
    name: '  ຄັນຮົ່ມ  ', unitLabel: 'ອັນ', packLabel: 'ແພັກ',
    unitsPerPack: 10, sortOrder: 20,
  });
  assert.equal(result.name, 'ຄັນຮົ່ມ');
  assert.equal(state.documents.get(`giftItems/${result.id}`).active, true);
});

test('Manager creates Campaign only for own branch and duplicate branch name fails', async () => {
  const state = fakeGiftFirestore({
    'users/manager-a': { role: 'branch_manager', branchId: '010', accountStatus: 'approved' },
  });
  await assert.doesNotReject(() => createGiftCampaignOperation(state.services, managerA, {
    name: 'ປີໃໝ່', branchId: '010', startDate: '2026-12-01', endDate: '2026-12-31', note: '',
  }));
  await assert.rejects(() => createGiftCampaignOperation(state.services, managerA, {
    name: 'ຂ້າມສາຂາ', branchId: '019', startDate: '2026-12-01', endDate: '2026-12-31', note: '',
  }), /branch/i);
});
```

Also assert Anonymous/Pending/Disabled/Staff denied, Admin any branch allowed, invalid date ranges denied, rename releases the old name reservation, and `active=false` preserves the document.

- [ ] **Step 3: Run the focused tests and confirm RED**

Run: `node --test functions/test/giftCatalog.test.js`

Expected: FAIL because the operations do not exist.

- [ ] **Step 4: Implement catalog and Campaign transactions**

Use SHA-256 of normalized names for deterministic reservation documents:

```js
function giftNameKey(db, normalizedName) {
  return db.doc(`giftItemNameKeys/${createHash('sha256').update(normalizedName).digest('hex')}`);
}

function campaignNameKey(db, branchId, normalizedName) {
  const value = `${branchId}\u0000${normalizedName}`;
  return db.doc(`giftCampaignNameKeys/${createHash('sha256').update(value).digest('hex')}`);
}
```

Each create/update transaction must verify the actor profile, validate all fields, create the new reservation before the catalog document, and delete the old reservation only on a successful rename. Reservation collections remain backend-only.

- [ ] **Step 5: Run catalog tests and Functions suite**

Run: `node --test functions/test/giftCatalog.test.js`

Run: `npm.cmd run test:functions`

Expected: focused tests and all existing Functions tests PASS.

- [ ] **Step 6: Commit**

```powershell
git add functions/src/giftCatalog.js functions/test/giftCatalog.test.js functions/test/helpers/fakeGiftFirestore.js
git diff --cached --check
git commit -m "feat: add gift catalog and campaign administration"
```

---

### Task 3: Implement receipts, allocations, thresholds and adjustments

**Files:**
- Create: `functions/src/giftInventory.js`
- Create: `functions/test/giftInventory.test.js`
- Modify: `functions/test/helpers/fakeGiftFirestore.js`

**Interfaces:**
- Consumes: Task 1 normalization/ID/digest/date helpers and Task 2 test double.
- Produces: `setGiftLowStockThresholdOperation`, `receiveGiftStockOperation`, `createGiftAllocationOperation`, `confirmGiftAllocationOperation`, `cancelGiftAllocationOperation`, `adjustGiftStockOperation`.
- Writes: `branchGiftStocks`, `giftReceipts`, `giftAllocations`, `giftStockMovements`.

Use fixed test IDs and clock:

```js
const managerA = { uid: 'manager-a', role: 'branch_manager', branchId: '010', accountStatus: 'approved' };
const admin = { uid: 'admin-a', role: 'admin', branchId: null, accountStatus: 'approved' };
const operationId = '550e8400-e29b-41d4-a716-446655440000';
const confirmationId = '550e8400-e29b-41d4-a716-446655440001';
const now = new Date('2026-09-13T17:30:00Z');
const allocationPayload = {
  allocationId: operationId,
  targetBranchId: '010',
  source: 'Marketing warehouse',
  reference: 'A-001',
  items: [{ giftId: 'umbrella', packs: 2, looseUnits: 5 }],
};

function inventoryState({ currentUnits = 5 } = {}) {
  return fakeGiftFirestore({
    'users/manager-a': { role: 'branch_manager', branchId: '010', accountStatus: 'approved' },
    'users/admin-a': { role: 'admin', branchId: null, accountStatus: 'approved' },
    'giftItems/umbrella': { name: 'ຄັນຮົ່ມ', active: true, unitsPerPack: 10 },
    'branchGiftStocks/010_umbrella': {
      branchId: '010', giftId: 'umbrella', currentUnits, lowStockThresholdUnits: 5, version: 1,
    },
  });
}
```

- [ ] **Step 1: Write RED tests for direct receipt and threshold scope**

```js
test('Manager direct receipt atomically adds normalized units to own branch', async () => {
  const state = inventoryState({ currentUnits: 5 });
  const result = await receiveGiftStockOperation(state.services, managerA, {
    receiptId: operationId, branchId: '010', source: 'Marketing warehouse', reference: 'R-001',
    items: [{ giftId: 'umbrella', packs: 2, looseUnits: 5 }],
  }, now);
  assert.equal(result.totalUnits, 25);
  assert.equal(state.documents.get('branchGiftStocks/010_umbrella').currentUnits, 30);
  assert.equal(state.documents.get(`giftStockMovements/${operationId}_umbrella`).deltaUnits, 25);
});

test('Manager cannot receive or set a threshold across branches', async () => {
  const state = inventoryState({ currentUnits: 5 });
  await assert.rejects(() => receiveGiftStockOperation(state.services, managerA, {
    receiptId: operationId, branchId: '019', source: 'Warehouse', reference: '',
    items: [{ giftId: 'umbrella', packs: 0, looseUnits: 1 }],
  }, now), /branch/i);
  await assert.rejects(() => setGiftLowStockThresholdOperation(state.services, managerA, {
    branchId: '019', giftId: 'umbrella', lowStockThresholdUnits: 5,
  }), /branch/i);
});
```

- [ ] **Step 2: Write RED tests for allocation state transitions**

Assert: create by Admin only; pending does not change Stock; target Manager/Admin confirmation changes Stock exactly once; cross-branch Manager denied; conflicting retry denied; pending cancellation requires reason; confirmed allocation cannot cancel or reconfirm.

```js
test('allocation changes Stock only on first valid confirmation', async () => {
  const state = inventoryState({ currentUnits: 5 });
  await createGiftAllocationOperation(state.services, admin, allocationPayload, now);
  assert.equal(state.documents.get('branchGiftStocks/010_umbrella').currentUnits, 5);
  await confirmGiftAllocationOperation(state.services, managerA, {
    allocationId: operationId, mutationId: confirmationId,
  }, now);
  await confirmGiftAllocationOperation(state.services, managerA, {
    allocationId: operationId, mutationId: confirmationId,
  }, now);
  assert.equal(state.documents.get('branchGiftStocks/010_umbrella').currentUnits, 30);
});
```

- [ ] **Step 3: Write RED tests for adjustments and atomic failure**

Assert positive/negative adjustment with reason, no negative ending balance, unknown/inactive gift denied, duplicate rows denied, one failing row leaves every stock/movement/parent unchanged, Admin any branch succeeds with Admin audit identity.

- [ ] **Step 4: Run focused tests and confirm RED**

Run: `node --test functions/test/giftInventory.test.js`

Expected: FAIL because inventory operations do not exist.

- [ ] **Step 5: Implement a shared transaction stock-delta helper**

```js
export async function applyGiftDeltas(transaction, db, {
  actor, operationId, operationType, movementType, branchId, dateKey, deltas, reason,
}) {
  const stockRefs = deltas.map((item) => db.doc(`branchGiftStocks/${giftStockId(branchId, item.giftId)}`));
  const snapshots = await Promise.all(stockRefs.map((ref) => transaction.get(ref)));
  const changes = deltas.map((item, index) => {
    const before = Number(snapshots[index].data()?.currentUnits ?? 0);
    const after = before + item.deltaUnits;
    if (!Number.isInteger(after) || after < 0) {
      throw new GiftOperationError('failed-precondition', 'Insufficient gift stock');
    }
    return { item, ref: stockRefs[index], before, after };
  });
  for (const change of changes) {
    transaction.set(change.ref, stockWrite(change, actor, branchId), { merge: true });
    transaction.create(db.doc(`giftStockMovements/${giftMovementId(operationId, change.item.giftId)}`),
      movementWrite(change, actor, operationType, movementType, branchId, dateKey, reason));
  }
}
```

Keep `stockWrite` and `movementWrite` private, pure field builders. `stockWrite` returns `schemaVersion`, `branchId`, `giftId`, `giftNameSnapshot`, `currentUnits`, preserved `lowStockThresholdUnits`, incremented `version`, `updatedBy`, `updatedAt`. `movementWrite` returns every field defined in spec section 5.8, including `distributionOwnerUid: null` for inbound/adjustment. Load and validate the complete active catalog before calling this helper. Read every stock document before issuing any write to comply with Firestore transaction ordering.

- [ ] **Step 6: Implement the six inventory operations**

Every operation must verify actor/profile, branch access, operation state and request digest before calling `applyGiftDeltas`. `createGiftAllocationOperation` writes pending only. `confirmGiftAllocationOperation` uses the stored normalized items and a deterministic confirmation result so retry returns without applying deltas again.

- [ ] **Step 7: Run focused and complete Functions tests**

Run: `node --test functions/test/giftInventory.test.js`

Run: `npm.cmd run test:functions`

Run: `npm.cmd --prefix functions run lint`

Expected: all commands PASS.

- [ ] **Step 8: Commit**

```powershell
git add functions/src/giftInventory.js functions/test/giftInventory.test.js functions/test/helpers/fakeGiftFirestore.js
git diff --cached --check
git commit -m "feat: add transactional gift stock operations"
```

---

### Task 4: Implement distribution, amendments and cancellation

**Files:**
- Create: `functions/src/giftDistribution.js`
- Create: `functions/test/giftDistribution.test.js`
- Modify: `functions/src/giftInventory.js`
- Modify: `functions/test/helpers/fakeGiftFirestore.js`

**Interfaces:**
- Consumes: `applyGiftDeltas` from Task 3 and Task 1 domain helpers.
- Produces: `recordGiftDistributionOperation`, `amendGiftDistributionOperation`, `cancelGiftDistributionOperation`.

Use test fixtures with two active gifts, own/cross-branch Customers, own/cross-branch Campaigns and branch stocks:

```js
const staffA = { uid: 'staff-a', role: 'staff', branchId: '010', accountStatus: 'approved' };
const managerA = { uid: 'manager-a', role: 'branch_manager', branchId: '010', accountStatus: 'approved' };
const admin = { uid: 'admin-a', role: 'admin', branchId: null, accountStatus: 'approved' };
const operationId = '550e8400-e29b-41d4-a716-446655440000';
const now = new Date('2026-09-13T17:30:00Z');

function distributionState() {
  return fakeGiftFirestore({
    'users/staff-a': { role: 'staff', branchId: '010', accountStatus: 'approved', name: 'Staff A' },
    'users/manager-a': { role: 'branch_manager', branchId: '010', accountStatus: 'approved' },
    'users/admin-a': { role: 'admin', branchId: null, accountStatus: 'approved' },
    'giftItems/umbrella': { name: 'ຄັນຮົ່ມ', active: true, unitsPerPack: 10 },
    'giftItems/shirt': { name: 'ເສື້ອ', active: true, unitsPerPack: 10 },
    'branchGiftStocks/010_umbrella': { branchId: '010', giftId: 'umbrella', currentUnits: 20, version: 1 },
    'branchGiftStocks/010_shirt': { branchId: '010', giftId: 'shirt', currentUnits: 20, version: 1 },
    'customers/customer-a': { name: 'Customer A', branchId: '010', recordState: 'active' },
    'customers/customer-b': { name: 'Customer B', branchId: '019', recordState: 'active' },
    'giftCampaigns/campaign-a': { name: 'Campaign A', branchId: '010', active: true },
    'giftCampaigns/campaign-b': { name: 'Campaign B', branchId: '019', active: true },
  });
}
```

- [ ] **Step 1: Write RED tests for a valid Customer distribution**

```js
test('Staff distributes multiple gifts to an own-branch Customer atomically', async () => {
  const state = distributionState();
  const result = await recordGiftDistributionOperation(state.services, staffA, {
    distributionId: operationId,
    expectedDateKey: '2026-09-14',
    branchId: '010',
    recipientType: 'customer',
    customerId: 'customer-a',
    items: [
      { giftId: 'umbrella', packs: 0, looseUnits: 3 },
      { giftId: 'shirt', packs: 1, looseUnits: 0 },
    ],
    note: 'VIP visit',
  }, now);
  assert.equal(result.totalUnits, 13);
  assert.equal(state.documents.get('branchGiftStocks/010_umbrella').currentUnits, 17);
  assert.equal(state.documents.get('giftDistributions/' + operationId).createdBy, 'staff-a');
});
```

- [ ] **Step 2: Write RED security and validation tests**

Assert Customer/Campaign XOR, missing recipient, Customer/Campaign branch mismatch, cross-branch actor, forged actor/date/timestamp fields, inactive gift, duplicate gift, insufficient one-of-many rows, Pending/Disabled/Anonymous and admin without explicit target branch all fail without writes.

- [ ] **Step 3: Write RED amendment/cancellation tests**

Assert:

- Staff may amend/cancel own record only while server Laos date equals original `dateKey`.
- Staff cannot amend another actor's record.
- Manager may amend/cancel own-branch old record with reason.
- Admin may amend/cancel any branch with explicit reason.
- Expected version mismatch fails closed.
- Amendment applies net deltas, writes one revision and keeps `distributionOwnerUid` unchanged.
- Cancellation returns Stock exactly once, changes status, writes revision/movements and cannot be repeated.
- Manager/Admin actor identity is recorded separately from distribution owner.

- [ ] **Step 4: Run focused tests and confirm RED**

Run: `node --test functions/test/giftDistribution.test.js`

Expected: FAIL because distribution operations do not exist.

- [ ] **Step 5: Implement recipient and access validation**

```js
function recipientRequest(data) {
  const recipientType = data?.recipientType;
  if (!['customer', 'campaign'].includes(recipientType)) {
    throw new GiftOperationError('invalid-argument', 'Gift recipient type required');
  }
  const customerId = recipientType === 'customer' ? assertDocumentId(data.customerId, 'Customer') : null;
  const campaignId = recipientType === 'campaign' ? assertDocumentId(data.campaignId, 'Campaign') : null;
  if (recipientType === 'customer' && data.campaignId != null) {
    throw new GiftOperationError('invalid-argument', 'Choose Customer or Campaign, not both');
  }
  if (recipientType === 'campaign' && data.customerId != null) {
    throw new GiftOperationError('invalid-argument', 'Choose Customer or Campaign, not both');
  }
  return { recipientType, customerId, campaignId };
}
```

Read the recipient in the same transaction and require `branchId` equality. Campaign must be active. Customer must remain readable/active under the existing CRM record model; do not modify Customer documents.

- [ ] **Step 6: Implement create/amend/cancel transactions**

For amendments, build a union of old and new gift IDs and pass one net delta per gift to `applyGiftDeltas`:

```js
function amendmentDeltas(previousItems, nextItems) {
  const previous = new Map(previousItems.map((item) => [item.giftId, item.totalUnits]));
  const next = new Map(nextItems.map((item) => [item.giftId, item.totalUnits]));
  return [...new Set([...previous.keys(), ...next.keys()])]
    .map((giftId) => ({ giftId, deltaUnits: (previous.get(giftId) ?? 0) - (next.get(giftId) ?? 0) }))
    .filter((item) => item.deltaUnits !== 0);
}
```

Use amendment `mutationId` as the movement/revision operation ID. Store the revision result and request digest for retry. Cancellation deltas are positive totals from the active distribution.

- [ ] **Step 7: Run focused and complete Functions verification**

Run: `node --test functions/test/giftDistribution.test.js`

Run: `npm.cmd run test:functions`

Run: `npm.cmd --prefix functions run lint`

Expected: all commands PASS.

- [ ] **Step 8: Commit**

```powershell
git add functions/src/giftDistribution.js functions/src/giftInventory.js functions/test/giftDistribution.test.js functions/test/helpers/fakeGiftFirestore.js
git diff --cached --check
git commit -m "feat: add audited gift distribution workflow"
```

---

### Task 5: Expose trusted callable Functions

**Files:**
- Modify: `functions/src/index.js`
- Create: `functions/test/giftCallableContract.test.js`

**Interfaces:**
- Consumes: all operation exports from Tasks 2–4.
- Produces callable names: `createGiftItem`, `updateGiftItem`, `createGiftCampaign`, `updateGiftCampaign`, `setGiftLowStockThreshold`, `receiveGiftStock`, `createGiftAllocation`, `confirmGiftAllocation`, `cancelGiftAllocation`, `adjustGiftStock`, `recordGiftDistribution`, `amendGiftDistribution`, `cancelGiftDistribution`.

- [ ] **Step 1: Write RED source-contract tests**

```js
test('index exports every reviewed gift callable and maps GiftOperationError codes', async () => {
  const source = await readFile(new URL('../src/index.js', import.meta.url), 'utf8');
  for (const name of [
    'createGiftItem', 'updateGiftItem', 'createGiftCampaign', 'updateGiftCampaign',
    'setGiftLowStockThreshold', 'receiveGiftStock', 'createGiftAllocation',
    'confirmGiftAllocation', 'cancelGiftAllocation', 'adjustGiftStock',
    'recordGiftDistribution', 'amendGiftDistribution', 'cancelGiftDistribution',
  ]) assert.match(source, new RegExp(`export const ${name} = callable`));
  assert.match(source, /error instanceof GiftOperationError/);
});
```

- [ ] **Step 2: Run focused test and confirm RED**

Run: `node --test functions/test/giftCallableContract.test.js`

- [ ] **Step 3: Add imports, error mapping and exports**

Extend the existing `callable` catch condition without weakening Sales handling:

```js
if ((error instanceof SalesOperationError || error instanceof GiftOperationError)
    && CALLABLE_ERROR_CODES.has(error.code)) {
  throw new HttpsError(error.code, error.message);
}
```

Export each callable with the existing `callable(operation)` wrapper. Do not add secrets or public HTTP endpoints.

- [ ] **Step 4: Run Functions tests/lint**

Run: `npm.cmd run test:functions`

Run: `npm.cmd --prefix functions run lint`

Expected: all Functions tests PASS and callable discovery source is valid.

- [ ] **Step 5: Commit**

```powershell
git add functions/src/index.js functions/test/giftCallableContract.test.js
git diff --cached --check
git commit -m "feat: expose gift inventory callables"
```

---

### Task 6: Add Firestore security rules and required indexes

**Files:**
- Modify: `firestore.rules`
- Modify: `firestore.indexes.json`
- Modify: `tests/rules/firestore.rules.test.js`

**Interfaces:**
- Consumes exact collection/field names from Tasks 2–4.
- Produces direct-read scopes required by `giftService.js`; all gift writes remain backend-only.

- [ ] **Step 1: Seed gift documents in the Rules test fixture**

Inside the existing `withSecurityRulesDisabled` setup, seed gifts/stocks/Campaigns/distributions/movements for branches `010` and `019`, including one movement where `actorUid` is Manager A but `distributionOwnerUid` is Staff A.

- [ ] **Step 2: Write RED actor-matrix tests**

```js
it('denies anonymous pending and disabled gift reads', async () => {
  await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'giftItems/umbrella')));
  await assertFails(getDoc(doc(actor('pending', 'staff', '010', 'pending'), 'branchGiftStocks/010_umbrella')));
  await assertFails(getDoc(doc(actor('disabled', 'staff', '010', 'disabled'), 'giftCampaigns/campaign-a')));
});

it('keeps Staff and Manager inside branch and owner scopes while Admin reads all', async () => {
  await assertSucceeds(getDoc(doc(actor('staff-a', 'staff', '010'), 'branchGiftStocks/010_umbrella')));
  await assertFails(getDoc(doc(actor('staff-a', 'staff', '010'), 'branchGiftStocks/019_umbrella')));
  await assertSucceeds(getDoc(doc(actor('manager-a', 'branch_manager', '010'), 'giftDistributions/distribution-a')));
  await assertFails(getDoc(doc(actor('manager-b', 'branch_manager', '019'), 'giftDistributions/distribution-a')));
  await assertSucceeds(getDoc(doc(actor('admin', 'admin', null), 'giftDistributions/distribution-a')));
});
```

Add explicit query tests for Staff `createdBy`/`distributionOwnerUid`, Manager `branchId`, Admin date-range query, direct-document cross-branch denial, reservation collection denial and direct create/update/delete denial for every gift collection/subcollection.

- [ ] **Step 3: Run Rules suite and confirm RED**

Run:

```powershell
$env:PATH='C:\Program Files\Android\Android Studio\jbr\bin;' + $env:PATH
npm.cmd run test:rules
```

Expected: new gift assertions FAIL because the rules do not expose gift reads.

- [ ] **Step 4: Implement gift read predicates and deny writes**

Add focused helpers:

```text
function giftStaffRecord(data) { return staff() && data.createdBy == request.auth.uid; }
function giftStaffMovement(data) { return staff() && data.distributionOwnerUid == request.auth.uid; }
function giftBranchRead(data) { return admin() || (approved() && data.branchId == request.auth.token.branchId); }
```

Use `giftBranchRead` for branch stocks/Campaigns and Manager/Admin records. Distribution/movement reads must include Staff owner predicates. Catalog reads require `approved()`. Every `allow create, update, delete` remains `false`.

- [ ] **Step 5: Add only query-backed indexes**

Add the composite indexes listed by the spec only when the exact service query uses them. Keep all preexisting indexes. Verify the JSON with:

Run: `node -e "JSON.parse(require('node:fs').readFileSync('firestore.indexes.json','utf8')); console.log('valid')"`

- [ ] **Step 6: Run Rules suite and confirm GREEN**

Run: `npm.cmd run test:rules`

Expected: all Firestore and Storage rule tests PASS; Storage Rules are unchanged.

- [ ] **Step 7: Commit**

```powershell
git add firestore.rules firestore.indexes.json tests/rules/firestore.rules.test.js
git diff --cached --check
git commit -m "feat: secure gift inventory data access"
```

---

### Task 7: Build client models, service wrappers and Lao errors

**Files:**
- Create: `src/gifts/giftModel.js`
- Create: `src/gifts/giftModel.test.js`
- Create: `src/gifts/giftErrors.js`
- Create: `src/gifts/giftErrors.test.js`
- Create: `src/services/giftService.js`
- Create: `src/services/giftService.test.js`

**Interfaces:**
- Produces normalizers: `normalizeGiftItem`, `normalizeGiftStock`, `normalizeGiftCampaign`, `normalizeGiftDistribution`, `normalizeGiftMovement`.
- Produces helpers: `giftLineTotal`, `giftStockDisplay`, `isLowGiftStock`, `giftCallableMessage`.
- Produces role-scoped subscriptions and wrappers matching all Task 5 callable names.

- [ ] **Step 1: Write RED model/error tests**

```js
it('converts packs and units without translating stored values', () => {
  expect(giftLineTotal({ packs: '2', looseUnits: '5' }, { unitsPerPack: 10 })).toBe(25);
  expect(giftStockDisplay(25, { unitsPerPack: 10, packLabel: 'ແພັກ', unitLabel: 'ອັນ' }))
    .toBe('2 ແພັກ 5 ອັນ');
});

it('treats equal threshold as low stock', () => {
  expect(isLowGiftStock({ currentUnits: 5, lowStockThresholdUnits: 5 })).toBe(true);
  expect(isLowGiftStock({ currentUnits: 6, lowStockThresholdUnits: 5 })).toBe(false);
});

it('maps insufficient stock without hiding permission failures', () => {
  expect(giftCallableMessage({ code: 'functions/failed-precondition', message: 'Insufficient gift stock' }))
    .toMatch(/Stock/);
  expect(giftCallableMessage({ code: 'functions/permission-denied' })).toMatch(/ສິດ/);
});
```

- [ ] **Step 2: Run model/error tests and confirm RED**

Run: `npx.cmd vitest run src/gifts/giftModel.test.js src/gifts/giftErrors.test.js`

- [ ] **Step 3: Implement pure model and error functions**

Normalize Firestore timestamps with existing `toDate`. Reject invalid form integers before calling Functions. Preserve internal enums such as `pending`, `confirmed`, `cancelled`, `customer`, `campaign`; translate only display labels.

- [ ] **Step 4: Write RED service query/callable contract tests**

Mock Firebase Firestore/Functions as in `src/services/salesService.test.js`. Assert:

- active catalog query orders by `sortOrder`.
- Staff distributions query `createdBy == uid` and movements query `distributionOwnerUid == uid`.
- Manager queries `branchId == claim branch`.
- Admin query accepts an explicit branch filter or all branches.
- date ranges order by `dateKey desc`.
- wrapper payloads contain only reviewed client fields and preserve operation/mutation IDs.

- [ ] **Step 5: Implement `giftService.js`**

```js
async function invoke(name, payload) {
  const result = await httpsCallable(functions, name)(payload);
  return result.data;
}

export function recordGiftDistribution(values) {
  return invoke('recordGiftDistribution', {
    distributionId: values.distributionId,
    expectedDateKey: values.expectedDateKey,
    branchId: values.branchId,
    recipientType: values.recipientType,
    customerId: values.customerId ?? null,
    campaignId: values.campaignId ?? null,
    items: values.items,
    note: values.note ?? '',
  });
}
```

Implement named wrappers for every callable and focused subscription helpers for catalog, Campaigns, stocks, allocations, distributions and movements. Do not fetch all branches and filter in browser for Staff/Manager.

- [ ] **Step 6: Run focused tests and root lint**

Run: `npx.cmd vitest run src/gifts/giftModel.test.js src/gifts/giftErrors.test.js src/services/giftService.test.js`

Run: `npm.cmd run lint`

Expected: all PASS.

- [ ] **Step 7: Commit**

```powershell
git add src/gifts/giftModel.js src/gifts/giftModel.test.js src/gifts/giftErrors.js src/gifts/giftErrors.test.js src/services/giftService.js src/services/giftService.test.js
git diff --cached --check
git commit -m "feat: add gift inventory client domain services"
```

---

### Task 8: Build the distribution and correction experience

**Files:**
- Create: `src/gifts/GiftsPage.jsx`
- Create: `src/gifts/GiftsPage.test.jsx`
- Create: `src/gifts/GiftDistributionForm.jsx`
- Create: `src/gifts/GiftDistributionForm.test.jsx`
- Create: `src/gifts/GiftCorrectionSheet.jsx`
- Create: `src/gifts/GiftCorrectionSheet.test.jsx`

**Interfaces:**
- Consumes Task 7 services/model/errors and existing `useAuth`, `SearchableSelect`, `CustomSelect`, `Input`, `Textarea`, `Button`, `ModalSheet`, `GlassCard`.
- Produces role-aware page shell and create/amend/cancel UI.

- [ ] **Step 1: Write RED page/tab tests**

Assert Staff defaults to `ແຈກເຄື່ອງ`; Manager can see distribution/stock/inbound/report/Campaign tabs; Admin sees all tabs plus catalog and must select a target branch before branch actions.

- [ ] **Step 2: Write RED compact-form tests**

```jsx
const staffIdentity = {
  uid: 'staff-a', role: 'staff', branchId: '010', accountStatus: 'approved',
};
let user;

beforeEach(() => {
  user = userEvent.setup();
});

async function submitFormWithoutRecipient() {
  await user.click(screen.getByRole('button', { name: 'ບັນທຶກ' }));
}

async function selectSameGiftTwice() {
  await user.selectOptions(screen.getAllByLabelText('ເຄື່ອງແຈກ')[0], 'umbrella');
  await user.click(screen.getByRole('button', { name: 'ເພີ່ມເຄື່ອງແຈກ' }));
  await user.selectOptions(screen.getAllByLabelText('ເຄື່ອງແຈກ')[1], 'umbrella');
}

it('starts with one gift row and adds only selected products', async () => {
  render(<GiftDistributionForm identity={staffIdentity} />);
  expect(screen.getAllByLabelText('ເຄື່ອງແຈກ')).toHaveLength(1);
  await user.click(screen.getByRole('button', { name: 'ເພີ່ມເຄື່ອງແຈກ' }));
  expect(screen.getAllByLabelText('ເຄື່ອງແຈກ')).toHaveLength(2);
});

it('requires exactly one Customer or Campaign and prevents duplicate gifts', async () => {
  render(<GiftDistributionForm identity={staffIdentity} />);
  await submitFormWithoutRecipient();
  expect(screen.getByRole('alert')).toHaveTextContent('ລູກຄ້າ ຫຼື Campaign');
  await selectSameGiftTwice();
  expect(screen.getByRole('alert')).toHaveTextContent('ຊ້ຳ');
});
```

Also assert sort order, current stock display, pack/unit total, max 25 rows, invalid integer rejection, insufficient-stock error retention, busy/double-submit guard and retry with the same `distributionId`.

- [ ] **Step 3: Run focused UI tests and confirm RED**

Run: `npx.cmd vitest run src/gifts/GiftsPage.test.jsx src/gifts/GiftDistributionForm.test.jsx src/gifts/GiftCorrectionSheet.test.jsx`

- [ ] **Step 4: Implement the page and form**

Keep the draft operation ID in a ref so rerenders/retries do not regenerate it:

```jsx
const operationIdRef = useRef(crypto.randomUUID());
const submittingRef = useRef(false);

async function submit(event) {
  event.preventDefault();
  if (submittingRef.current) return;
  submittingRef.current = true;
  setBusy(true);
  try {
    await recordGiftDistribution({
      distributionId: operationIdRef.current,
      expectedDateKey: laosTodayKey(),
      branchId: effectiveBranchId,
      recipientType,
      customerId: recipientType === 'customer' ? recipientId : null,
      campaignId: recipientType === 'campaign' ? recipientId : null,
      items: validGiftLines(rows),
      note,
    });
    operationIdRef.current = crypto.randomUUID();
    resetForm();
  } catch (error) {
    setError(giftCallableMessage(error));
  } finally {
    submittingRef.current = false;
    setBusy(false);
  }
}
```

Customer/Campaign subscriptions must use effective branch scope. Admin cannot interact with branch-specific form controls until selecting a branch.

- [ ] **Step 5: Implement correction sheet**

Use a new mutation UUID for each intended amendment/cancellation, preserve it for retry, include `expectedVersion`, require reason, and show old/new totals before confirmation.

- [ ] **Step 6: Run focused tests and client regression subset**

Run: `npx.cmd vitest run src/gifts/GiftsPage.test.jsx src/gifts/GiftDistributionForm.test.jsx src/gifts/GiftCorrectionSheet.test.jsx src/components/ui/SearchableSelect.test.jsx src/customers/CustomersPage.test.jsx`

Run: `npm.cmd run lint`

Expected: all PASS.

- [ ] **Step 7: Commit**

```powershell
git add src/gifts/GiftsPage.jsx src/gifts/GiftsPage.test.jsx src/gifts/GiftDistributionForm.jsx src/gifts/GiftDistributionForm.test.jsx src/gifts/GiftCorrectionSheet.jsx src/gifts/GiftCorrectionSheet.test.jsx
git diff --cached --check
git commit -m "feat: add gift distribution workflow"
```

---

### Task 9: Build stock, inbound, catalog and Campaign management UI

**Files:**
- Create: `src/gifts/GiftStockPanel.jsx`
- Create: `src/gifts/GiftStockPanel.test.jsx`
- Create: `src/gifts/GiftInboundPanel.jsx`
- Create: `src/gifts/GiftInboundPanel.test.jsx`
- Create: `src/gifts/GiftItemRows.jsx`
- Create: `src/gifts/GiftItemRows.test.jsx`
- Create: `src/gifts/GiftCatalogAdmin.jsx`
- Create: `src/gifts/GiftCatalogAdmin.test.jsx`
- Create: `src/gifts/GiftCampaignAdmin.jsx`
- Create: `src/gifts/GiftCampaignAdmin.test.jsx`
- Modify: `src/gifts/GiftsPage.jsx`
- Modify: `src/gifts/GiftsPage.test.jsx`

**Interfaces:**
- Consumes Task 7 service wrappers and Task 8 page branch context.
- Produces all Manager/Admin management tabs.

- [ ] **Step 1: Write RED Stock panel tests**

Assert current units and pack/unit display, equal-threshold low state, threshold update, Manager own-branch lock, Admin branch selector, adjustment reason requirement and error retention.

- [ ] **Step 2: Write RED inbound/allocation tests**

Assert direct receipt source + optional reference, compact multi-item rows, pending allocation no Stock success claim, Admin-only allocation creation, Manager/Admin confirmation dialog and cancelled/confirmed action disabling.

- [ ] **Step 3: Write RED catalog/Campaign tests**

Assert catalog controls visible only to Admin; fields include name/unit/pack label/units per pack/sort order/active; no delete button. Assert Manager Campaign form is branch-locked, Admin selects branch, invalid range rejected and inactive Campaign preserved in historical display.

- [ ] **Step 4: Run management UI tests and confirm RED**

Run: `npx.cmd vitest run src/gifts/GiftStockPanel.test.jsx src/gifts/GiftInboundPanel.test.jsx src/gifts/GiftCatalogAdmin.test.jsx src/gifts/GiftCampaignAdmin.test.jsx`

- [ ] **Step 5: Implement four focused panels and the shared row editor**

Each panel owns only its subscriptions/form state and receives `{ identity, effectiveBranchId }`. Extract the compact gift-row editor from `GiftDistributionForm.jsx` into `src/gifts/GiftItemRows.jsx` and reuse it for distribution, direct receipt and allocation; do not duplicate row validation.

```jsx
<GiftItemRows
  catalog={activeGifts}
  rows={rows}
  onChange={setRows}
  showStock={mode === 'distribution'}
  maxRows={25}
/>
```

- [ ] **Step 6: Wire panels into `GiftsPage` and run tests**

Run: `npx.cmd vitest run src/gifts`

Run: `npm.cmd run lint`

Expected: all gift UI tests PASS.

- [ ] **Step 7: Commit**

```powershell
git add src/gifts/GiftStockPanel.jsx src/gifts/GiftStockPanel.test.jsx src/gifts/GiftInboundPanel.jsx src/gifts/GiftInboundPanel.test.jsx src/gifts/GiftItemRows.jsx src/gifts/GiftItemRows.test.jsx src/gifts/GiftCatalogAdmin.jsx src/gifts/GiftCatalogAdmin.test.jsx src/gifts/GiftCampaignAdmin.jsx src/gifts/GiftCampaignAdmin.test.jsx src/gifts/GiftsPage.jsx src/gifts/GiftsPage.test.jsx src/gifts/GiftDistributionForm.jsx src/gifts/GiftDistributionForm.test.jsx
git diff --cached --check
git commit -m "feat: add gift stock management screens"
```

---

### Task 10: Implement reports and Excel export

**Files:**
- Create: `src/gifts/giftReport.js`
- Create: `src/gifts/giftReport.test.js`
- Create: `src/gifts/giftExport.js`
- Create: `src/gifts/giftExport.test.js`
- Create: `src/shared/spreadsheet.js`
- Create: `src/shared/spreadsheet.test.js`
- Modify: `src/sales/salesExport.js`
- Modify: `src/sales/salesExport.test.js`
- Create: `src/gifts/GiftReportPanel.jsx`
- Create: `src/gifts/GiftReportPanel.test.jsx`
- Modify: `src/gifts/GiftsPage.jsx`

**Interfaces:**
- Produces: `giftDateRange(preset, anchorKey, custom)`, `buildGiftReport({ movements, stocks, gifts, filters })`, `buildGiftWorkbook(ExcelJS, report, metadata)`, `giftWorkbookFilename(range)`.
- Report result includes `receivedUnits`, `distributedUnits`, `currentUnits`, `lowStockCount`, `gifts`, `branches`, `staff`, `customers`, `campaigns`, `movements` and `canViewInbound`.
- Staff report inputs contain only owned distribution movements and set `canViewInbound=false`; UI/Excel omit received/adjustment fields instead of displaying misleading zero values. Manager/Admin set `canViewInbound=true`.

Use these exact report test fixtures:

```js
const gifts = [{ id: 'umbrella', name: 'ຄັນຮົ່ມ', sortOrder: 10, active: true, unitsPerPack: 10 }];
const stocks = [{ branchId: '010', giftId: 'umbrella', currentUnits: 20, lowStockThresholdUnits: 5 }];
function movement(movementType, deltaUnits, overrides = {}) {
  return {
    id: `${movementType}-${deltaUnits}-${Object.keys(overrides).length}`,
    movementType,
    branchId: '010',
    giftId: 'umbrella',
    giftNameSnapshot: 'ຄັນຮົ່ມ',
    deltaUnits,
    dateKey: '2026-09-13',
    actorUid: 'staff-a',
    actorRole: 'staff',
    distributionOwnerUid: null,
    customerId: null,
    campaignId: null,
    ...overrides,
  };
}
```

- [ ] **Step 1: Write RED date/report tests**

```js
it('uses Laos Monday-Sunday and custom ranges', () => {
  expect(giftDateRange('week', '2026-09-13')).toEqual({
    startKey: '2026-09-07', endKey: '2026-09-13',
  });
  expect(giftDateRange('custom', '2026-09-13', {
    startKey: '2026-01-01', endKey: '2026-01-31',
  })).toEqual({ startKey: '2026-01-01', endKey: '2026-01-31' });
});

it('reports net distribution after amendment and cancellation', () => {
  const report = buildGiftReport({
    gifts, stocks, filters: {},
    movements: [
      movement('receive', 20),
      movement('distribute', -5, { distributionOwnerUid: 'staff-a' }),
      movement('distribution_amend', 2, { distributionOwnerUid: 'staff-a' }),
      movement('distribution_cancel', 3, { distributionOwnerUid: 'staff-a' }),
    ],
  });
  expect(report.receivedUnits).toBe(20);
  expect(report.distributedUnits).toBe(0);
  expect(report.currentUnits).toBe(20);
});
```

Cover day/month/year/leap day, gift/branch/staff/customer/Campaign filters, Manager correction attribution to original Staff, tie sorting and query-error versus empty-data behavior.

- [ ] **Step 2: Run report tests and confirm RED**

Run: `npx.cmd vitest run src/gifts/giftReport.test.js`

- [ ] **Step 3: Implement pure range/filter/aggregation functions**

Use `dateKey` string comparisons only after strict `YYYY-MM-DD` validation. Received totals include only `receive` and `allocation_receive`. Distributed net totals use signed distribution movement deltas and return a positive displayed quantity by negating the net stock delta. Adjustment is shown separately in movement history and does not inflate received/distributed KPI values.

- [ ] **Step 4: Write RED Excel tests**

Use this exact movement-sheet column order so tests and the operator-visible workbook stay aligned: `A dateKey`, `B movementType`, `C branchId`, `D giftName`, `E deltaUnits`, `F beforeUnits`, `G afterUnits`, `H distributionOwnerName`, `I actorName`, `J recipientType`, `K recipientName`, `L reason`.

```js
import ExcelJS from 'exceljs';

it('creates the three approved sheets with totals equal to the report', () => {
  const report = buildGiftReport({ movements: [], stocks, gifts, filters: {} });
  const metadata = { startKey: '2026-09-13', endKey: '2026-09-13', exportedBy: 'Admin' };
  const workbook = buildGiftWorkbook(ExcelJS, report, metadata);
  expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual([
    'ສະຫຼຸບ', 'ລາຍການເຄື່ອນໄຫວ', 'Stock ປັດຈຸບັນ',
  ]);
  expect(workbook.getWorksheet('ສະຫຼຸບ').getCell('B4').value).toBe(report.receivedUnits);
});

it('escapes spreadsheet formula-like user text', () => {
  const report = buildGiftReport({
    gifts, stocks, filters: {},
    movements: [movement('distribute', -1, {
      campaignId: 'campaign-a', campaignNameSnapshot: '=HYPERLINK("x")',
      distributionOwnerUid: 'staff-a',
    })],
  });
  const workbook = buildGiftWorkbook(ExcelJS, report, {
    startKey: '2026-09-13', endKey: '2026-09-13', exportedBy: 'Admin',
  });
  expect(String(workbook.getWorksheet('ລາຍການເຄື່ອນໄຫວ').getCell('K2').value))
    .toBe('\'=HYPERLINK("x")');
});
```

- [ ] **Step 5: Implement Excel workbook using dynamic import**

Move the existing `sanitizeSpreadsheetText` implementation from `src/sales/salesExport.js` to `src/shared/spreadsheet.js`, import it back into Sales, and add `src/shared/spreadsheet.test.js` with the existing formula-like cases. `giftExport.js` imports the same helper. Keep the Sales public export temporarily by re-exporting `sanitizeSpreadsheetText` from `salesExport.js` so existing callers remain compatible.

- [ ] **Step 6: Write RED report panel tests and implement UI**

Assert date presets, custom range, role-scoped filters, loading/error/empty states, KPI values, movement table and export uses current filtered report. The component must never convert a failed subscription into zero totals.

- [ ] **Step 7: Run focused tests and build**

Run: `npx.cmd vitest run src/gifts/giftReport.test.js src/gifts/giftExport.test.js src/gifts/GiftReportPanel.test.jsx src/sales/salesExport.test.js`

Run: `npm.cmd run build`

Expected: all tests PASS and ExcelJS remains lazy-loaded in a separate build chunk.

- [ ] **Step 8: Commit**

```powershell
git add src/gifts/giftReport.js src/gifts/giftReport.test.js src/gifts/giftExport.js src/gifts/giftExport.test.js src/gifts/GiftReportPanel.jsx src/gifts/GiftReportPanel.test.jsx src/gifts/GiftsPage.jsx src/shared/spreadsheet.js src/shared/spreadsheet.test.js src/sales/salesExport.js src/sales/salesExport.test.js
git diff --cached --check
git commit -m "feat: add gift inventory reports and Excel export"
```

---

### Task 11: Integrate low-stock notifications and navigation

**Files:**
- Create: `src/gifts/GiftLowStockContext.js`
- Create: `src/gifts/GiftLowStockProvider.jsx`
- Create: `src/gifts/GiftLowStockProvider.test.jsx`
- Create: `src/gifts/useGiftLowStock.js`
- Create: `src/notifications/NotificationCenterPage.jsx`
- Create: `src/notifications/NotificationCenterPage.test.jsx`
- Modify: `src/App.jsx`
- Create: `src/App.test.jsx`
- Modify: `src/components/Navbar.jsx`
- Modify: `src/components/Navbar.test.jsx`
- Modify: `src/pages/Profile.jsx`
- Modify: `src/pages/Profile.test.jsx`

**Interfaces:**
- `useGiftLowStock()` returns `{ count, items, loading, error }`.
- Bell count = birthday count + gift low-stock count, capped visually at `99+`.
- Bell links to `/notifications`; each low-stock item links to `/gifts?tab=stock&branchId=<id>&giftId=<id>`.

- [ ] **Step 1: Write RED provider tests**

Assert Staff does not subscribe and returns zero; Manager subscribes own branch; Admin subscribes all branches; active gifts at/equal/below threshold are included; inactive gifts and above-threshold stocks are excluded; snapshot update clears count without acknowledgment write.

- [ ] **Step 2: Implement provider and hook**

```jsx
const value = useMemo(() => ({
  count: items.length,
  items,
  loading,
  error,
}), [items, loading, error]);

return <GiftLowStockContext.Provider value={value}>{children}</GiftLowStockContext.Provider>;
```

Use existing Auth identity and Task 7 role-scoped stock subscription. No scheduled Function and no notification documents are created.

- [ ] **Step 3: Write RED notification-center and Navbar tests**

```jsx
vi.mock('../birthdays/useBirthdayReminders', () => ({
  useBirthdayReminders: () => ({ count: 2, reminders: [] }),
}));
vi.mock('../gifts/useGiftLowStock', () => ({
  useGiftLowStock: () => ({ count: 3, items: [], loading: false, error: '' }),
}));

it('shows one combined bell count and links to the notification center', () => {
  render(<MemoryRouter><Navbar title="CRM" /></MemoryRouter>);
  expect(screen.getByTestId('notification-count')).toHaveTextContent('5');
  expect(screen.getByRole('link', { name: /ແຈ້ງເຕືອນ 5/ })).toHaveAttribute('href', '/notifications');
});
```

Assert notification page preserves existing birthday actions and shows low-stock cards only for Manager/Admin scope.

- [ ] **Step 4: Implement route/provider/navigation integration**

Wire providers so `Navbar` and `/notifications` can read both contexts:

```jsx
<BirthdayRemindersProvider>
  <GiftLowStockProvider>
    <AppShell />
  </GiftLowStockProvider>
</BirthdayRemindersProvider>
```

Lazy-load `GiftsPage` and `NotificationCenterPage`. Add `ເຄື່ອງແຈກ` link to Profile/More. Do not change Bottom Navigation or Quick Create.

- [ ] **Step 5: Run focused integration tests**

Run: `npx.cmd vitest run src/gifts/GiftLowStockProvider.test.jsx src/notifications/NotificationCenterPage.test.jsx src/components/Navbar.test.jsx src/pages/Profile.test.jsx src/App.test.jsx`

`src/App.test.jsx` must mock lazy page dependencies and verify approved users can resolve `/gifts` and `/notifications`, while the existing ProtectedRoute still redirects unauthorized account states.

- [ ] **Step 6: Commit**

```powershell
git add src/gifts/GiftLowStockContext.js src/gifts/GiftLowStockProvider.jsx src/gifts/GiftLowStockProvider.test.jsx src/gifts/useGiftLowStock.js src/notifications/NotificationCenterPage.jsx src/notifications/NotificationCenterPage.test.jsx src/App.jsx src/App.test.jsx src/components/Navbar.jsx src/components/Navbar.test.jsx src/pages/Profile.jsx src/pages/Profile.test.jsx
git diff --cached --check
git commit -m "feat: add gift stock notifications and navigation"
```

---

### Task 12: Finish responsive styling and UI accessibility

**Files:**
- Modify: `src/styles/screens.css`
- Modify: `src/styles/screens.test.js`

**Interfaces:**
- Produces stable responsive layout at 360px, tablet and desktop using existing CRM design tokens/classes.

- [ ] **Step 1: Write RED CSS source-guard tests**

Add assertions for:

- gift row uses a compact two-column layout on tablet/desktop and one-column-safe controls at 360px.
- action groups wrap instead of overflowing.
- tables use contained horizontal scrolling only inside their card when unavoidable.
- bottom navigation does not cover the final form/report action.
- low-stock state has a text/icon indicator, not color alone.
- focus-visible states exist for gift tabs/actions.

- [ ] **Step 2: Run style tests and confirm RED**

Run: `npx.cmd vitest run src/styles/screens.test.js src/gifts`

- [ ] **Step 3: Add focused gift CSS**

Use existing `.page-content`, `.panel`, `.form-grid`, `.chip-row`, `.ui-button` and color tokens. Prefix new selectors with `.gift-` and avoid global element selectors.

```css
.gift-item-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(10rem, 0.55fr) auto;
  gap: 0.75rem;
  align-items: end;
}

@media (max-width: 700px) {
  .gift-item-row {
    grid-template-columns: minmax(0, 1fr);
  }
}
```

- [ ] **Step 4: Run UI/style/accessibility tests**

Run: `npx.cmd vitest run src/styles/screens.test.js src/gifts src/notifications src/components/Navbar.test.jsx src/pages/Profile.test.jsx`

Run: `npm.cmd run lint`

Expected: all PASS with no horizontal-overflow source regression.

- [ ] **Step 5: Commit**

```powershell
git add src/styles/screens.css src/styles/screens.test.js
git diff --cached --check
git commit -m "style: polish responsive gift inventory UI"
```

---

### Task 13: Add rollout, rollback and acceptance documentation

**Files:**
- Create: `docs/deployment/gift-inventory-rollout.md`

**Interfaces:**
- Consumes callable list, indexes, Rules and route from Tasks 5–12.
- Produces a human-executable backend-first deployment checklist.

- [ ] **Step 1: Write the rollout document**

Include exact sections and commands:

```markdown
# Gift Inventory Production Rollout

## Preflight — SAFE READ-ONLY
- Confirm branch/commit/clean status.
- Run lint, all tests, Rules emulator, Functions tests, build and `git diff --check`.
- Capture current Functions list, Firestore Rules source/ruleset, index list and Vercel release.

## Backend deployment — REQUIRES HUMAN APPROVAL
1. Deploy only the 13 reviewed gift callable Functions.
2. Run unauthenticated-denial and controlled Admin/Manager/Staff checks.
3. Deploy Firestore indexes and wait until every required index is READY.
4. Deploy reviewed Firestore Rules; do not deploy Storage Rules.

## Frontend deployment — REQUIRES HUMAN APPROVAL
1. Push reviewed branch to main through the approved Git workflow.
2. Wait for Vercel production READY and verify crm.keotasystem.com.
3. Run the complete actor and mobile/desktop acceptance matrix.

## Rollback
- Restore the captured Functions versions/source and Firestore Rules ruleset.
- Roll back the Vercel deployment to the captured production release.
- Do not delete gift documents automatically; preserve ledger evidence.
```

List all callable names explicitly, exact Firebase/Vercel commands, expected success evidence, stop conditions and the role matrix. State that existing data is additive and no Notion migration runs.

- [ ] **Step 2: Validate commands against project configuration**

Run: `firebase.cmd use`

Run: `firebase.cmd functions:list --project crm-web-app-97b91`

Run: `npx.cmd vercel inspect https://crm.keotasystem.com`

These are read-only. Record current command syntax in the document without deploying.

- [ ] **Step 3: Check and commit documentation**

Run: `git diff --check`

```powershell
git add docs/deployment/gift-inventory-rollout.md
git diff --cached --check
git commit -m "docs: add gift inventory rollout runbook"
```

---

### Task 14: Run full verification and independent review

**Files:**
- Modify only files required to correct Critical or Important review findings.

**Interfaces:**
- Produces a clean, reviewed branch ready for a separate production-approval decision.

- [ ] **Step 1: Run all root checks**

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

Expected: every command exits `0`; working tree clean after committed fixes.

- [ ] **Step 2: Confirm subsystem evidence**

Record exact totals for root Vitest, Functions Node tests and Rules emulator. Confirm:

- receipt/allocation retry does not double Stock;
- multi-item failure writes nothing;
- amend/cancel preserves owner and records actual actor;
- ledger replay equals current Stock;
- every cross-branch and Pending/Disabled case is denied;
- Excel totals equal UI report;
- Customer/Activity/Birthday/Sales regression tests pass;
- `storage.rules`, Auth model and PWA files are unchanged.

- [ ] **Step 3: Review the complete branch diff**

Run:

```powershell
git diff --stat main...HEAD
git diff --check main...HEAD
git diff main...HEAD
```

Review specifically for direct client Stock writes, untrusted actor/timestamps, negative Stock race, non-idempotent retry, hard delete, cross-branch reads, query/rules mismatch, spreadsheet formula injection, unbounded subscriptions, notification duplication and unrelated changes.

- [ ] **Step 4: Fix Critical/Important findings with RED tests**

For every finding: add one focused failing regression test, run it to confirm RED, apply the minimum fix, rerun the focused test and affected subsystem suite, then commit with a precise `fix:` message.

- [ ] **Step 5: Re-run full verification after review fixes**

Repeat Step 1. Do not claim completion from earlier results.

- [ ] **Step 6: Produce the implementation evidence report**

Report final branch/HEAD, clean status, commits, files changed, exact test totals, lint/build/diff results, security matrix, ledger reconciliation, deployment dependencies and remaining production approvals. Stop before any production mutation.

---

### Task 15: Controlled production rollout after separate approval

**Files:**
- No source edits unless a verified production-only defect requires a new reviewed commit.

**Interfaces:**
- Consumes the clean reviewed branch and `docs/deployment/gift-inventory-rollout.md`.
- Produces deployed backend/indexes/rules/frontend plus acceptance evidence.

- [ ] **Step 1: Obtain explicit production mutation approval**

Approval must cover Functions deployment, index deployment, Firestore Rules deployment and frontend push/Vercel rollout. Without it, stop at Task 14.

- [ ] **Step 2: Re-run preflight and capture rollback sources**

Confirm exact reviewed HEAD, clean tree and full green verification. Capture Functions inventory, prior Firestore Rules source/ruleset, prior index inventory and prior Vercel production deployment ID.

- [ ] **Step 3: Deploy gift Functions first**

```powershell
$env:FUNCTIONS_DISCOVERY_TIMEOUT='30'
firebase.cmd deploy --project crm-web-app-97b91 --only "functions:createGiftItem,functions:updateGiftItem,functions:createGiftCampaign,functions:updateGiftCampaign,functions:setGiftLowStockThreshold,functions:receiveGiftStock,functions:createGiftAllocation,functions:confirmGiftAllocation,functions:cancelGiftAllocation,functions:adjustGiftStock,functions:recordGiftDistribution,functions:amendGiftDistribution,functions:cancelGiftDistribution"
```

Stop on any failed deployment or failed unauthenticated-denial/controlled role check.

- [ ] **Step 4: Deploy indexes and wait for READY**

Run: `firebase.cmd deploy --only firestore:indexes --project crm-web-app-97b91`

Use the documented Cloud Console/CLI read-only check until every query-backed gift index is READY. Stop on NEEDS_REPAIR.

- [ ] **Step 5: Deploy Firestore Rules**

Run: `firebase.cmd deploy --only firestore:rules --project crm-web-app-97b91`

Do not deploy Storage Rules. Run controlled direct-document/query denials immediately after deployment.

- [ ] **Step 6: Push reviewed frontend and wait for Vercel READY**

Push through the approved `main` integration path. Verify `https://crm.keotasystem.com` references the new build assets and returns HTTP 200.

- [ ] **Step 7: Run production acceptance matrix**

Verify Anonymous/Pending/Disabled denial; Staff own-entry/own-history; Manager own-branch stock/inbound/corrections; Admin all-branch actions; cross-branch denial; no negative Stock; low-stock bell; reports/Excel; 360px/tablet/desktop; unchanged Customers/Activities/Birthdays/Sales.

- [ ] **Step 8: Initialize data manually**

Admin creates the approved gift catalog and Campaigns, then records reviewed direct receipts for starting Stock. No Notion import or bulk production mutation tool is used.

- [ ] **Step 9: Record production evidence and monitor**

Record deployment IDs/timestamps, Functions list, index states, Rules release, Vercel release, catalog/Stock counts and acceptance results. Monitor immediate errors and retain all rollback sources.
