# Multi-workspace foundation: implementation contract

Date: 17 November 2026. Status: reviewed implementation contract; F1 private candidate implemented and tested only in disposable PostgreSQL. F2–F5 and Supabase staging/production activation remain pending. Owner requested a robust setup after reviewing multiple academies, independent teaching, admin-only accounts, overlapping roles and employment privacy. Preserve the existing Supabase project, Auth accounts and installed001–014. This document supersedes the single-owner assumption for future development; it does not change current runtime permissions.

Companion: [validation and release gates](../validation/MULTI_WORKSPACE_VALIDATION.md). Current production checkpoint: [PROGRESS.md](../../PROGRESS.md).

## 1. Scope and decisions

### Required product outcomes

- One account may create/own several academies, teach in several accepted academies, operate an independent practice, and use Parent privately.
- An academy may have several owners/admins/coaches; multiple instructors/substitutes can teach a batch or class.
- Academy owner/admin and Coach are independent capabilities. An admin-only person is not forced to create a Coach profile. An owner who teaches can hold both roles.
- Academy affiliations require deliberate acceptance. Membership in one academy never grants visibility into other affiliations, private practice or private family data.
- Existing accounts and data survive migration. Installed001–014 are not rerun. Guardian verified-email/Coach-approved links from014 remain enforced until their replacement is fully tested.
- A parent connection is reused per child/academy; a new lesson/update does not require a new identity approval. Feedback publication still requires an authorised author and reviewed content.

### Safe defaults and open choice

| Topic | Proposed foundation rule | State |
| --- | --- | --- |
| Academic boundaries | Each academy has its own teaching workspace; independent coaching has a separate private teaching workspace | Recommended implementation default |
| Branches/groups | Branches belong to one academy. Optional organisation grouping grants no implicit student access across academies | Recommended; implement group roll-ups after explicit grants exist |
| Independent practice | One active personal teaching workspace per account initially; no fake academy record | Recommended initial limit; multiple academies still supported |
| Staff association | Verified-email invitation or join request, accepted by both account and authorised workspace manager | Required |
| Assignment | A membership alone does not authorise all teaching records; instructor reads/writes are limited to assigned batches/classes and necessary students | Required |
| Academy records after departure | Academy retains its original records/history; departing coach loses academy access and retains personal profile/private workspace | Recommended policy; retention/export implementation must be explicit |
| Guardian privacy | Separate private family spaces, each receiving only approved child updates | Owner preference question pending. Existing one-household limit stays until decided and implemented |
| Conflicting guardian media decisions | Do not enable multiple digital guardian authorities until authority/conflict rules and per-guardian consent/delivery exist | Blocking rule for guardian expansion; no guessed legal authority |
| Platform staff | No global admin role derived from academy ownership. Any future support access is a separate audited, time-limited mechanism | Required |

F1 does not merge existing accounts. A login identifies an access account, not proven unique human identity. Work/personal identity linking must require proof of both accounts; no automatic merge by name, phone, birthday, device or email resemblance. Academy membership cannot take ownership of the person's personal account. Future employer SSO/deprovisioning must not delete unrelated Parent/private-practice access.

## 2. Entity model and unique identities

Names below describe intended concepts. Final SQL identifiers follow implementation review; do not treat this as migration DDL.

