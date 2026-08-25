# Legacy image security transition

## Current state and residual risk

Legacy objects at `customers/{legacyObject}` and `places/{legacyObject}` remain read-compatible for any approved account. The legacy object name does not encode a Customer ID or branch, so the current Storage Rules cannot derive branch ownership from the path. Existing tokenized download URLs are bearer URLs and may remain usable independently of signed-in, branch-aware SDK reads.

New and replaced images already use deterministic managed paths:

- `customers/{customerId}/customer-photo`
- `customers/{customerId}/place-photo`

These paths support a direct Firestore Customer lookup and branch-aware Storage Rules. No production legacy object may be deleted solely because an inventory classifies it as a potential orphan.

## Option A — Temporary compatibility acceptance

### Pros

- Lowest migration risk.
- Existing legacy photos continue to render without changing Firestore references or Storage object metadata.
- Provides time to build and independently verify a complete object-to-Customer map.

### Cons

- Any approved user may access a legacy object outside their own branch if they know its path.
- A previously issued tokenized download URL may remain usable by its bearer.
- The compatibility window has no branch isolation and must be treated as a documented exception.

### Rollback implications

Rollback is simple because no object or reference changes. Preserve the exact compatibility Rules source/ruleset and the legacy object inventory as evidence.

## Option B — Legacy reference mapping

Create a reviewed mapping from each legacy object path to its Customer ID and branch. A possible model is one mapping document per legacy path namespace with fields such as `objectPath`, `customerId`, `branchId`, object generation, size, and checksum.

Storage Rules can read a fully specified Firestore document, but they cannot reverse-query Firestore to discover which Customer references an arbitrary object. Therefore, the mapping key must be deterministically derivable from the requested Storage path. The mapping itself must be protected from client writes and verified against the Customer document before the legacy read rule is tightened.

### Pros

- Can add branch-aware authenticated access before moving object bytes.
- Creates durable evidence for later controlled migration.
- Makes unmapped objects fail closed once the mapping is complete and verified.

### Cons

- Requires a collision-free key scheme for both `customers/*` and `places/*` namespaces.
- Adds a Firestore lookup to Storage Rules evaluation.
- Does not revoke existing bearer download URLs.
- A wrong mapping can deny a valid photo or expose it to the wrong branch.

### Rollback implications

Capture the mapping collection, mapping digest, prior Storage Rules release, and object inventory. Rollback restores the previous Rules release; mapping documents should be retained until all references are reconciled.

## Option C — Controlled legacy image migration

For every verified legacy reference:

1. Resolve legacy object → Firestore Customer → canonical branch.
2. Capture source object name, generation, size, content type, checksum, and download-token metadata state.
3. Copy the source to the appropriate deterministic managed slot without deleting the source.
4. Verify copied bytes/checksum, MIME type, size, authenticated same-branch read, cross-branch denial, and anonymous denial.
5. Update only that Customer's `imageStoragePath` or `placeImageStoragePath`, preserving the legacy URL/reference during the verification window.
6. Verify UI rendering and capture a post-update Customer/reference digest.
7. Retire the legacy reference and later delete the source only under a separately approved, recoverable deletion plan.

### Pros

- Reaches the intended deterministic, branch-aware access model.
- Removes dependency on broad legacy compatibility rules after verification.
- Provides one canonical slot for each Customer photo type.

### Cons

- Highest operational risk because object bytes, metadata, Firestore references, and download-token behavior must remain consistent.
- A Customer has only one canonical object per slot, so conflicts and duplicate legacy references require manual resolution.
- Copying or rewriting metadata can preserve, replace, or remove token metadata depending on the exact operation; token behavior must be captured and explicitly verified rather than assumed.

### Rollback implications

- Do not delete the source during the initial copy/reference phase.
- Retain the pre-change Customer documents, legacy references, source object generations/checksums, copied object generations/checksums, and prior Rules release.
- Firestore rollback restores the old references; Storage rollback preserves both source and managed copies until reference verification is complete.
- Never mass-delete managed copies during rollback. Audit which objects were created by the migration and whether any post-migration client replaced them.

## Recommended staged path

Option C is the selected target. Keep Option A only as the temporary compatibility state until the guarded copy-first plan is reviewed and executed. The private plan artifact provides Option B-like object-to-Customer evidence without making a separate mapping collection a production dependency.

Use `scripts/migrate-legacy-images.mjs` in dry-run mode to create the reviewed Customer/slot map and SHA-256 digest. Apply is guarded by matching project, copy-only confirmation, plan digest, input artifact, and `ALLOW_PRODUCTION_MIGRATION`. Each slot is copied create-only, then checksum/size/MIME and the current Customer reference are revalidated before the managed Firestore path is written. A rerun reuses an identical destination, retries a failed Firestore reference write, and never deletes the legacy source or clears the legacy URL.

Do not tighten compatibility Rules or retire source objects until every Customer reference, checksum, branch authorization test, UI render, and rollback record passes. Retain sources for at least 30 days after the final successful batch when the recommended independent Storage backup has also been verified.

The migration must maintain zero data loss: no source deletion before verified copy, verified Firestore reference, acceptance check, and recoverable rollback evidence.

## Decision gate

**OPTION C SELECTED — HUMAN EXECUTION APPROVAL REQUIRED**

Production must still approve the independent Storage recovery location, release window, batch size, designated acceptance records/accounts, and eventual retirement event. The managed destination deliberately omits legacy Firebase download-token metadata; the legacy source and its bearer URL remain during the retention window. This document authorizes no object copy, metadata change, reference write, Rules deployment, token cleanup, or deletion.

References:

- [Firebase Storage Rules can use fully specified `firestore.get()` and `firestore.exists()` document paths](https://firebase.google.com/docs/reference/security/storage)
- [Cloud Storage Rules evaluate request path, authentication, and object metadata](https://firebase.google.com/docs/storage/security/rules-conditions)
- [Firebase Web download URLs are directly usable URLs](https://firebase.google.com/docs/storage/web/download-files)
