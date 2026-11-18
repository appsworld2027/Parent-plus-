# Database relationship review — 16 November 2026

This review describes source through migration013. It does not certify live Supabase installation or every possible relationship. Activation follow-up: the owner has now supplied a screenshot confirming011–013 installed. All nine Parent/media table endpoints return401/42501 to anonymous zero-row requests, replacing the old missing-table error. No production records were read/written by this review; signed-in save/reopen and account-isolation acceptance remain pending.

## Identity and boundaries

One Supabase Auth user can independently own a Coach academy and a Parent family. Choosing a signup path selects onboarding, never a permission. Existing accounts sign in with the same credentials; an absent academy/family leads to the corresponding setup. Existing profiles reopen without creating duplicates.

Academy students and family children are independent UUID records. A coach-issued, hashed, expiring, single-use invitation connects them explicitly. Names, contact numbers, OCR output and student photos do not establish guardian access. Parent-owned memories/plans remain private even after a Coach connection.

| Relationship / combination | Current rule and evidence |
| --- | --- |
| Account → academy / family | At most one owned academy and one private family per account; database unique owner keys. Owning one grants no access to the other module's records. |
| Family → siblings | Many children, separate IDs and child-scoped records/feed. Added sibling linking, feed isolation and independent disconnect regression. |
| Student → batches | Many-to-many through enrolments. One enrolment per academy/student/batch; composite foreign keys keep tenants consistent. Added two-batch regression. |
| Batch → classes | Many dated class sessions; attendance ties the same academy, batch, student and session together. Existing class database suite tests eligibility and isolation. |
| Child → coaches | Can explicitly connect to students at different academies. Added multi-academy linking and Coach/family isolation regression. |
| Student → parent household | One active verified family connection per academy student. A second invite is rejected while connected. Multiple stored contact rows are not multiple authenticated guardians. |
| Feedback → recipients | Recorded revision → coach-reviewed per-student snapshot. Parents cannot query raw observations. Existing tests cover held/released snapshots and replacement-family revocation. |
| Photos/videos → subjects | Private media with explicit subject IDs; fresh consent for every pictured student, capture and sharing purposes separate. Existing suites cover preparation/finalisation, private access and consent withdrawal. No automatic WhatsApp sending. |
| Connection → disconnect | Active link revoked; related available handoffs cancelled. Old inactive-link retry cannot cancel replacement-family approvals. Added stale former-parent permission rejection. |
| Child → archive | Migration013 requires disconnecting all active Coach links before family-child archival. Claim locks the owned child row so archive cannot silently leave a new active link. No Parent archive UI is exposed. |
| Student → archive | Migration013 serializes archive/claim/issue on the academy lock, revokes unused invitations and rejects first claims for archived students. Existing connected families retain approved text history until disconnect; media remains subject to active-student/consent checks. Exact successful claim retry stays idempotent. |
| Unauthenticated / foreign account | Family tables and trusted link operations remain protected by RLS/RPC ownership checks. Added anonymous and direct forged-link rejection alongside existing cross-family foreign-key tests. |
| Retries / upgrades | Exact combined011–013 owner file is applied twice in disposable PostgreSQL tests. Previous011/012 files stay unchanged.013 also handles an old unrevoked invitation against an already archived student. |

## Limits requiring further implementation

**Guardian identity follow-up0.13:** update014 now implements intended verified-email binding plus an immutable pending request and Coach match approval before link/feedback release. See PARENT_IDENTITY.md. It remains pending owner live installation; until014 runs, the previous server gap remains. Email control plus Coach attestation is not independent legal-custody proof. Same-login testing uses the same explicit approval gate.

- Multiple guardian accounts are not supported concurrently for one academy student. Do not drop the unique link constraint alone: current consent is a single student stream and disconnect cancellation is student-scoped. A safe extension needs per-guardian authority, consent aggregation, per-link delivery/revocation and explicit replacement rules.
- Whether guardians get separate private families or an explicitly shared family is awaiting the owner's choice. Whether every guardian's refusal blocks media is also awaiting their choice. A guardian's private content must not become visible merely because they share a child.
- Family-child archival now requires disconnecting active coaches first. There is no archive control in the Parent UI; add a guided disconnect/archive flow before exposing one.
- Migration013 prevents a family child from linking to two active student records inside one academy, in both the claim RPC and a unique index. Existing conflicting data makes the migration stop atomically for owner review; it never merges children. Duplicate discovery/resolution UI remains future work. Never match by name/phone alone.
- Multiple staff per academy, academy ownership transfer, account deletion/export/retention and repeated enrolment periods need explicit membership/lifecycle models. One account owning multiple academies is not implemented.
- Serial database tests validate constraints, permissions and both archive/claim outcomes; they do not prove real concurrent transaction scheduling, deployed Supabase Storage integration, backups or real two-account device acceptance.

## Release and activation

New source uses signup entry links at /coach/signup and /parent/signup. Returning-user login remains available; already signed-in users proceed to their existing profile or setup. Signed-in workspace switching is navigation only.

The replacement owner package is supabase/update_011_013.sql. It adds011–013 after installed001–010 in one transaction and preserves existing teaching/family records. Do not run the old011/012-only package for this candidate. Owner installation is confirmed; do not rerun this package. Future multi-guardian expansion still awaits privacy choices. Never ask for the service role key in chat.

Before calling this comprehensive for production: resolve the multi-guardian and archive lifecycle decisions, implement remaining guardian membership/delivery constraints/RPCs/UI, add group-media and multi-academy revocation scenarios, test actual conflicting transactions, then perform controlled live two-account acceptance. Passing automated checks alone is not evidence these remaining features exist.
