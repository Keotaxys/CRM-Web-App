# CRM Web App production operator runbook

This runbook prepares a controlled deployment of the reviewed release content at commit `f942f75c71718c6a3c5c500b75ee48f226edf54d` to Firebase project `crm-web-app-97b91`. It is not deployment authorization.

## Approved release identity

| Item | Required value |
|---|---|
| Git branch | `codex/predeploy-remediation` |
| Reviewed release-content commit | `f942f75c71718c6a3c5c500b75ee48f226edf54d` |
| Deployment runbook HEAD | The current approved documentation-only descendant of the release-content commit; record its exact `git rev-parse HEAD` value in the release record |
| Starting remediation HEAD (historical only) | `412509def0bb7e0f891caf0177c8d18da1ac5599`; this is not the required current release HEAD |
| Firebase project | `crm-web-app-97b91` |
| Project number | `601560289578` |
| Firebase CLI principal | `keota.mar@gmail.com` |
| Firestore database/location | `(default)` / `asia-southeast1` (Singapore) |
| Storage bucket | `gs://crm-web-app-97b91.firebasestorage.app` |
| Functions runtime/region | Node.js 22 / `asia-southeast1` |
| Hosting site | `crm-web-app-97b91` |
| Recommended backup bucket | `gs://crm-web-app-97b91-prod-backups-601560289578` in `asia-southeast1` |

The deployment runbook HEAD is intentionally not hard-coded in this tracked file: doing so would make every documentation-only correction invalidate its own required hash. At approval time, record the current runbook HEAD externally and require it to contain the reviewed release-content commit as an ancestor. The committed delta after that release-content commit must be limited to the approved production runbook/checklist documentation.

The backup bucket name and its cost/retention configuration require human approval. If that globally unique name is unavailable, stop and record an approved replacement throughout this runbook before creating anything.

## Command safety labels

- **SAFE READ-ONLY**: reads production or local state and does not alter the Firebase/Google Cloud project.
- **SAFE LOCAL-ONLY**: creates local build/evidence files but does not alter production.
- **REQUIRES HUMAN APPROVAL — PRODUCTION MUTATION**: changes a Google/Firebase resource or production data. Never run it from this preparation task.

For every stop condition: keep the freeze active, preserve command output, do not improvise a broader rollback, and escalate to the named release owner.

## 1. Open the release record and start the freeze

Record the change ticket, named operator, reviewer, commit, project, UTC start time, browser test accounts, designated test Customer, and approved backup bucket. Announce a maintenance window and obtain an explicit acknowledgement from every operator who can use Firebase Console or production scripts.

The freeze means:

- no Customer create/edit/status/archive/trash;
- no Activity, Appointment, Event, Customer Visit, or Follow-up create/edit;
- no profile, role, branch, account-status, or Custom Claims change;
- no Customer/place/profile image upload, replacement, or deletion;
- no manual Firestore, Auth, Storage, Functions, Rules, index, CORS, API, billing, or secret changes;
- no Hosting or other production deployment.

Freeze phases are: announce and record start → operator confirmation → fresh baseline after freeze → backups → controlled migration/deployment → acceptance and evidence → monitoring decision → recorded freeze end.

**SAFE READ-ONLY**

```powershell
$releaseContentCommit='f942f75c71718c6a3c5c500b75ee48f226edf54d'
git status --short
git branch --show-current
$deploymentRunbookHead=git rev-parse HEAD
git merge-base --is-ancestor $releaseContentCommit HEAD
if ($LASTEXITCODE -ne 0) { throw 'Reviewed release-content commit is not an ancestor of HEAD.' }
git diff --quiet "$releaseContentCommit..HEAD" -- . ':(exclude)docs/deployment/production-runbook.md' ':(exclude)docs/deployment/production-checklist.md'
if ($LASTEXITCODE -ne 0) { throw 'HEAD contains non-documentation changes after the reviewed release-content commit.' }
Write-Output "DEPLOYMENT_RUNBOOK_HEAD=$deploymentRunbookHead"
firebase login:list
firebase use
```

Expected: clean tree; fixed branch; successful ancestor and content-delta checks; an externally approved `DEPLOYMENT_RUNBOOK_HEAD`; `keota.mar@gmail.com`; and `crm-web-app-97b91`.

Rollback point: none; no change occurred.

Stop if any value differs, the runbook HEAD is not the approved documentation-fix commit, the reviewed release-content commit is not an ancestor, any non-approved-document path changed after the release-content commit, more than one operator is actively changing production, or the freeze acknowledgement is incomplete.

## 2. Re-run local release verification

**SAFE LOCAL-ONLY**

```powershell
npm.cmd ci
npm.cmd run lint
npm.cmd test
npm.cmd run test:functions
$env:PATH='C:\Program Files\Android\Android Studio\jbr\bin;' + $env:PATH
npm.cmd run test:rules
npm.cmd run build
git diff --check
```

Expected: lint 0; unit/script tests 0; Functions tests 0; Rules emulator 0; build 0; diff-check empty. Record exact counts and warnings. The build artifact is `dist/`.

Rollback point: delete only the local regenerated `dist/` if necessary; production is unchanged.

Stop on any non-zero exit, changed Git state, or a build whose application/configuration source differs from the reviewed release-content commit.

## 3. Capture the post-freeze production baseline

**SAFE READ-ONLY (production) / SAFE LOCAL EVIDENCE WRITE**

