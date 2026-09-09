# Activity Date Filters and VIP Birthday Reminders Design

**Date:** 2026-09-09

**Status:** Approved

**Branch:** `codex/activity-date-birthday-reminders`

## Summary

This change adds two related CRM usability improvements:

1. The Activities page gains an explicit date mode with **Today** as the default, **All**, and an inclusive **Custom** start/end date range.
2. Customers gain an optional date of birth. Active VIP customers whose next birthday is within fourteen days appear in an in-app reminder list and in a counted notification bell. An approved user can acknowledge that the customer has been greeted for that birthday occurrence.

The birthday reminder is deliberately in-app only. This release does not add device push notifications, Firebase Cloud Messaging, email, or a scheduled daily job.

## Approved Product Decisions

- Activity date modes are `today`, `all`, and `custom`.
- `today` is selected when the Activities page opens.
- A custom range is inclusive of both endpoints and filters by the activity's `startAt` date in `Asia/Vientiane`.
- Customer date of birth is optional and is stored as `birthDate: "DD-MM-YYYY"`.
- Birthday reminders apply only to active customers whose priority is `VIP` and whose birth date is valid.
- A reminder first appears fourteen days before the birthday and its remaining-day count updates each day.
- The app header contains a bell with the current reminder count and links to a dedicated birthday-reminder page.
- The reminder page groups birthdays into today, one-to-seven days, and eight-to-fourteen days.
- A user can select `ອວຍພອນແລ້ວ`; the system records the occurrence year, actor UID, and server timestamp.
- An acknowledged birthday does not remind again until the next annual occurrence.
- Staff and branch managers see only customers in their branch. Admins see all branches.
- A 29 February birthday is observed on 28 February in non-leap years.

## 1. Activity Date Filtering

### User interface

Replace the current single-date filter with three accessible chip buttons:

- `ມື້ນີ້`
- `ທັງໝົດ`
- `ກຳນົດເອງ`

Selecting `ກຳນົດເອງ` reveals two existing `DateField` controls:

- `ຈາກວັນທີ`
- `ເຖິງວັນທີ`

The end field must not permit a date before the start field. If a previously selected range becomes invalid, the UI must surface the validation state and must not silently produce misleading results.

### Filtering behavior

- Today is calculated using the Laos calendar day in `Asia/Vientiane`, not the browser's arbitrary local offset.
- Custom ranges include the start and end dates.
- An activity is included according to the Laos day key derived from `startAt`.
- Type, status, scope, and staff filters continue to compose with the date filter.
- The existing branch-scoped Firestore subscription remains unchanged. The date operation is client-side over already-authorized results.
- No Activity schema, Callable Function, Firestore Rule, or index change is required for this filter.

## 2. Customer Birth Date

### Data contract

The optional customer field is:

```text
birthDate: "DD-MM-YYYY" | null
```

The UI date picker may use its native internal `YYYY-MM-DD` control value, but an explicit adapter must convert at the form/model boundary. Application code must never pass `DD-MM-YYYY` to the JavaScript `Date` constructor.

Validation must confirm:

- exact two-digit day and month and four-digit year;
- a real Gregorian calendar date;
- no future date;
- correct leap-year behavior.

Firestore Rules will enforce the allowed field and its exact string shape or null value. Calendar validity and the no-future constraint are enforced by the shared parser at the application boundary and revalidated by the trusted acknowledgment Function before it acts. Existing customer documents without `birthDate` normalize to `null`, so no production migration is needed.

### Customer screens

- Customer create/edit includes `ວັນເກີດ (ບໍ່ບັງຄັບ)`.
- Customer detail displays the birth date when present and an em dash when absent.
- Clearing the field persists `null`.
- The customer create and update payload allowlists include only the new `birthDate` field; lifecycle, branch, role, image, and ownership protections remain unchanged.

## 3. Birthday Reminder Calculation

A shared, deterministic birthday module owns parsing and reminder calculations. Given a customer and a Laos calendar day it returns either no reminder or a normalized reminder containing:

- customer ID;
- next birthday occurrence date;
- birthday occurrence year;
- days remaining from zero through fourteen;
- urgency group;
- whether that occurrence has already been acknowledged.

The candidate is excluded when the customer is not active, is not VIP, has no valid birth date, is outside the fourteen-day window, or has an acknowledgment for the same occurrence year.

The occurrence year is important near New Year. For example, a late-December reminder for a January birthday records the coming January's year, not the current calendar year.

## 4. Reminder State and Trusted Acknowledgment

The trusted Function stores acknowledgment metadata on the customer document as a server-owned value:

```text
birthdayGreeting: {
  occurrenceYear: number,
  acknowledgedBy: uid,
  acknowledgedAt: server timestamp
}
```

The client cannot directly create or change `birthdayGreeting`. A new Callable Function, `acknowledgeBirthdayGreeting`, performs the mutation after confirming:

- the caller is authenticated and approved;
- the caller's Firestore profile matches the Custom Claims;
- the customer exists and is active;
- the customer is VIP and has a valid birth date;
- the caller is an admin or has access to the customer's branch;
- the requested occurrence is the server-calculated current reminder occurrence and lies within zero to fourteen days.

