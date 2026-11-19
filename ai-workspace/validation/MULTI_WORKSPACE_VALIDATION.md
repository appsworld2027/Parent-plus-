# Multi-workspace acceptance and release gates

Date: 17 November 2026. Status: required tests, not passing-test claims. Governing contract: [MULTI_WORKSPACE_FOUNDATION.md](../architecture/MULTI_WORKSPACE_FOUNDATION.md). No new production schema/API exists from this document.

## Identity, onboarding and assignments

| ID | Scenario | Required result |
| --- | --- | --- |
| MW-01 | Same account owns A, teaches at B, runs independent practice and uses Parent | Separate accepted contexts, correct per-context capabilities and no duplicate login requirement |
| MW-02 | Create admin-only academy owner | No forced Coach profile or false teaching/feedback authorship; can invite actual instructors |
| MW-03 | Owner also teaches; later removes instructor grant | Ownership remains; new teaching/feedback writes deny until valid assignment/grant restored |
| MW-04 | Several instructors and substitute on one class | Effective period and assigned students enforced; actual author/teacher retained |
| MW-05 | Staff joins by invite/request | Verified recipient + issuer authority + both-party acceptance; pending state has zero academic access |
| MW-06 | Work/personal emails belong to separate accounts | No silent merge, role transfer, family exposure or credential recovery through an employer |
| MW-07 | Several branches; overlapping staff roles | Each query/projection respects branch and resource scope; roles in A do not widen B |
| MW-08 | Invitation expires/revoked; inviter loses authority before acceptance | Stale acceptance fails; retries neither duplicate membership nor restore grants |
| MW-09 | Concurrent last-owner removals/ownership transfer | Workspace retains at least one accepted owner; no orphan or unilateral unaccepted transfer |
| MW-10 | Leaving then rejoining | New membership period, explicit assignments, retained historical attribution; no revival from old invite |

## Isolation and privacy: test direct API/SQL, not just UI

| ID | Attack / condition | Required result |
| --- | --- | --- |
| MW-11 | Member/Admin A supplies workspace/resource/student/media ID from B | Denied with no B data or existence leak; include reads, writes, bulk actions and pagination |
| MW-12 | Instructor requests raw invoice/contact columns or export route | Only permitted projection; no finance/PII access through broad base-table grants |
| MW-13 | Academy admin searches staff affiliations, invites same person or opens calendar/reporting | No private practice, other employment or Parent/family information disclosed |
| MW-14 | User changes workspace while an old request/save/upload is in flight | Old result cannot populate new context; write remains in original workspace or fails |
| MW-15 | Draft/offline queue from A resumes while user is in B | No changed workspace/recipient; current authority rechecked before sync |
| MW-16 | An account combines Parent/instructor/owner in different contexts | Parent feed remains child-scoped; union of roles never expands a foreign context |
| MW-17 | Guessed UUIDs, edited headers/client role flags/deep links | No grant derived from client context; database evaluates real current membership/scope |
| MW-18 | Storage path/signing/preview from another workspace | Object/read/sign authorisation follows resource mapping and permitted purpose, including old path format |
| MW-19 | Revocation while a draft or queued publication exists | Subsequent writes/sends deny; queued work needs authorised adoption without changing authorship. Existing published feedback uses separate guardian/retention rules. No substituted recipient or stale JWT/grant bypass |
| MW-20 | Logs, notifications, diagnostic export and aggregate counts | No hidden employment, child note, token, signed URL or foreign-workspace data |

## Parent identity, consent and history

| ID | Scenario | Required result |
| --- | --- | --- |
| MW-21 |014 guardian requests/approved links after membership migration | Stable identities and reviewed snapshots preserved; wrong email/unverified account blocked |
| MW-22 | Instructor without match-review grant or outside assignment approves guardian | Denied; same-login dual-role test still requires an authorised explicit approval |
| MW-23 | Rejected/cancelled/disconnected/changed guardian snapshot replay | Cannot release feedback or restore stale link/access |
| MW-24 | Student taught in several batches/branches and two academies | Academy's approved guardian link reused within its student record and across staff changes; other academy stays isolated |
| MW-25 | Profile renames, siblings/same-name children, household changes | No automatic merge or link change; private records stay with the right IDs |
| MW-26 | Multiple guardians proposed before per-link consent/delivery is implemented | Expansion blocked; existing one-family constraint retained |
| MW-27 | Future multi-guardian/group-media conflict or one guardian disconnect | Defined authority policy enforced; no overwriting another guardian or student-wide cancellation of unrelated deliveries |
| MW-28 | Consent withdrawal after capture/queue; short-lived previews | Fresh reads/capture/sharing obey policy; no cancelled handoff resurrection; documented existing-link expiry limit |

