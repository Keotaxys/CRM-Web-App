# ແບບອອກແບບລະບົບຕິດຕາມ Stock ເຄື່ອງແຈກ

ວັນທີ: 2026-09-13

ສະຖານະ: ຜ່ານການຢືນຢັນດ້ານແນວຄິດ ແລະລໍຖ້າການກວດສະບັບຂຽນ

ລະບົບ: CRM Web App (`crm-web-app-97b91`)

## 1. ເປົ້າໝາຍ

ເພີ່ມລະບົບຈັດການເຄື່ອງແຈກເຂົ້າໃນ CRM ເພື່ອຮູ້ຍອດຮັບເຂົ້າ, ຍອດແຈກ ແລະຍອດຄົງເຫຼືອຂອງແຕ່ລະສາຂາ. ການແຈກຕ້ອງຜູກກັບລູກຄ້າ CRM ຫຼື Campaign, ກວດສອບຍ້ອນຫຼັງໄດ້ ແລະບໍ່ອະນຸຍາດໃຫ້ Stock ຕິດລົບ.

ລະບົບຕ້ອງສະຫຼຸບຜົນຕາມວັນ, ອາທິດ, ເດືອນ, ປີ ຫຼືຊ່ວງວັນທີກຳນົດເອງ ແລະສົ່ງອອກ Excel ໄດ້. ຮອບນີ້ຕິດຕາມຈຳນວນເທົ່ານັ້ນ; ບໍ່ຕິດຕາມລາຄາ, ຕົ້ນທຶນ ຫຼືງົບປະມານ.

## 2. ຂໍ້ຕົກລົງທີ່ຢືນຢັນ

- Stock ແຍກຕາມສາຂາ; Admin ເຫັນທຸກສາຂາ.
- Admin ຈັດການລາຍການເຄື່ອງແຈກກາງ.
- Branch Manager ຈັດການການຮັບເຂົ້າ, ການປັບຍອດ ແລະການກວດສອບໃນສາຂາຕົນ.
- Admin ສາມາດດຳເນີນທຸກວຽກຂອງ Branch Manager ໃຫ້ທຸກສາຂາ ໂດຍເລືອກສາຂາຢ່າງຊັດເຈນ ແລະບັນທຶກວ່າ Admin ເປັນຜູ້ດຳເນີນການ.
- Staff ບັນທຶກການແຈກຂອງຕົນເອງ.
- ການແຈກແຕ່ລະຄັ້ງຕ້ອງເລືອກຜູ້ຮັບພຽງແບບດຽວ: ລູກຄ້າ CRM ຫຼື Campaign.
- ຮອງຮັບການປ້ອນຈຳນວນເປັນແພັກ/ແກັດ ແລະຈຳນວນອັນ; ຄ່າທີ່ເກັບແລະຄິດໄລ່ຈິງເປັນຈຳນວນອັນ.
- Admin ສ້າງລາຍການຈັດສັນໃຫ້ສາຂາໄດ້; Branch Manager ຫຼື Admin ຢືນຢັນຮັບແທນສາຂາໄດ້.
- Branch Manager ຫຼື Admin ບັນທຶກການຮັບເຂົ້າສາຂາໂດຍກົງໄດ້.
- Stock ຕິດລົບບໍ່ໄດ້ສຳລັບທຸກບົດບາດ.
- Staff ແກ້ໄຂ ຫຼືຍົກເລີກລາຍການຂອງຕົນໄດ້ພາຍໃນວັນດຽວກັນຕາມເຂດເວລາ `Asia/Vientiane`; ປະຫວັດເກົ່າຕ້ອງຖືກຮັກສາ.
- ຫຼັງຈາກຂ້າມວັນ ມີພຽງ Branch Manager ຂອງສາຂາ ຫຼື Admin ທີ່ແກ້/ຍົກເລີກໄດ້ ແລະຕ້ອງລະບຸເຫດຜົນ.
- ຈຸດແຈ້ງເຕືອນ Stock ຕ່ຳກຳນົດແຍກຕາມເຄື່ອງແຈກແລະສາຂາ.
- Campaign ເປັນລາຍການທີ່ເລືອກຈາກ Dropdown; Admin ຈັດການທັງໝົດ ແລະ Branch Manager ຈັດການສະເພາະ Campaign ຂອງສາຂາ.
- ບໍ່ນຳເຂົ້າຂໍ້ມູນເກົ່າຈາກ Notion; ຜູ້ໃຊ້ຈະສ້າງ catalog ແລະ Stock ເລີ່ມຕົ້ນໃໝ່ໃນ CRM.

## 3. ຂອບເຂດທີ່ບໍ່ລວມ

- ບໍ່ມີສາງກາງທີ່ມີຍອດ Stock ແຍກຕ່າງຫາກ.
- ລາຍການ “Admin ຈັດສັນ” ເປັນການຮັບເຂົ້າທີ່ລໍຖ້າສາຂາຢືນຢັນ; ບໍ່ແມ່ນການຫັກຈາກ Stock ສາງກາງ.
- ບໍ່ຮອງຮັບການໂອນ Stock ລະຫວ່າງສາຂາໃນຮອບນີ້.
- ບໍ່ມີລາຄາ, ຕົ້ນທຶນ, ງົບປະມານ ຫຼືການຕີມູນຄ່າ Stock.
- ບໍ່ມີ Barcode, QR Code ຫຼືການສະແກນ.
- ບໍ່ມີຮູບພາບເຄື່ອງແຈກ.
- ບໍ່ມີ SMS, WhatsApp, Email ຫຼື Push Notification; ແຈ້ງເຕືອນ Stock ຕ່ຳສະແດງຢູ່ໃນ CRM ເທົ່ານັ້ນ.
- ບໍ່ປ່ຽນ data contract ຂອງ Customer, Activity, Birthday Reminder ຫຼື Daily Sales.
- ບໍ່ມີ hard delete ສຳລັບ catalog, Campaign, ການຮັບ, ການແຈກ ຫຼືປະຫວັດ Stock.

