# CRM Pre-deployment Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the code, tooling, security-test, localization, and documentation blockers found during Step 7 without mutating or deploying production resources.

**Architecture:** Keep migration classification pure and make apply recovery explicit; keep Auth claims backup/restore in isolated CLI tools backed by deterministic artifact helpers; centralize UI display labels without changing persisted enums; harden the trusted webhook adapter through dependency-injected network tests. Production-only actions remain documented gates.

**Tech Stack:** Node.js 22, React 19, Vitest, Node test runner, Firebase Admin SDK, Firebase Web SDK, Firebase Emulator Suite.

**Spec:** `docs/superpowers/specs/2026-08-25-integrated-crm-upgrade-design.md` plus the approved Step 7B remediation request.

## Global Constraints

- Do not deploy Hosting, Rules, Functions, indexes, or CORS.
- Do not enable APIs, change billing/IAM, set production claims, bootstrap Admin, or run migration `--apply`.
- Preserve `stash@{0}` until its intended Lao regression coverage is committed.
- New production behavior must be preceded by a focused failing test.
- Persisted roles, account statuses, activity types, and activity statuses remain unchanged.
- No real legacy webhook endpoint may be called by tests.

---

### Task 1: Migration classification and rerun safety

**Files:**
- Modify: `scripts/migration/core.mjs`
- Modify: `scripts/migration/core.test.js`

**Interfaces:**
- Consumes: legacy and canonical user/customer snapshots.
- Produces: `migrateUser(user)` and `migrateCustomer(customer)` results with stable IDs, patches, canonical access state, and fail-closed conflicts.

- [ ] Add literal table-driven tests for legacy, Pending, Disabled, Staff, Branch Manager, Admin, invalid combinations, unchanged customer IDs, and unchanged UIDs.
- [ ] Run `npm.cmd test -- scripts/migration/core.test.js` and record the expected classifier failures.
- [ ] Implement canonical-state validation: Admin requires null branch; Staff/Manager require a known branch; Pending requires null role/branch; Disabled retains a valid canonical role/branch; legacy `branch == "Admin"` remains blocked.
- [ ] Re-run the focused test and the complete Vitest suite.
- [ ] Commit as `fix: make CRM migration idempotent`.

### Task 2: Partial migration claim recovery

**Files:**
- Create: `scripts/migration/apply.mjs`
- Create: `scripts/migration/apply.test.js`
- Modify: `scripts/migrate.mjs`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: a validated snapshot and injected Firestore/Auth services.
- Produces: `applyMigration(snapshot, services, options)` with per-UID profile/claim outcomes and a private recovery artifact on claim failure.

- [ ] Add failing tests for profile-write success followed by claim failure, recovery artifact contents, rerun repair, no duplicate profile creation, and no role escalation.
- [ ] Run the focused tests and record RED.
- [ ] Extract apply logic, derive claims only from a validated canonical state, write Firestore first, record claim failures, and throw only after the remediation evidence is durable.
- [ ] Re-run focused and migration suites; confirm a canonical Admin created after migration remains clean on later dry-runs.
- [ ] Commit with Task 1 or as `fix: record recoverable migration claim failures`.

### Task 3: Auth claims snapshot tool

**Files:**
- Create: `scripts/auth-claims/core.mjs`
- Create: `scripts/auth-claims/core.test.js`
- Create: `scripts/snapshot-auth-claims.mjs`
- Modify: `.gitignore`

**Interfaces:**
- Produces: deterministic `serializeClaimsArtifact`, `digestClaimsPayload`, and read-only `snapshotAuthClaims` helpers.

- [ ] Add failing tests for sorted UID/claim serialization, fixed-clock digest, source project metadata, empty claims, and absence of Auth mutation calls.
- [ ] Run focused tests and record RED.
- [ ] Implement paginated reads, canonical JSON, SHA-256, timestamp metadata, JSON output, and `.sha256` sidecar under a Git-ignored private artifact path.
- [ ] Re-run focused tests.
- [ ] Commit as `feat: add auth claims rollback tooling` together with Task 4.

### Task 4: Guarded Auth claims restore tool

**Files:**
- Modify: `scripts/auth-claims/core.mjs`
- Modify: `scripts/auth-claims/core.test.js`
- Create: `scripts/restore-auth-claims.mjs`

**Interfaces:**
- Produces: `validateClaimsArtifact`, `planClaimsRestore`, `assertRestoreApplyGuard`, and `applyClaimsRestore`.

- [ ] Add failing tests for dry-run, digest mismatch, project mismatch, malformed/duplicate UID records, exact restore plan, complete apply guard, and partial failures.
- [ ] Run focused tests and record RED.
- [ ] Implement dry-run default, exact project/digest checks, explicit UID-only restore, exact custom-claims replacement, plan-before-apply output, and partial-failure evidence.
- [ ] Re-run focused and complete script tests.
- [ ] Commit as `feat: add auth claims rollback tooling`.

