# Parent attendance integration: isolated implementation

**Current status, 17 November 2026:** the standalone reader migration20261117090944 is installed in Destination and grants were verified. App UI is opt-in development/test; F1/F2 staff candidates remain isolated. Earlier preparation sections below are historical; the live activation section records the current evidence.

17 November 2026. Working branch `AM/consolidated`. No merge into other branches or live SQL activation is authorized by this checkpoint.

## Product and source traceability

Port the source's child-scoped saved-session/attendance read as a destination-native implementation, preserving the distinction between an unrecorded mark and absence. Source reference: AM `380adba9f73b3021a787dff72074df57f2a53634`, `apps/web/src/modules/parent-feed/contracts.ts`, `parent-home.tsx`, migration053 and DEC-024. The Monday/date utility and strict response-decoding approach are adapted into `src/parent/attendance.ts`. The Next.js screen and source SQL history are not copied.

Development/test journey: select own family child → view approved academy classes on their academy-local date → see saved attendance or unrecorded → page through the saved results. Parent signals and weekly totals remain unfinished parts of the source feature. Reports must never write attendance or assert physical handover.

## Database implementation

`supabase/candidates/parent_attendance_projection.sql` defines a private function after001–014 plus F1/F2 candidates. It derives student/academy from active links owned by the current family account, requires an approved request and current verified intended email, filters archived child/student/batch, checks date-effective enrolment and returns at most50 ordered rows. Keyset cursor is starts_at + session_id and requires both fields. The result excludes contacts, fees, private observations and other families. No public execution grants, migration ledger entries or existing policies are changed.

Tests create links using actual014 invite/claim/Coach-review functions with fictional accounts. The projection passes its initial12cases after failing when absent. Tests include wrong/guessed child, disconnect, changed email, ban, academy timezone/day boundaries, nullable attendance, 55-row pagination, malformed cursor and denied client roles. Fixtures do not prove real provider identity or concurrent revocation. The read has no lock-serialized revocation/instant-erasure guarantee.

## APVerse database parity slice —17November2026

Live metadata inspection confirms APVerse already has its own Parent academic reader: authenticated-only `app_parent_sessions(child, workspace, local date, optional batch, cursor)`. It verifies the current guardian/workspace relationship through `attendance_parent`, then returns up to50 ordered session rows with attendance, enrollment, signal and next-cursor metadata. APVerse stores children/guardianships/workspace-child links; MM's installed reader instead resolves private `family_children` and `parent_coach_links`. These are separate identity models and their migration histories must not be combined.

Added `src/parent/apverseAttendance.ts` as a contract adapter for that existing APVerse RPC. It verifies the signed-in account, validates dates and cursors, converts only the allowlisted display fields, and rejects malformed pages. Shared attendance decoding now preserves APVerse's additional `excused` and `make_up` outcomes; the Parent screen labels make-up attendance clearly. Tests cover the real RPC parameter contract, ordered 50-row paging, unrecorded/late/excused/make-up outcomes, malformed responses and account changes. These are local mocked-client tests; no real Parent session or APVerse write was made.

Exact local verification on this adapter checkpoint: `npm run quality:run` passed 7 quality-gate self-checks, lint, TypeScript, **486 unit/database tests**, **92 Playwright browser scenarios** and web export; the source-bound receipt verified all486/92 runtime test identities. Tests cover cross-workspace chronological merge, a global paging cursor, MM-to-workspace normalization, and excused/make-up outcomes. The browser case confirms a make-up outcome is visible without changing attendance. Browser/API journeys use fictional transport, and the adapter itself uses a mocked Supabase client. No live child record was read by the app.

The adapter now enumerates the child's authorized APVerse workspaces and merges their session streams with one global cursor, but it is not connected to the screen yet. The current Parent UI gets child identity/profile data from MM's private-family model; AM must switch to APVerse child creation/listing and preserve private family profile details without treating Coach workspaces as family ownership. Remaining before the AM endpoint can change: the other Coach/Parent RPC adapters, AP child/profile integration, all-flow regression and correct AM-only Vercel environment. Non-AM branches remain on MM. Do not switch the runtime project setting early.

## App contract and remaining gates

`src/parent/attendance.ts` whitelists returned fields, rejects malformed/duplicate/unordered/oversized pages and preserves null attendance. Monday calculation includes real-calendar validation. `attendanceService.ts` verifies the expected current account before calling the staging API and rejects reversed/repeated cursor pages. `ParentAttendance.tsx` provides date selection, refresh, loading/error/empty states and paging. An owner/child/link keyed instance and request generations discard old child/date responses. No records are persisted by this reader. Class times are explicitly labeled UTC; date selection uses academy-local dates on the server.

The panel is gated by `EXPO_PUBLIC_ENABLE_PARENT_ATTENDANCE=true` AND a non-production environment, current approved link and014identity readiness. The flag controls visibility only; database authorization remains authoritative. Default is disabled. The Playwright test runner enables the flag with fictional transport. Do not enable it against a hosted project before the exact candidate/staging review.

`supabase/candidates/parent_attendance_api.sql` is a separate isolated API wrapper after001–014, F1/F2 and the private projection. Authenticated users may execute the wrapper in that disposable database; the private projection remains inaccessible. Ordinary callers are filtered by the same actual approved-link/account checks. Anon/service execution is revoked. This staging candidate is not a production migration and has not been installed in Supabase.