## 4. ຫຼັກການສຳຄັນ

### 4.1 Append-only stock ledger

ຍອດ Stock ປັດຈຸບັນເປັນຄ່າທີ່ລະບົບອັບເດດໄວ້ເພື່ອໃຫ້ອ່ານໄວ, ແຕ່ທີ່ມາຂອງຍອດຕ້ອງພິສູດໄດ້ຈາກບັນຊີຄວາມເຄື່ອນໄຫວແບບ append-only. ການແກ້ ຫຼືຍົກເລີກບໍ່ລຶບ movement ເກົ່າ; ລະບົບສ້າງ movement ຊົດເຊີຍ ຫຼືຄືນ Stock.

### 4.2 Trusted transactional writes

ການປ່ຽນແປງ Stock ທັງໝົດຜ່ານ callable Functions ແລະ Firestore transaction. ການກວດສິດ, ການກວດຈຳນວນ, ການອ່ານຍອດ, ການປ້ອງກັນຍອດຕິດລົບ, ການອັບເດດຍອດ ແລະການສ້າງ movement ຕ້ອງສຳເລັດພ້ອມກັນ ຫຼືບໍ່ສຳເລັດທັງໝົດ.

### 4.3 Idempotency and concurrency

Client ສ້າງ operation ID ຄັ້ງດຽວ ແລະໃຊ້ ID ເດີມເມື່ອ retry. Server ເກັບ payload digest ຂອງ operation; retry ທີ່ ID ແລະ payload ກົງກັນຈະຄືນຜົນເດີມ, ແຕ່ ID ເກົ່າກັບ payload ຕ່າງກັນຈະຖືກປະຕິເສດ. ການແກ້ໄຂໃຊ້ version ເພື່ອປ້ອງກັນການຂຽນທັບກັນ.

### 4.4 Audit identity

UID, role, branch ແລະ server timestamp ມາຈາກ identity ທີ່ backend ກວດສອບແລ້ວ; client ປອມຄ່າເຫຼົ່ານີ້ບໍ່ໄດ້. Admin ທີ່ດຳເນີນການໃຫ້ສາຂາອື່ນຍັງຖືກບັນທຶກເປັນ Admin ໂດຍມີ `targetBranchId`; ບໍ່ມີການປອມຕົວເປັນ Branch Manager.

## 5. ໂຄງສ້າງຂໍ້ມູນ

ຊື່ collection ດ້ານລຸ່ມເປັນ contract ສຳລັບການວາງແຜນ. ການລົງມືຕ້ອງຮັກສາຄວາມໝາຍ ແລະຂໍ້ຈຳກັດນີ້.

### 5.1 `giftItems/{giftId}`

```js
{
  schemaVersion: 1,
  name: "ຄັນຮົ່ມ",
  normalizedName: "ຄັນຮົ່ມ",
  unitLabel: "ອັນ",
  packLabel: "ແພັກ",
  unitsPerPack: 10,
  sortOrder: 10,
  active: true,
  createdBy: "uid",
  createdAt: Timestamp,
  updatedBy: "uid",
  updatedAt: Timestamp
}
```

ຂໍ້ກຳນົດ:

- Admin-only create/update.
- `name` ຫຼັງ normalize ຕ້ອງບໍ່ຊ້ຳ; ການຈອງຊື່ເຮັດໃນ transaction.
- `unitsPerPack` ເປັນເລກເຕັມບວກ.
- `sortOrder` ໃຊ້ຈັດລຳດັບ Dropdown ແລະລາຍງານ.
- ບໍ່ hard delete; ປິດດ້ວຍ `active=false` ແລະປະຫວັດເກົ່າຍັງສະແດງຊື່ snapshot.

### 5.2 `giftCampaigns/{campaignId}`

```js
{
  schemaVersion: 1,
  name: "Campaign ປີໃໝ່",
  normalizedName: "campaign ປີໃໝ່",
  branchId: "020",
  startDate: "2026-12-01",
  endDate: "2026-12-31",
  active: true,
  note: "",
  createdBy: "uid",
  createdAt: Timestamp,
  updatedBy: "uid",
  updatedAt: Timestamp
}
```

ຂໍ້ກຳນົດ:

- Campaign ຜູກກັບສາຂາດຽວ.
- Branch Manager create/update ໄດ້ສະເພາະສາຂາຕົນ; Admin ເລືອກສາຂາໃດກໍໄດ້.
- ຊື່ທີ່ normalize ແລ້ວຕ້ອງບໍ່ຊ້ຳພາຍໃນສາຂາດຽວກັນ.
- `startDate` ແລະ `endDate` ໃຊ້ date key `YYYY-MM-DD` ຕາມ `Asia/Vientiane`; end ຕ້ອງບໍ່ກ່ອນ start.
- ບໍ່ hard delete; Campaign ທີ່ປິດຍັງຢູ່ໃນລາຍງານເກົ່າ.

### 5.3 `branchGiftStocks/{branchId}_{giftId}`

```js
{
  schemaVersion: 1,
  branchId: "020",
  giftId: "gift-id",
  giftNameSnapshot: "ຄັນຮົ່ມ",
  currentUnits: 190,
  lowStockThresholdUnits: 20,
  version: 7,
  updatedBy: "uid",
  updatedAt: Timestamp
}
```

ຂໍ້ກຳນົດ:

