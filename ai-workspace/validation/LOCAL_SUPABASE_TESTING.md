# Portable local Supabase testing

## What travels to another account

GitHub stores the pinned CLI dependency, test configuration, deployed migration source, synthetic integration journeys, existing application tests, coverage report and operating instructions. Another ChatGPT/Codex account needs access to this private repository and must check out **MM/development**. Account connections, a running workspace, Docker containers, local test mail, sessions and ignored files do not transfer automatically. A workspace with Node24, npm, Git and local Unix-socket Docker access can recreate the services with the commands below. A disconnected/replaced workspace can rerun setup; it needs no hosted Supabase credentials or extra hosted project.

This setup does not change the live application, production Supabase, real accounts or main. The current app deployment is a separate release decision. [Feature coverage](FEATURE_COVERAGE.md) lists the built and missing product slices; passing these tests does not mean all58 roadmap items are finished.

## Recreate and test

On a computer/agent workspace with Docker running, from the repository root:

```sh
git switch MM/development
git pull --ff-only origin MM/development
npm ci
npm run test:services:guards
npm run test:services
```

`test:services` starts actual PostgreSQL17, GoTrue Auth, PostgREST, private Storage and Mailpit, runs fictional-account API journeys, then removes its disposable containers/data even after test failure. First use downloads images and can take several minutes; Docker image-registry outages/rate limits are reported as environment blockers. Disk/memory/network capacity and local Docker permission are prerequisites. The locked CLI is3.2.0 with its official slim-image catalogue enabled to fit this workspace. The catalogue pins slim images to digests; Kong uses the CLI’s standard image. This Linux workspace is the first validation target; macOS/WSL2 bootstrap acceptance is unrun; native Windows is refused.

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
npm run export:android
```

The PostgreSQL command requires the isolated empty test database described in [workspace validation](MULTI_WORKSPACE_VALIDATION.md). It must not point at the local Supabase database or production. In this managed Linux workspace, use the cache/browser settings in [developer guide](../development/DEVELOPER_GUIDE.md); Docker and child-process checks may need the execution tool's local permission grant.

## Isolation and evidence

- Deployment configuration `supabase/config.toml` stays unchanged. The runner copies only deployed001–014 into ignored `.local-supabase/supabase/`; private candidates015–021 are excluded. Local migrations are real source files, not the PGlite Auth/Storage fixture.
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
Continue appsworld2027/Parent-plus- on MM/development only.
Read AGENTS.md, PROGRESS.md, ai-workspace/development/DEVELOPER_GUIDE.md,
ai-workspace/validation/FEATURE_COVERAGE.md and LOCAL_SUPABASE_TESTING.md.
Confirm commands/Docker work. Run npm ci, test:services:guards and test:services.
Use fictional accounts only. No hosted Supabase changes, real messages, main
promotion, branch deletion or new feature claims are authorized by this handoff.
Report exact source, passed/failed/blocked scenarios and remaining acceptance.
```


## Executed campaign —19November2026

[Sanitized committed evidence](evidence/local-supabase-20261119.json): source `a401e1a21afcaba78d7c985ccf60528b4d6c4d3c`, clean tree; `npm run test:services` exit0. Fresh setup,13/13journeys and cleanup all pass,32.426seconds total (setup26.174s, journeys2.835s, cleanup3.414s).78HTTP requests went to the local API/mail endpoints; none were blocked. All14source migration hashes and exact journey hash are in the artifact. Containers/project volumes/network were removed after this run. A separate deliberate nonlocal Docker attempt exited1, replaced the preceding passing report with0passed/1failed, and made no journey requests. The six guard checks pass, including effective port bindings and orphan-volume ownership. Existing fresh TypeScript and472Vitest cases pass with0failures/errors/skips (JUnit verified).

Independent source review: `/root/flow_review` inspected exact commita401e1a, reran6guards/syntax checks and found no unresolved material source blocker. Actual service campaign execution was by the implementer. The earlierd950 clean campaign passed too;687267b subsequently expanded inventory to include label-selected resources/foreign network attachments, and the finala401 campaign rechecks that version from empty services. Independent artifact read-back verifies clean-source identity, all13unique passes, all14migration/journey hashes and successful lifecycle. Daemon cleanup listing was observed by the implementer; reviewer access to the daemon was unavailable. Earlier full-image disk exhaustion, internal-network port suppression and inherited container proxy health403 were environment setup failures corrected before this clean run. No hosted provider or account was involved.