```powershell
node scripts/capture-production-baseline.mjs crm-web-app-97b91
node scripts/migrate.mjs --project crm-web-app-97b91
```

Expected: the capture command creates a unique, create-new-only folder under `artifacts/private/production-baselines/`, including `inventory.json`, current Firestore/Storage Rules sources, release metadata, and a release-specific `firebase.rollback.json`. The dry-run must report zero conflicts and zero Firestore user documents without Auth accounts.

The 2026-08-25 preparation baseline was Customers 34, Firestore user documents 12, Auth users 15, Auth-only 3, Storage objects 73, referenced objects 58, potential orphans 15, legacy image references 34, legacy GPS 1, and branches `020,050,060,110,130,140`. Differences after the freeze must be explained and accepted; do not treat these values as immutable.

Rollback point: none; no production change occurred. Retain the newly printed baseline directory as `BASELINE_DIR`.

Stop on conflicts, unmatched Firestore user UID, unexplained count/ID/branch digest drift, Rules capture failure, or any write observed after freeze start.

## 4. Prepare and verify the dedicated backup bucket

The approved destination is intended to be `gs://crm-web-app-97b91-prod-backups-601560289578`, region `asia-southeast1`, with uniform bucket-level access and 30-day soft delete. It keeps backup permissions, CORS, lifecycle, and object inventory separate from the application bucket. Using the application bucket is technically possible for a same-project Firestore export, but is rejected for this release because an application-bucket incident, Rules/CORS mistake, or inventory operation could affect both live data and its backup.

**SAFE READ-ONLY**

```bash
gcloud storage buckets describe gs://crm-web-app-97b91-prod-backups-601560289578 --project=crm-web-app-97b91 --format=json
```

Expected: either the approved bucket exists in `ASIA-SOUTHEAST1` with the approved controls, or the command reports not found.

Rollback point: none.

**REQUIRES HUMAN APPROVAL — PRODUCTION MUTATION**

```bash
gcloud storage buckets create gs://crm-web-app-97b91-prod-backups-601560289578 \
  --project=crm-web-app-97b91 \
  --location=asia-southeast1 \
  --uniform-bucket-level-access \
  --soft-delete-duration=30d
```

Expected: exactly one dedicated bucket in Singapore; no public access.

Rollback point: do not delete a bucket that contains evidence. If creation is wrong, stop before writing it and obtain a separate deletion approval.

Stop if the name is owned by another project, the location differs, Requester Pays/Rapid mode is enabled, public access is possible, or the Firestore service agent cannot access the same-project bucket.

## 5. Create and verify the Firestore export

Firestore export requires billing/Blaze and a Cloud Storage bucket near the database. The selected bucket is in the same project and exact database region. The Firestore service agent is `service-601560289578@gcp-sa-firestore.iam.gserviceaccount.com`; same-project access is expected, but its policy evidence must still be captured.

**SAFE READ-ONLY**

```bash
gcloud projects get-iam-policy crm-web-app-97b91 \
  --flatten='bindings[].members' \
  --filter='bindings.members:service-601560289578@gcp-sa-firestore.iam.gserviceaccount.com' \
  --format=json
gcloud storage buckets describe gs://crm-web-app-97b91-prod-backups-601560289578 --format=json
```

Expected: service-agent evidence and the exact approved bucket location/configuration. Also confirm the Google Cloud Firestore Import/Export page identifies the same authorization principal.

Rollback point: none.

**REQUIRES HUMAN APPROVAL — PRODUCTION MUTATION (backup export)**

```bash
STAMP=$(date -u +%Y%m%d-%H%M%S)
EXPORT_URI="gs://crm-web-app-97b91-prod-backups-601560289578/firestore/predeploy-$STAMP"
OPERATION=$(gcloud firestore export "$EXPORT_URI" \
  --project=crm-web-app-97b91 \
  --database='(default)' \
  --async \
  --format='value(name)')
printf '%s\n' "$OPERATION" > firestore-export-operation.txt
printf '%s\n' "$EXPORT_URI" > firestore-export-uri.txt
```

Expected: a non-empty long-running operation name and recorded unique export URI. Because Firestore exports are not start-time snapshots, the freeze must remain active until completion.

Rollback point: no data was changed; a failed/partial export must never be imported. Retain or separately clean partial backup objects only under approval.

**SAFE READ-ONLY**

```bash
gcloud firestore operations describe "$OPERATION" --project=crm-web-app-97b91 --format=json | tee firestore-export-operation-final.json
gcloud storage ls --recursive "$EXPORT_URI/**"
```

Expected: operation `done: true`, no error, a response output URI prefix, and export metadata/object files at that URI. Store the URI and final operation JSON in the private release evidence folder.

Rollback point: none.

Stop if the export is incomplete, cancelled, erroring, empty, in the wrong project/location, or its metadata cannot be listed.

Rollback import command, to run only during a separately approved data incident:

**REQUIRES HUMAN APPROVAL — DESTRUCTIVE PRODUCTION DATA ROLLBACK**

```bash
gcloud firestore import "$EXPORT_URI" \
  --project=crm-web-app-97b91 \
  --database='(default)' \
  --async
```

Expected: an import operation that is monitored to success. Import overwrites matching document IDs but does not delete extra documents created after export. Inventory those extras and newly created Pending profiles before any explicit deletion decision.

## 6. Snapshot Auth Custom Claims

Firestore export does not contain Firebase Auth Custom Claims. The artifact is UID + claims only, including users with no claims; it contains no emails but remains confidential access-control data.

### Path A — Google Cloud Shell (preferred)