- Document ID ຄົງທີ່ຕາມ branch + gift.
- `currentUnits` ປ່ຽນໄດ້ສະເພາະ trusted Functions.
- `lowStockThresholdUnits` ຕັ້ງໄດ້ໂດຍ Branch Manager ຂອງສາຂາ ຫຼື Admin.
- Low-stock ໝາຍເຖິງ active gift ທີ່ `currentUnits <= lowStockThresholdUnits`.
- Stock document ບໍ່ລຶບເມື່ອ gift ຖືກປິດ.

### 5.4 `giftReceipts/{receiptId}`

```js
{
  schemaVersion: 1,
  receiptId: "client-stable-uuid",
  payloadDigest: "sha256",
  branchId: "020",
  source: "ຜູ້ສະໜອງ/ສູນກາງ",
  reference: "optional reference",
  items: [
    {
      giftId: "gift-id",
      giftNameSnapshot: "ຄັນຮົ່ມ",
      packs: 2,
      looseUnits: 5,
      unitsPerPackSnapshot: 10,
      totalUnits: 25
    }
  ],
  status: "confirmed",
  receivedDateKey: "2026-09-13",
  createdBy: "uid",
  createdByRole: "branch_manager",
  createdAt: Timestamp
}
```

- ເປັນ direct receipt ທີ່ເພີ່ມ Stock ທັນທີໃນ transaction ດຽວ.
- Branch Manager ສ້າງໄດ້ສະເພາະສາຂາຕົນ; Admin ສ້າງໃຫ້ສາຂາທີ່ເລືອກໄດ້.
- ບໍ່ແກ້ ຫຼືລຶບ receipt ເດີມ; ການແກ້ຍອດໃຊ້ stock adjustment ພ້ອມເຫດຜົນ.

### 5.5 `giftAllocations/{allocationId}`

```js
{
  schemaVersion: 1,
  allocationId: "client-stable-uuid",
  payloadDigest: "sha256",
  targetBranchId: "020",
  source: "ສູນກາງ/ຜູ້ສະໜອງ",
  reference: "optional reference",
  items: [
    {
      giftId: "gift-id",
      giftNameSnapshot: "ຄັນຮົ່ມ",
      packs: 2,
      looseUnits: 5,
      unitsPerPackSnapshot: 10,
      totalUnits: 25
    }
  ],
  status: "pending",
  createdBy: "admin-uid",
  createdAt: Timestamp,
  confirmedBy: null,
  confirmedByRole: null,
  confirmedAt: null,
  cancelledBy: null,
  cancelledAt: null,
  cancelReason: null
}
```

- Admin-only create.
- `pending` ຍັງບໍ່ປ່ຽນ Stock.
- Branch Manager ຂອງ target branch ຫຼື Admin ຢືນຢັນໄດ້; confirmation ເພີ່ມ Stock ແລະສ້າງ movements ໃນ transaction ດຽວ.
- Confirmation retry ບໍ່ເພີ່ມ Stock ຊ້ຳ.
- ຍົກເລີກໄດ້ສະເພາະກ່ອນຢືນຢັນ ແລະຕ້ອງມີເຫດຜົນ.

### 5.6 `giftDistributions/{distributionId}`

```js
{
  schemaVersion: 1,
  distributionId: "client-stable-uuid",
  payloadDigest: "sha256",
  version: 1,
  dateKey: "2026-09-13",
  branchId: "020",
  recipientType: "customer",
  customerId: "customer-id",
  customerNameSnapshot: "Customer display name",
  campaignId: null,
  campaignNameSnapshot: null,
  items: [
    {
      giftId: "gift-id",
      giftNameSnapshot: "ຄັນຮົ່ມ",
      packs: 0,
      looseUnits: 3,
      unitsPerPackSnapshot: 10,
      totalUnits: 3
    }
  ],
  note: "",
  status: "active",
  createdBy: "uid",
  createdByRole: "staff",
  createdAt: Timestamp,
  updatedBy: "uid",
  updatedAt: Timestamp,
  cancelledBy: null,
  cancelledAt: null,
  cancelReason: null
}
```

ຂໍ້ກຳນົດ:

- `recipientType` ເປັນ `customer` ຫຼື `campaign` ແລະຕ້ອງມີ ID ທີ່ກົງກັບ type ພຽງອັນດຽວ.
- Customer ຫຼື Campaign ຕ້ອງຢູ່ branch ດຽວກັບ distribution.
- ຕໍ່ distribution ມີໄດ້ສູງສຸດ 25 gift rows, gift ID ບໍ່ຊ້ຳ, ແລະທຸກ `totalUnits` ເປັນເລກເຕັມບວກ.
- ທຸກ rows ໃນ distribution ສຳເລັດພ້ອມກັນ; ຖ້າ gift ລາຍການໃດ Stock ບໍ່ພໍ ຈະບໍ່ຫັກທຸກລາຍການ.
- Customer/Campaign name ແລະ gift name ເກັບ snapshot ເພື່ອຮັກສາຄວາມໝາຍຂອງປະຫວັດ.
- ການຍົກເລີກປ່ຽນ status ແລະຄືນ Stock; ບໍ່ລຶບ document.

### 5.7 `giftDistributions/{distributionId}/revisions/{revisionId}`

```js
{
  schemaVersion: 1,
  mutationId: "client-stable-uuid",
  reason: "ເຫດຜົນການແກ້ໄຂ",
  previousVersion: 1,
  nextVersion: 2,
  previousRecipient: {},
  nextRecipient: {},
  previousItems: [],
  nextItems: [],
  changedBy: "uid",
  changedByRole: "staff",
  changedAt: Timestamp
}
```

