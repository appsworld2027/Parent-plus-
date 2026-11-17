# Parent attendance integration: isolated implementation

17 November 2026. Working branch `AM/consolidated`. No merge into other branches or live SQL activation is authorized by this checkpoint.

## Product and source traceability

Port the source's child-scoped saved-session/attendance read as a destination-native implementation, preserving the distinction between an unrecorded mark and absence. Source reference: AM `380adba9f73b3021a787dff72074df57f2a53634`, `apps/web/src/modules/parent-feed/contracts.ts`, `parent-home.tsx`, migration053 and DEC-024. The Monday/date utility and strict response-decoding approach are adapted into `src/parent/attendance.ts`. The Next.js screen and source SQL history are not copied.

User journey to deliver: select own family child → view approved academy classes on their academy-local date → see saved attendance or unrecorded → page through the saved results. Parent signals, weekly totals and a complete screen remain separate unfinished parts of the source feature. Reports must never write attendance or assert physical handover.

## Database implementation

`supabase/candidates/parent_attendance_projection.sql` defines a private function after001–014 plus F1/F2 candidates. It derives student/academy from active links owned by the current family account, requires an approved request and current verified intended email, filters archived child/student/batch, checks date-effective enrolment and returns at most50 ordered rows. Keyset cursor is starts_at + session_id and requires both fields. The result excludes contacts, fees, private observations and other families. No public execution grants, migration ledger entries or existing policies are changed.

Tests create links using actual014 invite/claim/Coach-review functions with fictional accounts. The projection passes its initial12cases after failing when absent. Tests include wrong/guessed child, disconnect, changed email, ban, academy timezone/day boundaries, nullable attendance, 55-row pagination, malformed cursor and denied client roles. Fixtures do not prove real provider identity or concurrent revocation. The read has no lock-serialized revocation/instant-erasure guarantee.

## App contract and remaining gates

`src/parent/attendance.ts` whitelists returned fields, rejects malformed/duplicate/unordered/oversized pages and preserves null attendance. Monday calculation includes real-calendar validation. It currently has no network or UI callers. Public API exposure, in-flight child/account switching guards, sibling/multi-academy/ambiguous links, full negative/concurrency cases, performance/index review, Supabase staging, migration/restore acceptance and browser/device journeys remain before enablement. A copied utility or a private SQL test is not a completed Parent attendance feature.

No live database or source code was modified. Existing accounts, schema001–014 and application behavior remain authoritative.

## Local execution evidence

`npm run check` passed TypeScript and335tests across35files in50.80seconds, including12new SQL projection cases and12contract/date cases. The SQL tests first failed because the function was missing, then passed after implementation. The first combined check found test result typing errors; those were corrected before the successful complete run. `git diff --check` passed. No UI or runtime caller changed, so browser/export suites were not repeated for this isolated preparation. Hosted/provider/concurrent-read and real-device acceptance are not claimed.