Use the approved deployment runbook HEAD, whose application/configuration content is verified against the reviewed release-content commit. Cloud Shell must be logged into `keota.mar@gmail.com` and have ADC available.

**SAFE READ-ONLY**

```bash
RELEASE_CONTENT_COMMIT='f942f75c71718c6a3c5c500b75ee48f226edf54d'
gcloud auth list
gcloud config get-value project
gcloud auth application-default print-access-token >/dev/null
DEPLOYMENT_RUNBOOK_HEAD=$(git rev-parse HEAD)
git merge-base --is-ancestor "$RELEASE_CONTENT_COMMIT" HEAD
git diff --quiet "$RELEASE_CONTENT_COMMIT..HEAD" -- . \
  ':(exclude)docs/deployment/production-runbook.md' \
  ':(exclude)docs/deployment/production-checklist.md'
printf 'DEPLOYMENT_RUNBOOK_HEAD=%s\n' "$DEPLOYMENT_RUNBOOK_HEAD"
```

Expected: intended account, project `crm-web-app-97b91`, working ADC, approved deployment runbook HEAD, and successful release-content ancestor/content-delta checks. Do not print tokens.

**SAFE READ-ONLY (production) / SAFE LOCAL EVIDENCE WRITE**

```bash
mkdir -p artifacts/private
node scripts/snapshot-auth-claims.mjs \
  --project crm-web-app-97b91 \
  --out artifacts/private/predeploy-auth-claims.json
sha256sum --check artifacts/private/predeploy-auth-claims.json.sha256
```

Expected: 15 represented users, source project `crm-web-app-97b91`, a JSON artifact and matching `.sha256` sidecar. Review aggregate count only; do not print UIDs or claim contents into a shared log.

### Path B — local ADC

Install Google Cloud CLI later, authenticate ADC as the intended operator, verify `gcloud auth application-default print-access-token` without displaying its value, then run the same Node command from the approved deployment runbook HEAD after the same release-content ancestor/content-delta checks. Firebase CLI login alone is not ADC.

**REQUIRES HUMAN APPROVAL — BACKUP-BUCKET WRITE**

```bash
gcloud storage cp artifacts/private/predeploy-auth-claims.json \
  artifacts/private/predeploy-auth-claims.json.sha256 \
  gs://crm-web-app-97b91-prod-backups-601560289578/auth/predeploy-$STAMP/
```

Expected: two private objects in the release-specific prefix. Keep a second copy in an approved encrypted operator vault.

Rollback point: use this artifact with `scripts/restore-auth-claims.mjs`; Firestore import alone is insufficient. After any restore, force token refresh and re-check profile/claim consistency.

Stop if ADC identity is wrong, digest fails, project metadata differs, represented users differ from the frozen baseline, or the artifact cannot be stored privately.

## 7. Copy the live Storage bucket to independent recovery storage

Selected technical strategy: **S3, an independent predeployment copy plus manifest**. Seven-day soft delete is useful but time-limited and operationally coupled to the live bucket. Object Versioning is not required for this release and adds ongoing noncurrent-version management. With only about 73 objects, an independent copy is small and provides the clearest checksum/inventory evidence.

Potential orphan objects are copied as-is and remain out of scope; no delete flag is permitted.

**SAFE READ-ONLY**

```bash
gcloud storage rsync \
  gs://crm-web-app-97b91.firebasestorage.app \
  "gs://crm-web-app-97b91-prod-backups-601560289578/storage/predeploy-$STAMP" \
  --recursive --dry-run
```

Expected: a copy-only plan; no source deletions and no destination deletion option.

**REQUIRES HUMAN APPROVAL — BACKUP-BUCKET WRITE**

```bash
gcloud storage rsync \
  gs://crm-web-app-97b91.firebasestorage.app \
  "gs://crm-web-app-97b91-prod-backups-601560289578/storage/predeploy-$STAMP" \
  --recursive
```

Expected: all frozen source objects copied to the unique backup prefix.

**SAFE READ-ONLY**

```bash
gcloud storage rsync \
  gs://crm-web-app-97b91.firebasestorage.app \
  "gs://crm-web-app-97b91-prod-backups-601560289578/storage/predeploy-$STAMP" \
  --recursive --checksums-only --dry-run
gcloud storage ls --long --recursive gs://crm-web-app-97b91.firebasestorage.app > storage-live-manifest.txt
gcloud storage ls --long --recursive "gs://crm-web-app-97b91-prod-backups-601560289578/storage/predeploy-$STAMP" > storage-backup-manifest.txt
```

Expected: no remaining rsync action, equal object counts, and retained manifests. Record live bucket soft-delete/versioning state with the release.

Rollback point: restore only reviewed missing/damaged objects from the backup prefix. Never use a command that deletes unmatched destination objects.

Stop on a checksum difference, count difference, copy failure, source write after freeze, or unavailable restore permission.

## 8. Enable only the required Functions APIs

Current code uses Firebase Functions v2 callable HTTPS functions, Node.js 22, Cloud Run, build containers, and one Secret Manager secret. Firebase CLI 15.28.1 explicitly ensures Eventarc and Pub/Sub service identities for every v2 backend, including callable-only code. Pub/Sub, Cloud Storage, and Service Usage are already enabled.

The six disabled required APIs are:

- `cloudfunctions.googleapis.com`
- `cloudbuild.googleapis.com`
- `artifactregistry.googleapis.com`
- `run.googleapis.com`
- `eventarc.googleapis.com`
- `secretmanager.googleapis.com`