- Append-only ແລະ trusted backend-only.
- ການແກ້/ຍົກເລີກທຸກຄັ້ງຕ້ອງສ້າງ revision ພ້ອມ stock movements.
- Staff ແກ້ຂອງຕົນພາຍໃນວັນດຽວ; Branch Manager ແກ້ຂອງສາຂາ; Admin ແກ້ໄດ້ທຸກສາຂາ.
- ການແກ້/ຍົກເລີກຕ້ອງມີເຫດຜົນສັ້ນໆທີ່ບໍ່ຫວ່າງ.

### 5.8 `giftStockMovements/{movementId}`

```js
{
  schemaVersion: 1,
  movementType: "distribute",
  operationId: "distribution-id-or-mutation-id",
  operationType: "distribution",
  branchId: "020",
  giftId: "gift-id",
  giftNameSnapshot: "ຄັນຮົ່ມ",
  deltaUnits: -3,
  balanceBeforeUnits: 190,
  balanceAfterUnits: 187,
  dateKey: "2026-09-13",
  actorUid: "uid",
  actorRole: "staff",
  distributionOwnerUid: "uid",
  occurredAt: Timestamp,
  customerId: "customer-id",
  campaignId: null,
  reason: ""
}
```

- Movement types ຢ່າງນ້ອຍ: `receive`, `allocation_receive`, `distribute`, `distribution_amend`, `distribution_cancel`, `adjust`.
- Movement ID ຜູກກັບ operation ID + gift ID ເພື່ອ retry ບໍ່ສ້າງຊ້ຳ.
- Client ບໍ່ຂຽນ, ແກ້ ຫຼືລຶບ movement ໂດຍກົງ.
- `balanceBeforeUnits` ແລະ `balanceAfterUnits` ມາຈາກ transaction ແລະຊ່ວຍ reconciliation.
- `distributionOwnerUid` ເກັບຜູ້ສ້າງ distribution ເດີມສຳລັບ distribution movements; inbound/adjustment movements ໃຊ້ `null`. ຄ່ານີ້ບໍ່ປ່ຽນເມື່ອ Manager/Admin ເປັນຜູ້ແກ້, ສ່ວນ `actorUid` ບັນທຶກຜູ້ທີ່ປ່ຽນຕົວຈິງ.

## 6. Trusted backend

### 6.1 Catalog and Campaign

- `createGiftItem`, `updateGiftItem`: Admin-only; validate unique normalized name, units per pack, sort order ແລະ active state.
- `createGiftCampaign`, `updateGiftCampaign`: Branch Manager own-branch ຫຼື Admin any-branch; validate date range, branch ແລະ normalized name.
- ບໍ່ມີ callable hard-delete.

### 6.2 Stock setup and inbound

- `setGiftLowStockThreshold`: Branch Manager own-branch ຫຼື Admin any-branch; threshold ເປັນເລກເຕັມບໍ່ຕິດລົບ.
- `receiveGiftStock`: Branch Manager own-branch ຫຼື Admin any-branch; validate active catalog, convert packs + loose units, create receipt, update stocks ແລະ movements atomically.
- `createGiftAllocation`: Admin-only; creates pending allocation without changing Stock.
- `confirmGiftAllocation`: target Branch Manager ຫຼື Admin; changes pending to confirmed, updates stocks and movements atomically.
- `cancelGiftAllocation`: Admin-only while pending; requires reason and never changes Stock.
- `adjustGiftStock`: Branch Manager own-branch ຫຼື Admin; requires reason, records positive or negative delta, and refuses a negative ending balance.

`adjustGiftStock` ໃຊ້ສຳລັບການກວດນັບແລ້ວພົບຍອດຕ່າງ. ມັນບໍ່ແກ້ balance ໂດຍບໍ່ມີ movement.

`receivedDateKey` ຂອງ direct receipt ແລະ date key ຂອງ allocation confirmation ກຳນົດຈາກ server clock ຕາມ `Asia/Vientiane`; client ປອມ ຫຼືຍ້ອນວັນທີບໍ່ໄດ້. ຖ້າຕ້ອງແກ້ຍອດປະຫວັດ ໃຫ້ໃຊ້ adjustment ທີ່ມີເຫດຜົນ.

### 6.3 Distribution

- `recordGiftDistribution`: approved Staff/Branch Manager ໃນ branch ຕົນ ຫຼື Admin ທີ່ລະບຸ target branch; validates recipient, rows, Stock and identity, then writes distribution + stock balances + movements atomically.
- `amendGiftDistribution`: verifies owner/day or elevated branch permission, expected version and reason; returns old quantities and applies new quantities as one transaction.
- `cancelGiftDistribution`: verifies permission and reason, restores all active quantities and marks distribution cancelled in one transaction.
- Cancelled distribution cannot be amended or cancelled again.
- Admin/Manager correction preserves original creator and records separate changed-by identity.
- `dateKey` ຕອນສ້າງ distribution ມາຈາກ server clock ຕາມ `Asia/Vientiane`; client ປອມ ຫຼື backdate ບໍ່ໄດ້.

### 6.4 Error contract

Functions ຄືນ error code ທີ່ UI ແປເປັນຂໍ້ຄວາມພາສາລາວໄດ້:

- `unauthenticated`: ບໍ່ໄດ້ລັອກອິນ ຫຼື token ໝົດອາຍຸ.
- `permission-denied`: ບໍ່ມີສິດ ຫຼື branch ບໍ່ກົງ.
- `invalid-argument`: ຈຳນວນ, recipient, date ຫຼືຂໍ້ມູນອື່ນບໍ່ຖືກຕ້ອງ.
- `failed-precondition`: Stock ບໍ່ພໍ, gift/campaign ປິດໃຊ້, allocation ບໍ່ pending ຫຼື record ຖືກປ່ຽນໂດຍຄົນອື່ນ.
- `already-exists`: operation ID ຖືກໃຊ້ກັບ payload ອື່ນ.
- `internal`/`unavailable`: ບັນຫາລະບົບ ຫຼືເຄືອຂ່າຍ; form ຮັກສາຂໍ້ມູນໄວ້ໃຫ້ retry.

