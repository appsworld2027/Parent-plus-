# Portable service tests and coverage report

Authorized outcome: reproducible disposable Supabase tests and feature-by-feature coverage, portable through GitHub. Work stays on MM/development; no live database, users, mail, main release or candidates015–021 activation.

- [ ] Pin the CLI and isolate copied deployed001–014 migrations/config in ignored `.local-supabase/`; fail closed on other containers/endpoints. Keep production config unchanged.
- [ ] Start actual PostgreSQL/Auth/PostgREST/Storage/Mailpit through a labelled, loopback-bound Docker network. Capture boot failure honestly. `up`, `test`, `down` affect only this disposable project. Internal Docker networks suppress host port publishing here, so the bridge allows routing; strict request destinations/no provider configuration provide the application test boundary.
- [ ] Execute synthetic signup/confirmation/recovery, roster, explicit child connection/separate Coach approval, reviewed feedback, sibling/other-account isolation, revocation and private Storage scenarios. Sanitize results and never print auth links/keys.
- [ ] Document all58 catalogue items separately from active module tests and record gaps in real hosted/device/load acceptance; provide an account-transfer handoff command.
- [ ] Run relevant runner guards, existing regression checks and independent source review; commit/push only MM/development. Report exact evidence and remaining unrun scope.

Stable service scenario prefix `LOCAL-*`; guard scenario prefix `LOCAL-GUARD-*`. Acceptance: a clean checkout with Node24/Docker can launch without hosted credentials and run actual services; any nonlocal target/foreign container/different config is refused; a failed service/test produces nonzero exit plus sanitized evidence. Repeated runs use unique fictional users; teardown removes only owned disposable data. Existing fixture tests remain separate and unchanged. Local mail is not Gmail delivery; SDK/API tests are not an actual browser/device sign-off.