## Migration, concurrency, reliability and capacity

| ID | Scenario | Required result |
| --- | --- | --- |
| MW-29 | Production-shaped001–014 database upgraded twice | Stable account/student/class/feedback/receipt IDs, row counts, monetary totals, permissions and media mapping |
| MW-30 | Interrupted backfill; orphan or cross-tenant source row | Transaction/checkpoint recovery or safe stop; never silently assign/merge records |
| MW-31 | Legacy Android/web client after multi-workspace enablement | Controlled upgrade/fail-closed behavior; no maybeSingle ambiguity leading to arbitrary academy selection |
| MW-32 | New independent records have null legacy academy_id | Non-null workspace_id and same-workspace FKs still prevent every cross-tenant association |
| MW-33 | Separate real PostgreSQL connections race revoke/authorise, invite/accept, transfer/remove and approve/change | Specified lock ordering/commit semantics; no access resurrection, orphan owner or deadlock left unresolved |
| MW-34 | Lost response/offline retry/out-of-order job | One internal business transition per request; supported provider idempotency/receipts plus an explicit unknown/reconciliation state for external delivery, with no false exactly-once claim |
| MW-35 | OCR across many staff/workspaces and retries | Actor/workspace/project caps effective; old receipts preserved; no quota reset via migration |
| MW-36 | Many small tenants + one large tenant; group media + assignment-heavy scopes | Measured indexed/paginated query/RLS latency, errors, pool pressure, storage signing and queued-work delay; workload/result attached |
| MW-37 | Backup restore/forward repair after new writes | Restored tenant mapping, grants/revocations, receipts and private object policies validated; no unsafe old-schema rollback |
| MW-38 | Real verified Coach/Parent accounts, admin-only account and multi-academy colleague | Controlled live positive and negative acceptance, including actual email receipt; fictional fixture runs labelled separately |
| MW-39 | Assignment expires/revoked while academy membership stays active; rehire and post-class note entry | Class access and configured feedback window obey assignment dates; membership alone cannot restore old records or grants |
| MW-40 | New/substitute instructor requests previous teachers' drafts, history or media | No implicit old-history access; an explicit bounded history grant exposes only permitted projections |
| MW-41 | Instructor edits another author's recorded feedback; manager makes an authorised correction | Instructor denied; manager's new revision preserves original author/version and records editor/reason, with no silent published-snapshot change |
| MW-42 | Direct API/SQL using unconfirmed, disabled/banned/deleted actor or a previously accepted stale token | Server account eligibility denies all protected academic/private-family reads and writes independently of UI |
| MW-43 | Invited staff account changes verified email before accepting invitation | Recipient/issuer verification and authority are rechecked; no membership from a stale identity snapshot |
| MW-44 | Legacy class/attendance has no actual teacher; legacy feedback has only account author_id | Preserve unknown historical teacher and known author/provenance; never infer teaching from ownership |
| MW-45 | Legacy owner chooses admin-only or confirms teaching batches at cutover | Records remain manageable; no forced Coach identity, silent historical attribution or inaccessible old classes; future teaching assignments are explicit |

PGlite is useful for actual SQL/constraints/role fixtures but serial fixtures do not establish real concurrent transaction behavior. Use a PostgreSQL service with independent connections in CI for MW-33. UI automation must also attempt raw APIs/URLs and verify absence of records, not simply hidden buttons.

## Release sequence