`iam.googleapis.com` and `iamcredentials.googleapis.com` are not required by this deployment path and must remain disabled unless a later, evidenced feature specifically needs them.

**SAFE READ-ONLY**

```bash
gcloud services list --enabled --project=crm-web-app-97b91 --format='value(config.name)' | sort
```

**REQUIRES HUMAN APPROVAL — PRODUCTION INFRASTRUCTURE MUTATION**

```bash
gcloud services enable \
  cloudfunctions.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  run.googleapis.com \
  eventarc.googleapis.com \
  secretmanager.googleapis.com \
  --project=crm-web-app-97b91
```

Expected: all six enabled; billing remains on the already approved Blaze plan. The existing `pubsub.googleapis.com`, `storage.googleapis.com`, and `serviceusage.googleapis.com` remain enabled.

Rollback point: do not disable APIs as an incident rollback while deployed resources may depend on them. Roll back Functions/resources first; API disablement is a separate later decision.

Stop on billing error, service-agent/IAM failure, unexpected API request, or wrong project.

## 9. Capture the preexisting Functions inventory before deploying

**SAFE READ-ONLY**

```bash
mkdir -p artifacts/private/functions-before
firebase functions:list --project crm-web-app-97b91 --json \
  > artifacts/private/functions-before/firebase-functions-list.json
gcloud functions list --v2 --regions=asia-southeast1 --project=crm-web-app-97b91 --format=json \
  > artifacts/private/functions-before/gcloud-functions-list-v2.json
gcloud run services list --region=asia-southeast1 --project=crm-web-app-97b91 --platform=managed --format=json \
  > artifacts/private/functions-before/run-services.json
for FUNCTION in $(gcloud functions list --v2 --regions=asia-southeast1 --project=crm-web-app-97b91 --format='value(name.basename())'); do
  gcloud functions describe "$FUNCTION" --v2 --region=asia-southeast1 --project=crm-web-app-97b91 --format=json \
    > "artifacts/private/functions-before/function-$FUNCTION.json"
done
for SERVICE in $(gcloud run services list --region=asia-southeast1 --project=crm-web-app-97b91 --platform=managed --format='value(metadata.name)'); do
  gcloud run services describe "$SERVICE" --region=asia-southeast1 --project=crm-web-app-97b91 --platform=managed --format=json \
    > "artifacts/private/functions-before/run-service-$SERVICE.json"
  gcloud run revisions list --service="$SERVICE" --region=asia-southeast1 --project=crm-web-app-97b91 --platform=managed --format=json \
    > "artifacts/private/functions-before/run-revisions-$SERVICE.json"
done
```

Expected: complete names, regions, generations, runtime/build config, service account, active revision, and secret **bindings**. Do not capture secret values. An empty list is valid evidence and means rollback may remove only the newly introduced functions.

Rollback point: this inventory decides whether a failed function must be redeployed from retained previous source or may be explicitly deleted as newly introduced.

Stop if inventory is unavailable, incomplete, or reveals a preexisting function without recoverable source/configuration.

The reviewed deployment contains 16 callables: `approveUser`, `updateUserAccess`, `disableUser`, `upsertActivity`, `trashActivity`, `completeFollowUp`, `restoreActivity`, `permanentlyDeleteActivity`, `trashCustomer`, `archiveCustomer`, `abortCustomerUploads`, `transferCustomer`, `restoreCustomer`, `permanentlyDeleteCustomer`, `cleanupExpiredTrash`, and `syncLegacyCustomer`.

## 10. Capture, apply, verify, and restore Storage CORS

Reviewed origins are exactly the two Firebase Hosting origins plus localhost ports 5173 and 4173. Methods are `GET`, `HEAD`, `POST`, `PUT`, `DELETE`; `DELETE` exists only because `Profile.jsx` performs owner-avatar cleanup with Web SDK `deleteObject()`. Customer/place deletions remain server-side. No wildcard exists.

**SAFE READ-ONLY**

```bash
mkdir -p artifacts/private/cors
gcloud storage buckets describe gs://crm-web-app-97b91.firebasestorage.app --format=json \
  > artifacts/private/cors/storage-bucket-before.json
gsutil cors get gs://crm-web-app-97b91.firebasestorage.app \
  > artifacts/private/cors/storage-cors-before.json
```

Expected: exact restorable prior CORS JSON and full bucket metadata.

**REQUIRES HUMAN APPROVAL — PRODUCTION BUCKET CONFIGURATION MUTATION**

```bash
gcloud storage buckets update gs://crm-web-app-97b91.firebasestorage.app \
  --cors-file=storage.cors.json
```

Expected: the reviewed CORS list is accepted for the exact bucket.

**SAFE READ-ONLY**

```bash
gsutil cors get gs://crm-web-app-97b91.firebasestorage.app \
  > artifacts/private/cors/storage-cors-after.json
diff -u storage.cors.json artifacts/private/cors/storage-cors-after.json
```

Expected: no semantic difference. JSON formatting/key order may be normalized; if textual diff differs, compare parsed JSON.

Rollback point:

**REQUIRES HUMAN APPROVAL — PRODUCTION BUCKET CONFIGURATION ROLLBACK**

```bash
gsutil cors set artifacts/private/cors/storage-cors-before.json \
  gs://crm-web-app-97b91.firebasestorage.app
```

