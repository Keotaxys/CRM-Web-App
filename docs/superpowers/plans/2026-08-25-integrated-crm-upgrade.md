# Integrated CRM Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the existing production CRM codebase with secure account lifecycle, branch-scoped customers, unified activities, follow-up, admin workflows, managed images, trusted operations, rules, and dry-run migration tooling without deploying or mutating production.

**Architecture:** The React SPA uses centralized domain constants, pure policy/validation modules, Firebase service adapters, and guarded routes. Firestore/Storage Rules enforce claim-based branch access; callable Functions own sensitive operations. Migration extends existing documents in place and defaults to aggregate-only dry-run.

**Tech Stack:** React 19, React Router 7, Vite 8, Firebase Web SDK 12, Firebase Cloud Functions/Admin SDK, Firestore/Storage/Auth emulators, Vitest, React Testing Library, Tailwind CSS.

**Spec:** `docs/superpowers/specs/2026-08-25-integrated-crm-upgrade-design.md`

## Global Constraints

- Preserve existing customer IDs, Firebase Auth UIDs, branch codes, customer fields, statuses, images, GPS URLs, webhook contract, cards, quick actions, and mobile-first behavior.
- Do not deploy Hosting, Functions, Firestore Rules, Storage Rules, indexes, or production migrations.
- Do not mutate production data or Auth users.
- Migration and Admin bootstrap tools default to dry-run and require explicit apply/project confirmation.
- Customer Visit history belongs in `activities`; do not synthesize visits from legacy customer status timestamps.
- Admin privilege comes only from verified server-controlled custom claims.
- Exactly two customer CRM image slots remain.

---

### Task 1: Test and configuration foundation

**Files:** Modify `package.json`, `vite.config.js`, `firebase.json`, `.gitignore`; create `src/test/setup.js`, `tests/fixtures/legacy-snapshot.json`.

**Interfaces:** Produces `npm test`, `npm run test:rules`, `npm run migrate:dry-run`, and emulator configuration used by every later task.

- [ ] Add Vitest, Testing Library, Rules Unit Testing, Firebase Tools, and jsdom development dependencies plus test scripts.
- [ ] Run the empty/foundation test command and record the expected initial failure caused by missing test modules.
- [ ] Add Vitest setup and Firebase emulator port configuration.
- [ ] Run `npm test` and confirm the foundation executes without configuration errors.

### Task 2: Canonical constants, branches, permissions, and validation

**Files:** Create `src/shared/constants.js`, `src/branches/branches.js`, `src/shared/permissions.js`, `src/shared/validation.js`, `src/shared/followUp.js`; tests under `src/shared/*.test.js` and `src/branches/*.test.js`.

**Interfaces:** Produces `ROLES`, `ACCOUNT_STATUSES`, `ACTIVITY_TYPES`, `ACTIVITY_STATUSES`, `CUSTOMER_STATUSES`, `PRIORITIES`, `BRANCHES`, `branchIdFromLegacy`, `can*` policy functions, `validateActivity`, and `bucketFollowUp`.

- [ ] Write failing tests for exact legacy branch mappings, role/account guards, customer/activity permissions, assignment limits, visit/customer validation, and follow-up date buckets.
- [ ] Run focused tests and verify failures are missing exports/behavior.
- [ ] Implement the smallest pure modules that satisfy the matrix.
- [ ] Run focused and full tests; keep all tests green.

### Task 3: Central authentication and protected routes

**Files:** Replace `src/context/AuthContext.jsx`; create `src/auth/ProtectedRoute.jsx`, `src/auth/AdminRoute.jsx`, `src/auth/PendingPage.jsx`, `src/auth/DisabledPage.jsx`; modify `src/pages/Login.jsx`, `src/pages/Profile.jsx`, `src/App.jsx`.

**Interfaces:** `useAuth()` returns `{user, profile, claims, state, loading, refreshProfile, logout}` where state is `anonymous|pending|disabled|approved`; registration creates a pending profile.

