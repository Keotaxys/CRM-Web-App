# ແບບອອກແບບລະບົບຕິດຕາມຍອດຂາຍຜະລິດຕະພັນປະຈຳວັນ

ວັນທີ: 2026-09-11

ສະຖານະ: ຜ່ານການຢືນຢັນດ້ານແນວຄິດ ແລະລໍຖ້າການກວດສະບັບຂຽນ

ລະບົບ: CRM Web App (`crm-web-app-97b91`)

## 1. ເປົ້າໝາຍ

ເພີ່ມລະບົບບັນທຶກຈຳນວນຜະລິດຕະພັນ/ບໍລິການທີ່ພະນັກງານແຕ່ລະຄົນຂາຍໄດ້ໃນແຕ່ລະມື້ ເຊັ່ນ BCEL One, iBank ແລະ SMS Banking. ລະບົບຕ້ອງສາມາດສະຫຼຸບຕາມວັນ, ອາທິດ, ເດືອນ, ປີ ຫຼືຊ່ວງວັນທີກຳນົດເອງ ແລະ Export ເປັນ Excel ໄດ້.

ລະບົບນີ້ເກັບຈຳນວນເທົ່ານັ້ນ. ບໍ່ເກັບລາຄາ, ສ່ວນຫຼຸດ, ລາຍຮັບ, ຕົ້ນທຶນ, ກຳໄລ, ສະຕັອກ, ການຊຳລະ ຫຼືໃບບິນ.

## 2. ຂອບເຂດທີ່ຢືນຢັນ

- ພະນັກງານບັນທຶກຍອດລວມທ້າຍມື້ຂອງຕົນເອງ.
- ໜຶ່ງໃບສະຫຼຸບຕໍ່ພະນັກງານຕໍ່ວັນ.
- Admin ຈັດການລາຍຊື່ຜະລິດຕະພັນກາງທີ່ທຸກສາຂາໃຊ້ຮ່ວມກັນ.
- Staff ແກ້ໄຂຍອດໄດ້ສະເພາະພາຍໃນມື້ດຽວກັນຕາມເວລາລາວ.
- Branch Manager ແລະ Admin ແກ້ຍ້ອນຫຼັງໄດ້ເມື່ອລະບຸເຫດຜົນ; ຕ້ອງມີ audit history.
- ຖ້າບໍ່ມີເອກະສານໃນມື້ໃດ ລາຍງານຖືວ່າຍອດເປັນ 0.
- Staff ເບິ່ງ/Export ສະເພາະຂອງຕົນ, Branch Manager ສະເພາະສາຂາ ແລະ Admin ທຸກສາຂາ.
- ອາທິດເລີ່ມວັນຈັນແລະສິ້ນສຸດວັນອາທິດ ຕາມເຂດເວລາ `Asia/Vientiane`.
- Excel ມີ 3 ແຜ່ນງານ: ສະຫຼຸບຜະລິດຕະພັນ, ສະຫຼຸບທີມງານ ແລະລາຍລະອຽດລາຍວັນ.

## 3. ສິ່ງທີ່ບໍ່ຢູ່ໃນຂອບເຂດ

- ບໍ່ມີສະຕັອກ ຫຼືການຫັກສະຕັອກ.
- ບໍ່ມີລາຄາ, ລາຍຮັບ, ຕົ້ນທຶນ ຫຼືກຳໄລ.
- ບໍ່ສ້າງໃບສະເໜີລາຄາ, ໃບບິນ ຫຼືໃບຮັບເງິນ.
- ບໍ່ບັງຄັບໃຫ້ຜູກການຂາຍກັບ Customer.
- ບໍ່ມີ target/KPI, commission ຫຼືການແຈ້ງເຕືອນຜົນງານໃນຮອບທຳອິດ.
- ບໍ່ສ້າງ backend aggregate ລ່ວງໜ້າ; ລາຍງານຮອບທຳອິດຄຳນວນຈາກເອກະສານລາຍວັນໃນຊ່ວງທີ່ເລືອກ.

## 4. ໂຄງສ້າງຂໍ້ມູນ

### 4.1 `salesProducts/{productId}`

