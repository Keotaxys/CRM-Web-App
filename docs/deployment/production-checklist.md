# CRM integrated upgrade — controlled production checklist

This checklist is a runbook, not authorization. Every production write, API/billing change, secret update, deployment, migration apply, or rollback requires explicit approval and a named operator. The Step 7B remediation does not execute any of them.

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

1. Freeze deployments. Record the reviewed commit and capture a fresh production baseline, preservation digests, Hosting release, Rules releases/sources, current CORS, Functions inventory, and index inventory.
2. Create a recoverable Firestore export and verify that the operation succeeded at the recorded location.
3. Snapshot Auth Custom Claims with `node scripts/snapshot-auth-claims.mjs --project crm-web-app-97b91 --out artifacts/private/predeploy-auth-claims.json`; retain the JSON and `.sha256` sidecar privately.
4. Confirm the documented Storage recovery strategy is active and restorable. Do not treat the list of 15 potential legacy orphans as deletion authorization.
5. With separate production approval, enable/verify the required Functions, Cloud Build, Artifact Registry, Secret Manager, and supporting APIs and Blaze billing.
6. Capture the existing Functions inventory before the first Functions deployment.
7. Capture prior CORS, apply the reviewed `storage.cors.json` to `gs://crm-web-app-97b91.firebasestorage.app`, then test authenticated `getBlob()`, Web SDK upload, avatar cleanup, and anonymous denial in supported browsers. Stop and restore prior CORS if acceptance fails.
8. Set `LEGACY_WEBHOOK_URL` to a verified non-production stub, never the real endpoint for this first trusted-layer test.
9. Deploy the Functions from the reviewed commit to `asia-southeast1`.
10. Test authentication, authorization, activity/customer operations, timeout/failure handling, and webhook payload compatibility against the stub without destructive production operations.
11. With separate approval, set `LEGACY_WEBHOOK_URL` to the verified production endpoint.
12. Re-deploy only `syncLegacyCustomer` so that its production secret version becomes active, then run a deliberately controlled smoke test.
13. Run `node scripts/migrate.mjs --project crm-web-app-97b91` and require zero migration conflicts and no Firestore user document without a matching Auth UID.
14. With explicit migration approval, bind the apply to the verified pre-apply claims artifact/digest, set `ALLOW_PRODUCTION_MIGRATION=crm-web-app-97b91`, and run the guarded command below. Retain the aggregate report and any private Firestore-batch or claim-remediation artifact.
15. Re-run the dry-run and preservation checks. Require zero false conflicts, unchanged Customer IDs/Auth UIDs/branch codes, expected Pending profiles, and resolved Auth claim updates.
16. Confirm the intended first Admin UID out of band, then run the guarded bootstrap. Never infer Admin from legacy `branch == "Admin"`.
17. Force that Admin to refresh the ID token/re-authenticate and verify the canonical Firestore profile and server claims agree before proceeding.
18. Deploy `firestore.indexes.json`.
19. Wait until every required composite index reports `READY`; affected query features may fail until builds complete.
20. Deploy Storage Rules and immediately run the managed-image actor matrix plus the documented legacy-compatibility checks.
21. Deploy Firestore Rules and immediately run the full logged-out/Pending/Disabled/Staff/Manager/Admin actor matrix.
22. Deploy Hosting only after schema, claims, Functions, CORS, indexes, and Rules have passed their gates.
23. Force migrated users to refresh tokens or re-login so claim and profile state are synchronized.
24. Run the full actor, mobile, and browser acceptance matrix: customer images/GPS/actions, all Activity types, follow-up/calendar, Admin, trash/restore, same/cross-branch access, and managed-image upload/read behavior.
25. Capture post-deployment counts, ID/branch digests, Rules releases, Functions inventory, Hosting version, index states, CORS, and Storage aggregate; compare with the pre-deployment evidence.
26. Monitor callable, Auth, Rules-denial, Storage, and webhook failures through the agreed observation window.

This order prevents the new frontend from arriving before its schema and trusted layer, prevents new Rules from rejecting legacy documents during migration, ensures index-dependent queries are usable before Hosting, and avoids bootstrapping Admin into a schema the migration has not yet canonicalized. Migration does not depend on the callable Functions, but deploying and testing the trusted layer first keeps the final client release gate cohesive.

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
node scripts/restore-auth-claims.mjs --apply --project crm-web-app-97b91 --confirm-project crm-web-app-97b91 --input artifacts/private/predeploy-auth-claims.json --confirm-digest <SHA-256-FROM-VERIFIED-SNAPSHOT>
```

Its apply mode additionally requires `--apply`, matching `--confirm-project`, `--confirm-digest <SHA-256-FROM-VERIFIED-SNAPSHOT>`, and `ALLOW_PRODUCTION_MIGRATION=crm-web-app-97b91`. The tool re-reads each user's claims immediately before mutation and refuses a stale plan; produce and review a fresh dry-run instead of overwriting concurrent access changes. Do not apply it unless an approved rollback requires exact claim restoration.

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