- [ ] Write failing component tests for anonymous redirect, pending/disabled isolation, approved access, Admin guard, and pending registration profile shape.
- [ ] Verify failures before replacing the empty Auth Context.
- [ ] Implement auth observation, claim/profile loading, registration, guards, and personal-only Profile UI.
- [ ] Run auth tests and verify route aliases remain resolvable.

### Task 4: Customer compatibility model and branch-scoped service

**Files:** Create `src/customers/customerModel.js`, `src/services/customersService.js`, `src/services/webhookService.js`; tests beside models/services.

**Interfaces:** `normalizeCustomer`, `customerCreatePayload`, `customerUpdatePayload`, `subscribeCustomers`, `getCustomer`, `createCustomer`, `updateCustomer`, `archiveCustomer`, `changeCustomerStatus`.

- [ ] Write failing tests proving legacy fields/status/GPS/images survive normalization and privileged customer fields cannot be client-mutated.
- [ ] Verify RED.
- [ ] Implement branch-scoped query construction and compatible create/update payloads with audit metadata.
- [ ] Verify tests and keep webhook calls behind a trusted callable adapter.

### Task 5: Managed image lifecycle

**Files:** Create `src/services/imageService.js`, `src/shared/imagePaths.js`; modify customer/profile forms; add tests.

**Interfaces:** `validateImageFile`, `compressImage`, `customerImagePath(customerId, slot)`, `profileImagePath(uid)`, `uploadManagedImage`.

- [ ] Write failing tests for two allowed slots, deterministic paths, MIME rejection, and 1 MB post-compression rejection.
- [ ] Verify RED.
- [ ] Implement client compression/validation and managed Storage upload paths while preserving legacy URLs.
- [ ] Verify tests; ensure no mass delete or legacy relocation logic exists.

### Task 6: Customer UI preservation and routed detail

**Files:** Create `src/customers/CustomersPage.jsx`, `CustomerDetailPage.jsx`, `CustomerForm.jsx`, `CustomerFilters.jsx`; modify `CustomerCard.jsx`, legacy Add/Edit pages, and routes.

**Interfaces:** Existing `/`, `/add`, `/edit/:id` remain compatible; canonical routes are `/customers`, `/customers/new`, `/customers/:id`, `/customers/:id/edit`.

- [ ] Write failing UI tests for search/status/priority, phone/WhatsApp/map actions, own-branch edit, and customer detail sections.
- [ ] Verify RED.
- [ ] Extract the existing card/detail/form behavior and connect it to the customer service.
- [ ] Run UI tests and ensure the legacy status values and two-photo design remain.

### Task 7: Activity policy, model, and trusted client service

**Files:** Create `src/activities/activityModel.js`, `src/services/activitiesService.js`; tests beside modules.

**Interfaces:** `normalizeActivity`, `activityPayload`, `subscribeActivities`, `subscribeCustomerActivities`, `saveActivity`, `cancelActivity`, `trashActivity`, `completeFollowUp`.

- [ ] Write failing tests for all three types, required/optional customer relationships, multiple assignees, statuses, audit metadata, and record state.
- [ ] Verify RED.
- [ ] Implement pure model/validation and callable-backed mutation service.
- [ ] Verify focused/full tests.

### Task 8: Activities, follow-up, and calendar UI

**Files:** Create `ActivitiesPage.jsx`, `ActivityFormPage.jsx`, `ActivityDetailPage.jsx`, `FollowUpCenter.jsx`, `CalendarPage.jsx`, and activity components/tests.

**Interfaces:** Routes `/activities`, `/activities/new/:type`, `/activities/:id`, `/follow-up`, `/calendar`; filters support type/scope/staff/status/date.

- [ ] Write failing UI tests for type filters, My/Branch scope, visit fields, optional Appointment/Event customer, follow-up buckets, and calendar grouping.
- [ ] Verify RED.
- [ ] Implement list/cards/forms/detail/follow-up/calendar using shared services.
- [ ] Verify UI tests.

### Task 9: Home, quick create, and responsive navigation

**Files:** Create `src/pages/Home.jsx`, `src/components/QuickCreate.jsx`; modify `BottomNav.jsx`, `Navbar.jsx`, `App.jsx`, CSS/tests.

**Interfaces:** Main navigation is Home, Customers, Activities, Calendar, More/Profile; Quick Create routes to four creation flows.