```js
{
  schemaVersion: 1,
  name: "BCEL One",
  normalizedName: "bcel one",
  active: true,
  sortOrder: 10,
  createdBy: "uid",
  createdAt: Timestamp,
  updatedBy: "uid",
  updatedAt: Timestamp
}
```

ຂໍ້ກຳນົດ:

- `name` ຕ້ອງບໍ່ຫວ່າງ ແລະຊື່ທີ່ normalize ແລ້ວຕ້ອງບໍ່ຊ້ຳ.
- `sortOrder` ເປັນເລກເຕັມ ແລະໃຊ້ຈັດລຳດັບໜ້າບັນທຶກ.
- MVP ບໍ່ມີ hard delete. Admin ໃຊ້ `active=false` ເພື່ອປິດນຳໃຊ້.
- ຜະລິດຕະພັນທີ່ປິດແລ້ວຍັງປາກົດໃນລາຍງານປະຫວັດ.

### 4.2 `dailySales/{dateKey}_{staffUid}`

`dateKey` ໃຊ້ຮູບແບບ `YYYY-MM-DD` ຕາມເຂດເວລາ `Asia/Vientiane`. Document ID ແບບ deterministic ປ້ອງກັນການສ້າງຍອດຊ້ຳຂອງຄົນດຽວກັນໃນມື້ດຽວກັນ.

```js
{
  schemaVersion: 1,
  dateKey: "2026-09-11",
  staffUid: "uid",
  staffNameSnapshot: "Display name",
  branchId: "020",
  items: [
    {
      productId: "product-id",
      productNameSnapshot: "BCEL One",
      quantity: 5
    }
  ],
  totalQuantity: 5,
  createdBy: "uid",
  createdAt: Timestamp,
  updatedBy: "uid",
  updatedAt: Timestamp
}
```

ຂໍ້ກຳນົດ:

- ເກັບສະເພາະລາຍການທີ່ `quantity > 0`; UI ສະແດງລາຍການອື່ນເປັນ 0.
- `quantity` ເປັນເລກເຕັມບໍ່ຕິດລົບ.
- `totalQuantity` ຄຳນວນຢູ່ server ຈາກ `items`; ບໍ່ເຊື່ອຄ່າຈາກ client.
- `staffUid`, `staffNameSnapshot`, `branchId`, audit fields ແລະ server timestamps ກຳນົດຢູ່ server.
- `branchId` ເປັນສາຂາໃນມື້ທີ່ຂາຍ. ການຍ້າຍສາຂາພາຍຫຼັງບໍ່ຍ້າຍປະຫວັດເກົ່າ.
- `productNameSnapshot` ຮັກສາຄວາມໝາຍຂອງປະຫວັດເມື່ອມີການປ່ຽນຊື່ຜະລິດຕະພັນ.
- ການບັນທຶກເທື່ອທຳອິດທີ່ທຸກຄ່າເປັນ 0 ບໍ່ຈຳເປັນຕ້ອງສ້າງ document.
- ຖ້າ document ເຄີຍມີຍອດແລ້ວຖືກແກ້ເປັນ 0 ໃຫ້ເກັບ document ທີ່ `items=[]` ແລະ `totalQuantity=0` ໄວ້ເພື່ອຮັກສາ audit trail.

### 4.3 `dailySales/{dailySalesId}/revisions/{revisionId}`

```js
{
  schemaVersion: 1,
  reason: "ເຫດຜົນການແກ້ຍ້ອນຫຼັງ",
  previousItems: [],
  nextItems: [],
  previousTotalQuantity: 0,
  nextTotalQuantity: 0,
  changedBy: "uid",
  changedByRole: "branch_manager",
  changedAt: Timestamp
}
```

- Revision ສ້າງເມື່ອ Branch Manager/Admin ແກ້ຂໍ້ມູນຂ້າມມື້.
- Revision ເປັນ append-only; client ຂຽນ, ແກ້ ຫຼືລຶບໂດຍກົງບໍ່ໄດ້.
- ການປ່ຽນພາຍໃນມື້ຂອງຜູ້ບັນທຶກຍັງມີ `updatedBy/updatedAt`; revision ແບບລະອຽດບັງຄັບສຳລັບການແກ້ຍ້ອນຫຼັງ.

