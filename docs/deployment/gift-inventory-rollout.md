# Gift Inventory Production Rollout

This runbook is for the reviewed gift-inventory release on Firebase project
`crm-web-app-97b91` and the Vercel production site `https://crm.keotasystem.com`.
It is intentionally backend-first. A human release owner must approve every
section labelled **REQUIRES HUMAN APPROVAL**. No step here enables APIs, changes
production, pushes or merges code, or runs a Notion migration.

The release is additive: existing CRM data is preserved and gift documents are
created only by the reviewed workflows. Initial gift catalog/stock data is a
manual, additive initialization after the release. There is no Notion migration.

## Release inventory

The 13 reviewed gift callable Functions are:

`createGiftItem`, `updateGiftItem`, `createGiftCampaign`, `updateGiftCampaign`,
`setGiftLowStockThreshold`, `receiveGiftStock`, `createGiftAllocation`,
`confirmGiftAllocation`, `cancelGiftAllocation`, `adjustGiftStock`,
`recordGiftDistribution`, `amendGiftDistribution`, `cancelGiftDistribution`.

The eight new composite indexes are for `giftItems`, `giftCampaigns`,
`branchGiftStocks`, two `giftDistributions`, two `giftStockMovements`, and
`giftAllocations`; all existing indexes in `firestore.indexes.json` remain in
the file and must remain deployed. Firestore Rules change in this release;
Storage Rules do not change and must not be deployed by this runbook.

## Preflight — SAFE READ-ONLY

Run from the reviewed worktree. Save command output with the release record.

```powershell
git status --short --branch
git rev-parse HEAD
git diff --check
npm.cmd run lint
npm.cmd test
npm.cmd run test:rules
npm.cmd run test:functions
npm.cmd run build
firebase.cmd use
firebase.cmd functions:list --project crm-web-app-97b91
firebase.cmd firestore:indexes --project crm-web-app-97b91
npx.cmd vercel inspect https://crm.keotasystem.com
Get-Content -Raw firestore.rules
Get-Content -Raw firestore.indexes.json
```

Expected evidence: the branch and reviewed commit are identified; status is
clean (or any intentional local change is recorded); lint, all tests, Rules
emulator tests, Functions tests, build, and `git diff --check` exit 0. The
Firebase project resolves to `crm-web-app-97b91`, the Functions inventory and
index inventory are captured, Rules source is captured, and Vercel inspect
identifies the current production release for `crm.keotasystem.com`.

The three command-syntax checks required for this runbook were attempted on
2026-09-15. `firebase.cmd use` and
`firebase.cmd functions:list --project crm-web-app-97b91` were blocked before
Firebase evaluation by local `EPERM` reading
`C:\Users\la250\.config\configstore\firebase-tools.json`. The Vercel command
`npx.cmd vercel inspect https://crm.keotasystem.com` attempted to install
`vercel@59.17.0` and could not complete in the restricted environment. These
are validation-environment limitations, not evidence of a production result;
the release owner must run the commands in an authenticated environment.

Stop if any quality command fails, the commit is not the reviewed commit, the
project/target is unexpected, the current production release cannot be
captured, or any unreviewed file is about to be deployed.

## Backend deployment — REQUIRES HUMAN APPROVAL

### 1. Deploy only the reviewed gift Functions

After preflight evidence is approved, deploy exactly these 13 functions:

```powershell
firebase.cmd deploy --only functions:createGiftItem,functions:updateGiftItem,functions:createGiftCampaign,functions:updateGiftCampaign,functions:setGiftLowStockThreshold,functions:receiveGiftStock,functions:createGiftAllocation,functions:confirmGiftAllocation,functions:cancelGiftAllocation,functions:adjustGiftStock,functions:recordGiftDistribution,functions:amendGiftDistribution,functions:cancelGiftDistribution --project crm-web-app-97b91
firebase.cmd functions:list --project crm-web-app-97b91
```

Expected evidence: deploy completes successfully; the output names only the
13 gift callables above; each is deployed in region `asia-southeast1`; and a
post-deploy `functions:list` snapshot is saved. Do not use `--only functions`
without the individual names.

Stop immediately on a failed deploy, an unexpected function name/region, or a
request to deploy Storage Rules or unrelated Functions. Preserve the captured
pre-release inventory for rollback.

### 2. Verify authentication and roles in a controlled test window

Use a disposable test customer/account or an approved test record. Invoke each
callable through the production client/test harness with no Firebase Auth
token, then with approved Admin, Manager, and Staff accounts. Do not use real
customer data for destructive test payloads.

Expected evidence and required outcomes:

| Actor | Unauthenticated | Admin | Manager | Staff |
|---|---|---|---|---|
| Every callable | `unauthenticated` denial | permitted only for the documented operation scope | permitted only for branch/operation scope | permitted only for documented staff operations; management-only writes denied |
| Cross-branch access | denied | denied unless the reviewed Admin scope explicitly permits it | denied | denied |
| Invalid/stale payload | `invalid-argument` or `failed-precondition` | same validation | same validation | same validation |

Capture callable name, actor role, branch, request result/error code, and time.
Stop and roll back the Functions release if unauthenticated access succeeds,
any role crosses its branch boundary, a Staff account can perform a
management-only operation, or errors reveal an unexpected authorization path.

