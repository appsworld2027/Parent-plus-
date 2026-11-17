# Private staff-aware class feedback

17 November 2026. Candidate020 follows015–019. This slice converts actual feedback draft/record/edit, explicit correction and detail projection to workspace permissions. It is not a new public Parent delivery endpoint or a live Supabase migration.

## Implemented behavior

An eligible assigned instructor can create a class-linked draft, choose dated class recipients, and record it under their actual account and accepted membership. Editing requires the original author membership and current authority on both the existing and proposed class. A co-instructor, manager or rehired period cannot adopt another membership's authorship. Admin-only accounts do not become teachers.

Drafts can move between authorized classes with their recipient list replaced atomically. Recorded class/audience/recipients and first recording timestamp stay fixed. Only the note can be revised. Recording saves a version; it does not approve a Parent connection, publish a snapshot or send a message.

Corrections use the separate existing016 owner/delegated `feedback.correct` authority, require a recorded target and nonblank reason, preserve the original author/membership/class/recipient/recorded metadata, and append the actual editor. A correction never edits an already-reviewed Parent handoff snapshot. The existing public version `author_id` continues to identify that revision's saver; the original observation author stays unchanged and private audit records label editor and original author separately.

Fixed requests bind workspace, editor membership, target, expected revision, class, audience, sorted recipients, text, status, action and correction reason. Fresh authority is checked before replay. Exact retries return the prior result without restoring old text after newer edits; changed/stale requests fail. Immutable submissions retain before/after snapshots and original teacher/editor display snapshots. A later profile rename preserves the original saved teacher name. Legacy historical teacher memberships/names remain explicitly unknown, and a first correction retains the observed preimage without inventing an earlier save event.

The detail projection whitelists note/context/recipient IDs and version note/status/revision. Only global owner/admin receive up to five older versions. Current authors, branch managers and historical readers receive only the current revision: legacy versions lack the old class context needed to prove access to every earlier draft. This avoids exposing an old branch's draft after the note moves. Per-version scoped history is still pending. Guardian contacts, family records, other employment, media links and global account IDs are not projected.

## Evidence and review

- Missing-operation RED was observed before implementation. Integration cases cover current teachers versus owner-only/finance/unverified/foreign identities, co-instructor edit denial, revoked assignments/rehire, correct dated recipients, recorded context locks, request replay/conflicts, cross-batch draft movement, branch history isolation, actual correction reasons/editors, original name retention, unchanged approved Parent snapshots, legacy preimages and private grants.
- Review found a real immediate-FK failure when moving a draft with recipients across batches. Its regression failed before repair. Validated draft recipients are now cleared before changing their referenced batch tuple, then replaced with the new set in the same transaction.
- A direct-table regression also exposed SQL CHECK's NULL behavior for correction reasons. The table now requires a nonnull reason and preimage as well as the function's validation. Original shared teacher-name retention had a missing-column RED before implementation.
- Corrected an existing malformed-role test's `it.each` tuple expansion so actual role arrays reach validation. Real-PG verification also exposed a fixture using separately sampled "equal" access/write expiry clocks; it now derives every bound from one timestamp. These changes strengthen the tests without weakening authority rules. Final targeted staff+feedback57cases pass20.21s.
- Four actual feedback races extend the independent PostgreSQL runner: creation waiting behind assignment removal, stale competing note editors, identical concurrent creation and correction versus an author's stale save. Final25/25cases pass using real blocker relationships and durable data checks. Current full-suite and exact CI/merge evidence are recorded in PROGRESS.md and the PR.

## Activation limits

All four functions and the RLS/append-only submissions table deny direct app/service access. No production020 marker is added. The legacy owner-only save/review/guardian/storage routes remain unchanged and cannot coexist as enabled alternate writers at cutover. Legacy drafts have no invented author membership or silent adoption path; an explicit reviewed handling strategy is still needed.

Full API/RLS/storage/consent/guardian/OCR conversion, staff role/capability management, independent resources, workspace/onboarding UI, scoped old-version history, stale-client gates, backup/restore and migration rehearsal remain. The owner has no separate staging project yet; real Supabase Auth/API/Storage/email acceptance is not claimed. No live SQL, actual messages or real records were created in this slice.