## 5. Trusted backend

ການຂຽນທັງໝົດຜ່ານ callable Functions ໃນ region ເດີມຂອງ CRM. Firestore Rules ປະຕິເສດ direct client writes ຕໍ່ `salesProducts`, `dailySales` ແລະ `revisions`.

### 5.1 `saveDailySales`

- ຕ້ອງເປັນ authenticated, approved Staff ຫຼື Branch Manager ທີ່ມີສາຂາຖືກຕ້ອງ. Admin ທີ່ມີ `branchId=null` ບໍ່ບັນທຶກຍອດຂອງຕົນຜ່ານ flow ນີ້.
- Target UID ແລະ branch ມາຈາກ verified claims/profile, ບໍ່ຮັບຈາກ client.
- Staff ບັນທຶກ/ແກ້ໄດ້ສະເພາະ `dateKey` ປັດຈຸບັນຕາມ `Asia/Vientiane`.
- ກວດສອບ product IDs, active state, integer quantities ແລະກຳຈັດ product IDs ຊ້ຳ.
- ໃຊ້ transaction ແລະ deterministic document ID ເພື່ອໃຫ້ retry ປອດໄພ.

### 5.2 `amendDailySales`

- Branch Manager ແກ້ໄດ້ສະເພາະ target user/document ທີ່ຢູ່ສາຂາດຽວກັນ.
- Admin ແກ້ໄດ້ທຸກສາຂາ.
- ຕ້ອງມີເຫດຜົນທີ່ບໍ່ຫວ່າງ.
- Transaction ອັບເດດ daily document ແລະສ້າງ immutable revision ພ້ອມກັນ.
- ບໍ່ສາມາດປ່ຽນ `staffUid`, `branchId` ຫຼື `dateKey` ຂອງ document ເດີມ.
- Client ສົ່ງ `mutationId` ແບບ UUID ທີ່ສ້າງຄັ້ງດຽວແລະຮັກສາໄວ້ໃນການ retry. Revision ID ຜູກກັບ `mutationId`; server ປະຕິເສດ payload ຕ່າງກັນທີ່ໃຊ້ ID ເກົ່າ ແລະຄືນຜົນເດີມສຳລັບ retry ທີ່ payload ກົງກັນ.

### 5.3 Product administration

- `createSalesProduct`: Admin-only, ກວດຊື່ຊ້ຳ.
- `updateSalesProduct`: Admin-only, ປ່ຽນຊື່, `sortOrder` ຫຼື `active`.
- ບໍ່ມີ callable hard-delete ໃນ MVP.

Functions ຕ້ອງຕອບກັບດ້ວຍສະຖານະທີ່ client ຈັດການໄດ້ ເຊັ່ນ unauthenticated, permission-denied, invalid-argument, failed-precondition ແລະ internal. ບໍ່ log ຂໍ້ມູນລູກຄ້າ, token ຫຼືຂໍ້ມູນສ່ວນຕົວທີ່ບໍ່ຈຳເປັນ.

## 6. ສິດການອ່ານ

| ສະຖານະ/ບົດບາດ | Products | Daily sales | Revisions | Export |
|---|---|---|---|---|
| Anonymous | ປະຕິເສດ | ປະຕິເສດ | ປະຕິເສດ | ບໍ່ມີ |
| Pending | ປະຕິເສດ | ປະຕິເສດ | ປະຕິເສດ | ບໍ່ມີ |
| Disabled | ປະຕິເສດ | ປະຕິເສດ | ປະຕິເສດ | ບໍ່ມີ |
| Staff | catalog; form ໃຊ້ active products | ສະເພາະ `staffUid == auth.uid` | ສະເພາະຂອງຕົນ | ຂອງຕົນ |
| Branch Manager | products ທັງໝົດທີ່ຈຳເປັນ | ສະເພາະ `branchId` ຂອງຕົນ | ສະເພາະສາຂາ | ສາຂາຂອງຕົນ |
| Admin | ທັງໝົດ | ທຸກສາຂາ | ທຸກສາຂາ | ທຸກສາຂາ |

