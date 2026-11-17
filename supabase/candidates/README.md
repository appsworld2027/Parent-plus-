# Isolated foundation candidates

`workspace_account_eligibility.sql` is an isolated F2 building block. It checks the current Auth account exists, has confirmed email, is not soft-deleted and has no current ban. It has no app-role execution grants, no public API, no ledger entry and no callers in current policies. It does not replace a complete session-revocation check or convert existing authorization. `tests/workspace-account-eligibility.test.ts` exercises synthetic Auth rows only; real Supabase Auth/session behavior is not established. Do not run this file on a live project.

These files are not production migrations or owner dashboard scripts. Do not run them on the live Supabase project.

202611170015_workspace_foundation.sql is the F1 structural candidate. Tests apply the existing001–014 migrations to disposable PostgreSQL, seed fictional data and apply the candidate twice. It adds private RLS-protected tables/mappings, with no public APIs or production015 ledger marker, and retains existing application authorisation and academy owner uniqueness. Existing owners get staged management membership only; no Coach profile or historical teacher is inferred.

The candidate deliberately lives outside supabase/migrations. Scoped permission APIs, provider integration in real Supabase staging, onboarding/picker, migration compatibility and production activation are later stages. The new tables are storage constraints, not a working or deployed membership authorisation engine.

See [implementation contract](../../docs/MULTI_WORKSPACE_FOUNDATION.md) and [release gates](../../docs/MULTI_WORKSPACE_VALIDATION.md). The actual owner-installed production schema remains001–014.
