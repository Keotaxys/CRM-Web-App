# Activity Date Filters and VIP Birthday Reminders Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task, and use `superpowers:test-driven-development` for every behavior change.

**Goal:** Add Today/All/Custom date filtering to Activities and add secure, branch-scoped in-app VIP birthday reminders with optional `DD-MM-YYYY` customer birth dates.

**Architecture:** Keep Activity filtering client-side over the existing authorized subscription. Add pure birthday/date helpers for deterministic Laos-time calculations, a protected reminder provider shared by Navbar and a new reminder page, and one trusted Callable Function for acknowledgment. Extend only the customer birth-date Firestore allowlist; keep acknowledgment metadata server-owned.

**Tech stack:** React 19, React Router, Firebase Web SDK, Firestore, Firebase Functions v2 on Node 22, Vitest/Testing Library, Node test runner, Firebase Rules Emulator.

**Approved design:** `docs/superpowers/specs/2026-09-09-activity-date-birthday-reminders-design.md`

---

## Task 1: Add deterministic Laos date and birthday helpers

**Files:**

- Create: `src/shared/birthday.js`
- Create: `src/shared/birthday.test.js`
- Modify: `src/shared/dateTime.js`
- Modify: `src/shared/dateTime.test.js`

### Step 1: Write failing birthday format tests

Cover:

- `birthDateFromInput('1990-09-15') === '15-09-1990'`
- `birthDateToInput('15-09-1990') === '1990-09-15'`
- strict rejection of wrong shape, impossible days, invalid leap days, and future dates;
- a missing value normalizes to `null`;
- formatting never relies on `new Date('DD-MM-YYYY')`.

Run:

```powershell
npx.cmd vitest run src/shared/birthday.test.js
```

Expected: RED because `src/shared/birthday.js` does not exist.

### Step 2: Implement the smallest strict parser and adapters

Implement pure exports similar to:

```js
parseBirthDate(value)
birthDateFromInput(value)
birthDateToInput(value)
isValidBirthDate(value, todayKey)
```

Construct calendar dates from numeric year/month/day parts only. Round-trip the parts after construction to reject rollover dates such as `31-02-2020`.

### Step 3: Write failing reminder calculation tests

Cover:

- 14, 7, 1, and 0 days remaining;
- day 15 excluded;
- the day after an unacknowledged birthday excluded;
- late-December to January occurrence year;
- 29 February observed on 28 February in a non-leap year;
- non-VIP, archived, trashed, missing/invalid date, and same-occurrence acknowledgment excluded;
- next-year recurrence returns after the previous occurrence was acknowledged.

Use fixed `YYYY-MM-DD` Laos day keys rather than the test machine timezone.

### Step 4: Implement pure reminder calculation

Add exports similar to:

```js
birthdayReminderFor(customer, todayKey)
birthdayReminderGroup(daysRemaining)
sortBirthdayReminders(items)
```

The returned reminder must contain the server-relevant `occurrenceYear`; it must not mutate the customer.

### Step 5: Add Laos-today and next-midnight helpers

Extend `src/shared/dateTime.js` with pure/testable helpers:

```js
laosTodayKey(now = new Date())
millisecondsUntilNextLaosDay(now = new Date())
isLaosDayWithinInclusiveRange(value, startKey, endKey)
```

Test UTC instants around Laos midnight and inclusive endpoints.

### Step 6: Run focused tests and commit

```powershell
npx.cmd vitest run src/shared/birthday.test.js src/shared/dateTime.test.js
git diff --check
git add src/shared/birthday.js src/shared/birthday.test.js src/shared/dateTime.js src/shared/dateTime.test.js
git commit -m "feat: add deterministic VIP birthday calculations"
```

Expected: all focused tests GREEN.

---

## Task 2: Replace the Activity single-date filter with date modes

**Files:**

- Modify: `src/activities/ActivitiesPage.jsx`
- Modify: `src/activities/ActivitiesPage.test.jsx`
- Modify if needed: `src/styles/screens.css`

### Step 1: Replace the old date test with failing approved-behavior tests

Use a fixed system time and test activities on the previous day, today, tomorrow, and custom range endpoints. Prove:

- `ມື້ນີ້` is active by default and only the Laos-current day is shown;
- `ທັງໝົດ` shows every activity otherwise allowed by the existing filters;
- `ກຳນົດເອງ` reveals `ຈາກວັນທີ` and `ເຖິງວັນທີ`;
- both custom endpoints are included;
- values outside the range are excluded;
- an invalid/incomplete range shows validation feedback and does not pretend that an empty result is valid;
- the service subscriptions are still created once.

Run:

```powershell
npx.cmd vitest run src/activities/ActivitiesPage.test.jsx
```

