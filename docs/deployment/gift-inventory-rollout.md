# Gift Inventory Production Rollout

This runbook is for the reviewed gift-inventory release on Firebase project
`crm-web-app-97b91` and the Vercel production site `https://crm.keotasystem.com`.
It is intentionally backend-first. This documentation task itself did not
mutate, push, merge, or deploy anything; the later production steps below are
human-approved actions. A human release owner must approve every section
labelled **REQUIRES HUMAN APPROVAL**. No step enables APIs or runs a Notion
migration.

The release is additive: existing CRM data is preserved and gift documents are
created only by the reviewed workflows. Initial gift catalog/stock data is a
manual, additive initialization after the release. There is no Notion migration.

## Release inventory

The 13 reviewed gift callable Functions are:

`createGiftItem`, `updateGiftItem`, `createGiftCampaign`, `updateGiftCampaign`,
`setGiftLowStockThreshold`, `receiveGiftStock`, `createGiftAllocation`,
`confirmGiftAllocation`, `cancelGiftAllocation`, `adjustGiftStock`,
`recordGiftDistribution`, `amendGiftDistribution`, `cancelGiftDistribution`.

The eight new composite indexes, recorded exactly as manifest entries, are:

1. `giftItems`: `active ASCENDING`, `sortOrder ASCENDING`.
2. `giftCampaigns`: `branchId ASCENDING`, `active ASCENDING`,
   `startDate DESCENDING`.
3. `branchGiftStocks`: `branchId ASCENDING`, `giftId ASCENDING`.
4. `giftDistributions`: `createdBy ASCENDING`, `dateKey DESCENDING`.
5. `giftDistributions`: `branchId ASCENDING`, `dateKey DESCENDING`.
6. `giftStockMovements`: `distributionOwnerUid ASCENDING`,
   `dateKey DESCENDING`.
7. `giftStockMovements`: `branchId ASCENDING`, `dateKey DESCENDING`.
8. `giftAllocations`: `targetBranchId ASCENDING`, `status ASCENDING`,
   `createdAt DESCENDING`.

All existing indexes in `firestore.indexes.json` remain in the file and must
remain deployed. Firestore Rules change in this release;
Storage Rules do not change and must not be deployed by this runbook.

## Preflight — SAFE READ-ONLY

Run from the reviewed worktree. Save command output with the release record.

```powershell
git status --short --branch
git rev-parse HEAD
if (git status --porcelain) { throw 'STOP: working tree, index, or untracked files are not clean' }
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

### Capture current deployed Rules — SAFE READ-ONLY

In authenticated Google Cloud Shell, perform this **SAFE READ-ONLY** capture
of the currently deployed Firestore Rules release and immutable ruleset source
before deployment. Save the JSON files and SHA-256 output with the release
record:

```bash
set -euo pipefail
ACCESS_TOKEN="$(gcloud auth print-access-token)"
trap 'unset ACCESS_TOKEN' EXIT
test -n "$ACCESS_TOKEN"
curl -fsS -H "Authorization: Bearer $ACCESS_TOKEN" \
  "https://firebaserules.googleapis.com/v1/projects/crm-web-app-97b91/releases/cloud.firestore" \
  > prior-firestore-release.json
rulesetName="$(jq -er '.rulesetName | select(type == "string" and length > 0)' prior-firestore-release.json)"
test -n "$rulesetName"
curl -fsS -H "Authorization: Bearer $ACCESS_TOKEN" \
  "https://firebaserules.googleapis.com/v1/$rulesetName" \
  > prior-firestore-ruleset.json
jq -e --arg rulesetName "$rulesetName" '
  (.name == $rulesetName)
  and (.source.files | (type == "array" and length > 0))
  and (all(.source.files[];
    (.name | type == "string" and length > 0)
    and (.content | type == "string")))
' prior-firestore-ruleset.json
sha256sum prior-firestore-release.json prior-firestore-ruleset.json \
  | tee prior-firestore-sha256.txt
