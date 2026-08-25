# CRM integrated upgrade — controlled production checklist

This checklist is a release overview, not authorization. The executable command-by-command procedure is in `docs/deployment/production-runbook.md`. Every production write, API/billing change, secret update, deployment, migration apply, object copy, or rollback requires explicit approval and a named operator.

## Release identity and mandatory evidence

Record the project ID, Git commit, operator, UTC start time, and change ticket. Freeze other deployments and retain these items together in a private, access-controlled release folder:

- Firestore export location and successful operation metadata.
- Auth Custom Claims snapshot JSON and SHA-256 sidecar. Firestore export does not include Firebase Auth Custom Claims.
- The previous Hosting release/version and an immutable copy of its built `dist/` artifact.
- The previous Firestore Rules source and ruleset. The reviewed baseline is `artifacts/pre-upgrade-baseline-2026-08-25/firestore.rules`, ruleset `projects/crm-web-app-97b91/rulesets/842f1f5a-6966-4b51-900a-2c403b326b03`.
- The previous Storage Rules source and ruleset. The reviewed baseline is `artifacts/pre-upgrade-baseline-2026-08-25/storage.rules`, ruleset `projects/crm-web-app-97b91/rulesets/656a4974-1b53-40da-88b2-2c60147c9b4d`.
- The exact pre-change Storage CORS JSON and the bucket name.
- A preexisting Functions inventory including name, region, runtime, revision, secret bindings, and deployed source commit/artifact.
- The existing composite-index inventory and state.
- Customer IDs, Firestore user-document IDs, Auth UIDs, branch values, counts, and SHA-256 preservation digests. The earlier read-only baseline is in `artifacts/pre-upgrade-baseline-2026-08-25/inventory.json` and must be re-captured immediately before the release.
- Storage bucket recovery strategy, object count/inventory digest, versioning/retention state, and any backup/copy location.

Do not proceed unless the Firestore export is restorable and the chosen Storage recovery strategy is recoverable. A read-only inventory is not a backup.

## Controlled deployment order

1. Freeze every CRM/claim/image/manual-console write and record the fixed release identity.
2. Capture a fresh post-freeze baseline, current Rules sources/releases, CORS, Hosting release, and index state.
3. Create and verify the dedicated Singapore backup bucket.
4. Complete and verify the Firestore export.
5. Snapshot Auth Custom Claims and verify/store its SHA-256 artifact privately.
6. Complete the independent copy of the live Storage bucket; do not delete any potential orphan.
7. Enable the six required disabled APIs and verify already-enabled Pub/Sub/Storage/Service Usage.
8. Capture the full preexisting Functions/Cloud Run inventory before deployment.
9. Capture prior CORS, apply reviewed CORS, and verify the exact bucket configuration.
10. Configure `LEGACY_WEBHOOK_URL` to a controlled non-production stub.
11. Deploy the 16 Functions and perform health plus unauthenticated-rejection checks only.
12. Run the production migration dry-run and require zero conflicts/unmatched Firestore users.
13. Run the digest-bound guarded migration apply under the freeze.
14. Re-run dry-run and preservation evidence; require idempotent zero-conflict state.
15. Confirm the intended first Admin UID out of band and run guarded bootstrap.
16. Force Admin token refresh and verify canonical profile/claims agreement.
17. Use the verified Admin to run positive trusted-layer and webhook-stub tests, including `reason`, 2xx, error, and timeout behavior.
18. Only after stub acceptance, configure the verified production secret and redeploy only `syncLegacyCustomer`; do not call the real endpoint without a separate business-approved event.
19. Deploy `firestore.indexes.json` and wait for every required index to reach `READY`.
20. Run the reviewed legacy-image copy migration dry-run and verify its digest/conflict summary.
21. Run Option C guarded copy-first apply; verify checksum/MIME/reference evidence and retain every legacy source.
22. Deploy Storage Rules and run managed/legacy image security checks.
23. Deploy Firestore Rules and run the full actor matrix.
24. Capture the current live Hosting rollback point/channel.
25. Deploy Hosting last.
26. Force migrated users to refresh tokens or re-login.
27. Run the complete actor, feature, browser, mobile, and cross-branch acceptance matrix.
28. Capture post-deployment counts/digests/configuration and monitor through the agreed window.
29. End the freeze only after the release owner accepts all evidence.
30. Retire legacy sources only in a separate release at least 30 days later; the 15 potential orphans remain out of scope.

This order prevents frontend/schema/Rules races and recognizes one material runtime dependency: before migration and Admin bootstrap, no account can safely pass both canonical-profile and approved-claim checks, so the first positive webhook-stub invocation must occur after verified Admin token refresh. Functions may be deployed earlier, but only negative/health checks are valid at that point.

## Guarded production commands

These commands are examples for the later authorized production window; they must not be run during code remediation.