Expected: RED against the current single-date UI.

### Step 2: Implement the date-mode state and controls

Use state shaped like:

```js
{
  dateMode: 'today',
  dateFrom: '',
  dateTo: '',
  type: 'all',
  scope: 'branch',
  staff: 'all',
  status: 'all',
}
```

Render the two `DateField` controls only for `custom`. Set the start field's `max` from the selected end and the end field's `min` from the selected start. Filter with `laosDayKey(item.startAt)` and the pure range helper.

### Step 3: Preserve mobile layout

Add only scoped CSS needed for the date-mode row or custom-date grid. Do not change global navigation or unrelated cards.

### Step 4: Run focused tests and commit

```powershell
npx.cmd vitest run src/activities/ActivitiesPage.test.jsx src/shared/dateTime.test.js
git diff --check
git add src/activities/ActivitiesPage.jsx src/activities/ActivitiesPage.test.jsx src/styles/screens.css
git commit -m "feat: add activity date range filters"
```

---

## Task 3: Add the optional customer birth date end-to-end in the client model

**Files:**

- Modify: `src/customers/customerModel.js`
- Modify: `src/customers/customerModel.test.js`
- Modify: `src/customers/CustomerForm.jsx`
- Modify: `src/customers/CustomerForm.test.jsx`
- Modify: `src/customers/CustomerDetailPage.jsx`
- Modify: `src/customers/CustomerDetailPage.test.jsx`

### Step 1: Write failing model tests

Prove:

- legacy customers missing `birthDate` normalize to `null`;
- create payload persists `15-09-1990` exactly;
- create without a birth date persists `null`;
- update allowlist retains `birthDate` while still dropping branch, role, audit, and lifecycle fields;
- clearing the field produces `null`.

Run:

```powershell
npx.cmd vitest run src/customers/customerModel.test.js
```

Expected: RED until the model allows and normalizes `birthDate`.

### Step 2: Implement the model change

Add `birthDate` to the ordinary editable fields and canonical create payload only. Normalize missing values to `null`; do not introduce migration writes.

### Step 3: Write failing form/detail UI tests

Prove:

- the optional Lao-labeled date field is present;
- an existing stored `15-09-1990` displays as `15/09/1990` in `DateField`;
- selecting a date submits `15-09-1990`, not `1990-09-15`;
- clearing submits `null`;
- future dates cannot be selected;
- Customer Detail displays the stored value and displays an em dash when absent.

### Step 4: Implement form-boundary conversion

Keep the form's date-picker state in `YYYY-MM-DD`. Convert to/from stored `DD-MM-YYYY` only with the shared adapters. Set the field maximum from the Laos-current date. Do not use locale-dependent parsing.

### Step 5: Run focused tests and commit

```powershell
npx.cmd vitest run src/shared/birthday.test.js src/customers/customerModel.test.js src/customers/CustomerForm.test.jsx src/customers/CustomerDetailPage.test.jsx
git diff --check
git add src/customers/customerModel.js src/customers/customerModel.test.js src/customers/CustomerForm.jsx src/customers/CustomerForm.test.jsx src/customers/CustomerDetailPage.jsx src/customers/CustomerDetailPage.test.jsx
git commit -m "feat: add optional customer birth dates"
```

---

## Task 4: Extend Firestore Rules without weakening protected fields

**Files:**

- Modify: `tests/rules/firestore.rules.test.js`
- Modify: `firestore.rules`

### Step 1: Add failing Rules emulator assertions

Extend the canonical customer fixture and cover:

- create with `birthDate: null` succeeds;
- create/update with `15-09-1990` succeeds for an authorized branch actor;
- clearing to null succeeds;
- wrong shape such as `1990-09-15`, missing zero padding, or arbitrary text fails;
- cross-branch birth-date update fails;
- direct `birthdayGreeting` create/update fails;
- existing protected branch, lifecycle, creator, and audit assertions still pass.

Run with Java available:

```powershell
$env:PATH='C:\Program Files\Android\Android Studio\jbr\bin;' + $env:PATH
npm.cmd run test:rules
```

Expected: RED because `birthDate` is not in the current strict allowlists.

### Step 2: Make the minimum Rules change

Add a helper that accepts only null or an exact `DD-MM-YYYY` string shape. Add `birthDate` to customer create/update fields. Keep `birthdayGreeting` out of all client-write allowlists.

Rules are a security boundary, not the only data-quality layer: full calendar and no-future validation remains in application code and is repeated by the trusted Function before acknowledgment.

### Step 3: Run the complete Rules suite and commit