unset ACCESS_TOKEN
```

The access token is assigned without printing or persisting it, is used only
for these GETs, and is unset immediately afterward. Preserve
`prior-firestore-release.json`, `prior-firestore-ruleset.json`, and
`prior-firestore-sha256.txt` with the release record.

Expected evidence: the branch and reviewed commit are identified; the working
tree, index, and untracked-file status is empty (ignored build/cache artifacts
may exist); lint, all tests, Rules emulator tests, Functions tests, build, and
`git diff --check` exit 0. The Firebase project resolves to
`crm-web-app-97b91`, the Functions and deployed-index inventories are captured,
Rules source is captured, and Vercel inspect identifies the current production
release for `crm.keotasystem.com`.

The three command-syntax checks required for this runbook were attempted on
2026-09-15. `firebase.cmd use` and
`firebase.cmd functions:list --project crm-web-app-97b91` were blocked before
Firebase evaluation by local `EPERM` reading
`C:\Users\la250\.config\configstore\firebase-tools.json`. The Vercel command
`npx.cmd vercel inspect https://crm.keotasystem.com` attempted to install
`vercel@59.17.0` and could not complete in the restricted environment. These
are validation-environment limitations, not evidence of a production result;
the release owner must run the commands in an authenticated environment.

Stop if any quality command fails, the reviewed worktree is not hard-clean,
the commit is not the reviewed commit, the project/target is unexpected, the
deployed Rules release/ruleset or immutable SHA-256 cannot be captured, the
current production release cannot be captured, or any unreviewed file is about
to be deployed. Do not continue with a dirty tree even when a change appears
unrelated; resolve it in the approved workflow and repeat all preflight checks.

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

Expected evidence and required outcomes for every callable:

| Callable | Admin | Manager | Staff | Unauthenticated |
|---|---|---|---|---|
| `createGiftItem` | allowed | denied | denied | `unauthenticated` denied |
| `updateGiftItem` | allowed | denied | denied | `unauthenticated` denied |
| `createGiftCampaign` | allowed, any branch | allowed, own branch only | denied | `unauthenticated` denied |
| `updateGiftCampaign` | allowed, any branch | allowed, own branch only | denied | `unauthenticated` denied |
| `setGiftLowStockThreshold` | allowed, any branch | allowed, own branch only | denied | `unauthenticated` denied |
| `receiveGiftStock` | allowed, any branch | allowed, own branch only | denied | `unauthenticated` denied |
| `createGiftAllocation` | allowed | denied | denied | `unauthenticated` denied |
| `confirmGiftAllocation` | allowed, any target | allowed, target-own branch only | denied | `unauthenticated` denied |
| `cancelGiftAllocation` | allowed | denied | denied | `unauthenticated` denied |
| `adjustGiftStock` | allowed, any branch | allowed, own branch only | denied | `unauthenticated` denied |
| `recordGiftDistribution` | allowed for an explicit target branch | allowed, own branch only | allowed, approved own branch only | `unauthenticated` denied |
| `amendGiftDistribution` | allowed, any branch | allowed, own branch only | allowed, own distribution on same Laos date only | `unauthenticated` denied |
| `cancelGiftDistribution` | allowed, any branch | allowed, own branch only | allowed, own distribution on same Laos date only | `unauthenticated` denied |

For every `allowed` role above, a valid request must succeed within the listed
scope; an invalid or stale payload must instead return the reviewed validation
error (`invalid-argument` or `failed-precondition`). For every `denied` role,
authorization must fail first with `permission-denied` using a well-formed
payload; do not infer authorization behavior from a malformed request. Every
unauthenticated request must fail first with `unauthenticated`. Cross-branch
access is denied except an Admin operation with an explicit target permitted
by the contract.

Capture callable name, actor role, branch, request result/error code, and time.
Stop and roll back the Functions release if unauthenticated access succeeds,
any role crosses its branch boundary, a Staff account can perform a
management-only operation, an Admin lacks an explicit-target capability, or
errors reveal an unexpected authorization path.

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