```powershell
# Read-only baselines
node scripts/capture-production-baseline.mjs crm-web-app-97b91
node scripts/migrate.mjs --project crm-web-app-97b91
node scripts/snapshot-auth-claims.mjs --project crm-web-app-97b91 --out artifacts/private/predeploy-auth-claims.json

# Capture CORS before any change (Cloud Shell); the gsutil output is directly restorable
gcloud storage buckets describe gs://crm-web-app-97b91.firebasestorage.app --format="default(cors_config)" > artifacts/private/storage-cors-before.txt
gsutil cors get gs://crm-web-app-97b91.firebasestorage.app > artifacts/private/storage-cors-before.json

# CORS apply and exact restoration require separate approval
gcloud storage buckets update gs://crm-web-app-97b91.firebasestorage.app --cors-file=storage.cors.json
gsutil cors set artifacts/private/storage-cors-before.json gs://crm-web-app-97b91.firebasestorage.app

# Secret and targeted webhook Function deployment
firebase functions:secrets:set LEGACY_WEBHOOK_URL --project crm-web-app-97b91
firebase deploy --only functions:syncLegacyCustomer --project crm-web-app-97b91

# Guarded migration apply
$env:ALLOW_PRODUCTION_MIGRATION='crm-web-app-97b91'
$claimsDigest='<SHA-256-FROM-VERIFIED-SNAPSHOT>'
node scripts/migrate.mjs --apply --project crm-web-app-97b91 --confirm-project crm-web-app-97b91 --claims-snapshot artifacts/private/predeploy-auth-claims.json --confirm-claims-digest $claimsDigest

# Guarded first Admin bootstrap (replace the UID only after confirmation)
$env:ALLOW_PRODUCTION_MIGRATION='crm-web-app-97b91'
node scripts/bootstrap-admin.mjs --apply --project crm-web-app-97b91 --confirm-project crm-web-app-97b91 --uid <VERIFIED_UID> --confirm-uid <VERIFIED_UID>
```

The Auth restore defaults to dry-run:

```powershell
node scripts/restore-auth-claims.mjs --project crm-web-app-97b91 --input artifacts/private/predeploy-auth-claims.json

# Apply only under an approved Auth-claims rollback
$env:ALLOW_PRODUCTION_MIGRATION='crm-web-app-97b91'
node scripts/restore-auth-claims.mjs --apply --project crm-web-app-97b91 --confirm-project crm-web-app-97b91 --confirm-claims-freeze crm-web-app-97b91 --input artifacts/private/predeploy-auth-claims.json --confirm-digest <SHA-256-FROM-VERIFIED-SNAPSHOT>
```

Its apply mode additionally requires `--apply`, matching `--confirm-project`, matching `--confirm-claims-freeze`, `--confirm-digest <SHA-256-FROM-VERIFIED-SNAPSHOT>`, and `ALLOW_PRODUCTION_MIGRATION=crm-web-app-97b91`. Firebase Auth does not provide a compare-and-swap operation for Custom Claims: the tool's immediate re-read rejects changes that occurred after planning, but a narrow read/write race still exists. Therefore `--confirm-claims-freeze` is an operator assertion that all console, script, and callable claim-changing activity is paused for the complete plan/apply/verification window. If the freeze cannot be enforced, do not apply. Produce and review a fresh dry-run after any stale-plan failure.

The snapshot, restore, migration apply, and Admin bootstrap scripts use Google Application Default Credentials. Run them only from an approved operator environment such as Cloud Shell or a workstation with ADC configured for the intended production principal; Firebase CLI login by itself is not ADC.

## Rollback runbook

### Hosting

Use Firebase Hosting Release History to roll the live site back to the recorded previous version. If that release is unavailable, deploy the retained immutable previous `dist/` artifact from its recorded source commit. Do not rebuild an old commit with unpinned dependencies and call it the same release.

### Firestore Rules

Restore the recorded previous Rules source, not an assumed local file. For this baseline, `firebase.rollback.json` points to `artifacts/pre-upgrade-baseline-2026-08-25/firestore.rules`; verify its recorded ruleset ID above, then use `firebase deploy --config firebase.rollback.json --only firestore:rules --project crm-web-app-97b91` under explicit rollback approval and re-run the actor matrix.

### Storage Rules and CORS

Restore Storage Rules from `artifacts/pre-upgrade-baseline-2026-08-25/storage.rules`, verify the recorded ruleset ID, then use `firebase deploy --config firebase.rollback.json --only storage --project crm-web-app-97b91` under explicit rollback approval. Restore CORS from `artifacts/private/storage-cors-before.json` with the exact bucket command above. Rules rollback does not restore CORS, and CORS rollback does not restore Rules; verify both separately.

### Functions

Re-deploy the retained previous Functions source/artifact and secret bindings from the preexisting inventory. Remove a newly introduced Function only after verifying it did not exist in that inventory and receiving destructive-operation approval, for example `firebase functions:delete <NAME> --region asia-southeast1 --project crm-web-app-97b91`. Never delete all Functions as a blanket rollback.

### Firestore data and Auth claims

Import the recorded Firestore export only under an approved incident plan. A Firestore import overwrites documents with matching IDs but does not automatically delete extra documents created after the export; inventory and explicitly review post-export documents first. Newly created Pending `users/{uid}` profiles therefore require explicit rollback review rather than assumed deletion.

Restore Auth Custom Claims separately from the verified snapshot artifact because Firestore import does not restore them. Run the restore dry-run, inspect the UID-only plan, then use the guarded digest-confirmed apply only if approved. If any claim update fails, retain the create-new artifact under `artifacts/private/auth-claims-restore-recovery/`; it records the verified input digest, plan, successes, failures, and retry state. Force affected users to refresh tokens afterward and verify claim/profile consistency.

Migration apply preflights its private recovery directory before writes. A later Firestore batch failure or any Auth claim failure writes a create-new artifact under `artifacts/private/migration-recovery/` and prints a PII-minimized path/count summary. If artifact persistence itself fails, the command exits non-zero with `recoveryWriteFailed`; stop immediately and preserve the structured terminal output for manual incident evidence before any rerun.

Do not mass-delete legacy Storage objects during rollback. Preserve legacy objects and their bearer-token behavior while Firestore references are restored. Audit managed images created after the baseline against customer/profile references before considering any deletion; copy-first recovery and zero data loss are mandatory.

## Stop conditions

Stop the release on any failed backup/restore gate, digest drift that is not explained, migration conflict, unmatched Firestore user UID, partial claim failure without durable remediation evidence, unready index, actor-matrix failure, webhook production-endpoint uncertainty, or failed CORS/image-flow test. Preserve evidence and execute only the specifically approved rollback class.
