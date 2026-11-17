# Private class roster projection checkpoint

Goal: prepare the first narrow roster read for the existing F2 authorization kernel, keeping contact, finance and unrelated student data outside the instructor projection. Contract: `ai-workspace/architecture/MULTI_WORKSPACE_FOUNDATION.md` permissions and `ai-workspace/validation/MULTI_WORKSPACE_VALIDATION.md` MW-11/MW-12. Only a private isolated candidate is delivered.

Files: `supabase/candidates/workspace_class_roster.sql`, `tests/workspace-roster-projection.test.ts`. The projection derives academy and batch from the mapped class, calls the kernel's roster check and returns only student UUID/name. It filters archived students and enrolment dates using the existing academy timezone and inclusive date semantics. Unauthorized/missing/unassigned class uses the same generic permission error. No policy, public API, app service or installed migration is modified. Client/service execution is revoked.

Test-first evidence: nine targeted failures established missing-function behavior; after implementation all initial 11 cases passed. A further test covers UTC/local-day divergence and enrolment boundaries. The file applies twice inside disposable PGlite. Synthetic role/identity fixtures do not establish signed JWT, real API or concurrent revocation semantics. No new test database is provisioned in Supabase.

Remaining conversion work: a bounded/paged projection, endpoint integration, direct-table policy/grant review, sibling and multi-branch cases and provider/concurrency validation. Read authorization can race with later revocation; this projection makes no instant-erasure or lock-serialized read guarantee. The current app still uses its existing ownership reads. Do not expose this candidate in isolation or claim F2 complete.

Fresh local verification: `npm run check` passed TypeScript and 311 tests in 33 files, including 12 projection cases, in 50.25 seconds. `git diff --check` passed. No browser/export check was repeated for this private SQL-only addition with no runtime callers. Independent PostgreSQL transaction/provider checks have not been rerun for the new projection.