Log ບໍ່ເກັບ token, ເບີໂທ, ຂໍ້ມູນລູກຄ້າທີ່ບໍ່ຈຳເປັນ ຫຼື Excel content.

## 7. ສິດການໃຊ້ງານ

| ສະຖານະ/ບົດບາດ | Catalog | Stock/Inbound | Distribution | Campaign | Report/Export |
|---|---|---|---|---|---|
| Anonymous | ປະຕິເສດ | ປະຕິເສດ | ປະຕິເສດ | ປະຕິເສດ | ປະຕິເສດ |
| Pending | ປະຕິເສດ | ປະຕິເສດ | ປະຕິເສດ | ປະຕິເສດ | ປະຕິເສດ |
| Disabled | ປະຕິເສດ | ປະຕິເສດ | ປະຕິເສດ | ປະຕິເສດ | ປະຕິເສດ |
| Staff | active catalog ແລະ own-branch stock | read own-branch balance; no inbound/adjust | create/read/amend/cancel own records ຕາມ same-day rule | read active own-branch | ສະເພາະຍອດແຈກຂອງຕົນ ແລະ current stock ທີ່ໃຊ້ໃນ form; ບໍ່ສະແດງຍອດຮັບຂອງສາຂາ |
| Branch Manager | catalog ແລະ own-branch stock | receive/confirm/adjust own branch | create/read/amend/cancel own branch | manage own branch | ສາຂາຕົນ |
| Admin | manage catalog; all stocks | receive/confirm/adjust all branches; create allocations | create/read/amend/cancel all branches | manage all branches | ທຸກສາຂາ |

Firestore Rules:

- ກວດ canonical approved profile/claims ຕາມ access model ເດີມ.
- Deny direct client writes ຕໍ່ທຸກ gift collection ແລະ revision/movement.
- Staff query distributions ໄດ້ສະເພາະ `createdBy == auth.uid` ແລະ distribution movements ໄດ້ສະເພາະ `distributionOwnerUid == auth.uid`.
- Branch Manager query ຕ້ອງ scope ດ້ວຍ own `branchId`.
- Admin query ໄດ້ທຸກ branch.
- Staff ອ່ານ current stock ສະເພາະ branch ຕົນເພື່ອບັນທຶກການແຈກ; ບໍ່ອ່ານ inbound references ຫຼື audit ຂອງຄົນອື່ນ.
- Direct document ID, direct URL ແລະ query ທີ່ບໍ່ scope ຕ້ອງ fail closed.

## 8. ໜ້າຈໍ ແລະ navigation

ເພີ່ມ route `/gifts` ພາຍໃຕ້ ProtectedRoute ເດີມ ແລະເພີ່ມເມນູ `ເຄື່ອງແຈກ` ໃນໜ້າ “ເພີ່ມເຕີມ”. Bottom Navigation ເດີມບໍ່ປ່ຽນ.

### 8.1 ແຖບ `ແຈກເຄື່ອງ`

- ເປັນໜ້າເລີ່ມຕົ້ນສຳລັບ Staff.
- ເລືອກ `ລູກຄ້າ` ຫຼື `Campaign`; ຫຼັງເລືອກ type ຈຶ່ງສະແດງ searchable Dropdown ທີ່ຖືກ scope ຕາມ branch.
- ເລີ່ມດ້ວຍ gift row ໜຶ່ງແຖວ: Dropdown ຊ້າຍ, ຈຳນວນແພັກ/ອັນຂວາ ແລະປຸ່ມເພີ່ມແຖວດ້ານລຸ່ມ.
- Dropdown ຈັດລຳດັບດ້ວຍ `sortOrder`, ແລ້ວຊື່; ລາຍການທີ່ເລືອກແລ້ວບໍ່ໃຫ້ເລືອກຊ້ຳ.
- ສະແດງຍອດຄົງເຫຼືອກ່ອນບັນທຶກ ແລະ total units ທີ່ຄຳນວນຈາກ pack + loose units.
- ປຸ່ມບັນທຶກມີ synchronous double-submit guard ແລະ busy state.
- ຖ້າ save ລົ້ມເຫຼວ ຮັກສາ form ໄວ້; ບໍ່ສະແດງ “ສຳເລັດ” ກ່ອນ server ຢືນຢັນ.
- Branch Manager ແລະ Admin ໃຊ້ໜ້ານີ້ໄດ້; Admin ຕ້ອງເລືອກ target branch ກ່ອນ.

### 8.2 ແຖບ `Stock ສາຂາ`

- Card/table ສະແດງ gift, current units, ຄ່າທຽບເປັນແພັກ + ອັນ, low-stock threshold ແລະສະຖານະ.
- Branch Manager ເຫັນ own branch; Admin ມີ branch selector ຫຼື all-branch summary.
- Low-stock rows ມີປ້າຍ ແລະສີທີ່ບໍ່ອາໄສສີຢ່າງດຽວ.
- Manager/Admin ເປີດ action ຮັບເຂົ້າ, ປັບຍອດ ຫຼືປ່ຽນ threshold ໄດ້.

### 8.3 ແຖບ `ຮັບເຂົ້າ/ຈັດສັນ`

- Direct receipt form ສຳລັບ Branch Manager/Admin: branch, source, reference, gift rows ແລະ pack/unit inputs.
- Allocation list ມີ status `pending`, `confirmed`, `cancelled`.
- Admin ສ້າງ allocation; target Manager ຫຼື Admin ກົດຢືນຢັນຫຼັງກວດຈຳນວນ.
- Confirmation dialog ສະແດງ target branch, item rows ແລະ total units ກ່ອນປ່ຽນ Stock.