1. Blueprint and decision register reviewed against current code; unresolved guardian expansion stays disabled.
2. Additive schema and deterministic migration rehearsal in disposable/staging PostgreSQL.
3. Scoped RPC/grant/storage coverage complete; direct old access paths inventoried and gated.
4. Onboarding/picker/admin/independent/staff flows and cache/draft guards pass.
5. Isolation and concurrent-revocation tests pass; backup restoration and compatibility plan demonstrated.
6. Owner schedules/reviews the concrete tested activation and completes authorised admin execution when required. Never request admin keys/passwords in chat.
7. Controlled live accounts/monitoring/performance evidence, then broader rollout. No production-capacity or zero-leak guarantee is inferred from schema existence or fixture test counts.

## F2 roster/class slice evidence —17November2026

Candidate017 implements private scoped student/contact/enrolment, batch and class transactions plus management-profile and teaching-roster projections. All31new SQL cases pass within the full TypeScript/330test/33file suite (146.84s). Twelve independent PostgreSQL17 cases pass, including actual new API writes versus revocation, optimistic edit conflict, concurrent idempotent save and roster read versus class transfer. [Roster QA](../../docs/WORKSPACE_ROSTER_QA.md) states exact contracts, review fixes and remaining gates. These results do not mark every MW scenario complete: no production client/API grant, independent records, legacy mixed-write compatibility, full staff lifecycle or Supabase/provider acceptance is enabled.

## F1 execution evidence —17November2026

The isolated candidate tests/workspace-foundation.test.ts passes20/20 in10.99s against001–014 plus supabase/candidates/202611170015_workspace_foundation.sql. It applies twice, preserves original class/feedback IDs and014Parent links, creates no fictional Coach/teacher attribution, keeps new private tables inaccessible to anon/authenticated/service_role, preserves old runtime isolation despite a staged second membership, and checks workspace/branch/resource/invite/audit composite references and expected invalid states. Four fresh-database cases reject untracked candidate table, empty marker, function and index. Rerun does not restore revoked staged legacy memberships/grants; ownership drift fails safely.

Read-only review identified unconstrained audit subjects and incomplete namespace preflight; both were corrected and re-reviewed with no remaining material finding in that pass. This evidence covers the private F1 storage candidate, not the full45-scenario platform release. No public permission engine, UI, production migration or Supabase staging test is claimed. A mechanical inventory checks all36current public RPC names appear in the conversion checklist, IDsMW01–MW45 are unique/complete, and relative document links resolve.

Final local regression evidence: TypeScript and all245tests/30files pass54.47s, including the20F1cases. No app/UI or production migration was changed, so browser/provider/live concurrency/scale checks were not repeated or claimed.

## F2 kernel execution evidence —17November2026

The private candidate016 adds12private functions and two deny-all RLS tables. It does not activate a production permission engine. [Kernel QA](WORKSPACE_AUTHORIZATION_QA.md) states exact semantics and reproducible commands. All43new PGlite cases pass, covering verified/enabled current accounts, membership/grant states and expiry, exact workspace/branch/resource checks, management versus teaching, substitute limits, author membership/rehire, bounded group-note history, correction restrictions, finance, private affiliation projection, denied client/service execution, revocation audit/idempotence and last-owner protection. Unsupported REPEATABLE READ/SERIALIZABLE transactions fail closed.

All8real PostgreSQL17 transaction cases pass with independent connections and confirmed blocker/waiter relationships: both revoke/write orderings; assignment revocation; two owners removing one another; two owners leaving; role expiry after transaction start; account ban while a write waits; and unsupported snapshot isolation. Initial cleanup failed after seven assertions; idempotent awaited cleanup was repaired, the expiry test was made independent of connection startup, and the final fresh-database8case command exits0. A draft-correction gap found in read-only review was fixed with a regression. Those races cover only implemented kernel transitions, not invitation acceptance, grant changes, transfer, all legacy014 lock combinations or provider administration.

Final local TypeScript and **288tests/31files pass60.30s**, including43F2and20F1cases. CI now has a separate PG17 transaction job. Link/namespace/grant inventories and whitespace checks pass. Test containers were removed. No actual Supabase admin command, real private record, email/provider send, UI, native/device, capacity or production acceptance is implied. The45MWrelease gates remain broader than this passing subset; F2public/resource/storage conversion and F3–F5 are still open.