Real-browser acceptance must cover authenticated `getBlob()`, Customer photo upload, place photo upload, profile-avatar upload, avatar cleanup/delete on a designated recoverable test record, and expected anonymous/cross-branch denial once the reviewed Rules are active. Test both Hosting origins and intended local origins; verify no wildcard origin. Restore the designated test record/object afterward using its recorded baseline.

Stop and restore prior CORS on any unexpected origin, failed required Web SDK method, wrong bucket, or inability to capture/parse the prior configuration.

## 11. Deploy the trusted layer against a non-production webhook stub

The safe stub must be controlled by the release team, record method/body/timestamp, return configurable 2xx/non-2xx/delay, and never relay requests. It must not log bearer tokens or unrelated PII.

**REQUIRES HUMAN APPROVAL — SECRET MUTATION**

```bash
firebase functions:secrets:set LEGACY_WEBHOOK_URL --project crm-web-app-97b91
```

Expected: enter only the approved HTTPS stub URL; a new Secret Manager version is created. Do not put the URL in shell history or the client bundle.

**REQUIRES HUMAN APPROVAL — FUNCTIONS DEPLOYMENT**

```bash
firebase deploy --only functions --project crm-web-app-97b91
```

Expected: the 16 Node.js 22 v2 callables deploy to `asia-southeast1`; only `syncLegacyCustomer` binds `LEGACY_WEBHOOK_URL`.

Before migration/Admin bootstrap, perform only deployment-health, log, and unauthenticated-rejection checks. A positive callable test cannot safely succeed yet because the implementation requires both canonical profile fields and matching approved token claims. Do not create temporary claims to bypass this dependency.

Rollback point: use the preexisting inventory. Redeploy retained prior source/config for any preexisting function. If inventory proves no function existed, explicitly delete only the introduced names under separate approval; never bulk-delete unknown functions.

Stop on build/runtime/API/IAM error, unexpected region/runtime/service account, secret bound to another function, or any evidence the real webhook was called.

## 12. Run migration dry-run and guarded apply

The 2026-08-25 read-only review found:

| Account | Provider | Created (UTC) | Last sign-in (UTC) | Likely state | Recommended migration action |
|---|---|---|---|---|---|
| Auth-only User A | Password | 2026-04-07 10:27 | none recorded | unknown/pre-provisioned; identity review still useful | `CREATE PENDING PROFILE DURING MIGRATION` |
| Auth-only User B | Google | 2026-04-09 04:18 | 2026-04-09 04:18 | incomplete or abandoned one-time sign-in; not enough evidence to disable | `CREATE PENDING PROFILE DURING MIGRATION` |
| Auth-only User C | Google | 2026-08-24 11:33 | 2026-08-24 11:33 | recent account likely awaiting onboarding | `CREATE PENDING PROFILE DURING MIGRATION` |

Pending is the least-privilege state: it grants no CRM access and leaves all later approval/disable decisions to an Admin. Do not infer role/branch from provider or timing, and do not disable any of the three during migration.

**SAFE READ-ONLY**

```bash
node scripts/migrate.mjs --project crm-web-app-97b91
```

Expected: frozen counts, zero conflicts, zero Firestore users without Auth, preservation digests unchanged, and exactly the reviewed Auth-only profile plan.

**REQUIRES HUMAN APPROVAL — FIRESTORE AND AUTH CLAIM MUTATION**

```bash
export ALLOW_PRODUCTION_MIGRATION=crm-web-app-97b91
CLAIMS_DIGEST='<VERIFIED-SHA-256>'
node scripts/migrate.mjs \
  --apply \
  --project crm-web-app-97b91 \
  --confirm-project crm-web-app-97b91 \
  --claims-snapshot artifacts/private/predeploy-auth-claims.json \
  --confirm-claims-digest "$CLAIMS_DIGEST"
```

Expected: Customer IDs, Auth UIDs, branches, GPS, statuses, and legacy image URLs remain; canonical branch/access fields are added; no Activity is fabricated; no Storage object is changed; three Auth-only users receive denied-by-default Pending profiles; all claim updates succeed.

Rollback point: Firestore export plus separate Auth claims artifact. Preserve any `artifacts/private/migration-recovery/` report and rerun only after review. Do not attempt a broad destructive rollback.

**SAFE READ-ONLY**

```bash
node scripts/migrate.mjs --project crm-web-app-97b91
```

Expected: second dry-run is clean/idempotent with zero conflicts, zero access-field migrations, and unchanged IDs/branches.

Stop on any conflict, partial Auth claim failure without durable recovery artifact, ID/branch/GPS/status drift, or unexplained count change.

## 13. Select and bootstrap the first Admin

The human release owner identifies the intended Auth account out of band, verifies control of it, finds it in Firebase Authentication, and copies its UID into a private operator variable. Never infer Admin from a legacy branch string or an email guess. The ticket may record only a UID fingerprint unless full UID access is restricted.

Flow: identify account → verify person/control → obtain UID locally → two humans confirm UID/project → complete migration first → bootstrap → force token refresh → verify canonical Firestore profile and Auth claims.

**REQUIRES HUMAN APPROVAL — FIRESTORE AND AUTH CLAIM MUTATION**

```bash
export ADMIN_UID='<VERIFIED-UID>'
export ALLOW_PRODUCTION_MIGRATION=crm-web-app-97b91
node scripts/bootstrap-admin.mjs \
  --apply \
  --project crm-web-app-97b91 \
  --confirm-project crm-web-app-97b91 \
  --uid "$ADMIN_UID" \
  --confirm-uid "$ADMIN_UID"
```