### 8.4 ແຖບ `ລາຍງານ`

Date presets:

- ມື້ນີ້
- ອາທິດນີ້ (ຈັນ–ອາທິດ)
- ເດືອນນີ້
- ປີນີ້
- ກຳນົດເອງ

Filters:

- gift
- branch ຕາມສິດ
- staff ຕາມສິດ
- customer
- campaign
- movement type

ຜົນສະແດງ:

- KPI cards ສຳລັບ Manager/Admin: ຍອດຮັບ, ຍອດແຈກ, ຈຳນວນລາຍການ low-stock ແລະ current stock.
- KPI cards ສຳລັບ Staff: ຍອດແຈກຂອງຕົນ ແລະ current stock ທີ່ຕ້ອງໃຊ້ໃນ form; ບໍ່ສະແດງຍອດຮັບ, adjustment ຫຼື audit ຂອງຄົນອື່ນເປັນຄ່າ 0 ທີ່ຊວນໃຫ້ເຂົ້າໃຈຜິດ.
- ສະຫຼຸບຕາມ gift, branch, staff, customer ແລະ Campaign.
- ລາຍການ movements ຕາມເວລາ.
- Export Excel ສະເພາະ scope, date range ແລະ filters ທີ່ຜູ້ໃຊ້ເລືອກ.

### 8.5 ແຖບ `ຈັດການ`

- Admin: ເພີ່ມ/ແກ້/ເປີດ/ປິດ gift catalog ແລະຈັດລຳດັບ.
- Admin: ຈັດການ Campaign ທຸກ branch.
- Branch Manager: ຈັດການ Campaign own branch.
- ບໍ່ມີ hard-delete button.

ທຸກໜ້າຈໍຮອງຮັບ mobile 360px, tablet ແລະ desktop; ບໍ່ມີ horizontal overflow ແລະ touch target ຕ້ອງເໝາະສົມ.

## 9. Low-stock notification

- ບໍ່ສ້າງ notification ຊ້ຳທຸກມື້.
- Header bell ຄຳນວນຈາກ active `branchGiftStocks` ທີ່ຕ່ຳກວ່າ ຫຼືເທົ່າ threshold ແລະລວມເຂົ້າກັບ notification center ເດີມ.
- Branch Manager ເຫັນ low-stock count ຂອງ own branch; Admin ເຫັນທຸກ branch.
- ກົດ notification ແລ້ວໄປ `/gifts` ພ້ອມ branch/gift filter.
- ເມື່ອ Stock ເພີ່ມສູງກວ່າ threshold ລາຍການຫາຍຈາກ notification ອັດຕະໂນມັດ.
- Staff ບໍ່ຮັບ low-stock notification ໃນຮອບນີ້.

## 10. ການຄຳນວນແລະລາຍງານ

- Date boundaries ທັງໝົດໃຊ້ `Asia/Vientiane`; week ເລີ່ມວັນຈັນ.
- `totalUnits = packs * unitsPerPackSnapshot + looseUnits` ແລະທຸກຄ່າເປັນເລກເຕັມບໍ່ຕິດລົບ; operation ທີ່ປ່ຽນ Stock ຕ້ອງມີ total ຫຼາຍກວ່າ 0.
- ຍອດຮັບແມ່ນຜົນລວມ delta ບວກຈາກ `receive` ແລະ `allocation_receive` ໃນ date range.
- ຍອດແຈກສຸດທິແມ່ນ distribution deltas ຫຼັງລວມ amendments/cancellations; ບໍ່ນັບ cancelled quantity ເປັນຍອດແຈກສຸດທິ.
- Current stock ອ່ານຈາກ `branchGiftStocks`; movement reconciliation ຕ້ອງສາມາດພິສູດ balance ໄດ້.
- ການລາຍງານຕາມ customer/campaign ໃຊ້ ID ເປັນກຸນແຈ ແລະ snapshot ເປັນຊື່ສະແດງ.
- ຍອດຕາມ staff ຂອງ distribution ຈັດກຸ່ມຕາມ `distributionOwnerUid`, ບໍ່ແມ່ນ actor ຜູ້ແກ້ພາຍຫຼັງ. Audit report ຍັງສະແດງ `actorUid` ຂອງແຕ່ລະ movement ຕາມຄວາມຈິງ.
- ຮອບທຳອິດ query movements ຕາມ date range ແລະ role scope ແລ້ວ aggregate ຢູ່ client ໂດຍໃຊ້ pure shared report module. ຖ້າຂໍ້ມູນໃຫຍ່ຂຶ້ນຈົນລາຍງານປະຈຳປີຊ້າ ຈຶ່ງພິຈາລະນາ server-side aggregates ເປັນໂຄງການແຍກ.
- Query failure ບໍ່ສະແດງຍອດ 0 ແທນ error.

Indexes ທີ່ຄາດວ່າຕ້ອງໃຊ້:

- `giftItems`: `active ASC, sortOrder ASC`
- `giftCampaigns`: `branchId ASC, active ASC, startDate DESC`
- `branchGiftStocks`: `branchId ASC, giftId ASC`
- `giftDistributions`: `createdBy ASC, dateKey DESC`
- `giftDistributions`: `branchId ASC, dateKey DESC`
- `giftStockMovements`: `distributionOwnerUid ASC, dateKey DESC`
- `giftStockMovements`: `branchId ASC, dateKey DESC`
- `giftStockMovements`: `branchId ASC, giftId ASC, dateKey DESC`
- `giftAllocations`: `targetBranchId ASC, status ASC, createdAt DESC`