### 3. Deploy indexes and wait for READY

```powershell
firebase.cmd deploy --only firestore:indexes --project crm-web-app-97b91
firebase.cmd firestore:indexes --project crm-web-app-97b91
```

Confirm every required composite index is `READY` before continuing. The
captured inventory must show all eight gift indexes plus the preserved existing
indexes. If the Firebase CLI does not expose state in the current version, use
the Firebase Console's Firestore Indexes page for the same project and capture
the READY evidence; do not infer readiness from a successful submit.

Stop if any index is `CREATING`, `ERROR`, missing, or differs from
`firestore.indexes.json`. Do not proceed to Rules or frontend deployment until
all required indexes are READY.

### 4. Deploy reviewed Firestore Rules; do not deploy Storage Rules

```powershell
firebase.cmd deploy --only firestore:rules --project crm-web-app-97b91
firebase.cmd firestore:rules --project crm-web-app-97b91
```

Expected evidence: only Firestore Rules are released; the ruleset/version is
captured; and the Rules source matches the reviewed `firestore.rules`. There is
no `storage` target in the command. **Do not deploy Storage Rules**: Storage
Rules are unchanged in this release.

Stop on a Rules compile error, unexpected target, or any discrepancy between
the reviewed ruleset and deployed ruleset. The rollback owner must retain the
pre-release ruleset/version before proceeding.

## Frontend deployment — REQUIRES HUMAN APPROVAL

### 1. Integrate through the approved Git workflow

Push the reviewed branch to `main` only after backend evidence and the release
owner's approval. This runbook does not authorize push or merge.

```powershell
git push origin codex/gift-inventory-tracking
```

Use the repository's approved pull-request/merge workflow to update `main`.
Do not push directly if branch protection requires review.

### 2. Wait for Vercel production READY and verify the site

```powershell
npx.cmd vercel inspect https://crm.keotasystem.com
npx.cmd vercel ls
```

Expected evidence: the production deployment is `READY`, points to the
approved `main` commit, and `https://crm.keotasystem.com` loads the reviewed
gift route without console or network errors. Do not treat a queued,
building, failed, or superseded deployment as production success.

### 3. Complete actor and device acceptance matrix

Run the matrix against the production site with test accounts and a test
branch. Record URL, browser/device, actor, operation, expected result, actual
result, timestamp, and screenshot or request evidence.

| Surface | Admin | Manager | Staff | Unauthenticated |
|---|---|---|---|---|
| Desktop | Open gift route; create/update item and campaign; receive/adjust stock; approve/cancel allocations; record/amend/cancel distribution; verify audit/ledger | Open route; perform assigned branch catalog/stock/allocation/distribution operations; verify cross-branch denial | Open route; perform staff-allowed allocation/distribution flow; verify management-only controls hidden and callable denied | Route is protected; callable returns `unauthenticated`; no gift data is shown |
| Mobile | Same permitted Admin flow at mobile breakpoint; menus, forms, tables, validation, and touch targets usable | Same Manager checks at mobile breakpoint; branch filters and confirmation dialogs usable | Same Staff checks at mobile breakpoint; no horizontal clipping or inaccessible submit/cancel controls | Protected route and denial remain intact on mobile |

For each actor, verify refresh/reload persistence, low-stock threshold display,
stock movement/ledger evidence, allocation status transitions, and clear error
messages. Acceptance is complete only when every applicable cell passes.

Stop and do not announce release if any matrix cell fails, a role sees or
mutates another branch, ledger evidence is missing, a mobile control is
unusable, or Vercel is not READY.

## Rollback

Rollback is a human-approved incident action. First stop frontend traffic or
announce the incident according to the production incident process, then:

1. Restore the captured Functions source/version by checking out the approved
   prior release commit in the normal Git workflow and deploying only the
   previously captured Function names:

   ```powershell
   firebase.cmd deploy --only functions:<captured-prior-function-names> --project crm-web-app-97b91
   ```

2. Restore the captured Firestore Rules source/ruleset, then deploy only Rules:

   ```powershell
   firebase.cmd deploy --only firestore:rules --project crm-web-app-97b91
   ```

3. Roll back Vercel to the captured production release using the approved
   Vercel dashboard or CLI workflow, then verify:

   ```powershell
   npx.cmd vercel inspect https://crm.keotasystem.com
   ```

4. Re-run unauthenticated denial, Admin/Manager/Staff checks, and the minimum
   desktop/mobile smoke matrix before reopening traffic.

Do not delete gift documents, stock movements, allocations, or distributions
automatically during rollback. Preserve ledger and audit evidence. Data is
additive and remains available for investigation; any corrective data change
requires a separately approved, reversible operation. Indexes normally remain
in place during rollback; remove an index only through a separately approved
change after confirming no retained query depends on it.

## Release acceptance record

The release owner signs off only when preflight, Functions, authorization,
index READY, Firestore Rules, Vercel READY, and the full role/device matrix
have captured evidence. Record the reviewed commit, Firebase project,
Functions deployment timestamp, Ruleset ID, index READY timestamp, Vercel
deployment ID/URL, test-account IDs (not credentials), and approver names.