Expected: `users/{UID}` is canonical `role=admin`, `branchId=null`, `accountStatus=approved`; matching Custom Claims are set. The command is rerunnable if Firestore succeeds and the Auth claim write fails, but the two systems are not atomic: stop, inspect both, and rerun only the same verified UID.

Token refresh: sign out/in or force `getIdToken(true)`, then verify the ID token and Firestore profile agree before any Admin-only operation.

Rollback point: the pre-migration Firestore export and claims snapshot. Claims are restored separately; do not delete the Admin Auth account.

Stop if UID confirmation is absent, identity is uncertain, migration verification is incomplete, or profile/claims disagree after refresh.

## 14. Complete positive trusted-layer and stub acceptance

Now the verified Admin can exercise the callable authorization path without temporary claims.

**REQUIRES HUMAN APPROVAL — CONTROLLED PRODUCTION TEST MUTATIONS**

Use the designated recoverable test Customer/Activity only. Exercise each callable with a minimal reviewed payload and restore the test record using normal trusted operations. For `syncLegacyCustomer`, send the reviewed `reason`; verify the stub received the established payload plus `reason`, a 2xx succeeds, non-2xx/network/timeout become controlled failures, and Firestore remains consistent.

Expected: no real endpoint call; authorization/branch checks and timeout work; stub evidence contains the expected payload contract.

Rollback point: restore the designated test record from its pre-test evidence; do not restore the entire database for a test-only change.

Stop on payload drift, missing `reason`, hang beyond timeout, unsafe Firestore change, or any real-endpoint uncertainty.

Only after stub acceptance:

**REQUIRES HUMAN APPROVAL — SECRET MUTATION**

```bash
firebase functions:secrets:set LEGACY_WEBHOOK_URL --project crm-web-app-97b91
```

Expected: enter the independently verified production URL; do not invoke it yet.

**REQUIRES HUMAN APPROVAL — TARGETED FUNCTIONS DEPLOYMENT**

```bash
firebase deploy --only functions:syncLegacyCustomer --project crm-web-app-97b91
```

Expected: only `syncLegacyCustomer` receives the new secret version. Do not call the real webhook until a separate business-approved smoke event exists.

## 15. Deploy and wait for indexes

The file contains eight composite indexes.

Required before Hosting:

- `activities(branchId ASC, startAt DESC)` — branch Activity/Calendar list.
- `activities(branchId ASC, customerId ASC, startAt DESC)` — branch Customer detail Activity list.
- `activities(customerId ASC, startAt DESC)` — Admin Customer detail Activity list.
- `activities(recordState ASC, deletedAt DESC)` — Activity trash.
- `customers(recordState ASC, deletedAt DESC)` — Customer trash.

Present but not required by current queries:

- `customers(branchId ASC, createdAt DESC)` — customer list sorts client-side.
- `users(accountStatus ASC, createdAt DESC)` — Admin subscription has no `orderBy`.
- `users(accountStatus ASC, branchId ASC, name ASC)` — assignable-user query uses equality filters and no `orderBy`; Firestore can merge equality indexes.

Keep all eight for this reviewed release; remove optional indexes only in a separate performance/cost change.

Before deployment, retain a JSON inventory of every existing production index and compare it with `firestore.indexes.json`. The Firebase CLI may identify remote indexes that are absent locally; do **not** approve deletion of any preexisting index during this release. Do not use `--force`.

**SAFE READ-ONLY**

```bash
gcloud firestore indexes composite list \
  --project=crm-web-app-97b91 \
  --database='(default)' \
  --format=json > artifacts/private/firestore-indexes-before.json
```

**REQUIRES HUMAN APPROVAL — INDEX DEPLOYMENT**

```bash
firebase deploy --only firestore:indexes --project crm-web-app-97b91
```

**SAFE READ-ONLY**

```bash
gcloud firestore indexes composite list \
  --project=crm-web-app-97b91 \
  --database='(default)' \
  --format='table(name.basename(),collectionGroup,queryScope,state,fields)'
gcloud firestore operations list --project=crm-web-app-97b91 --database='(default)'
```

Expected: every required index state is `READY`; `CREATING` means wait, `NEEDS_REPAIR` means stop. Activity/calendar/trash UI may fail until required indexes are READY.

Rollback point: do not delete indexes during an incident unless an index itself caused a proven issue; old frontend can ignore extra ready indexes.

## 16. Execute Option C legacy-image copy migration

This is a separate copy-first migration. It stores Customer IDs, object paths, metadata evidence, and reference digests in a private artifact; it never stores the bearer download URL/token, never deletes a source, and omits Firebase download-token metadata from new managed copies.

**SAFE READ-ONLY (production) / SAFE LOCAL EVIDENCE WRITE**

```bash
node scripts/migrate-legacy-images.mjs \
  --project crm-web-app-97b91 \
  --bucket crm-web-app-97b91.firebasestorage.app \
  --out "artifacts/private/legacy-images/predeploy-$STAMP.json"
sha256sum --check "artifacts/private/legacy-images/predeploy-$STAMP.json.sha256"
```

Expected: dry-run mode, 34 or fewer Customer/slot records according to actual references, zero conflicts, source-deletion plan 0, deterministic destinations, and a reviewed SHA-256 artifact. Missing sources, unknown URLs, managed-path conflicts, invalid MIME/checksum, or destination mismatch block apply.

**REQUIRES HUMAN APPROVAL — STORAGE COPY AND FIRESTORE REFERENCE MUTATION**