Firestore queries ຕ້ອງມີ scope ທີ່ Rules ພິສູດໄດ້; ບໍ່ດຶງຂໍ້ມູນທຸກສາຂາມາ filter ໃນ browser. Required indexes ຢ່າງນ້ອຍ:

- `dailySales`: `staffUid ASC, dateKey ASC`
- `dailySales`: `branchId ASC, dateKey ASC`
- `salesProducts`: `active ASC, sortOrder ASC`

ການລົງມືຈະກວດສອບ query direction ທີ່ແທ້ຈິງ ແລະເພີ່ມສະເພາະ indexes ທີ່ຖືກໃຊ້.

## 7. ໜ້າຈໍ ແລະ navigation

ເພີ່ມ route `/sales` ພາຍໃຕ້ ProtectedRoute ເດີມ. ເຂົ້າໄດ້ຈາກ:

- ເມນູ `ຍອດຂາຍ` ໃນໜ້າ “ເພີ່ມເຕີມ”.
- ປຸ່ມລັດໃນໜ້າຫຼັກ.

Bottom Navigation ເດີມບໍ່ປ່ຽນ.

### 7.1 ແຖບ `ບັນທຶກມື້ນີ້`

- ສະແດງວັນທີ, ຊື່ຜູ້ໃຊ້ ແລະສາຂາຈາກ verified identity.
- ສະແດງ active products ຕາມ `sortOrder`.
- ແຕ່ລະ product ມີຊ່ອງຈຳນວນ ແລະປຸ່ມ `−`/`+` ທີ່ໃຊ້ງານສະດວກໃນມືຖື.
- ຄ່າຫວ່າງຕີຄວາມເປັນ 0; ບໍ່ຮັບເລກຕິດລົບ ຫຼືທົດສະນິຍົມ.
- ຖ້າມີ document ຂອງມື້ນີ້ ຈະໂຫຼດຄ່າເກົ່າມາແກ້.
- ປຸ່ມບັນທຶກມີ synchronous double-submit guard ແລະ busy state.
- ຖ້າລົ້ມເຫຼວ ຮັກສາຄ່າໃນ form ແລະອະນຸຍາດໃຫ້ retry.
- ແຖບນີ້ສະແດງສຳລັບ Staff ແລະ Branch Manager. Admin ເຫັນແຖບລາຍງານ ແລະຈັດການຜະລິດຕະພັນ, ແຕ່ບໍ່ມີ daily self-entry ເພາະ canonical Admin ບໍ່ຜູກກັບສາຂາ.
- ຖ້າ product ທີ່ມີຢູ່ໃນ daily document ຖືກ deactivate ລະຫວ່າງມື້, UI ຍັງສະແດງຄ່າເກົ່າພ້ອມປ້າຍ “ປິດນຳໃຊ້”. Server ອະນຸຍາດໃຫ້ຮັກສາ ຫຼືຫຼຸດຄ່າເດີມ, ແຕ່ບໍ່ອະນຸຍາດໃຫ້ເພີ່ມຍອດໃໝ່ໃຫ້ product ທີ່ປິດ.

### 7.2 ແຖບ `ລາຍງານ`

Date presets:

- ມື້ນີ້
- ອາທິດນີ້ (ຈັນ–ອາທິດ)
- ເດືອນນີ້
- ປີນີ້
- ກຳນົດເອງ

ຜົນລາຍງານ:

- KPI card ຍອດຈຳນວນລວມ.
- ຍອດ/ອັນດັບ/ສັດສ່ວນຕາມ product.
- ຍອດຕາມພະນັກງານ.
- ຍອດຕາມສາຂາສຳລັບ Admin.
- ຕາຕະລາງລາຍວັນ.
- Filters ສຳລັບ product, staff ແລະ branch ຕາມສິດ.
- ປຸ່ມ `Export Excel` ສົ່ງອອກສະເພາະຂໍ້ມູນໃນ scope/filter ປັດຈຸບັນ.

ເມື່ອ date range ບໍ່ມີ document ສຳລັບວັນໃດ ການຄຳນວນສະແດງຍອດ 0 ຕາມຂໍ້ຕົກລົງ. UI ບໍ່ກ່າວອ້າງວ່າພະນັກງານ “ສົ່ງລາຍງານແລ້ວ” ເພາະ missing ແລະ zero ບໍ່ສາມາດແຍກອອກຈາກກັນ.

