# CRM integrated upgrade — production deployment checklist

This checklist is intentionally not executed by the implementation batch. Every state-changing step requires explicit approval and a named operator.

## Required gates

1. Install a supported Java runtime and run `npm run test:rules` successfully. Do not deploy unverified Rules.
2. Review `artifacts/pre-upgrade-baseline-2026-08-25/` and repeat the read-only baseline immediately before deployment.
3. Create and verify a recoverable Firestore managed export and an appropriate Storage backup/versioning plan. The read-only inventory is not a data backup.
4. Explicitly verify the first Admin Firebase Auth UID. Never infer it from legacy `branch == "Admin"`.
5. Confirm Cloud Functions/Cloud Build/Artifact Registry availability and Blaze billing for the project.
6. Configure the Functions secret `LEGACY_WEBHOOK_URL`; test it against a non-production stub before enabling live sync.
7. Review the 15 potential orphan objects manually. Do not delete them as part of deployment.

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
11. Re-capture counts, ID digests, branch values, Rules releases, and Storage aggregate; compare to the pre-upgrade baseline.
12. Monitor callable errors and legacy webhook failures. Roll back Hosting/Rules/Functions to the recorded releases if acceptance checks fail.

## Guarded commands

- Fixture dry-run: `npm run migrate:dry-run`
- Live read-only dry-run: `node scripts/migrate.mjs --project crm-web-app-97b91`
- Baseline capture: `node scripts/capture-production-baseline.mjs crm-web-app-97b91`
- Admin bootstrap and migration apply intentionally require redundant CLI arguments and `ALLOW_PRODUCTION_MIGRATION`.

Never use `--apply`, deploy, or delete Storage objects without the explicit production approval described above.