ການລົງມືຕ້ອງກວດ query ຈິງ ແລະເພີ່ມສະເພາະ indexes ທີ່ໃຊ້; ບໍ່ເພີ່ມ index ເພື່ອຄາດເດົາ.

## 11. Excel export

Workbook ສ້າງໃນ browser ຈາກຂໍ້ມູນ role-scoped ທີ່ query ສຳເລັດ. ໃຊ້ ExcelJS ແບບ dynamic import ຕາມ pattern ຂອງ Daily Sales ເພື່ອບໍ່ເພີ່ມ initial bundle.

ຊື່ໄຟລ໌:

`CRM-Gift-Inventory-YYYY-MM-DD-to-YYYY-MM-DD.xlsx`

### 11.1 ແຜ່ນ `ສະຫຼຸບ`

- ຊ່ວງວັນທີ ແລະ filter scope
- gift, branch, received units, distributed net units, current units ແລະ low-stock status
- summary ຕາມ staff, customer ແລະ Campaign ຕາມ filter ທີ່ເລືອກ

Staff export ສະແດງສະເພາະຍອດແຈກຂອງຕົນ ແລະ current stock ທີ່ມີສິດອ່ານ. ຊ່ອງຍອດຮັບ/adjustment ຂອງສາຂາຈະຖືກລະເວັ້ນ ບໍ່ໃສ່ 0 ແທນຂໍ້ມູນທີ່ Staff ບໍ່ມີສິດເຫັນ.

### 11.2 ແຜ່ນ `ລາຍການເຄື່ອນໄຫວ`

- ວັນທີ/ເວລາ
- movement type
- gift
- delta, balance before ແລະ balance after
- branch
- actor ແລະ role
- customer ຫຼື Campaign
- reference/reason ທີ່ຜູ້ໃຊ້ມີສິດເຫັນ

### 11.3 ແຜ່ນ `Stock ປັດຈຸບັນ`

- branch
- gift
- current units
- ຈຳນວນ pack + loose units ທີ່ຄຳນວນຈາກ catalog ປັດຈຸບັນ
- low-stock threshold ແລະ status

Text cells ຈາກຂໍ້ມູນຜູ້ໃຊ້ຕ້ອງ sanitize ເພື່ອປ້ອງກັນ spreadsheet formula injection. Workbook metadata ບັນທຶກຜູ້ Export, role scope, filters ແລະເວລາສ້າງ. Totals ຕ້ອງມາຈາກ aggregation result ດຽວກັບ UI.

## 12. Error handling ແລະ recovery

- Form ຮັກສາຄ່າໄວ້ເມື່ອ save ລົ້ມເຫຼວ.
- Multi-item operation ເປັນ all-or-nothing; ບໍ່ສະແດງ partial success ທີ່ເຮັດໃຫ້ຜູ້ໃຊ້ສັບສົນ.
- Retry ໃຊ້ operation ID ເດີມ ແລະບໍ່ສ້າງ Stock/movement ຊ້ຳ.
- ຖ້າ version ບໍ່ກົງ ລະບົບຢຸດ, reload ຂໍ້ມູນລ່າສຸດ ແລະໃຫ້ຜູ້ໃຊ້ທົບທວນກ່ອນສົ່ງໃໝ່.
- ການກວດນັບແລ້ວພົບຍອດບໍ່ກົງໃຊ້ adjustment ພ້ອມເຫດຜົນ; ບໍ່ແກ້ document ຍອດໂດຍກົງ.
- ຖ້າ gift/campaign ຖືກປິດລະຫວ່າງທີ່ form ເປີດ, server ປະຕິເສດ operation, UI reload catalog ແລະຮັກສາ rows ອື່ນໄວ້.
- ບໍ່ມີ destructive automatic rollback; ledger ແລະ revision ເປັນຫຼັກຖານສຳລັບ controlled correction.

## 13. ການທົດສອບ

### 13.1 Domain/unit tests

- Pack + loose units conversion, invalid integer values ແລະ units-per-pack snapshot.
- Laos date key, same-day edit boundary, Monday–Sunday week, month/year/leap-day boundaries.
- Low-stock boundary: below, equal, above threshold.
- Movement aggregation for receive, allocation receive, distribute, amend, cancel ແລະ adjust.
- Report grouping by gift, branch, staff, customer and Campaign.
- Operation payload digest, deterministic movement IDs and retry idempotency.
- Stock never becomes negative and multi-item validation is all-or-nothing.

### 13.2 Functions tests

- Anonymous, Pending and Disabled denied for every callable.
- Staff can distribute only in own branch and cannot spoof actor/branch/server fields.
- Customer/Campaign branch mismatch denied.
- Branch Manager inbound/threshold/adjust/campaign actions allowed only in own branch.
- Branch Manager cross-branch denied.
- Admin can perform Manager actions for explicitly selected branches and audit remains Admin identity.
- Allocation remains non-stock-changing until confirmation; retry confirmation does not double stock.
- Insufficient stock, inactive/unknown gift, duplicate rows, invalid pack/unit and malformed recipient fail closed.
- Staff own same-day amend/cancel allowed; cross-user or past-day denied.
- Manager/Admin correction requires reason and writes revision + movements + stock atomically.
- Concurrency/version conflict fails safely without partial writes.
- No hard-delete callable exists.

### 13.3 Firestore Rules emulator

- Actor matrix: Anonymous, Pending, Disabled, Staff A/B, Manager A/B, Admin.
- Direct writes to all gift collections, stock balances, movements and revisions denied.
- Staff reads active catalog, own-branch stock and own distributions/movements only.
- Manager reads own branch only; direct document/query cross-branch denied.
- Admin reads all branches.
- Direct URL/document access does not bypass branch or actor restrictions.
- Customer and Activity rules remain unchanged except where a proven read dependency is required.