| Entity | Identity and relationship | Access/uniqueness rule |
| --- | --- | --- |
| Auth account / existing profile | Existing auth.users.id remains the application login identity | Preserve UUID; verified email is changeable contact/claim evidence, not a foreign key |
| Coach profile | Optional profile attached to an account | At most one active profile/account initially; private by default; share only necessary staff fields |
| Teaching workspace | Stable UUID, kind academy or independent | Academic data boundary; family records are not generic staff workspaces |
| Academy | Existing academy UUID maps one-to-one to a teaching workspace | Several academies may belong to one account through ownership memberships |
| Organisation | Optional grouping of academies | Grouping does not imply learner, family, staff-affiliation or media read permission |
| Branch | Stable UUID under one academy/workspace | Scope within that workspace; a franchise requiring independent control is a separate academy |
| Workspace membership | Account + workspace + state + accepted interval | One active membership/account/workspace; rehire has a new membership period, preserving old attribution |
| Role grants | Several roles attached to a membership, optionally branch-scoped, with validity dates | Owner/admin/instructor/finance capabilities do not become global account flags |
| Batch/class assignments | Membership + workspace + batch/class + validity/teaching role | Team teaching/substitution supported. Same-workspace composite keys and current grant checks required |
| Student/contact/enrolment | Existing UUIDs retained, tenant scope becomes workspace | Different academies maintain separate student records; no universal staff-searchable child directory |
| Classes/attendance/feedback/media/ledger | Resource UUID + workspace, optional branch and original authorship | Every association is checked against the same workspace; separate finance/teaching/media projections |
| Parent/family/child | Existing private family and family_children IDs retained | Staff membership grants no private family access; siblings and private family spaces remain distinct |
| Guardian-student link/request | Explicit family-child to workspace-student relationship | Keep014 verified email, reviewed immutable snapshot, approval actor and revoked-history semantics |
| Guardian authority/consent/delivery | Future per-guardian link records | Required before lifting one-active-family/student. No consent overwrite or student-wide cancellation on removal of one of several guardians |
| Audit/idempotency/outbox | Event/request IDs + workspace + actor and membership context | Append-only audit; idempotency key includes workspace/actor/operation; delivery recipients fixed at review |

Do not deduplicate real children globally. Two guardians may maintain private child profiles for the same academy student; a future explicit guardian-link model handles authority without revealing one family's private records to the other. One Parent child may connect independently to several academy student records. Ordinary profile edits preserve stable IDs; moving a student to another workspace is an explicit reviewed transfer/copy, never an editable tenant field.

## 3. Permission contract

Access requires all applicable conditions: server-confirmed verified/enabled account, active accepted membership, correct workspace, current role grant, correct branch/class assignment, valid resource state, and purpose-specific consent where required. Selecting a workspace in the app is a context hint; the database validates every supplied ID. Client role flags/headers cannot grant authority. Verification/disabled/banned/deleted-account checks belong in trusted server helpers and every relevant RLS/RPC path, including private-family access; AuthProvider.getUser() and a still-valid JWT are not sufficient evidence of current account eligibility. Never expose auth.users records to clients to implement this check.

| Capability | Owner | Delegated academy admin | Branch manager | Instructor | Finance | Parent |
| --- | --- | --- | --- | --- | --- | --- |
| Ownership transfer / last-owner actions | Explicit protected workflow | No | No | No | No | No |
| Academy structure/settings | Own workspace | Delegated settings | Assigned branch operations only | No | No | No |
| Invite/revoke staff or grant roles | Within authority | Delegated roles; cannot grant ownership or exceed own scope | Only if separately delegated; cannot elevate scope | No | No | No |
| Student/guardian roster | Own academy, necessary purposes | Delegated scope | Own branch projection | Assigned students; minimum needed fields | Billing projection only | Own approved child/student view |
| Classes and attendance | Management; teaching authorship needs Coach identity | Management; actual teaching needs instructor grant | Assigned branch | Assigned batch/class and effective period | No | Reviewed permitted schedule only when implemented |
| Correct/cancel recorded feedback | Audited management workflow | Explicit correction grant | Scoped correction grant only | Own record with current authority | No | No |
| Write/share feedback | Only with instructor role/assignment | Only with instructor role/assignment | Only with instructor role/assignment | Assigned student/class; reviewed publish | No | Read approved child snapshots; no raw Coach notes |
| Review guardian-child match | Owner roster authority | Delegated match permission | Scoped match permission | Assigned students only with match-review permission | No | Submit/cancel own pending request; no self-grant |
| Fee management | Own workspace | Only with finance grant | Only with scoped finance grant | No default fee access | Delegated finance scope | Future own authorised fee view only |
| Class media | Explicit relevant media/retention authority | Relevant scoped grant | Relevant scoped grant | Assigned class + capture/share permission | No | Approved per-child media with current consent |
| Private family memories / other employment | No access from this role | No access | No access | No access | No access | Own private space |

