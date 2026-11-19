# Portable service tests and coverage report

Authorized outcome: reproducible disposable Supabase tests and feature-by-feature coverage, portable through GitHub. Implementation is ported to AM/consolidated; it uses a disposable local stack and does not change live databases, real users, mail providers, production or candidate migrations.

- [x] Pin the CLI and isolate copied deployed001–014 migrations/config in ignored `.local-supabase/`; fail closed on other containers/endpoints. Keep production config unchanged. The allowlist intentionally excludes APVerse migrations.
- [x] Implement disposable PostgreSQL/Auth/PostgREST/Storage/Mailpit setup, loopback-only published services and owned-resource teardown. Never execute this against a hosted project.
- [ ] Execute synthetic Auth, roster, explicit child connection/separate Coach approval, reviewed feedback, sibling/other-account isolation, revocation and private Storage scenarios. **Blocked in this workspace:** 84 MB free disk; Docker images plus services need several GB. No containers were created.
- [x] Import the 58-item feature coverage index and document source-branch baseline, AM/APVerse verification boundaries, non-APK web checks and account-transfer commands. The product inventory itself remains comparative and requires AM-specific feature review.
- [x] Run available validation: 6 runner guard tests, TypeScript/lint, 556 automated tests, 111/112 full browser tests plus a passing focused rerun of the one ENOSPC case, 22 quality-control tests and web export. The PostgreSQL concurrency suite was not run because its safe loopback test database is not configured.
- [ ] Independent review of this exact harness integration, local service campaign and hosted CI evidence; record after push. No live database changes or production release.

Stable service scenario prefix `LOCAL-*`; guard scenario prefix `LOCAL-GUARD-*`. Acceptance: a clean checkout with Node24/Docker can launch without hosted credentials and run actual services; any nonlocal target/foreign container/different config is refused; a failed service/test produces nonzero exit plus sanitized evidence. Repeated runs use unique fictional users; teardown removes only owned disposable data. Existing fixture tests remain separate and unchanged. Local mail is not Gmail delivery; SDK/API tests are not an actual browser/device sign-off.