Remaining before live enablement: real-provider session checks, complete sibling/multi-academy lifecycle scenarios, concurrent disconnect/revocation review, performance/index review, Supabase staging, migration/restore acceptance and device journeys. No complete F2 conversion or source feature parity is claimed.

No live database or source code was modified. Existing accounts, schema001–014 and application behavior remain authoritative.

## AM development-preview verification

The API wrapper, account-checked service and native panel pass the current local checks: TypeScript;338unit/database tests in35 files (98.29s);89 Playwright browser cases (4.1minutes), including failed refresh/retry and a deliberately delayed previous-child response; Expo web and Android JS exports; and whitespace validation. Final typecheck passes after the UI guard review. The wrapper tests verify ordinary authenticated own-child success, foreign-child empty response, and anon/service-role denial. Applying the transactional candidate inside a test originally committed the fixture and invalidated its local identity; setup was corrected to apply candidates before transactional test data. Browser responses use the existing synthetic in-page network fixture, not a live Supabase provider. The two focused new browser cases passed before the complete browser run. Build results are exports, not a new installed APK.

No hosted CI run, real-provider test, new independent PostgreSQL race check, staging migration or live activation is claimed for this preview. The existing private-kernel race evidence does not substitute for testing this new API under concurrent link/account changes.

## Earlier isolated checkpoint evidence

`npm run check` passed TypeScript and335tests across35 files in50.80seconds, including12new SQL projection cases and12contract/date cases. The SQL tests first failed because the function was missing, then passed after implementation. The first combined check found test result typing errors; those were corrected before the successful complete run. `git diff --check` passed. No UI or runtime caller changed at that earlier checkpoint, so browser/export suites were not repeated then. The development-preview verification above supersedes this preparation-time scope.

## Authorized activation preparation — 17 November 2026

Current owner instruction authorizes Destination DB changes. The standalone CLI-generated migration 20261117090944_parent_attendance_read removes the reader's dependency on unfinished F1/F2 candidates. It uses a private eligible-account guard and exact approved request/link/family/student/academy identity matching, retains014 intended-email requirements, and exposes only whitelisted session/attendance facts. It is additive and leaves existing workflows/UUIDs/tables intact. Apply only after 014; no Source migration history is imported. Status remains preparation until actual test/live evidence is recorded below.

Acceptance: ordinary approved own-child read; unrecorded remains null; deterministic cursor; archived/ended/disconnected/changed-email/withdrawn or mismatched-sibling approval deny; banned/deleted/anonymous/unconfirmed/future-confirmed users deny; private helpers inaccessible; public function authenticated-only. SQL failures or migration lock timeout roll back the package. Feature visibility remains opt-in and non-production while provider/device gates remain open. A lock-free read does not promise instant erasure of already delivered data.

Rollback/repair: disable the optional attendance preview in build configuration; revoke authenticated execution of the new public reader if necessary. Existing001–014 flows continue. Prefer reviewed forward repair; do not roll back family links or restore an old DB over new writes. Rerunning the migration is tested idempotently.

## Live Destination activation — 17 November 2026

Owner-authorized migration `20261117090944_parent_attendance_read.sql` applied successfully to Destination zcgcnycnanqkbdlwojln after installed014. The custom app ledger now records 20261117090944. The MCP initially registered standard migration timestamp 20261117093415; its single stored SQL statement MD5 exactly matched the reviewed file (`c28835e951b1ed6b2e13f7c4e140cebb`). Only that new registration was normalized to the CLI-created file version 20261117090944; no legacy or Source history was marked applied. Legacy001–014 remain tracked in the existing custom ledger; do not run a blind CLI db push before its deliberate baseline reconciliation.

Post-activation catalog: public reader exists; authenticated execute=true; anon/service execute=false; private authenticated execute=false. Platform rls_auto_enable anon/authenticated execute=false, ensure_rls event trigger remains enabled. Supabase no longer reports the anonymous security-definer warning; leaked-password protection still needs Auth configuration work. The real anonymous PostgREST request returns401/42501. Initial direct Node networking was unavailable; the successful probe used the managed environment proxy and no account/token/data writes.

Before/after aggregate counts match for students, sessions, attendance, families, children and links. No business row, Auth account, UUID or legacy policy was rewritten. App exposure remains opt-in development/test; native/provider/real signed-parent acceptance remains open. Existing001–014 behavior remains authoritative for all other features. F1/F2 staff candidates are not installed by this migration.

Fresh local proof: lint/types,348 unit/database cases and89 browser scenarios plus web/Android JS exports passed through quality:run with exact runtime identities and receipt. Seven gate self-tests,24focused Parent SQL cases and12diagnostic cases passed. A separate real PG17 runner verifies migration replay, genuine014 approval creation, own/null attendance, wrong/banned actor, endpoint/private/platform privileges, lack of staff-schema dependency and rollback cleanup;8 workspace transaction races also passed. These use fictional local identities; no real account or provider acceptance is implied. A failing regression reproduced historical preview SQL overwriting the stronger reader; retired files are now non-mutating compatibility sentinels and the regression passes.