- [ ] Write failing navigation and dashboard tests.
- [ ] Verify RED.
- [ ] Implement branch-scoped work dashboard summaries and mobile quick-create sheet.
- [ ] Verify tests and no-horizontal-overflow assertions at representative widths.

### Task 10: Admin UI and trusted callable Functions

**Files:** Create `src/admin/AdminPage.jsx`, `src/services/adminService.js`; create `functions/package.json`, `functions/src/index.js`, `authz.js`, `validators.js`, `customerAdmin.js`, `activityAdmin.js`, `legacyWebhook.js`; tests under `functions/test`.

**Interfaces:** Callable operations: `approveUser`, `updateUserAccess`, `disableUser`, `upsertActivity`, `trashActivity`, `completeFollowUp`, `transferCustomer`, `restoreCustomer`, `permanentlyDeleteCustomer`, `permanentlyDeleteActivity`, `cleanupExpiredTrash`, `syncLegacyCustomer`.

- [ ] Write failing pure Functions tests for claim checks, branch restrictions, assignee validation, permanent-delete authorization, and trash retention.
- [ ] Verify RED.
- [ ] Implement callable wrappers around testable pure authorization and validation functions.
- [ ] Implement Admin Users/Branches/Trash views that invoke trusted operations.
- [ ] Run Functions and UI tests.

### Task 11: Firestore Rules, Storage Rules, and indexes

**Files:** Create `firestore.rules`, `storage.rules`, `firestore.indexes.json`, `tests/rules/firestore.rules.test.js`, `tests/rules/storage.rules.test.js`; modify `firebase.json`.

**Interfaces:** Claims expose `role`, `branchId`, `accountStatus`; pending/disabled are denied; activities are client-read/server-write.

- [ ] Write failing emulator tests for the complete actor matrix and image size/type/branch access.
- [ ] Verify RED against deny/default or absent rules.
- [ ] Implement claim helpers and resource-specific permissions, plus required indexes.
- [ ] Run emulator tests; if the environment lacks Java/emulator runtime, preserve tests and report the exact prerequisite rather than weakening rules.

### Task 12: Migration, Admin bootstrap, and orphan audit

**Files:** Create `scripts/migration/core.mjs`, `scripts/migrate.mjs`, `scripts/bootstrap-admin.mjs`, `scripts/audit-storage.mjs`, tests and fixture.

**Interfaces:** Default command is dry-run; apply requires `--apply --project X --confirm-project X` and `ALLOW_PRODUCTION_MIGRATION=X`; Admin bootstrap additionally requires matching UID confirmation.

- [ ] Write failing tests for legacy user/customer transforms, Admin conflict handling, idempotency, aggregate reporting, GPS/image coverage, and orphan detection.
- [ ] Verify RED.
- [ ] Implement pure transforms and guarded Admin SDK runners without logging PII.
- [ ] Run fixture dry-run and verify no write-capable path runs by default.

### Task 13: Integrated quality and deployment gate

**Files:** Update README and deployment checklist documentation only after commands produce evidence.

**Interfaces:** Final status is determined solely by fresh command output and unresolved prerequisites.

- [ ] Run `npm run lint` and fix all errors caused or touched by this work.
- [ ] Run `npm test` and record exact pass/fail counts.
- [ ] Run Rules emulator tests and record exact results or prerequisite blocker.
- [ ] Run Functions tests and migration fixture dry-run.
- [ ] Run `npm run build` and dependency audit.
- [ ] Run representative mobile browser checks for customer cards, filters, navigation, quick create, detail, activity form, and external quick actions.
- [ ] Review `git diff --check`, `git diff --stat`, Git status, and verify no deployment/apply occurred.
- [ ] Produce the A–L final report and stop before production deployment.

## Self-review

- Spec coverage: all 60 specification sections map to Tasks 1–13 or the production deployment gate.
- Placeholder scan: no implementation placeholders are used; unavailable production credentials/emulator runtime are explicit prerequisites rather than invented behavior.
- Type consistency: role/account/activity/status/record-state names match the approved design and are shared across client, Functions, Rules, and migration.

