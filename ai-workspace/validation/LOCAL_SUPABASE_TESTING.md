# Portable local Supabase testing

## What travels to another account

GitHub stores the pinned CLI dependency, test configuration, an allowlisted migration baseline, synthetic integration journeys, existing application tests, coverage report and operating instructions. This optional service harness is run from `AM/consolidated`; it uses fictional users and an isolated local stack. Account connections, a running workspace, Docker containers, local test mail, sessions and ignored files do not transfer automatically. A workspace with Node24, npm, Git, local Unix-socket Docker access and several GB of free disk space can recreate the services below. It needs no hosted Supabase credentials or extra hosted project.

This setup does not change a live app, either Supabase project, real accounts or production. Its allowlisted migrations are the Coach/Parent service baseline; the APVerse-specific Parent attendance and family-record migrations are intentionally outside this campaign. Passing these tests does not establish APVerse schema parity or prove every roadmap item is finished. [Feature coverage](FEATURE_COVERAGE.md) is a comparative inventory imported from MM development and must be read with that scope.

## Recreate and test

From the current `AM/consolidated` checkout, in a Linux workspace with local Docker running:

```sh
npm ci
npm run test:services:guards
npm run test:services
```

`test:services` starts actual PostgreSQL17, GoTrue Auth, PostgREST, private Storage and Mailpit, runs fictional-account API journeys, then removes its disposable containers/data even after test failure. First use downloads images and can take several minutes; Docker image-registry outages/rate limits are reported as environment blockers. Several GB of disk, memory/network capacity and local Docker access are prerequisites. The locked CLI is3.2.0 with its official slim-image catalogue enabled; the catalogue pins slim images to digests and Kong uses the CLI’s standard image. The runner currently checks for the original 14-migration service baseline; APVerse migrations live under a separate directory and are never copied into this baseline. Linux is the intended runner; macOS/WSL2 bootstrap acceptance is unrun; native Windows is refused.

For investigation, keep the local services running explicitly:

```sh
npm run test:services:up
npm run test:services:run
npm run test:services:down
```

Every test run creates unique fictional accounts and records. The mail viewer is http://127.0.0.1:54324 and the API is http://127.0.0.1:54321 while running. There is no Studio or app browser server in this API harness. Local emails are captured, not sent to Gmail. No card, hosted test-project creation, production secret or SQL-editor paste is required.

The existing browser suite remains a separate UI check:

```sh
npm run check
npx playwright install chromium
npm run test:e2e
npm run test:workspace:postgres
npm run export:web
```

APK/Android build and testing are retired. Vercel Preview deployment checks are a separate web release check and are not performed by this local service workflow.

The PostgreSQL command requires the isolated empty test database described in [workspace validation](MULTI_WORKSPACE_VALIDATION.md). It must not point at the local Supabase database or production. In this managed Linux workspace, use the cache/browser settings in [developer guide](../development/DEVELOPER_GUIDE.md); Docker and child-process checks may need the execution tool's local permission grant.

## Isolation and evidence

- Deployment configuration `supabase/config.toml` stays unchanged. The runner copies only its explicitly guarded 001–014 service baseline into ignored `.local-supabase/supabase/`; APVerse migration files and private candidates are excluded. Local migrations are real source files, not the PGlite Auth/Storage fixture.
- A fixed, labelled Docker project/network `parentplus-local-test` is dedicated and binds host ports to127.0.0.1. Remote Docker endpoints, foreign project containers/volumes, extra container networks, exposed ports, linked-project state and changed local config/migrations are refused. The Docker bridge permits outbound routing so the host CLI can publish/reach services; it is not a network firewall. Tests strip host proxy settings, restrict HTTP destinations and configure no external message/provider service. Fixed ports must be free. This harness is for one concurrent run per host.
- Local Auth requires actual confirmation. The journey reads the captured signup/recovery message and redeems the actual local link; it never administers another user's password or marks email verified with an admin shortcut. No SMS, external SMTP, OCR, AI, payments or WhatsApp provider is enabled.
- Local keys and CLI logs stay ignored under `.local-supabase/`; never commit/upload that directory. The test process restricts fetch destinations to the two exact local API/mail origins and does not print tokens/passwords/links. Service authority is not used to satisfy user-permission assertions.
- Sanitized scenario evidence is written to ignored `test-results/local-supabase.json`, with source SHA, dirty-state flag, runner hash, migration hashes, scenario results and explicit limits. A failed prerequisite blocks dependent scenarios; it does not award passes. Keep evidence outside a later Playwright run if needed, because Playwright clears `test-results/`.
- `test:services:down` removes only this project's disposable data/containers; cached images/private bootstrap logs remain. Never run `docker system prune`, global volume deletion, hosted `db reset`, `link`, `push` or migration commands to clean this setup.

## Acceptance boundaries

The new service scenarios cover real local Auth/email-link/password recovery, Coach roster writes, two private family children, intended verified guardian matching, an explicit child claim, retained separate Coach approval, reviewed feedback visibility, sibling/outsider denial, private Storage bytes and disconnect. Exact case results belong in the generated report and progress entry after an actual run.

Still separate: actual app-browser→local-service end-to-end wiring, production Site URL/SMTP configuration and real inbox delivery, the reported real account's intermittent batches/child mismatch, native camera/video/lifecycle/accessibility, third-party OCR extraction/billing, load/capacity, backup/restore drills, operational monitoring and unfinished product features. Run scoped real-account acceptance only with authorized inboxes/accounts and explicit provider actions. Never copy production family records into this stack.

## Handoff text for a new agent/account

```text
Continue appsworld2027/Parent-plus- on AM/consolidated only.
Read AGENTS.md, PROGRESS.md, ai-workspace/development/DEVELOPER_GUIDE.md,
ai-workspace/validation/FEATURE_COVERAGE.md and LOCAL_SUPABASE_TESTING.md.
Confirm commands/Docker work. Run npm ci, test:services:guards and test:services.
Use fictional accounts only. No hosted Supabase changes, real messages, main
promotion, branch deletion or new feature claims are authorized by this handoff.
Report exact source, passed/failed/blocked scenarios and remaining acceptance.
```
