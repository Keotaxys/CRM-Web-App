# CRM Web App

Incremental upgrade of the existing Firebase CRM. The project preserves existing customer document IDs, Firebase Auth UIDs, branch codes, customer statuses, photos, GPS links, customer cards, and mobile quick actions while adding controlled account approval, branch isolation, Activities, follow-up, calendar, Admin, Trash, Rules, Functions, and guarded migration tooling.

## Architecture

- React/Vite SPA with centralized auth state and protected routes.
- Firestore domains: `users`, `customers`, and `activities`; branch IDs reuse the 22 legacy codes in `src/branches/branches.js`.
- Roles: `admin`, `branch_manager`, `staff`; states: `pending`, `approved`, `disabled`.
- Sensitive mutations use callable Firebase Functions and Admin SDK.
- Firestore and Storage Rules are deny-by-default and claim/profile/branch aware.
- Customer images remain exactly two slots. Existing URLs remain readable; replacements use deterministic managed paths.
- Migration is dry-run by default and never infers Admin from the legacy branch string.

## Local commands

```text
npm install
npm run dev
npm run lint
npm test
npm run test:functions
npm run test:rules
npm run migrate:dry-run
npm run build
```

Rules tests require Java plus the Firebase Emulator Suite. Functions use Node.js 22 in Firebase; local pure tests also run on newer compatible Node versions.

## Routes

- `/` Home
- `/customers`, `/customers/new`, `/customers/:id`, `/customers/:id/edit`
- `/activities`, `/activities/new/:type`, `/activities/:id`, `/activities/:id/edit`
- `/follow-up`, `/calendar`, `/profile`, `/admin`
- Legacy aliases `/add` and `/edit/:id` remain supported.

## Safety

No command in the normal test/build workflow deploys or mutates production. Production migration apply requires all of:

- `--apply`
- matching `--project` and `--confirm-project`
- `ALLOW_PRODUCTION_MIGRATION` equal to the same project

Admin bootstrap additionally requires matching UID confirmation. See `docs/deployment/production-checklist.md` before any production action.