### 7.3 ແຖບ `ຈັດການຜະລິດຕະພັນ`

ສະແດງສະເພາະ Admin:

- ເພີ່ມ product.
- ປ່ຽນຊື່ ແລະລຳດັບ.
- ເປີດ/ປິດນຳໃຊ້.
- ສະແດງ confirmation ກ່ອນປິດ product.
- ບໍ່ມີປຸ່ມ hard delete.

## 8. ການຄຳນວນລາຍງານ

- ທຸກ date boundary ຄຳນວນຕາມ `Asia/Vientiane` ແລະໃຊ້ `dateKey` ບໍ່ໃຊ້ browser timezone ໂດຍກົງ.
- ອາທິດແມ່ນວັນຈັນ 00:00 ຫາວັນອາທິດ 23:59:59 ຕາມເວລາລາວ.
- ຍອດ product ຈັດກຸ່ມຕາມ `productId`. ຊື່ໃນສະຫຼຸບໃຊ້ snapshot ລ່າສຸດພາຍໃນ date range ທີ່ເລືອກ; ລາຍລະອຽດລາຍວັນໃຊ້ snapshot ຂອງແຕ່ລະເອກະສານ. ດັ່ງນັ້ນ ການສ້າງລາຍງານຂອງຊ່ວງເກົ່າຈະບໍ່ປ່ຽນຊື່ຕາມ catalog ປັດຈຸບັນ.
- ຍອດພະນັກງານຈັດກຸ່ມຕາມ `staffUid`; ຊື່ສະແດງ fallback ຫາ snapshot ເມື່ອ profile ບໍ່ມີແລ້ວ.
- ຍອດສາຂາຈັດກຸ່ມຕາມ `branchId` ທີ່ເກັບໃນ daily document.
- ສັດສ່ວນ product = product quantity / total quantity. ເມື່ອ total ເປັນ 0 ສັດສ່ວນທຸກລາຍການເປັນ 0%.
- ການຈັດອັນດັບໃຊ້ quantity ຫຼາຍຫາໜ້ອຍ; ເມື່ອເທົ່າກັນໃຊ້ product `sortOrder` ແລ້ວຊື່.

ຮອບທຳອິດດຶງສະເພາະ documents ໃນ date range ແລະ role scope ແລ້ວ aggregate ໃນ client. ຖ້າປະລິມານຂໍ້ມູນໃນອະນາຄົດເຮັດໃຫ້ລາຍງານປະຈຳປີຊ້າ ຈຶ່ງພິຈາລະນາ server-side aggregates ພ້ອມ reconciliation ເປັນໂຄງການແຍກ.

## 9. Excel export

Workbook ສ້າງຢູ່ browser ຈາກຂໍ້ມູນທີ່ Firestore Rules ອະນຸຍາດໃຫ້ຜູ້ໃຊ້ອ່ານ. ໃຊ້ ExcelJS ຜ່ານ module ສຳລັບ export ໂດຍສະເພາະ ແລະ load ດ້ວຍ dynamic import ເມື່ອກົດ Export ເທົ່ານັ້ນ ເພື່ອບໍ່ເພີ່ມ initial bundle. ແຜນລົງມືຕ້ອງ pin ເວີຊັນທີ່ກວດ compatibility/license/security ແລ້ວ.

ຊື່ໄຟລ໌:

`CRM-Sales-YYYY-MM-DD-to-YYYY-MM-DD.xlsx`

### 9.1 `ສະຫຼຸບຜະລິດຕະພັນ`

- ຊື່ product
- ຍອດລວມ
- ສັດສ່ວນ
- ອັນດັບ

### 9.2 `ສະຫຼຸບທີມງານ`

- ຊື່ພະນັກງານ
- ສາຂາ
- ຍອດແຕ່ລະ product
- ຍອດລວມ

### 9.3 `ລາຍລະອຽດລາຍວັນ`

- ວັນທີ
- ພະນັກງານ
- ສາຂາ
- ຜະລິດຕະພັນ
- ຈຳນວນ
- ເວລາອັບເດດລ່າສຸດ