```bash
export ALLOW_PRODUCTION_MIGRATION=crm-web-app-97b91
PLAN="artifacts/private/legacy-images/predeploy-$STAMP.json"
PLAN_DIGEST='<VERIFIED-SHA-256>'
node scripts/migrate-legacy-images.mjs \
  --apply \
  --project crm-web-app-97b91 \
  --bucket crm-web-app-97b91.firebasestorage.app \
  --confirm-project crm-web-app-97b91 \
  --confirm-copy-only crm-web-app-97b91 \
  --input "$PLAN" \
  --confirm-digest "$PLAN_DIGEST"
```

Expected per slot: current source generation/checksum/MIME/reference revalidated → destination create-only copy → destination checksum/size/MIME verified → only the managed path field updated in a Firestore transaction. Legacy source and legacy URL remain. Existing identical destination is reused; different destination fails closed. A Firestore failure leaves a verified copy and a rerun retries only the reference. Partial failures create a private recovery artifact and exit non-zero.

Rollback point: restore old Firestore references from export or reviewed baseline while retaining both source and managed copy. Never mass-delete managed copies during rollback; audit post-migration replacements first.

Stop on any conflict, checksum mismatch, missing source, copy/update partial failure without durable recovery artifact, source count decrease, or any source deletion.

## 17. Deploy Storage Rules, then Firestore Rules

Migration and Option C must precede Rules so canonical user/customer data and deterministic image paths exist. Storage Rules go first because they use canonical Auth claims plus Firestore profile/customer branch fields to secure managed paths. Firestore Rules follow after managed-image SDK access is verified; neither Rules deployment changes object bytes.

**REQUIRES HUMAN APPROVAL — STORAGE RULES DEPLOYMENT**

```bash
firebase deploy --only storage --project crm-web-app-97b91
```

Expected: Pending/Disabled/anonymous denied; approved same-branch managed images allowed; cross-branch denied; valid images at most 1,000,000 bytes; avatar owner write/delete; legacy paths remain compatibility-read-only temporarily.

Rollback:

**REQUIRES HUMAN APPROVAL — STORAGE RULES ROLLBACK**

```bash
firebase deploy --config "$BASELINE_DIR/firebase.rollback.json" \
  --only storage \
  --project crm-web-app-97b91
```

**REQUIRES HUMAN APPROVAL — FIRESTORE RULES DEPLOYMENT**

```bash
firebase deploy --only firestore:rules --project crm-web-app-97b91
```

Expected: full anonymous/Pending/Disabled/Staff/Manager/Admin matrix, branch isolation, self-access escalation denial, lifecycle integrity, and intended same-branch Customer Visit collaboration.

Rollback:

**REQUIRES HUMAN APPROVAL — FIRESTORE RULES ROLLBACK**

```bash
firebase deploy --config "$BASELINE_DIR/firebase.rollback.json" \
  --only firestore:rules \
  --project crm-web-app-97b91
```

Stop and restore only the affected prior Rules source on any actor-matrix failure. CORS and Rules are independent rollback classes.

## 18. Capture Hosting rollback point and deploy Hosting last

The build source is `dist/` produced from the approved deployment runbook HEAD, whose application/configuration content matches the reviewed release-content commit, together with the `firebase.json` SPA rewrite. Capture a local digest and the current live release. Create a release-specific rollback channel that points to the current live version before deploying.

**SAFE LOCAL-ONLY**

```powershell
Get-ChildItem dist -Recurse -File | Get-FileHash -Algorithm SHA256 | Sort-Object Path | ConvertTo-Json | Set-Content artifacts/private/hosting-dist-sha256.json
```

**SAFE READ-ONLY**

```bash
curl -fsS -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  "https://firebasehosting.googleapis.com/v1beta1/sites/crm-web-app-97b91/channels/live/releases?pageSize=10" \
  > artifacts/private/hosting-live-releases-before.json
```

**REQUIRES HUMAN APPROVAL — HOSTING PREDEPLOY ROLLBACK CHANNEL MUTATION**

```bash
ROLLBACK_CHANNEL="predeploy-$STAMP"
printf '%s\n' "$ROLLBACK_CHANNEL" > artifacts/private/hosting-rollback-channel.txt
firebase hosting:clone \
  crm-web-app-97b91:live \
  "crm-web-app-97b91:$ROLLBACK_CHANNEL" \
  --project crm-web-app-97b91
```

Expected: rollback channel serves the exact prior live version.

**REQUIRES HUMAN APPROVAL — HOSTING DEPLOYMENT**

```bash
firebase deploy --only hosting --project crm-web-app-97b91
```

Expected: only Hosting deploys; smoke URLs are `https://crm-web-app-97b91.web.app` and `https://crm-web-app-97b91.firebaseapp.com`.

Rollback:

**REQUIRES HUMAN APPROVAL — HOSTING ROLLBACK**

```bash
ROLLBACK_CHANNEL=$(cat artifacts/private/hosting-rollback-channel.txt)
firebase hosting:clone \
  "crm-web-app-97b91:$ROLLBACK_CHANNEL" \
  crm-web-app-97b91:live \
  --project crm-web-app-97b91
```

Firebase Console Hosting Release History rollback to the recorded version is the secondary path. If neither retained version is available, deploy the immutable prior `dist/` artifact from its recorded source; do not rebuild old source with changed dependencies.

Stop on wrong site, unexpected non-Hosting target, digest mismatch, rollback-channel failure, or smoke-test failure.

