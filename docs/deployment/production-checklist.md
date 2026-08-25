# CRM integrated upgrade — production deployment checklist

This checklist is intentionally not executed by the implementation batch. Every state-changing step requires explicit approval and a named operator.

## Required gates

1. Ensure a supported Java runtime is available and run `npm run test:rules` successfully. Android Studio's bundled JBR was used for the verified local run; do not deploy unverified Rules.
2. Review `artifacts/pre-upgrade-baseline-2026-08-25/` and repeat the read-only baseline immediately before deployment.
3. Create and verify a recoverable Firestore managed export and an appropriate Storage backup/versioning plan. The read-only inventory is not a data backup.
   Review `storage.cors.json`, add every approved custom Hosting origin, apply it to the exact bucket, and verify authenticated `getBlob()` plus anonymous denial in a real browser. CORS is a production prerequisite, not applied by this implementation batch.
4. Explicitly verify the first Admin Firebase Auth UID. Never infer it from legacy `branch == "Admin"`.
5. Confirm Cloud Functions/Cloud Build/Artifact Registry availability and Blaze billing for the project.
6. Configure the Functions secret `LEGACY_WEBHOOK_URL`; test it against a non-production stub before enabling live sync.
7. Review the 15 potential orphan objects manually. Do not delete them as part of deployment.
8. Review the 3 Firebase Auth accounts that have no `users/{uid}` profile. The guarded migration will create Pending profiles for them; an Admin must assign branch/role only after identity verification.

## Approved deployment sequence

1. Record Git commit, project ID, operator, customer/user counts, ID digests, current Rules releases, and Storage aggregate.
2. Deploy trusted Functions only; smoke-test callable authentication without performing destructive operations.
3. Run the guarded Admin bootstrap with matching project and UID confirmations.
4. Run the production migration dry-run again and resolve every unknown branch or privileged-role conflict.
5. With explicit approval, set `ALLOW_PRODUCTION_MIGRATION` to the exact project and run migration `--apply` with matching project confirmation. Save the aggregate result.
6. Re-run dry-run. Expect zero documents needing branch/access fields and unchanged customer/user counts and ID digests.
7. Deploy composite indexes and wait until all are ready.
8. Deploy Hosting, Firestore Rules, and Storage Rules in one tightly controlled release window.
9. Force token refresh/re-login and smoke-test Logged out, Pending, Disabled, Staff A/B, Manager A/B, and Admin actors.
10. Verify customer cards, two legacy images, legacy GPS, call/WhatsApp/map, add/edit, all Activity types, follow-up, calendar, Admin, Trash/restore, and mobile widths.
    Confirm a replacement image is stored as `*StoragePath` with an empty legacy URL and cannot be fetched anonymously.
    Confirm customer transfer/permanent delete is blocked when related Activities still exist.
11. Re-capture counts, ID digests, branch values, Rules releases, and Storage aggregate; compare to the pre-upgrade baseline.
12. Monitor callable errors and legacy webhook failures. Roll back Hosting/Rules/Functions to the recorded releases if acceptance checks fail.

## Guarded commands

- Fixture dry-run: `npm run migrate:dry-run`
- Live read-only dry-run: `node scripts/migrate.mjs --project crm-web-app-97b91`
- Baseline capture: `node scripts/capture-production-baseline.mjs crm-web-app-97b91`
- Reviewed CORS apply (explicit approval required): `gcloud storage buckets update gs://crm-web-app-97b91.firebasestorage.app --cors-file=storage.cors.json`
- Admin bootstrap and migration apply intentionally require redundant CLI arguments and `ALLOW_PRODUCTION_MIGRATION`.

Never use `--apply`, deploy, or delete Storage objects without the explicit production approval described above.

The Admin 30-day cleanup action is manual/prepared only. It skips customers with related Activities and is not scheduled or enabled automatically.