In an independent workspace, the user deliberately choosing Teach independently receives owner + instructor capabilities for their own workspace. Academy creation creates an owner membership; a separate "I also teach" choice creates the Coach profile/instructor grant. An admin-only owner can manage classes/staff without being recorded as their teacher or feedback author.

Instructor match-review permission can be delegated without adding an admin approval to every feedback update. Staff can only grant capabilities at or below their own grantable scope. Role unions apply within the same workspace and scope; a Parent role or owner role in A must not widen access in B. Field-level finance/contact restrictions need whitelisted views/column grants or trusted RPC projections, not frontend-hidden fields or row policies alone.

## 4. Employment privacy and context switching

- Staff lists return workspace membership IDs and explicitly shared staff details, not a person's complete global profile, memberships or family roles. Global account mapping remains an internal authority relation; UUID secrecy is never the security control.
- Invite/join responses do not enumerate whether the account works elsewhere. No cross-workspace staff search, counts, activity trails, exports, analytics, notification payloads or diagnostic content.
- Each workspace invite has an intended verified recipient, explicit role/scope, expiry, one-use/retry receipt and issuer authority. Existing-account responses remain neutral. Acceptance rechecks both issuer authority and target scope.
- Coach sees their own workspace list. Academy admin sees only contexts they are authorised for, even when academies share an organisation.
- Cross-workspace availability/calendar conflict warnings are private to the Coach by default. Do not expose other employment/class titles through scheduling errors. A later availability-sharing feature needs an explicit policy.
- Workspace change cancels/ignores old in-flight responses using a context generation; cache/draft keys include account + workspace + resource. Pending writes remain bound to their original workspace and idempotency ID. Never replay under the newly selected workspace.
- Membership removal blocks subsequent server operations after commit. Already authorised in-flight reads and short-lived signed links can finish within their stated limits; downloaded data cannot be recalled. Delete/expire local scoped caches on the next verified revocation/expiry check; define offline cache limits without claiming instant offline erasure.

## 5. State transitions, ownership and revocation

Membership: invitation/request → pending → accepted/active → suspended/left/revoked/expired. Expired/revoked grants never become active through a stale retry. Owner transfer: verified target acceptance before the last current owner is removed; lock the workspace to prevent concurrent orphaning. Rejoin creates a new effective period and no implicit historical assignments.

History is a separate permission scope. A new batch assignment or a one-class substitution does not automatically grant prior teachers' drafts, historical classes, notes or media. Curated recorded student history needs an explicit history-read grant with a student/date boundary. Own earlier records still require active workspace authority and a valid historical-access grant; authorship alone is not a perpetual access right. A current working note is a note authored in the same membership period for a class covered by an active assignment/access window. That window permits own-note reads; once it closes, recorded notes use the explicit history path and drafts are not inherited. Teaching time and data-access/write windows are distinct: allow a configured post-class feedback window where appropriate, but revocation/assignment expiry cuts it off. No duration is invented by this blueprint.

Recorded feedback retains the original author. Ordinary instructor editing is limited to their own record with current write authority. Owner/delegated correction authority can create a new revision with editor, reason and preserved original version; it cannot impersonate the original author, rewrite recorded teaching attribution or silently widen recipients. Published snapshots do not silently change when a source note is corrected; a new reviewed revision/explicit withdrawal is needed.

Classes support a lead teacher, additional instructors and time-bounded substitutes through assignment records. Historical attendance and feedback preserve the actual author/teacher, account, membership period and display snapshot. Classroom staff cannot impersonate another author. Permissions to manage a class and to teach/write its feedback are different.

Academy records stay with the academy when an employee leaves. Personal practice/family data stay private. The guardian connection belongs to the workspace/student relationship, not to one particular employee. Teacher changes or substitutes do not require the Parent to reconnect. An already-published approved snapshot remains governed by guardian-link/consent and workspace retention policy after its original author leaves. Unpublished queued work from revoked staff needs an explicit re-review/adoption by a currently authorised publisher, retaining original authorship; membership removal is not a silent transfer of publication authority.