## 19. Production acceptance matrix

Every row is a checkbox in the release ticket. Use designated accounts and recoverable test records. Record browser, device width, token refresh time, result, and evidence.

### Actor authorization

| Actor | Customers/Activities | Images/upload | Admin/trash | Required cross-branch result |
|---|---|---|---|---|
| Anonymous | denied | denied | denied | denied |
| Pending | app waiting state; data denied | denied | denied | denied |
| Disabled | disabled state; data denied | denied | denied | denied |
| Staff Branch A | own-branch permitted operations | own-branch read/upload; own avatar | no Admin lifecycle authority | Branch B denied |
| Staff Branch B | own-branch permitted operations | own-branch read/upload; own avatar | no Admin lifecycle authority | Branch A denied |
| Manager Branch A | own-branch manager operations | own-branch read/upload; own avatar | own-branch authority only | Branch B denied |
| Manager Branch B | own-branch manager operations | own-branch read/upload; own avatar | own-branch authority only | Branch A denied |
| Admin | all branches | all Customer images; own avatar | all approved Admin operations | cross-branch allowed |

### Functional acceptance for every permitted actor

| Area | Checks |
|---|---|
| Customers | list/detail/create/edit/status, branch scope, archive/trash boundaries |
| Activities | Appointment, Event, Customer Visit create/detail/edit/cancel; assigned vs unrelated Staff |
| Follow-up | Lao badge/labels, complete/reschedule validation, no raw enums |
| Calendar | correct dates/status labels/branch scope and required index readiness |
| Images | legacy fallback, managed read, Customer/place upload, avatar upload/cleanup, MIME/size denial |
| Quick actions | Call, WhatsApp, Map links use intended Customer values |
| Trash | role-appropriate list/restore/permanent delete; no unrelated Staff access |
| Admin | Pending users, access updates, disable flow, branch/role validation, no self-escalation path |
| Webhook | stub payload/reason/2xx/non-2xx/network/timeout; real endpoint remains uncalled until separate approval |

### Browser/device/session acceptance

| Check | Expected |
|---|---|
| Mobile 360 px | no clipped controls, tables/cards/navigation remain usable |
| Desktop | full navigation/forms/detail/calendar/admin layouts usable |
| Both Hosting origins | authenticated SDK reads/uploads pass CORS |
| Token refresh | migrated users and Admin sign out/in or force refresh; claims/profile match |
| Stale token | old claims do not grant access after Disabled/profile mismatch |
| Cross-branch direct URL | denied even when route/object path is known |

Stop and roll back the smallest affected class on any authorization leak, data corruption, broken critical workflow, CORS/Rules mismatch, or unusable mobile UI.

## 20. Post-deployment evidence, monitoring, and freeze end

**SAFE READ-ONLY (production) / SAFE LOCAL EVIDENCE WRITE**

```powershell
node scripts/capture-production-baseline.mjs crm-web-app-97b91
node scripts/migrate.mjs --project crm-web-app-97b91
```

Also capture Hosting release, Functions/Cloud Run inventory, Rules releases, CORS, index states, object counts, and Auth claims snapshot/digest. Compare Customer IDs, Auth UIDs, branch codes, counts, managed-reference counts, and Storage backup/live manifests with predeployment evidence.

Monitor callable errors, Rules denials, Storage/CORS failures, Auth refresh/profile mismatches, index errors, and webhook failures for the agreed window. End the freeze only when acceptance is complete, evidence is stored, no rollback condition exists, and the named release owner records the UTC end time.

## 21. Legacy-source retirement is a later, separate release

Retain every legacy source for at least **30 days after the last successful Option C batch** because S3 uses a 30-day protected backup and the live bucket has only seven-day soft delete. A later cleanup release must prove, for every source: managed object checksum/size/MIME, Firestore managed reference, same-branch access, cross-branch/anonymous denial, UI rendering, expired rollback window, and reviewed audit record.

Source retirement must use a separate dry-run-by-default, digest-bound tool and separate human approval. It must never be combined with copy migration. The 15 potential orphan objects remain out of scope and must not be deleted by legacy retirement.

## 22. Rollback boundaries

- **Firestore data:** import the recorded export; then review extra post-export documents because import does not delete them.
- **Auth Claims:** run `restore-auth-claims.mjs` dry-run, then guarded apply under a dedicated claims freeze; force token refresh.
- **Storage objects:** copy specific verified generations from the S3 backup. Do not mass-delete legacy or managed objects.
- **CORS:** restore `storage-cors-before.json` independently of Storage Rules.
- **Rules:** deploy the fresh `BASELINE_DIR/firebase.rollback.json`, one service at a time.
- **Functions:** use the preexisting inventory; redeploy prior retained source or delete only inventory-proven new functions.
- **Hosting:** clone the predeploy rollback channel to live or use the recorded Console release.
- **Indexes:** normally leave extra ready indexes; do not delete them as a reflexive rollback.

Official references: [Firestore export/import](https://firebase.google.com/docs/firestore/manage-data/export-import), [Functions secret parameters](https://firebase.google.com/docs/functions/config-env), [Cloud Storage CORS](https://cloud.google.com/storage/docs/configuring-cors), [Cloud Storage checksums](https://cloud.google.com/storage/docs/data-validation), [Firestore index states](https://cloud.google.com/firestore/docs/reference/rest/Shared.Types/State), and [Firebase Hosting releases/rollback](https://firebase.google.com/docs/hosting/manage-hosting-resources).
