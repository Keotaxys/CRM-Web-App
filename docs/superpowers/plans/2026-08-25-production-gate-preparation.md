# Production Gate Preparation Implementation Plan

> Execution scope: local code, tests, and documentation plus read-only production inspection. No production mutation or deployment is authorized.

**Goal:** Produce an evidence-backed, human-executable production runbook and a guarded, copy-first legacy-image migration tool for `crm-web-app-97b91`.

**Architecture:** Keep production actions outside this work item. The runbook binds every future mutation to a human approval, captured pre-change evidence, an expected result, a rollback point, and a stop condition. The image migration is a separate Admin SDK command that produces a deterministic reviewed plan in dry-run mode and, only with matching project/digest confirmations, copies one legacy object into a deterministic managed slot, verifies metadata/checksum, then writes only the managed Firestore path while retaining the source and legacy URL.

**Tech stack:** Node.js ESM, Firebase Admin SDK, Vitest, Firebase CLI/Google Cloud Shell commands, Markdown operator documentation.

---

## Task 1: Establish fresh evidence

- Verify the exact branch, commit, and clean tree.
- Run lint, unit, Functions, Rules emulator, build, diff-check, and the focused migration/Auth matrix.
- Run the live migration in read-only dry-run mode and compare all aggregate values with the Step 7B baseline.
- Inspect Firestore location, enabled service set, and Auth-only accounts without printing email addresses or full UIDs.

## Task 2: Add controlled legacy-image migration tooling with TDD

**Files:**

- Create `scripts/legacy-images/core.mjs`.
- Create `scripts/legacy-images/core.test.js`.
- Create `scripts/migrate-legacy-images.mjs`.
- Update `.gitignore` if a private plan/recovery path is not already covered.

**Red tests:** Prove customer-photo only, place-photo only, both slots, missing source, destination already verified, duplicate rerun, copy failure, Firestore update failure, checksum mismatch, partial success, and the invariant that source deletion is impossible.

**Implementation:**

- Parse only recognized Firebase/Google Storage legacy references.
- Build deterministic slot plans with source generation, size, MIME type, and checksum evidence.
- Default to dry-run and create a timestamped private plan plus SHA-256 sidecar.
- Apply only with explicit project, confirmation project, plan, digest, `--apply`, a no-source-delete confirmation, and `ALLOW_PRODUCTION_MIGRATION=<project>`.
- Use destination create preconditions; accept an existing destination only when verification matches.
- Verify copied metadata/checksum before updating `imageStoragePath` or `placeImageStoragePath`.
- Preserve `imageUrl`/`placeImageUrl` and never call delete.
- Emit resumable per-slot outcomes and a private partial-failure artifact.

## Task 3: Prepare external production gates

**Files:**

- Create/update `docs/deployment/production-runbook.md`.
- Update `docs/deployment/production-checklist.md` where the selected Option C sequence changes dependencies.
- Update `docs/security/legacy-image-transition.md` to record Option C as selected while retaining the remaining human decisions.

Document the freeze, Firestore export/restore, Auth claims snapshot/restore, Storage recovery choice, exact required APIs, pre-deploy Functions inventory, CORS capture/apply/verify/rollback, webhook stub-to-production secret sequence, Auth-only decisions, Admin selection, index readiness, Rules/Hosting deployment and rollback, image retirement, complete dependency order, and the actor/device acceptance matrix.

Mark every command `SAFE READ-ONLY` or `REQUIRES HUMAN APPROVAL`, and give each mutation an expected result, rollback point, and stop condition.

## Task 4: Verify and review

- Run the focused image-tool tests first.
- Re-run lint, full unit tests, Functions tests, Rules emulator tests, build, and `git diff --check` after all changes.
- Review the complete diff for production mutation, unsafe apply guards, source deletion, PII leakage, checksum bypass, dependency-order hazards, and rollback gaps.
- Commit only local tooling/documentation changes to `codex/predeploy-remediation`; do not merge, deploy, enable APIs, configure secrets/CORS, or mutate production data.
