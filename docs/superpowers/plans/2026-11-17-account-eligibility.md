# Private account eligibility: implementation and review notes

Goal: implement the account-eligibility predicate required by the multi-workspace contract without changing current runtime access. Scope: isolated SQL candidate and actual SQL/role tests; no live migration.

Current ownership helpers check resource ownership but do not themselves establish verified/enabled account status. F2 requires an eligibility check in every relevant academic and private-family path; adding an unused helper is only its first building block.

Implemented files: `supabase/candidates/workspace_account_eligibility.sql`, `tests/workspace-account-eligibility.test.ts`. The private security-definer predicate accepts no target user ID and derives identity from `auth.uid()`, uses an empty search path and revokes execution from PUBLIC, anon, authenticated and service_role. Privileged tests exercise the predicate; app-role tests prove it is not exposed. Candidate applies twice in the disposable fixture. No installed migration or legacy helper is modified.

Test-first evidence: initial targeted run had 8 failures because the helper was absent; after implementation all 10 cases passed. Cases cover verified, unverified, currently banned, expired ban, deleted, removed and missing identity, plus three denied caller roles. Full regression evidence belongs to the current execution/PR report. Tests use PGlite and synthetic identity claims; they do not prove real JWT/session behavior or independent concurrent transactions.

Fresh local regression: `npm run check` passed TypeScript and 255 tests across 31 files in 43.37 seconds. `git diff --check` passed. Browser and exports were not repeated for the unused isolated SQL helper; no app/UI/runtime path changed.

Remaining review: account eligibility must be integrated consistently across public RPCs, direct table policies, views and storage; otherwise an unconverted path can bypass it. Strict sign-out/session revocation requires a separate session policy and real-provider tests. This predicate deliberately does not claim that checking account status invalidates every previously issued JWT. Statement-time ban evaluation does not establish concurrent revocation serialization. No complete F2 authorization engine or production security fix is claimed.