ທຸກ sheet ມີ metadata ຊ່ວງວັນທີ, report scope, ຜູ້ Export ແລະເວລາສ້າງ. Text cells ຈາກຂໍ້ມູນຜູ້ໃຊ້ຕ້ອງ sanitize ເພື່ອປ້ອງກັນ spreadsheet formula injection. Workbook totals ຕ້ອງກົງກັບຄ່າທີ່ UI ສະແດງຈາກ aggregation result ດຽວກັນ.

## 10. Error handling ແລະ consistency

- Form ຮັກສາຄ່າໄວ້ເມື່ອ save ລົ້ມເຫຼວ.
- ສະແດງ error ແຍກລະຫວ່າງ authentication, permission, validation, stale-day lock ແລະ network/internal failure.
- Retry ຕໍ່ `saveDailySales` ປອດໄພເພາະ document ID ຄົງທີ່ ແລະ transaction ອ່ານ/ອັບເດດ document ເດີມ.
- Client ບໍ່ປ່ຽນ UI ເປັນ “ບັນທຶກແລ້ວ” ກ່ອນ callable ຕອບສຳເລັດ.
- Report query failure ບໍ່ສະແດງຍອດ 0 ແທນ error; ຍອດ 0 ໃຊ້ສະເພາະການ query ທີ່ສຳເລັດແຕ່ບໍ່ມີ documents.
- Product ທີ່ຖືກ deactivate ລະຫວ່າງທີ່ form ເປີດຈະບໍ່ຮັບຍອດເພີ່ມໃໝ່. Client reload catalog ແລະຮັກສາຄ່າ product ອື່ນໄວ້; ຖ້າ daily document ມີ product ນັ້ນກ່ອນແລ້ວ ກົດການຮັກສາ/ຫຼຸດຄ່າໃຊ້ຕາມຂໍ້ 7.1.

## 11. ການທົດສອບ

### 11.1 Domain/unit tests

- Laos date key ແລະ Monday–Sunday boundaries.
- Day/week/month/year/custom-range aggregation.
- Month/year boundaries ແລະ leap day.
- Product/staff/branch grouping, total, percentage ແລະ ranking ties.
- Missing document ຄິດເປັນ 0 ໂດຍບໍ່ອ້າງວ່າສົ່ງແລ້ວ.
- Empty/negative/decimal/duplicate product quantities.
- Deterministic daily document ID ແລະ retry idempotency.

### 11.2 Functions tests

- Anonymous/Pending/Disabled denied.
- Staff ບັນທຶກຂອງຕົນເອງໃນມື້ປັດຈຸບັນໄດ້.
- Staff ປອມ target UID, branch, server fields ຫຼືວັນຍ້ອນຫຼັງບໍ່ໄດ້.
- Branch Manager ບັນທຶກຂອງຕົນ ແລະ amend ສະເພາະສາຂາພ້ອມ reason.
- Branch Manager cross-branch denied.
- Admin all-branch amend ພ້ອມ reason.
- Past-date amend ສ້າງ revision ແລະ daily update ໃນ transaction ດຽວ.
- Inactive/unknown/duplicate products ແລະ invalid quantities fail closed.
- Retry ບໍ່ສ້າງ daily document ຫຼື revision ຊ້ຳໂດຍບໍ່ຈຳເປັນ.
- Product administration ເປັນ Admin-only ແລະຊື່ normalize ບໍ່ຊ້ຳ.

### 11.3 Firestore Rules emulator

- Actor matrix: Anonymous, Pending, Disabled, Staff A/B, Manager A/B, Admin.
- Direct writes ໄປ products/dailySales/revisions denied ສຳລັບ client.
- Staff read own-only; direct document/query cross-user denied.
- Manager read own-branch only; direct document/query cross-branch denied.
- Admin read all branches.
- Revisions ບໍ່ສາມາດປ່ຽນ/ລຶບຈາກ client.
- Query constraints ກົງກັບ rules ແລະ indexes.

### 11.4 UI tests

