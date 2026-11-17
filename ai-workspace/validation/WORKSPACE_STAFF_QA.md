# Private workspace staff lifecycle

17 November 2026. Candidate018 follows private015–017. This is backend implementation and disposable-database evidence, not an active Supabase update or a new public onboarding screen. Existing001–014, accounts and legacy owner permissions are unchanged.

## Implemented behavior

An accepted owner can propose explicit staff roles and branches to one intended email. SQL stores only a SHA-256 token digest. The eventual client must generate a cryptographically random token and retain the same request/payload when retrying. No email or message is sent here. Expiry is explicit, within seven days and no later than the issuing authority's expiry.

The recipient signs in with the matching currently verified account, previews the workspace/roles and explicitly accepts a shared staff name. A new instructor also explicitly creates a teaching identity; an administrator does not become a Coach automatically. Joining alone gives no classes or student access. Owner-created teaching assignments are separate, bounded and checked against current instructor grants, branch, membership period and the issuing owner's authority ceiling.

Suspended membership cannot be bypassed by an invite. Rehire requires a fresh post-offboarding offer and creates a new membership period without previous assignments. Accepted retries return the original membership receipt without restoring removed roles. A pending offer pins the precise owner grant that issued it; losing and later regaining ownership does not revive it. Current eligible issuer and recipient are rechecked after the shared transaction lock.

Ownership transfer is a distinct proposal accepted by a different verified account. It establishes an indefinite new owner before revoking the issuer's ownership grant. A bounded issuing owner/membership or an existing temporary recipient-owner grant requires explicit role review rather than a silent handoff. The previous membership, authorship and other roles remain. **This cannot be activated while legacy `academies.owner_id` APIs still grant the original owner authority.**

The owner directory returns only workspace-local membership IDs, shared names, membership status and role/branch summaries. It omits global account IDs, emails, other employment and family data. Invitation/profile/event tables have RLS and no public, anonymous, authenticated or service-role grants. Staff events are append-only with typed same-workspace subjects and actual actors.

## Verification

- PGlite integration cases exercise intended-email/verification/account status, issuer revocation, role validation, scope, expiry, retries, suspended/ended periods, rehire, admin-only identity, teaching assignments, local projections, private ACLs and ownership transfers. Candidate reapplies without restoring state.
- New regressions were observed failing before the repairs: a bounded non-instructor could receive an assignment through PostgreSQL's NULL-ignoring `least`; ownership round trips revived stale offers; a handoff could reuse a temporary owner grant; and assignments could exceed a temporary issuer's expiry.
- The real PostgreSQL runner adds five independent-connection cases: pending-offer revoke versus accept, concurrent identical accepts, issuer removal versus accept, actual joined-instructor roster assignment/removal, and ownership handoff versus an old-owner batch write. It checks actual lock blockers through `pg_blocking_pids` and durable rows rather than guessed delays.
- Fresh full-suite and final source/CI results are recorded in PROGRESS.md and the feature PR. These checks use fictional local records; they do not establish live Supabase Auth email delivery, API exposure or phone acceptance.

## Remaining activation work

Convert all remaining attendance, feedback, guardian, storage/OCR, public API and RLS paths to workspace authority; close every legacy write/owner bypass and minimum-client compatibility path. Add explicit existing-member role management, independent resource constraints and onboarding UI/secure token handling. Preserve Parent consent and verified guardian approval throughout. Then run the reviewed candidate sequence in a separately authorized Supabase staging project, including real Auth/API isolation, backup/restore and migration rehearsal. Do not paste018 into the live SQL editor.