Copy/export/transfer across workspaces requires explicit authority, necessary guardian consent and provenance; it is never an automatic offboarding benefit. Retention/deletion/backup restoration policies need a separate product/legal schedule before public-scale launch; no duration is invented here.

For protected writes, authorisation and revocation must serialize consistently, not trust an earlier UI check. Final SQL must define one lock order compatible with014's child → academy → request ordering. Revoke/grant/assignment changes and writes need shared authority anchors or equivalent transaction guarantees. Never add new locks in a conflicting order. Test real concurrent sessions before activation. Subsequent operations after revocation commit must deny access; queued publications/deliveries recheck current authority and consent at execution. A review snapshot does not authorise a future recipient substitution. Internal state transitions use transactional idempotency/outbox receipts. External email/message delivery uses provider-supported idempotency and receipts where available; an unknown provider outcome requires reconciliation, not a false exactly-once/delivered claim.

## 6. Migration and compatibility plan

### F0: inventory/contract — completed design checkpoint

Review current constraints, public functions, policies, storage paths, client state and tests. Fix the boundary/permission decisions above; guardian preference remains explicitly pending. No production DDL or app version change.

### F1: additive foundation in disposable/staging database

Add teaching workspaces, optional Coach profiles, scoped memberships/roles, branches, assignments, invitation receipts and authority audit. Existing academy IDs map to exactly one workspace; current owners get owner/management memberships. Instructor capability and future batch/class assignments require explicit confirmation that the person actually teaches; admin-only owners do not receive a fabricated Coach identity. Existing families/014 links/consent stay unchanged. Current classes/attendance do not record an actual teacher, so historical teacher remains unknown/legacy unless backed by real evidence. Existing feedback author_id identifies the account that recorded it, not necessarily the teacher. Preserve that author and label the legacy provenance; do not infer historical teaching from academy ownership. All new authority tables deny anonymous/direct client writes.

Keep academies.owner_id and its unique restriction temporarily. Membership tables are not authoritative for production access until all access paths are covered. Do not add a broad OR membership policy alongside old ownership access and call the migration complete.

### F2: scoped data and API coverage

Backfill workspace_id on academic records from existing academy_id, preserving primary IDs, versions, idempotency receipts, timestamps and stored paths. Detect orphan/cross-tenant associations and stop for review; never silently assign to an arbitrary workspace. Add same-workspace unique keys/FKs and indexes, then validate and enforce non-null workspace IDs before allowing independent records with a null legacy academy_id. Nullable legacy composite FKs must not become an isolation bypass.

Introduce explicitly scoped APIs and least-privilege read projections. Convert roster, classes, attendance, observations, ledger, OCR reservations/import, storage, consent, guardian approvals and deliveries together; domain coverage is listed below. Every security-definer function validates target workspace/grants/assignments with fixed search_path. Scope storage policies by authorised resources, not just a caller-supplied folder prefix. Preserve014 verified-contact gate and effective consent during the transition.

Old storage objects do not need bulk copying merely to rename tenant folders. Use an explicit resource/workspace mapping for existing paths; new paths can be workspace-scoped. Keep private bucket policy effective throughout. OCR quotas remain actor + workspace + project bounded; migrating workspaces does not reset receipts or create unlimited free quotas.

### F3: onboarding and workspace UI

After one verified login, resume existing accepted contexts. Add Teach independently / Create academy / Join invited academy / Parent choices. Admin-only accounts skip Coach profile creation. Pending invitations never grant data access. Add workspace picker showing only own accepted contexts, clear active-context headers, separate staff and family entry points, scoped draft/cache guards and private affiliation behavior.

At cutover, a legacy owner explicitly chooses admin-only or also teaches. If teaching, review/confirm the batches/upcoming classes and effective dates before creating assignments; a reviewed bulk confirmation may cover all their listed active batches. Historical teacher fields remain unknown. An admin-only owner retains management visibility over existing classes and can assign real instructors; missing teaching assignments must not make the records inaccessible or silently grant teacher access.

Preserve current users and their default mapped workspace; stop using owner_id.maybeSingle() as the academy selector. Each service call receives explicit validated context. Back/refresh, deep links, offline retry and simultaneous tabs cannot change the write target.