- Today form loads active products and an existing same-day document.
- Integer input, `−`/`+`, keyboard input, busy state ແລະ double-submit prevention.
- Save success/error/retry behavior.
- Past date lock ແລະ manager/admin correction reason form.
- Role-scoped report filters and results.
- Mobile 360px, desktop, no horizontal overflow, keyboard/focus accessibility.
- Navigation entry from Home and More without changing Bottom Navigation.

### 11.5 Excel tests

- Workbook has exactly 3 required sheets with the approved headers.
- Workbook metadata, filename and selected date range are correct.
- Totals in all sheets equal the shared aggregation result used by UI.
- Staff/Manager/Admin exports contain no rows outside their scope.
- Formula-like text is escaped/sanitized.
- Empty result exports valid sheets with zero totals and headers.

## 12. Deployment and rollout

ຟີເຈີນີ້ເປັນ additive ແລະບໍ່ຕ້ອງ migration ຂໍ້ມູນ Customer/Activity ເກົ່າ.

ລຳດັບ production ທີ່ປອດໄພ:

1. ກວດ code/test/build ແລະບັນທຶກ rollback evidence.
2. Deploy callable Functions ໃໝ່.
3. Deploy required Firestore indexes ແລະລໍຖ້າ READY.
4. Deploy Firestore Rules ທີ່ຮອງຮັບ read scope ແລະປະຕິເສດ direct writes.
5. ທົດສອບ Functions/Rules ໃນ production ດ້ວຍ controlled non-destructive checks.
6. Admin ສ້າງ initial product catalog (BCEL One, iBank, SMS Banking ແລະລາຍການທີ່ອະນຸມັດ).
7. Deploy frontend ຫຼັງ backend/indexes/rules ພ້ອມ.
8. ທົດສອບ Staff/Manager/Admin acceptance matrix ແລະ Excel totals.

Rollback frontend/rules/functions ໃຊ້ release ແລະ source ກ່ອນ deployment. ຂໍ້ມູນ `salesProducts` ແລະ `dailySales` ທີ່ເພີ່ມໃໝ່ບໍ່ຖືກລຶບໃນ rollback ອັດຕະໂນມັດ; ຈະຮັກສາໄວ້ເພື່ອການກວດສອບ ແລະຕ້ອງມີການອະນຸມັດແຍກກ່ອນລຶບ.

## 13. ຂໍ້ຈຳກັດທີ່ຮັບຮູ້

ຕາມການຕັດສິນໃຈຂອງຜູ້ໃຊ້, ການບໍ່ມີ document ໃນມື້ໃດໝາຍເຖິງຍອດ 0. ດັ່ງນັ້ນ ລະບົບບໍ່ສາມາດແຍກ “ຂາຍບໍ່ໄດ້” ອອກຈາກ “ລືມບັນທຶກ”. ບໍ່ຄວນນຳຂໍ້ມູນນີ້ໄປວັດອັດຕາການສົ່ງລາຍງານ ຫຼືກ່າວຫາວ່າຜູ້ໃຊ້ຢືນຢັນຍອດ 0.

## 14. ເກນການຍອມຮັບ

- ພະນັກງານບັນທຶກຈຳນວນຫຼາຍ products ໃນໃບດຽວຂອງມື້ນີ້ໄດ້.
- Retry/double click ບໍ່ສ້າງຂໍ້ມູນຊ້ຳ.
- Staff ບໍ່ສາມາດອ່ານ ຫຼືຂຽນຍອດຂອງຄົນອື່ນ.
- Manager ບໍ່ສາມາດຂ້າມສາຂາ.
- Pending/Disabled ບໍ່ມີສິດຕໍ່ຂໍ້ມູນຍອດຂາຍ.
- ການແກ້ຍ້ອນຫຼັງມີ reason ແລະ immutable audit revision.
- ລາຍງານວັນ/ອາທິດ/ເດືອນ/ປີ/custom range ຄຳນວນກົງກັນຕາມເວລາລາວ.
- Excel ມີ 3 sheets, ຂອບເຂດຖືກຕ້ອງ ແລະ totals ກົງກັບ UI.
- Admin ຈັດການ catalog ໂດຍບໍ່ທຳລາຍປະຫວັດ.
- UI ໃຊ້ງານໄດ້ທີ່ 360px ແລະ desktop ໂດຍບໍ່ມີ horizontal overflow.
