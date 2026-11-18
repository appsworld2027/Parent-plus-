# Verified guardian and child connection — update014

Published Coach0.13.0 / Parent0.3.0. The owner explicitly requested closing the guardian-identity gap. This replaces invitation-possession/self-confirmation as the access gate. It verifies control of an intended email account and records the owning Coach’s match decision; it does not independently prove legal custody.

## Connection and authentication

1. Coach opens a student profile, checks the intended guardian email (initially the saved contact email if present), confirms that recipient and creates an invitation. The private invitation records the normalised exact email, student and academy. It is single-use and expires after48hours. The old unbound two-argument API is revoked.
2. Parent signs in/signs up through existing Supabase Auth and completes email verification. Both preview and claim read the current verified email from server-owned auth.users, never a submitted email/user metadata value. A different or unverified email cannot preview student details or claim the invitation. Dot/plus aliases are not guessed or normalised into a different address.
3. Parent selects an owned family child, reviews the identities and explicitly submits the verified email, Parent name, child name and optional birth date for Coach review. Claim creates an immutable pending request, not an active link or consent authority. No feedback is released.
4. Coach Today → Parent connection approvals (also available in the student profile). Coach reviews the verified email and child details against admission records/direct guardian confirmation, ticks the match checkbox, then approves or rejects. Server checks academy ownership and rechecks the email and child/name/DOB snapshot under locks. Changed details require rejection and a fresh invitation; no silent switch is accepted.
5. Approval creates the active child/student link with the verified email, approving Coach, timestamp and request ID. Only then do previously Coach-reviewed/shared snapshots become available. New media choices default to deny. Rejection/cancellation never releases feedback. Parents refresh their workspace to receive the approved result; no automatic email/WhatsApp/push is sent by this flow.

Same-login testing follows every step. The Coach shortcut binds its invitation to the current login email, Parent sends a request, then a same-tab link returns to Coach Today for explicit approval. There is no automatic self-approval because both roles share an account. Existing approved links open directly.

## Server enforcement and lifecycle

- Requests have participant-only RLS and SELECT-only authenticated grants; clients cannot insert or mark requests approved directly. Only the trusted functions transition them.
- Pending claim retries return the same request. Approved retries require the original active link. Rejected/cancelled/disconnected requests and stale approvals cannot restore access. NULL is rejected as an approval decision.
- Claim/review lock the family child before the shared academy lock; invitation/student archive and cancellation serialize through the academy. Child identity edits are checked at approval. Family-child archive requires pending requests to be cancelled and active connections disconnected first; Coach student archive cancels pending requests and revokes unused invites.
- One active family per student and one active child mapping per academy remain enforced. Multiple guardians/staff are not introduced by this change.
- Parent-account media consent is effective only while its actor has an active approved link. Group media checks every pictured child’s current permission independently of which authorised parent views it. Outer handoff/storage RLS still determines viewer access.
- Read-only request APIs reveal only participant match details, not private family memories/plans. A valid login alone never links a child, and names/phones are not auto-matched.

## Upgrade and owner activation

Run only supabase/update_014.sql after installed001–013. It is the exact versioned migration, tested in disposable PostgreSQL and applied twice. npm run prepare:identity-sql -- --check verifies the delivered file matches the source. New script does not delete students/classes/attendance/original feedback or family records.

Legacy unbound invitations are revoked. Legacy active links without an approval record are disconnected, and their shared copies are cancelled but retained in history. Reconnect through verified email/Coach approval and re-share the original saved feedback as needed. This is necessary so a pre-update forwarded invitation cannot retain access. Re-running014 preserves connections approved under014. Already opened short-lived media links can last until their existing expiry.

The new client pauses linking/feed display if the014 request API is absent while keeping private family records available. The server protections are not live until the owner installs014. Do not claim production activation from a hosted fixture pass. This workspace has no authorised Supabase admin connection; actual installation requires the owner’s SQL editor action. Do not repeat001–013 or Google setup.

## Acceptance evidence required

Actual SQL tests cover wrong verified email/forwarding, unverified account, pending isolation, explicit approval and NULL rejection, rejection, child/email changes, foreign-family/Coach denial, cancellation/archive, same-login gate, group-media permissions and withdrawal, legacy upgrade, stale replay after disconnect and migration rerun. Browser checks cover pending/approve/reject, wrong-email refusal before details, missing014 client fail-closed behavior and normal authentication. Real email receipt, owner account save/reopen and live cross-account acceptance remain separate from fictional browser transport.

Live Auth configuration check on16November2026: email provider is enabled and mailer_autoconfirm=false (confirmation required). This read-only settings check sent no email and read no account data. Keep email confirmation enabled; actual inbox receipt remains a live acceptance check.

Hosted bundle verification: [PARENT_IDENTITY_HOSTED_QA.md](../validation/PARENT_IDENTITY_HOSTED_QA.md),4/4 in41.577s on source0791763. Tests use fictional transport; update014 still needs owner live installation.

Activation follow-up17November2026: after an all-false diagnostic, owner ran the complete014 file and reports exact installed_update202611160014. Fresh new-table/parent-request/Coach-request API checks all return401/42501 to anonymous requests, replacing404missing objects. No records were read/written. Installation/API visibility is confirmed; do not rerun SQL. Owner-signed-in acceptance remains next.