### F4: safe cutover and migration rehearsal

Use disposable real PostgreSQL for early schema tests, then a separate Supabase staging project or supported isolated branch for Auth, Storage, email, API and schema-cache integration with sanitised representative data. Staging project/branch availability and any cost must be checked in the owner’s account before provisioning. Default automation sends no real mail/OCR/payment requests; controlled email delivery tests use only explicitly authorised test inboxes. Local PostgreSQL alone is not proof of provider integration. Compare row counts, stable IDs, relationships, approved feed visibility, monetary totals, receipts and media ownership before/after. Verify twice-run migration behavior and a restart mid-backfill. Legacy writes arriving during backfill must be handled by a rehearsed transactional dual-write path or a scheduled short write pause with final reconciliation before cutover. Do not assume the first snapshot mapping includes later records. The pilot default is a scheduled write pause/final reconciliation; a zero-downtime claim needs its own tested change-capture design. Take and verify a restorable production backup before any owner-run cutover. A backup is not proof of rollback until restore is tested.

Remove owner_id uniqueness and enable multiple academies/independent records only after scoped constraints/APIs, permissions, new client and legacy compatibility gates are ready. Legacy clients that cannot select multiple workspaces must fail closed with an upgrade path; never auto-pick an arbitrary academy or rerun an old creation RPC with changed semantics. Preserve the meaning of existing user email verification and014 approved links. Existing teacher author IDs are not rewritten to a different staff member.

After new writes, rolling back to an old client/schema may be unsafe. Prefer forward repair; rehearsal must explicitly document which app versions and DB schema states are compatible. No rollback may restore broad permissions or lose new independent/multi-academy records.

No production SQL is delivered by this blueprint. Supabase schema and permission changes are required; “no setup now” means no owner action during preparation. Existing production project/logins remain. Disposable SQL tests, real Supabase staging integration and production activation are separate stages. This workspace has no authorised Supabase admin connection; staging provisioning and eventual production execution require the owner or an authorised supported connection, without secrets in chat. Later migrations get their own version IDs after014 and are tested as exact owner artefacts. Existing Supabase project/credentials remain; no repeat setup is needed now.

### F5: release verification and measured scale

Pass the companion positive/negative/concurrency matrix, hosted UI checks and controlled live two-account acceptance. Test private practice plus two academies plus Parent simultaneously. Verify actual email invitation/confirmation delivery and failure recovery, not only fixture transport. Capture performance of tenant filters/RLS/media/group consent under representative tenant sizes and concurrent use, plus revocation and queue delays. Publish workload, latency/error results and recovery evidence before claiming capacity; no user/student capacity is promised here.

Multi-guardian delivery/authority is a separate guarded phase after the owner's privacy decision. Parent private spaces remain independent and the existing one-family constraint remains until per-link consent, delivery/revocation, household authority and conflict tests pass. Future SSO, finance/gateway, group roll-ups and bulk exports follow these boundaries; they are not prerequisites for this first multi-workspace implementation.

## 7. Current-code impact inventory

| Surface | Verified current assumption | Required conversion |
| --- | --- | --- |
| Migration001 / academies | owner_id unique; owns_academy reads one owner | Membership/grant authority; remove uniqueness only at cutover; protect last owner |
| AuthProvider/AuthGate/App | Owned academy query uses maybeSingle; academy setup is mandatory for Coach | Context list/picker, optional Coach identity, admin/independent onboarding |
| Roster /002/007 | Students/contacts/batches/enrolments use academy_id; student writes atomic | Same-workspace FKs and role/branch projections; retain atomic writes |
| Classes /003/004 | Owner-saved classes and attendance; no staff assignment model | Assignment-aware teaching/manage privileges, actual-teacher attribution, conflict checks |
| Feedback /005/011/012/014 | Owner authoring/review and academy-wide approved guardian access | Assigned author + match-review capabilities; immutable content recipients and verified guardian gate |
| Fees /006/007 | Owner sees invoice balances and manual-payment detail | Finance-only reads/writes; instructor cannot query hidden billing columns directly |
| Photos/media/storage /008/011 | Academy paths and owner read/capture checks | Resource-to-workspace policy, purpose grants and current consent; no mass path rewrite required |
| OCR /009/010 / Edge Function | Academy owner reservation/import + project cap | Staff import permission, actor/workspace/project quotas and unchanged provider-secret boundary |
| Parent /012–014 | Private family owner and one active family/student | Preserve private boundaries; future per-guardian authority/delivery before expanding uniqueness |
| Device state | Account/academy-scoped private drafts, signed media previews, tab selection | Workspace-aware keys/in-flight generations and revoked-context handling |
| Background/operational paths | Existing RPC receipts; no real automated delivery worker | New jobs carry workspace, actor, membership, fixed audience and fresh authority/consent checks |

