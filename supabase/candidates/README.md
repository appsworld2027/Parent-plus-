# Isolated foundation candidates

These files are not production migrations or owner dashboard scripts. Do not run them on the live Supabase project.

202611170015_workspace_foundation.sql is the F1 structural candidate. Tests apply the existing001–014 migrations to disposable PostgreSQL, seed fictional data and apply the candidate twice. It adds private RLS-protected tables/mappings, with no public APIs or production015 ledger marker, and retains existing application authorisation and academy owner uniqueness. Existing owners get staged management membership only; no Coach profile or historical teacher is inferred.

202611170016_workspace_authorization.sql adds an isolated F2 permission kernel and owner-only membership/assignment revocation functions. It applies after F1, enables no public API or client execution/table grants, and keeps the production migration ledger unchanged. It is tested in disposable PGlite and independent real PostgreSQL sessions. [Kernel QA](../../docs/WORKSPACE_AUTHORIZATION_QA.md) documents account/assignment/history rules, lock protocol and the remaining coverage.

Both candidates deliberately live outside supabase/migrations. Complete scoped API/storage conversion, provider integration in real Supabase staging, onboarding/picker, migration compatibility and production activation remain. A tested private decision kernel does not make the live app membership-authorised.

See [implementation contract](../../docs/MULTI_WORKSPACE_FOUNDATION.md) and [release gates](../../docs/MULTI_WORKSPACE_VALIDATION.md). The actual owner-installed production schema remains001–014.