```powershell
$env:PATH='C:\Program Files\Android\Android Studio\jbr\bin;' + $env:PATH
npm.cmd run test:rules
git diff --check
git add firestore.rules tests/rules/firestore.rules.test.js
git commit -m "feat: permit validated customer birth dates"
```

Expected: all Firestore and Storage Rules tests GREEN; `storage.rules` unchanged.

---

## Task 5: Add the trusted birthday acknowledgment Function

**Files:**

- Create: `functions/src/birthday.js`
- Create: `functions/test/birthday.test.js`
- Create: `functions/test/customerBirthday.test.js`
- Modify: `functions/src/customerAdmin.js`
- Modify: `functions/src/index.js`
- Modify: `src/services/customersService.js`
- Modify: `src/services/customersService.test.js`

### Step 1: Write failing server date-contract tests

Mirror the critical client cases in Node tests: strict `DD-MM-YYYY`, 14/7/1/0 days, cross-year, 29 February, invalid/future date, and same-occurrence acknowledgment.

Run:

```powershell
node --test functions/test/birthday.test.js
```

Expected: RED because the trusted helper does not exist.

### Step 2: Implement the trusted pure helper

Create a dependency-free server module that independently parses and calculates the reminder occurrence from a supplied server date. Do not import browser code or trust client calculations.

### Step 3: Write failing operation tests

Create transaction fakes following existing `customerStatusSync.test.js` patterns. Prove:

- Staff and Manager can acknowledge an own-branch active VIP in the window;
- cross-branch actors are denied;
- Admin can acknowledge across branches;
- non-VIP, inactive, malformed-date, missing-date, and out-of-window customers fail closed;
- the write contains the server-derived occurrence year, actor UID, and `FieldValue.serverTimestamp()`;
- retry for the same occurrence is idempotent and creates no second write;
- no caller-supplied role, branch, date, or remaining-day value is trusted.

### Step 4: Implement and export the operation

Add `acknowledgeBirthdayGreetingOperation` to `functions/src/customerAdmin.js` and expose it through the existing `callable(...)` wrapper in `functions/src/index.js` as `acknowledgeBirthdayGreeting`.

### Step 5: Add the client service wrapper test first

Prove `acknowledgeBirthdayGreeting('c1')` calls only the named Callable Function with `{ id: 'c1' }` and performs no direct Firestore update.

### Step 6: Implement the service wrapper

Return the Function result and keep PII out of error logging.

### Step 7: Run focused and subsystem tests, then commit

```powershell
node --test functions/test/birthday.test.js functions/test/customerBirthday.test.js
npm.cmd --prefix functions test
npx.cmd vitest run src/services/customersService.test.js
npm.cmd --prefix functions run lint
git diff --check
git add functions/src/birthday.js functions/test/birthday.test.js functions/test/customerBirthday.test.js functions/src/customerAdmin.js functions/src/index.js src/services/customersService.js src/services/customersService.test.js
git commit -m "feat: acknowledge VIP birthday greetings securely"
```

---

## Task 6: Add one shared reminder provider

**Files:**

- Create: `src/birthdays/BirthdayRemindersContext.js`
- Create: `src/birthdays/BirthdayRemindersProvider.jsx`
- Create: `src/birthdays/useBirthdayReminders.js`
- Create: `src/birthdays/BirthdayRemindersProvider.test.jsx`
- Modify: `src/App.jsx`
- Modify if required: `src/components/AppShell.test.jsx`

### Step 1: Write failing provider tests

Mock the customer subscription and acknowledgment service. Prove:

- the provider subscribes once with the approved identity;
- it exposes only eligible VIP reminders and the correct count;
- it recalculates when customer snapshots change;
- it recalculates on visibility/focus and Laos day rollover;
- after a successful server acknowledgment the item leaves the count;
- failed acknowledgment preserves the item and exposes an error;
- the subscription is cleaned up on unmount.

### Step 2: Implement context, hook, and provider

Keep the Context object in a non-JSX module to satisfy Fast Refresh lint rules. Wrap the protected `AppShell` in the provider so Pending and Disabled routes do not mount a customer subscription.

Only mark an occurrence locally acknowledged after the Callable Function succeeds. Firestore remains the durable source of truth on reload.

### Step 3: Run focused tests and commit

```powershell
npx.cmd vitest run src/birthdays/BirthdayRemindersProvider.test.jsx src/components/AppShell.test.jsx
git diff --check
git add src/birthdays/BirthdayRemindersContext.js src/birthdays/BirthdayRemindersProvider.jsx src/birthdays/useBirthdayReminders.js src/birthdays/BirthdayRemindersProvider.test.jsx src/App.jsx src/components/AppShell.test.jsx
git commit -m "feat: provide branch-scoped birthday reminders"
```

---

## Task 7: Add the bell and dedicated VIP birthday page

