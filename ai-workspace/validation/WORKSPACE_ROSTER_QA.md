# Workspace student, batch and class transactions

17 November 2026. Candidate017 follows the private015/016 foundation. It is outside active migrations, grants no client/service execution or table access, and does not change the website or installed001–014 behavior.

## Implemented operations

| Private operation | Authority and result |
| --- | --- |
| workspace_save_student | Current global owner/admin. One transaction saves name, age, proficiency, primary contact and added batch enrolments. Existing memberships are not silently removed or reactivated. |
| workspace_save_batch | Current owner/admin or matching branch manager. Saves name/room, preserves fees and prevents silent branch transfers. |
| workspace_save_class | Matching management scope for both old and proposed context. Saves schedule/room/status; preserves attendance, feedback/media context and explicit teaching assignments. Management never invents a teacher identity. |
| workspace_student_profile | Global owner/admin only. Whitelisted student/contact/enrolment fields and current revision; excludes finance and private family records. |
| workspace_class_roster | Assigned instructor or authorized manager. Class-date/timezone-correct enrolments, excluding archived students; returns only student ID/name/age/level. |

All operations validate a workspace derived academy mapping, rather than trusting a supplied academy ID. Independent physical student/class records remain blocked until their non-null workspace constraints and legacy compatibility are converted. No fake academy is created.

## Transactions, retries and privacy

Version and receipt tables have typed same-workspace resource/membership foreign keys, RLS and no client/service grants. Existing mapped resources begin at revision1, new saves require revision0, and subsequent edits require the current revision. Stale saves fail40001. Stable client-generated resource/request UUIDs and a SHA-256 payload hash prevent duplicate saves or changed-request reuse. Receipts store no raw contact payload. Request IDs are scoped to membership period/workspace and contain a fixed operation/resource/result revision.

Current authority is rechecked before receipt replay. An exact retry returns its original ID/revision without undoing a later successful edit; the client should refresh current data before another edit. Expired/revoked staff cannot use receipts as permission. Class times are hashed as UTC epoch values so pooled database timezones cannot break an otherwise identical retry. Reapplying017 preserves existing revisions and receipts.

An approved Parent connection remains distinct from a manually saved contact. Unchanged contacts do not block ordinary age/name/level edits when the approved Parent has a different verified email. Actually changing the primary contact email while a Parent connection is active requires the explicit connection review/disconnect flow; profile edits never replace a Parent link. No new guardian identity is inferred from a name or email match.

All operations acquire academy→workspace→actor locks and recheck016 eligibility. Reads hold the same context anchor through authorization and projection: a concurrent class move cannot swap another batch's students into an already-authorized roster query. The current exclusive workspace lock is intentionally conservative; throughput, pool pressure and read-sharing optimization still need measured staging validation. Converted wrappers must follow the014 child→academy→request order before these anchors where relevant. No compatibility with arbitrary privileged SQL maintenance writes is promised.

## Verification and review

Run `npx vitest run tests/workspace-roster-transactions.test.ts`. It loads actual001–014 plus015/016/017 and uses fictional data. Cases cover accepted admin-only management, teacher/finance denial, branch/foreign resource scope, one account with authority in two workspaces, atomic rollback after a contact-write failure, revisions, receipts, archived resources, ended enrolments, legitimate versus changed guardian contacts, timezone retries, class-history/assignment protection, private projections and grants.

The shared real PostgreSQL runner now loads017 and adds four cases to the prior eight: actual batch write versus membership removal; two stale competing batch editors; concurrent identical requests; and roster read versus class transfer. It verifies real blocker/waiter relationships. Successful unit fixtures alone are not claimed as concurrency evidence.

Review found three concrete issues in the first implementation: unchanged contacts could block an ordinary profile edit, class request hashes varied with session timezone, and roster authority/projection could race with a move. Tests were added and the implementation corrected before release. Exact final results and PR evidence are in PROGRESS.md and the current PR.

## Activation remains gated

Legacy001–014 writes do not maintain017 resource revisions/receipts. Do not enable a mixed old/new runtime or use these candidates as owner scripts. Full public RPC/direct-grant/storage conversion, attendance/feedback/guardian/media APIs, staff lifecycle, independent resource constraints, onboarding/picker, old-client handling, backup/restore and migration rehearsal remain. Real Supabase staging must validate Auth/API/Storage/email and performance before any live activation. This checkpoint runs no live SQL, sends no messages and creates no real records.