Stop if any index is `CREATING`, `ERROR`, `NEEDS_REPAIR`, missing, or differs
from `firestore.indexes.json`. Do not proceed to Rules or frontend deployment
until all required indexes are READY. Record one READY evidence line for each
of the eight exact manifest entries listed in Release inventory.

### 4. Deploy reviewed Firestore Rules; do not deploy Storage Rules

```powershell
firebase.cmd deploy --only firestore:rules --project crm-web-app-97b91
```

Expected evidence: only Firestore Rules are released; the new ruleset/version
is captured; and the Rules source matches the reviewed `firestore.rules`. There
is no `storage` target in the command. **Do not deploy Storage Rules**: Storage
Rules are unchanged in this release.

The prior deployed Rules release was captured in preflight using the official
Rules REST API. Do not use an unvalidated `firebase firestore:rules` command as
evidence of the deployed release.

Stop on a Rules compile error, unexpected target, or any discrepancy between
the reviewed ruleset and deployed ruleset. The rollback owner must retain the
pre-release ruleset/version before proceeding.

## Manual catalog and stock initialization — REQUIRES HUMAN APPROVAL

After Functions, indexes, and Firestore Rules pass, initialize only the
approved gift catalog, campaigns, thresholds, and opening stock. Use the
reviewed production UI at `https://crm.keotasystem.com/gifts` or the reviewed
callables as Admin/Manager permits. Never write directly to Firestore and do
not run a Notion migration.

Expected evidence: each additive item/campaign/threshold/stock receipt has an
approved business owner, source reference, actor, branch, quantity, timestamp,
and resulting ledger/audit ID. Existing CRM documents are unchanged.

Stop if a requested initialization would overwrite/delete existing data, use a
direct Firestore write, cross a role/branch boundary, lack an audit/ledger ID,
or require Notion migration. Keep initialization reversible through the
reviewed adjustment/cancellation workflows.

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
| Desktop | Open `https://crm.keotasystem.com/gifts`; run permitted Admin flows; verify audit/ledger | Open route; run own-branch flows; verify cross-branch denial | Open route; run approved own-branch distribution flow; management controls hidden/denied | Route protected; all callables denied |
| Tablet | Same Admin checks at tablet breakpoint; verify responsive tables/forms | Same Manager checks; verify branch filters and dialogs | Same Staff checks; verify touch targets and no clipping | Protected route and denial intact |
| Mobile | Same Admin checks at mobile breakpoint; menus, forms, tables, validation, and touch targets usable | Same Manager checks; branch filters and confirmation dialogs usable | Same Staff checks; no horizontal clipping or inaccessible controls | Protected route and denial intact |

For each actor, verify refresh/reload persistence, low-stock threshold display,
stock movement/ledger evidence, allocation status transitions, and clear error
messages. Acceptance is complete only when every applicable cell passes.

Stop and do not announce release if any matrix cell fails, a role sees or
mutates another branch, ledger evidence is missing, a mobile control is
unusable, or Vercel is not READY.

## Rollback — REQUIRES HUMAN APPROVAL

Rollback is a human-approved incident action. First stop frontend traffic or
announce the incident according to the production incident process, then:

1. Restore the captured Functions source/version by checking out the approved
   prior release commit in the normal Git workflow. Compare the captured
   preflight and post-deploy inventories. Deploy every preexisting function
   from the captured prior inventory, and retire only the named gift functions
   that are absent from that preflight inventory. The only candidates for
   deletion are these 13 new callables: `createGiftItem`, `updateGiftItem`,
   `createGiftCampaign`, `updateGiftCampaign`, `setGiftLowStockThreshold`,
   `receiveGiftStock`, `createGiftAllocation`, `confirmGiftAllocation`,
   `cancelGiftAllocation`, `adjustGiftStock`, `recordGiftDistribution`,
   `amendGiftDistribution`, and `cancelGiftDistribution`. **REQUIRES HUMAN
   APPROVAL** before deploy or delete:

   ```powershell
   firebase.cmd deploy --only functions:<captured-prior-function-names> --project crm-web-app-97b91
   firebase.cmd functions:delete <new-gift-names-absent-from-preflight> --region asia-southeast1 --project crm-web-app-97b91 --force
   ```

