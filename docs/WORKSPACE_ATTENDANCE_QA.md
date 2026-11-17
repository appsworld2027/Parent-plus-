# Private workspace attendance conversion

17 November 2026. Candidate019 follows015–018 and converts the attendance transaction/projection to accepted workspace membership and current teaching assignments. It grants no public/client/service access and does not change the installed001–014 application.

## Contract

- A current assigned instructor with an explicitly created Coach identity can write within the assignment/access/write dates. Being an owner or administrator alone permits a minimum roster inspection, not invented teaching authorship. Existing016 authority rules are preserved.
- The read returns class attendance revision, the existing millisecond-UTC batch/time/status context, and only eligible student IDs, names, ages, proficiency and marks. No guardian contact, family, finance or unrelated employment data is returned.
- Each save holds academy→workspace→actor and class locks, rechecks current teaching authority, validates context/revision, accepts1–500 unique valid marks and requires exactly the full dated roster in the academy's timezone. Foreign, archived, unenrolled, duplicate, incomplete and unmapped children fail without partial writes.
- Existing `class_sessions.attendance_revision` stays the attendance revision;017 resource versions are separate. No owner impersonation or call through an owner-only legacy wrapper occurs.
- A fixed request belongs to one accepted membership period. Its hash binds session, expected revision/context and UUID-sorted marks, so row ordering does not change the request. A valid retry returns the old receipt after later edits without overwriting them. Removed/expired teaching authority denies even receipt replay.
- Append-only submission snapshots preserve the real account, membership period, shared display name, canonical marks, resulting revision and timestamp. Existing attendance is retained without inventing a historical teacher. Later submissions preserve earlier snapshots. All tables have RLS; no direct application/service privileges or production migration marker are added.

## Evidence

The first focused test failed because the new operation did not exist. The implementation then passed24integration cases, including current teacher versus admin-only/finance/unverified/other-academy identities, branch isolation, stable retry, conflicting/stale requests, malformed/duplicate/foreign/partial rows, academy-local dates, archived children, removal/expiry/cancellation, immutable original attribution and private function/table ACLs.019 reapplies without resetting revisions or submissions. Final targeted/full/CI source results are recorded in PROGRESS.md and the PR.

The independent PostgreSQL runner adds four actual attendance cases: save waits behind assignment removal and is denied; competing instructors use the same revision and one gets a stale conflict; simultaneous identical requests yield one snapshot/revision; and a save locking first commits while revocation waits, after which even replay is denied. Tests inspect real lock blockers and durable rows. This complements the existing actual roster, staff, ownership and authorization race cases.

## Remaining boundaries

These functions cannot be activated alongside the legacy owner/direct attendance routes. Legacy writes do not create019 snapshots; mixed writers remain blocked by the full conversion/release gate. Public/RLS/storage/feedback/guardian/OCR conversion, independent resources, UI/context selection, existing-member role/capability management, migration/backup rehearsal and a separately authorized real Supabase staging project remain. The owner confirmed no separate staging project exists. Local PostgreSQL establishes transaction behavior, not real Supabase Auth/API/Storage/email or phone acceptance. No live setup script is being delivered for019.
