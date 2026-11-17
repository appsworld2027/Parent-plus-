# Workspace roster transactions implementation plan

> Execute directly using the repository test-first guidance. The owner has authorized continued implementation; no repeat plan approval is needed. Session restrictions override upstream agent/approval examples.

**Goal:** implement real workspace-authorized student, batch and class transactions with safe retries, conflict detection and scoped reads.

**Architecture:** private017 candidate after015/016, retaining installed001–014 APIs and client behavior. Trusted operations use the academy→workspace→actor lock order and current memberships. Typed resource versions and request receipts bind workspace, member, resource and payload. Public APIs remain gated until full conversion/staging.

**Spec:** docs/MULTI_WORKSPACE_FOUNDATION.md and docs/MULTI_WORKSPACE_VALIDATION.md. No new dependencies, fake academy for independent practice, production SQL, guardian expansion or client grants. Existing fees and historical teaching attribution remain.

## Task 1: transactional roster/class slice

- [x] Add tests/workspace-roster-transactions.test.ts with fictional001–014/F1/F2 fixtures. Confirm missing017 operations fail before implementation.
- [x] Add supabase/candidates/202611170017_workspace_roster.sql: typed version/receipt tables; shared lock/retry/revision helpers; owner/admin student/contact/additive-enrolment save; scoped batch and class save; class-specific minimum roster projection and protected management profile.
- [x] Test atomic rollback, membership/role revocation, branch/foreign IDs, archived resources, stale revisions, request mutation, retries after a later edit, two members reusing request IDs, protected guardian identity and attendance/feedback context. Keep all helpers/tables private and guard untracked namespace objects.
- [x] Extend the independent PostgreSQL runner to race actual batch writes with revocation and stale concurrent edits, plus identical retries and roster/class transfers. Avoid claiming legacy API/concurrency coverage beyond tested paths.
- [ ] Run focused SQL tests, full npm run check and real PostgreSQL cases. Refresh progress/candidate QA and open a focused PR into main. Do not activate or merge without applicable authorization.

## Review focus

- A teacher can see only enrolled students in the assigned class; no guardian contacts, fees or family data in the projection.
- Branch managers cannot move resources into/out of an unauthorized branch or alter global student profiles through a class assignment.
- A lost response retries safely without replaying stale data over a later edit; current authority is rechecked first.
- A changed guardian contact cannot silently replace an approved Parent link; historical class/feedback context remains stable.
- Private candidates still need independent resource constraints, all remaining RPC/storage conversion and real Supabase staging before runtime activation. Existing legacy writes are not versioned by this slice, so mixed-client activation remains prohibited.