Public RPC coverage checklist (including legacy aliases): create_academy; save_student/save_student_profile/archive_student/add_batch_students; save_class_session/save_attendance/save_class_attendance/save_class_attendance_checked; save_observation; create_fee_invoice/get_fee_invoice/collect_student_fee/record_manual_fee_payment/reverse_manual_fee_payment/void_fee_invoice; attach_coach_photo; reserve_roster_scan/reserve_vision_roster_scan/import_roster_scan; record_coach_media_consent/prepare_class_media/finish_class_media/queue_parent_feedback/cancel_parent_feedback; issue_parent_link_invite/preview_parent_link/claim_parent_link/get_parent_coach_connections/get_parent_connection_requests/get_coach_parent_requests/review_parent_connection_request/cancel_parent_connection_request/get_parent_media_permissions/parent_media_permission/disconnect_parent_link. Also inspect all helper functions, views, triggers, direct table grants and bucket policies, not only RPC names.

## 8. First isolated implementation checkpoint

The candidate supabase/candidates/202611170015_workspace_foundation.sql implements the private F1 structures and a deterministic001–014 legacy mapping in disposable SQL tests. It is intentionally outside supabase/migrations, has no owner delivery script, adds no production015 marker/public API, retains owner_id uniqueness and does not activate membership-based access. All new tables enable RLS and revoke direct access from anon/authenticated/service_role. This is not a deployable multi-academy release.

It preserves old public IDs/guardian links, stages owner management memberships without creating Coach identities or teaching assignments, and uses same-workspace composite FKs for role/capability, branch, resource, assignment, history, invitation and typed audit subjects. It rejects untracked candidate tables/indexes/functions and ownership/ID drift before adopting mappings. Audit events are append-only and distinguish migration evidence from human actions. Legacy mapping reruns cannot revive revoked staged authority.

The subsequent private F2 kernel implements current-account eligibility, scoped class/feedback/history/finance decisions and two owner-only revocation functions with a last-owner guard. [Kernel implementation and test protocol](../validation/WORKSPACE_AUTHORIZATION_QA.md) records its boundaries. Candidate017 adds real student/contact/enrolment, batch and class transactions plus protected profile/roster projections; [roster QA](../validation/WORKSPACE_ROSTER_QA.md) states authority, revision/receipt and concurrency rules. Candidate018 adds owner-issued staff offers, verified recipient acceptance, separate ownership handoff and explicit teaching assignments; [staff QA](../validation/WORKSPACE_STAFF_QA.md) records the tested lifecycle and remaining role-management scope. Functions/tables remain inaccessible to clients; no legacy/public access path is broadened. READ COMMITTED is required; unsupported higher-isolation transactions deny access. Full36RPC/direct-grant/storage conversion, delegated existing-member role/capability management, independent student/class records, onboarding/picker, staff UI and production/staging activation remain. Pending/accepted records in these candidates do not grant runtime access. F2–F5 release gates remain open.

Candidate019 adds real assigned-instructor attendance projection/save with immutable actual-author snapshots and stable retries ([attendance QA](../validation/WORKSPACE_ATTENDANCE_QA.md)). Candidate020 adds actual class feedback authoring, reasoned correction and minimal detail/history projection without Parent publication ([feedback QA](../validation/WORKSPACE_FEEDBACK_QA.md)). These private transactions advance F2; they do not expose or activate the incompletely converted public/guardian/media/storage routes.