### Task 5: Storage CORS and Rules coverage

**Files:**
- Modify: `storage.cors.json`
- Create: `tests/storage.cors.test.js`
- Modify: `tests/rules/storage.rules.test.js`

**Interfaces:**
- CORS supports authenticated reads plus Firebase Web SDK uploads and the existing owner-only abandoned-avatar cleanup.

- [ ] Add a failing static CORS behavior test for exact origins, GET/HEAD/POST/PUT/DELETE, and no wildcard.
- [ ] Add failing emulator assertions for anonymous and disabled managed-image reads.
- [ ] Run focused static test and Rules suite to record RED.
- [ ] Add only the methods required by `getBlob`, `uploadBytes`, and the existing avatar `deleteObject` cleanup; seed a disabled profile in the emulator fixture.
- [ ] Re-run the focused tests and Rules suite.
- [ ] Commit as `fix: complete storage CORS and security coverage`.

### Task 6: Legacy image transition documentation

**Files:**
- Create: `docs/security/legacy-image-transition.md`

**Interfaces:**
- Documents compatibility acceptance, reference mapping, controlled migration, rollback/token implications, verification, and zero-data-loss constraints.

- [ ] Document Options A/B/C and Storage Rules limitations.
- [ ] Recommend staged mapping followed by controlled copy/reference verification.
- [ ] Mark the unresolved choice exactly `USER SECURITY DECISION REQUIRED`.
- [ ] Commit with Task 5.

### Task 7: Trusted legacy webhook hardening

**Files:**
- Modify: `functions/src/legacyWebhook.js`
- Create: `functions/test/legacyWebhook.test.js`

**Interfaces:**
- `syncLegacyCustomerOperation(services, actor, data, webhookUrl, options?)` accepts an injected `fetchImpl` and finite timeout for tests.

- [ ] Add failing tests for missing secret, 2xx, non-2xx, network error, abort timeout, literal payload, and `reason` preservation.
- [ ] Verify the old client payload fields from the rollback branch and confirm the real endpoint is never referenced by the test.
- [ ] Run `npm.cmd --prefix functions test` and record RED.
- [ ] Implement AbortController timeout with `finally` cleanup and add only `reason` to the established payload.
- [ ] Re-run focused and complete Functions tests.
- [ ] Commit as `test: harden trusted legacy webhook`.

### Task 8: Lao Activity display labels

**Files:**
- Restore from stash: `src/activities/ActivityForm.test.jsx`, `src/activities/ActivityCard.test.jsx`, `src/shared/constants.test.js`
- Modify: `src/shared/constants.js`
- Modify: Activity UI consumers with verified raw enum leakage.
- Add/modify focused React tests only for consumer-visible leakage.

**Interfaces:**
- Produces label maps/helpers for activity type/status, role, account status, and follow-up buckets while retaining original internal values.

- [ ] Apply (do not pop/drop) `stash@{0}` and inspect every restored assertion.
- [ ] Run the three restored tests and record RED.
- [ ] Keep behavior-based assertions; discard guessed helper architecture when it does not test user-visible behavior.
- [ ] Implement centralized labels and use them in Activity Form/Card/list/detail/calendar/customer activity rows plus obvious Profile/Admin role/status surfaces.
- [ ] Assert submitted/stored values remain `customer_visit`, `planned`, and other original enums.
- [ ] Re-run focused and full UI suites.
- [ ] Commit as `fix: localize activity display labels`.

### Task 9: Deployment and rollback documentation

**Files:**
- Modify: `docs/deployment/production-checklist.md`

**Interfaces:**
- Defines production gates, dependency-safe order, evidence captures, and non-destructive rollback limits.

- [ ] Replace the old Admin-before-migration sequence with backup → claims snapshot → prerequisites → trusted layer → migration → verification → Admin → indexes → Rules → Hosting.
- [ ] Capture required Hosting, Rules, CORS, Functions, indexes, branch/customer/user digest, Firestore export, and claims artifact evidence.
- [ ] State Firestore import semantics, separate claims restore, Pending-profile review, and managed/legacy image audit requirements.
- [ ] Commit as `docs: harden production deployment rollback plan`.

### Task 10: Verification, production dry-run, and independent review

**Files:**
- Review all changed files; do not add production artifacts.

**Interfaces:**
- Produces command evidence and a review-clean remediation branch.

- [ ] Run lint, Vitest, Functions tests, Rules emulator tests with Android Studio JBR, build, `git diff --check`, and every focused script test.
- [ ] Run only `node scripts/migrate.mjs --project crm-web-app-97b91` and save no PII; never pass `--apply`.
- [ ] Dispatch an independent complete-diff review for destructive behavior, idempotency, Admin inference, claims safety, CORS, webhook, enums, legacy risk, and rollback gaps.
- [ ] Fix every Critical/Important finding and re-run affected/full verification.
- [ ] Commit remaining focused changes, confirm `stash@{0}` remains, and report final HEAD/status.