### 13.4 UI tests

- Role-based tab/menu visibility.
- Admin target branch selection required before branch-specific actions.
- Recipient type toggle, searchable customer/Campaign Dropdown and branch scoping.
- Gift rows add/remove, duplicate prevention, sort order, pack/unit calculation and stock display.
- Busy state, synchronous double-submit guard, error retention and retry.
- Low-stock bell count, link and automatic clearing.
- Same-day edit/cancel, manager/admin reason dialog and stale-version handling.
- Report presets, custom range and role-scoped filters.
- Mobile 360px, tablet and desktop without horizontal overflow; keyboard/focus accessibility.

### 13.5 Excel tests

- Workbook has exactly 3 approved sheets and correct filename/metadata.
- Totals match shared UI aggregation.
- Staff/Manager/Admin exports contain no rows outside their scope.
- Filtered export includes only selected range and filters.
- Formula-like text is escaped/sanitized.
- Empty result exports valid headers and zero totals.

### 13.6 Reconciliation tests

- For each branch + gift, replay of ordered movements equals `currentUnits`.
- Each receipt/allocation/distribution/revision maps to the expected deterministic movement set.
- Cancelled distribution returns exactly the active quantity and cannot return it twice.
- Adjustment preserves an explicit reason and actor identity.

## 14. Deployment and rollout

ຟີເຈີນີ້ເປັນ additive. ບໍ່ຕ້ອງ migration Customer, Activity, Daily Sales ຫຼືຂໍ້ມູນ Notion.

ລຳດັບ production ທີ່ປອດໄພ:

1. ກວດ code/test/build, working tree ແລະ rollback evidence.
2. ບັນທຶກ baseline ຂອງ Functions, Firestore Rules, indexes ແລະ frontend release.
3. Deploy gift callable Functions.
4. Deploy required Firestore indexes ແລະລໍຖ້າ indexes ທີ່ໃຊ້ທັງໝົດ READY.
5. Deploy Firestore Rules ທີ່ເພີ່ມ gift read scopes ແລະ deny direct writes.
6. ທົດສອບ backend/rules ດ້ວຍ controlled accounts ກ່ອນ frontend rollout.
7. Deploy frontend ເປັນລຳດັບສຸດທ້າຍ.
8. Admin ສ້າງ gift catalog, Campaign ແລະບັນທຶກ direct receipt ສຳລັບ Stock ເລີ່ມຕົ້ນ.
9. ກວດ Staff/Manager/Admin acceptance matrix, reconciliation, low-stock notification ແລະ Excel totals.

Rollback frontend/rules/functions ໃຊ້ release/source ກ່ອນ deployment. Gift data ທີ່ຖືກສ້າງຫຼັງ rollout ບໍ່ຖືກລຶບອັດຕະໂນມັດ; ຮັກສາໄວ້ເພື່ອ audit ແລະໃຊ້ controlled correction ຫຼັງຈາກ review.

## 15. ເກນການຍອມຮັບ

- Admin ສ້າງ, ຈັດລຳດັບ ແລະປິດ catalog ໂດຍບໍ່ທຳລາຍປະຫວັດ.
- Branch Manager ຈັດການ own-branch Stock/Campaign; Admin ເຮັດວຽກດຽວກັນໄດ້ທຸກ branch ໂດຍບັນທຶກ actor ຖືກຕ້ອງ.
- Direct receipt ແລະ confirmed allocation ເພີ່ມ Stock ຄັ້ງດຽວ; pending allocation ບໍ່ປ່ຽນ Stock.
- Staff ບັນທຶກ multi-item distribution ໃຫ້ Customer ຫຼື Campaign ໃນ own branch ໄດ້.
- Insufficient Stock ປະຕິເສດທັງ distribution ແລະບໍ່ມີ partial write.
- Retry/double click ບໍ່ສ້າງ receipt, distribution, movement ຫຼື Stock delta ຊ້ຳ.
- Staff ແກ້/ຍົກເລີກ own same-day record ໄດ້; manager/admin correction ຂ້າມວັນມີ reason, revision ແລະ actor/time.
- Pending/Disabled/Anonymous ບໍ່ມີສິດ; Staff/Manager cross-branch access ຖືກປະຕິເສດທັງ query ແລະ direct document.
- Low-stock bell count ກົງກັບ branch scope ແລະຫາຍໄປເມື່ອ balance ສູງກວ່າ threshold.
- Report ວັນ/ອາທິດ/ເດືອນ/ປີ/custom range ຄຳນວນຕາມ `Asia/Vientiane` ແລະ totals reconcile ກັບ ledger/current stock.
- Excel ມີ 3 sheets, role scope ຖືກຕ້ອງ, sanitized text ແລະ totals ກົງກັບ UI.
- UI ໃຊ້ງານໄດ້ໃນ mobile 360px, tablet ແລະ desktop ໂດຍບໍ່ມີ horizontal overflow.
- Existing Customer, Activity, Birthday Reminder and Daily Sales flows ຍັງຜ່ານ regression tests.

## 16. ການກວດຫຼັງນຳໃຊ້

- ກວດ Functions errors, permission denials ທີ່ຜິດປົກກະຕິ ແລະ failed-precondition rates.
- ກວດ reconciliation ລະຫວ່າງ movement ledger ແລະ current stock.
- ກວດວ່າບໍ່ມີ direct client writes ຫຼື cross-branch reads.
- ກວດ sample Excel ຂອງ Staff, Manager ແລະ Admin ກ່ອນໃຊ້ລາຍງານທາງການ.
- ຖ້າ report ປະຈຳປີເລີ່ມຊ້າ ໃຫ້ວັດປະລິມານຂໍ້ມູນຈິງກ່ອນອອກແບບ server-side aggregates.
