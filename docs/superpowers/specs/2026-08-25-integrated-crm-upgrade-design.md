# Integrated CRM Upgrade Design

**Status:** Approved by the user-provided “CRM Web App — One-shot Integrated Upgrade” specification on 2026-08-25.

**Baseline:** `main` at `a1b457c5df01bc6b4bfc911e1b3fbc96047e58e9`; clean working tree; rollback ref `codex/rollback-pre-integrated-upgrade-20260825`.

## Goal

Incrementally upgrade the existing React/Firebase CRM into a branch-secure customer and activity system while preserving Firebase Auth UIDs, customer document IDs, legacy customer fields, branch codes, images, GPS links, customer statuses, mobile cards, and field workflows. All production migrations and deployments remain gated for later approval.

## Safety boundary

- No production writes, Auth mutations, migrations, Rules deployment, Functions deployment, Hosting deployment, or destructive Storage cleanup in this implementation run.
- Migration and bootstrap tools default to dry-run and require explicit `--apply`, project confirmation, and an allow environment variable.
- Existing customer IDs and Auth UIDs are never replaced.
- Legacy image URLs and GPS URLs remain readable; missing coordinates are not fabricated.
- Existing customer status values remain separate from activity lifecycle status.
- The legacy Apps Script integration is represented by a trusted adapter and requires production secret configuration before deployment.

## Architecture

The React SPA remains the client. It is divided into focused `auth`, `customers`, `activities`, `admin`, `branches`, `shared`, `services`, and `firebase` modules. UI permissions improve usability, while Firestore/Storage Rules and callable Cloud Functions are the actual security boundaries.

Firestore uses `users`, `customers`, `activities`, and optional `branches`. Normal customer and activity queries include `branchId == currentUser.branchId`; admin queries may span branches. Growing visit history is stored in `activities`, never embedded in customers.

Trusted Cloud Functions own approval, role/branch changes, activity writes that require assignee validation, cross-branch transfer, permanent deletion, managed Storage cleanup, and expired-trash cleanup. Admin status is derived from verified custom claims, never from the legacy `branch == "Admin"` value.

## Identity and account lifecycle

Registration creates Firebase Auth plus a Firestore profile with `role: null`, `branchId: null`, and `accountStatus: pending`. Pending and disabled users can only see their status/profile surfaces. Approved users receive claims and profile metadata through trusted operations.

Canonical roles are `admin`, `branch_manager`, and `staff`; account states are `pending`, `approved`, and `disabled`. Existing users with an exact known branch mapping can migrate to approved staff. Legacy Admin-like values are manual conflicts and never grant Admin automatically.

## Branches

The 22 existing branch code/name pairs from `Profile.jsx` are centralized unchanged. Their numeric code is the canonical `branchId`. A Branch Master may mirror the constants in Firestore, but no new codes are generated.

## Customers and images

Legacy fields stay intact. New customer records add `branchId`, `recordState`, update/archive/delete audit metadata, optional normalized location, and managed image paths. Staff can edit/archive own-branch customers; managers can additionally trash; Admin uses trusted operations for restore, transfer, and permanent delete.

Customers retain exactly two CRM image slots. New uploads use deterministic managed paths under `customers/{customerId}` and profile avatars use `profiles/{uid}/avatar`. Client validation/compression targets 0.5 MB; Storage Rules cap uploads at 1 MB and require `image/*`. Legacy tokenized download URLs continue displaying without mass relocation.

## Activities and follow-up

One `activities` collection supports `appointment`, `event`, and `customer_visit` with shared timestamps, status, branch, customer relationship, multiple assignees, audit metadata, and record state. Customer Visit requires `customerId`; Appointment and Event do not.

Customer Visits are editable by approved staff in the same branch. Appointment/Event staff edits require creator or assignee; managers own the branch; Admin spans branches. Trusted functions validate every assignee’s approved account and branch.

Follow-up fields are independent of activity status. Overdue, Today, and Upcoming views derive from `followUpRequired`, `followUpDate`, and completion metadata using explicit local-day boundaries.

## UI and navigation

Protected routing distinguishes anonymous, pending, disabled, approved, and Admin. Main navigation is Home, Customers, Activities, Calendar, and More/Profile, retaining the mobile bottom navigation. Existing Add/Edit aliases remain compatible.

The customer grid, photo cards, search/filter, phone, WhatsApp, map, status, and priority UX remain. Customer Detail becomes a routed component and includes related activities/follow-up. Quick Create offers Customer, Appointment, Event, and Customer Visit.

## Rules and indexes

Firestore Rules are deny-by-default and claim-driven. Self-profile writes are limited to personal fields. Customer reads/writes are branch-bound. Activity client writes are denied and routed through trusted functions. Composite indexes cover branch/customer/type/status/date/assignee/follow-up query shapes.

Storage Rules authorize managed customer images through the referenced Firestore customer branch and permit owner-only avatar writes. Pending/disabled claims cannot access CRM images.

## Migration and rollback

The migration tool uses Admin SDK or fixture input. It reports aggregate customer/user/image/GPS/branch coverage and conflicts without PII. Apply mode is idempotent field extension, never document replacement, and refuses to run without explicit project confirmation. Orphan analysis is report-only.

Rollback is Git-based for source. Production rollback requires pre-deployment exports/rules capture and is outside this no-deploy run.

## Testing

Vitest covers policies, validation, migration transforms, branch mapping, follow-up bucketing, and image paths. React Testing Library covers account guards and key UI flows. Firebase Rules Unit Testing plus Emulator Suite covers the required actor matrix. Functions expose testable pure authorization/validation modules. Final gates are lint, tests, emulator tests, migration fixture dry-run, build, mobile checks, dependency audit, and diff review.

## Known production prerequisites

- Verified UID for the initial Admin and explicit bootstrap approval.
- Firebase project access sufficient to capture deployed Rules, indexes, counts, Auth users, and Storage inventory.
- Cloud Functions billing/runtime prerequisites.
- Production secret for the legacy Apps Script webhook.
- Emulator Java/runtime availability for local Rules testing.