**Files:**

- Create: `src/components/Navbar.test.jsx`
- Modify: `src/components/Navbar.jsx`
- Create: `src/birthdays/BirthdayRemindersPage.jsx`
- Create: `src/birthdays/BirthdayRemindersPage.test.jsx`
- Modify: `src/App.jsx`
- Modify: `src/styles/screens.css`
- Modify if needed: `src/styles/screens.test.js`

### Step 1: Write failing Navbar tests

Prove:

- the bell links to `/birthdays`;
- its accessible label communicates the reminder count;
- zero does not render a misleading badge;
- a positive count renders the badge without displacing Logout or the page title.

### Step 2: Implement the bell

Use a semantic link or button with the existing icon language. Keep customer names out of the global header and badge.

### Step 3: Write failing reminder-page tests

Prove:

- items group into today, one-to-seven, and eight-to-fourteen days;
- each card shows customer name, stored birth date, days remaining, and customer-detail link;
- Admin sees branch labels;
- Staff/Manager do not receive cross-branch data from the provider contract;
- clicking `ອວຍພອນແລ້ວ` waits for success;
- failure keeps the card and shows an accessible error;
- loading and empty states are clear.

### Step 4: Implement the lazy route and page

Add the protected `/birthdays` route in `src/App.jsx`. Reuse existing `Navbar`, card, button, and spacing primitives rather than introducing a second design system.

### Step 5: Add responsive styles and guards

Keep the header usable at 360 px, prevent badge overlap, and make reminder actions wrap safely. Add a focused CSS source contract only for important non-regression behavior.

### Step 6: Run focused tests and commit

```powershell
npx.cmd vitest run src/components/Navbar.test.jsx src/birthdays/BirthdayRemindersPage.test.jsx src/styles/screens.test.js
git diff --check
git add src/components/Navbar.jsx src/components/Navbar.test.jsx src/birthdays/BirthdayRemindersPage.jsx src/birthdays/BirthdayRemindersPage.test.jsx src/App.jsx src/styles/screens.css src/styles/screens.test.js
git commit -m "feat: add VIP birthday reminder center"
```

---

## Task 8: Full verification and independent diff review

**Files:**

- Review all changed files; modify only to fix verified findings.

### Step 1: Run all root checks

```powershell
npm.cmd run lint
npm.cmd test
npm.cmd run build
git diff --check
```

Record exact file/test totals and warnings.

### Step 2: Run all Functions checks

```powershell
npm.cmd --prefix functions test
npm.cmd --prefix functions run lint
```

### Step 3: Run Rules emulator checks

```powershell
$env:PATH='C:\Program Files\Android\Android Studio\jbr\bin;' + $env:PATH
npm.cmd run test:rules
```

### Step 4: Review the complete branch diff

```powershell
git status --short
git diff main...HEAD --stat
git diff main...HEAD --check
git diff main...HEAD
git stash list
```

Confirm:

- no customer IDs, Auth UIDs, branch fields, stored Activity enums, or image contracts changed;
- no Storage Rules, Auth/PWA, webhook, or unrelated UI files changed;
- `birthDate` is stored as `DD-MM-YYYY` and is not parsed by native locale behavior;
- acknowledgment remains server-controlled and branch-scoped;
- no scheduled notification writes or push infrastructure appeared;
- Activity Today behavior is Laos-time correct;
- the preexisting localization stash remains untouched.

Use `superpowers:requesting-code-review` for an independent review and fix all Critical or Important findings. Then use `superpowers:verification-before-completion` and rerun the affected checks after the last fix.

### Step 5: Create a final verification commit only if needed

If review requires corrections, commit only the verified fixes with a focused message. Finish with a clean working tree.

---

## Task 9: Prepare the production release gate

Production mutation is not part of plan execution unless the user explicitly authorizes it after reviewing verification evidence.

When authorized, use this dependency order:

1. Capture the current production baseline, Function inventory, active Rules source/ruleset, and frontend rollback reference.
2. Deploy only `functions:acknowledgeBirthdayGreeting`.
3. Run authenticated success and cross-branch/unauthenticated denial checks without exposing customer PII.
4. Deploy the reviewed Firestore Rules; do not deploy Storage Rules.
5. Verify existing customer and activity actor matrices remain valid.
6. Push the reviewed feature branch through the repository's approved integration path.
7. Deploy the frontend through the project's active hosting provider.
8. Verify at 360 px and desktop: Today/All/Custom filters, customer create/edit/clear birth date, bell count, reminder groups, branch scoping, and acknowledgment.
9. Confirm no customer migration or unrelated production mutation occurred.

Rollback sources must be captured before each mutation. If Rules or Function verification fails, stop before frontend rollout.