The Function derives the occurrence from server time in `Asia/Vientiane`; it does not trust a client-provided remaining-day value, branch, priority, or birthday. Repeated acknowledgment of the same occurrence is idempotent and does not create duplicate records.

The UI removes a reminder only after the Function succeeds. On failure it retains the item, shows a safe error, and allows retry.

## 5. Application Architecture

A birthday-reminder provider wraps the protected `AppShell`. It owns one branch-authorized customer subscription and exposes:

- reminder items;
- reminder count;
- loading/error state;
- acknowledgment action.

This lets `Navbar` and the dedicated reminder page share one listener and one calculation. Pending and disabled users never mount the protected provider.

The new route is a protected, lazy-loaded birthday-reminder page. The header bell links to it and exposes an accessible label containing the count. The reminder page groups items as:

- `ວັນເກີດມື້ນີ້`
- `ເຫຼືອ 1–7 ມື້`
- `ເຫຼືອ 8–14 ມື້`

Each item shows the customer name, `DD-MM-YYYY` birth date, remaining days, branch for admins, a customer-detail link, and the acknowledgment button.

The provider recalculates when customer data changes, when the app regains visibility/focus, and after Laos midnight while the app remains open.

## 6. Authorization and Rules

- Existing customer read scoping remains the source of reminder visibility: same branch for Staff/Manager and all branches for Admin.
- `birthDate` is added to the customer create/update allowlists without changing any other protected field behavior.
- Direct client changes to `birthdayGreeting` remain denied because the field is absent from the update allowlist.
- The Callable Function uses the existing approved-profile/claim consistency wrapper and branch authorization helper.
- Storage Rules, Auth role semantics, PWA behavior, activity authorization, and image flows are unchanged.

## 7. Error Handling and Compatibility

- Invalid birth dates are rejected before save with a Lao validation message.
- Legacy customers with a missing field continue to load and edit normally.
- A reminder subscription failure shows a non-sensitive error state and does not fabricate a zero count as if data were complete.
- An acknowledgment failure never hides the reminder or records a local-only success.
- Empty birthday lists show an explicit no-upcoming-birthdays state.
- No customer migration, scheduled cleanup, or notification-document lifecycle is introduced.

## 8. Test Strategy

Development follows TDD with focused RED then GREEN cycles.

### Activity tests

- Today is the default in the Laos timezone.
- All removes the date constraint.
- A custom range includes both endpoints.
- Items immediately outside the range are excluded.
- Reversed or incomplete custom ranges cannot produce a misleading result.
- Existing type/status/scope/staff filters still compose without extra subscriptions.

### Birth-date model tests

- Create, edit, and clear a birth date.
- Preserve the stored `DD-MM-YYYY` value.
- Reject malformed, impossible, and future dates.
- Normalize a missing legacy field to null.

### Reminder calculation tests

- Days remaining 14, 7, 1, and 0.
- Exclude day 15 and past occurrences.
- Cross-year occurrence handling.
- Leap-year and non-leap-year 29 February handling.
- Exclude non-VIP, archived/trashed, missing/invalid birth dates, and acknowledged occurrences.
- Recalculate at Laos midnight.

### UI tests

- Bell count and accessible link.
- Reminder grouping and empty/error states.
- Branch label for Admin.
- Acknowledgment success and failure behavior.
- Customer form and detail display.
- Mobile-width layout does not overflow.

### Function tests

- Staff/Manager same-branch acknowledgment.
- Cross-branch denial.
- Admin all-branch acknowledgment.
- Pending/disabled denial through the existing wrapper.
- Invalid, non-VIP, inactive, out-of-window, and malformed-date denial.
- Server-derived occurrence, server timestamp, actor UID, and idempotent retry.

### Rules emulator tests

- Valid optional `birthDate` create/update.
- Null/clear behavior.
- Malformed field shape denial.
- Protected-field and cross-branch assertions remain intact.
- Direct `birthdayGreeting` create/update is denied.

## 9. Deployment Dependencies

The safe deployment order is:

1. Deploy the new `acknowledgeBirthdayGreeting` Function.
2. Deploy the reviewed Firestore Rules that permit the optional birth-date field but protect acknowledgment metadata.
3. Deploy the frontend.
4. Run production acceptance for Staff, Manager, and Admin branch scopes; birth-date create/edit/clear; bell/list calculations; and acknowledgment success/failure.

The frontend is last so it never sends the new customer field before Rules accept it or calls the Function before it exists. No Firebase Hosting assumption is made; the repository's active frontend deployment target remains authoritative at implementation/release time.

## Non-goals

- Device push notifications, Firebase Cloud Messaging, email, SMS, or WhatsApp automation.
- Per-customer reminder schedules.
- Separate daily notification documents.
- Scheduled Functions or Cloud Scheduler.
- Customer schema migration.
- New Activity indexes or server-side date queries.
- Changes to Storage Rules, Auth roles, PWA behavior, image processing, or legacy webhook behavior.
