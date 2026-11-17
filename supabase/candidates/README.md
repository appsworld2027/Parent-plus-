# Isolated foundation candidates

`parent_attendance_projection.sql` is a private destination-native Parent session/attendance read adapted from AM's source journey. It requires the F2 account helper and installed014 link structures, with no direct client execution. `parent_attendance_api.sql` separately exposes its approved-child read to authenticated users only inside an isolated staging candidate. A development/test-only app panel can call that wrapper; default/production remains disabled. Neither candidate has been applied live. See [integration scope and release gaps](../../docs/PARENT_ATTENDANCE_INTEGRATION.md).

`workspace_class_roster.sql` adds a private instructor/manager projection after the F1 and F2 kernel candidates. It returns only IDs and names for active students enrolled on the academy-local class day, after the kernel's roster permission check. It grants no client execution and does not replace current app reads. Its dedicated tests cover authorization, membership/account rejection, archive/date filtering and timezone boundaries. This is not a live migration or a complete roster conversion; pagination/capacity and real-provider/concurrent-read acceptance remain future gates.

`workspace_account_eligibility.sql` is the retired standalone prototype, retained as a compatibility check. Apply the isolated F1/F2 candidates first in disposable tests; this file now asserts the canonical F2 helper is present and never creates/replaces it. This prevents branch integration from restoring the older weaker eligibility rule. `tests/workspace-account-eligibility.test.ts` exercises the canonical helper with synthetic Auth rows and verifies replay cannot downgrade it. There is no public API, live ledger entry or production activation. Do not run this file on a live project.

These files are not production migrations or owner dashboard scripts. Do not run them on the live Supabase project.

202611170015_workspace_foundation.sql is the F1 structural candidate. Tests apply the existing001–014 migrations to disposable PostgreSQL, seed fictional data and apply the candidate twice. It adds private RLS-protected tables/mappings, with no public APIs or production015 ledger marker, and retains existing application authorisation and academy owner uniqueness. Existing owners get staged management membership only; no Coach profile or historical teacher is inferred.

202611170016_workspace_authorization.sql adds an isolated F2 permission kernel and owner-only membership/assignment revocation functions. It applies after F1, enables no public API or client execution/table grants, and keeps the production migration ledger unchanged. It is tested in disposable PGlite and independent real PostgreSQL sessions. [Kernel QA](../../docs/WORKSPACE_AUTHORIZATION_QA.md) documents account/assignment/history rules, lock protocol and the remaining coverage.

Both candidates deliberately live outside supabase/migrations. Complete scoped API/storage conversion, provider integration in real Supabase staging, onboarding/picker, migration compatibility and production activation remain. A tested private decision kernel does not make the live app membership-authorised.

See [implementation contract](../../docs/MULTI_WORKSPACE_FOUNDATION.md) and [release gates](../../docs/MULTI_WORKSPACE_VALIDATION.md). The actual owner-installed production schema remains001–014.