2. Restore the captured Firestore Rules source/ruleset, then deploy only Rules
   if the reviewed prior source is the rollback artifact:

   ```powershell
   firebase.cmd deploy --only firestore:rules --project crm-web-app-97b91
   ```

   ### Restore the immutable Rules release — REQUIRES HUMAN APPROVAL

   The immutable deployed Rules release itself is restored with the official
   Rules REST API. In authenticated Google Cloud Shell, set
   `PRIOR_RULESET_NAME` to the exact `.rulesetName` captured from
   `prior-firestore-release.json`, then obtain a human approval before PATCH.
   Generate the official `projects.releases.patch` body into an evidence file;
   do not send a bare Release body or put `updateMask` only in the URL:

   ```bash
   set -euo pipefail
   test -n "${PRIOR_RULESET_NAME:-}"
   jq -n \
     --arg name "projects/crm-web-app-97b91/releases/cloud.firestore" \
     --arg rulesetName "$PRIOR_RULESET_NAME" \
     '{release:{name:$name,rulesetName:$rulesetName},updateMask:"rulesetName"}' \
     > rollback-firestore-release-patch.json
   ACCESS_TOKEN="$(gcloud auth print-access-token)"
   trap 'unset ACCESS_TOKEN' EXIT
   test -n "$ACCESS_TOKEN"
   curl -fsS -X PATCH \
     -H "Authorization: Bearer $ACCESS_TOKEN" \
     -H "Content-Type: application/json" \
     --data-binary @rollback-firestore-release-patch.json \
     "https://firebaserules.googleapis.com/v1/projects/crm-web-app-97b91/releases/cloud.firestore" \
     > rollback-firestore-release-patch-response.json
   jq -e \
     --arg expectedName "projects/crm-web-app-97b91/releases/cloud.firestore" \
     --arg priorRulesetName "$PRIOR_RULESET_NAME" \
     '.name == $expectedName and .rulesetName == $priorRulesetName' \
     rollback-firestore-release-patch-response.json
   curl -fsS -H "Authorization: Bearer $ACCESS_TOKEN" \
     "https://firebaserules.googleapis.com/v1/projects/crm-web-app-97b91/releases/cloud.firestore" \
     > rollback-firestore-release.json
   jq -e \
     --arg expectedName "projects/crm-web-app-97b91/releases/cloud.firestore" \
     --arg priorRulesetName "$PRIOR_RULESET_NAME" \
     '.name == $expectedName and .rulesetName == $priorRulesetName' \
     rollback-firestore-release.json
   rollbackRulesetName="$(jq -er '.rulesetName' rollback-firestore-release.json)"
   test "$rollbackRulesetName" = "$PRIOR_RULESET_NAME"
   sha256sum rollback-firestore-release.json | tee rollback-firestore-release-sha256.txt
   unset ACCESS_TOKEN
   ```

   Stop if the PATCH response fails, the release does not verify to the
   captured ruleset name, or the rollback evidence cannot be preserved.

3. Roll back Vercel to the exact captured prior production deployment URL:

   ```powershell
   npx.cmd vercel rollback <captured-prior-production-deployment-url>
   npx.cmd vercel rollback status crm-web-app
   npx.cmd vercel inspect https://crm.keotasystem.com
   ```

   Hobby plans may only allow rollback to the previous deployment; Pro and
   Enterprise plans may allow a specific eligible prior deployment. In either
   case, capture the exact prior production deployment URL during preflight.

4. Re-run unauthenticated denial, Admin/Manager/Staff checks, and the minimum
   desktop/tablet/mobile smoke matrix before reopening traffic.

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
