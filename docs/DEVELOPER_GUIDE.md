# Developer handover and working agreement

**Current engineering entrypoint, 17 November 2026:** read section 10, “Rigorous feature delivery for every Codex session,” for the reusable delivery/test procedure and document ownership map. All new work remains on `AM/consolidated`; historical main-promotion and Parent-deferral instructions do not override the current task. The code gap audit is in the existing [system comparison](PARENTPLUS_SYSTEM_COMPARISON.md#5-code-gap-audit--refreshed-17-november-2026). No new runtime quality automation is installed by these instructions.

**F2 execution checkpoint,17November2026:** private `202611170016_workspace_authorization.sql` adds the decision kernel and owner-only revocations, with no client/public activation. Read [kernel QA](WORKSPACE_AUTHORIZATION_QA.md) before using its helpers. Current-note reads end with the assignment access window; historical grants cannot reveal drafts. Protected writes/revocations share workspace→actor locks after any required legacy locks, recheck authority and support READ COMMITTED only. `npm run test:workspace:postgres` uses an explicitly configured empty disposable database; CI has a separate PG17 service. All36public RPCs/direct grants/storage still need complete conversion. No new owner SQL is ready.

**Robust foundation direction,17November2026:** read [MULTI_WORKSPACE_FOUNDATION.md](MULTI_WORKSPACE_FOUNDATION.md) and [MULTI_WORKSPACE_VALIDATION.md](MULTI_WORKSPACE_VALIDATION.md). Owner authorised continuing after Supabase clarification. A private F1candidate exists only under supabase/candidates/ and runs in disposable tests; do not present it as an owner script or live015. Current001–014 permissions/app remain. F2server authorisation must cover all36public RPCs/direct grants/storage and server account eligibility before enabling memberships. Never auto-infer old teachers or give a legacy admin an invented Coach identity. Real Supabase staging/prod activation will need authorised access; none is configured here. Guardian privacy choice remains pending and blocks guardian expansion, not independent F1/F2work.

**Guardian identity hardening0.13:** owner explicitly authorised “Close the Gap.” See [PARENT_IDENTITY.md](PARENT_IDENTITY.md). Only new SQL014 is required after installed001–013; previous no-new-SQL wording refers to0.12. It binds verified guardian email and requires Coach approval before feedback release, including same-login tests. Owner-confirmed014 is now API-visible (17November2026): new approval table and both request RPCs reject anonymous access with401/42501. Do not rerun SQL. Signed-in live class/approval/Parent acceptance remains next.

**Same-login feedback journey0.12:** see [SAME_LOGIN_FEEDBACK_FLOW.md](SAME_LOGIN_FEEDBACK_FLOW.md). Reuses installed001–013 and existing verified Auth/RLS/invitation RPCs; do not request another Supabase script. Parent web guides profile/child selection from the Coach’s saved review and rejects another account’s link.

**Signup/relationship follow-up,16November2026:** role-specific /coach/signup and /parent/signup entry; shared Auth remains. Read [database relationship review](DATABASE_RELATIONSHIP_REVIEW.md) for supported combinations, migration013 lifecycle constraints and remaining guardian/staff limits. The candidate owner package is now supabase/update_011_013.sql; never send the superseded011/012-only package for this candidate. Live011–013 installation is owner-confirmed by screenshot; anonymous API reads are denied on all nine new tables. Do not rerun SQL. Next: actual signed-in save/reopen and reviewed feedback acceptance.

**Later owner authorisation,16November2026:** build the separate Aurora Parent workspace on the same Supabase/Auth project. Both original prototypes are now in docs/prototypes/. Read [PARENT_PRD.md](PARENT_PRD.md) and [PARENT_MODULE.md](PARENT_MODULE.md). This supersedes older parent-app deferral language; it does not activate device push, real payments or public release.


**Current owner priority (16November2026):** feedback-first, easy batch/class setup, coach-reviewed WhatsApp, held Parent snapshots and consented class media. Fee collection/gateway work is shelved. This supersedes older payment-first sequencing and no-parent-sharing exclusions below. See [current reset](COACH_FEEDBACK_RESET.md) and PRD1.6. The owner has now provided the original Coach and Aurora references in docs/prototypes/; use these for visual alignment.


Reviewed: 12 November 2026. Start with [current progress](../PROGRESS.md), then [how the system works](ARCHITECTURE.md). The owner has explicitly resumed feature development while postponing Windows-emulator setup. Phone-control automation remains on hold. Read the current checkpoint before taking action; development resumes do not authorize payment activation or parent delivery.

## 1. Read in this order

1. [PROGRESS.md](../PROGRESS.md): current source/build, verification limits, blockers and next steps.
2. [PRD.md](../PRD.md): product requirements and acceptance criteria.
3. [ARCHITECTURE.md](ARCHITECTURE.md): current runtime/data/build flows, with diagrams. [Product decisions](PRODUCT_DECISIONS.md) explains the current tradeoffs.
4. [BUILD_PLAN.md](../BUILD_PLAN.md): module sequence and test gates.
5. [VALIDATION.md](VALIDATION.md) and [ISSUES.md](ISSUES.md): actual test/build evidence and known failures. Older entries are history; read the dated follow-ups.
6. Follow the relevant entry point in the map below, then its tests and migration.

## 2. Source map

| File/directory | Responsibility | Read alongside |
| --- | --- | --- |
| `index.ts` | Crypto initialization order and app registration | `src/auth/installCrypto.ts` |
| `App.tsx` | Workspace shell, tab navigation, support, roster navigation guards | `src/ui/ConfirmDialog.tsx`, `e2e/foundation.spec.ts` |
| `src/config.ts`, `config/public-client.json` | Validate public connection/environment settings | `tests/config.test.ts`, `.env.example` |
| `src/version.ts`, `app.json`, `app.config.js` | Version/revision labels and preview application ID | APK build script and validation record |
| `src/auth/AuthGate.tsx` | Login/signup/recovery forms, academy form and screen selection | `e2e/auth.spec.ts`, `tests/auth.test.ts` |
| `src/auth/AuthProvider.tsx` | Session/academy state, auth events, callbacks and refresh | `src/auth/rules.ts`, `src/auth/client.ts` |
| `src/auth/client.ts` | Single SDK client, storage selection and bounded request timeout | Public config and session adapter |
| `src/auth/storage.ts` | Serialized, chunked session persistence | `tests/auth.test.ts` |
| `src/auth/cryptoSupport.ts`, `installCrypto.ts` | Native Expo crypto adapter for SDK PKCE | `tests/crypto.test.ts` |
| `src/roster/RosterScreen.tsx` | Student/batch forms, search, load/save state and guards | `e2e/roster.spec.ts` |
| `src/roster/model.ts` | Data shapes, input validation and integer money conversion | `tests/roster.test.ts` |
| `src/roster/service.ts` | Roster query/RPC boundary and safe errors | Migration 002 and database tests |
| `src/ui/ActionFeedback.tsx` | Fixed in-app result notification, scoped publishers and accessible Dismiss | `e2e/feedback.spec.ts`, [feedback design](ACTION_FEEDBACK.md) |
| `src/diagnostics.ts`, `src/deviceStorage.ts`, `src/ErrorBoundary.tsx` | Validated device-persisted diagnostic metadata, storage fallback and render recovery | `tests/diagnostics.test.ts`, foundation browser checks |
| `src/classes/ClassesScreen.tsx`, `model.ts`, `service.ts` | Dated classes, attendance, timezone/eligibility logic and trusted API calls | `tests/classes.test.ts`, `classes-database.test.ts`, `e2e/classes.spec.ts` |
| `src/classes/drafts.ts`, `localDrafts.ts` | One scoped device attendance draft, serialized cleanup | Device storage, auth sign-out and draft tests |
| `src/classes/TodayClasses.tsx` | Today figures from real session records | Class service and attendance browser journey |
| `supabase/migrations/` | Versioned database schema, policies, trusted operations | `tests/database.test.ts` and deployment instructions |
| `tests/native-accessibility.test.ts` | Check literal roles against actual RN Android supported enum | ANDROID-001; web/type checks alone missed this |
| `e2e/support/backend.ts` | Fictional SDK transport for browser flows | Never deploy as a live backend |
| `.github/workflows/checks.yml` | Browser/automated/export pipeline | `playwright.config.ts` |
| `.github/workflows/android-preview.yml` | Native preview build and evidence | `scripts/install-android-sdk.py`, `build-android-preview.py` |
| `scripts/build_support.py`, `test_android_installer.py`, `test_apk_architectures.py` | Safe build-error redaction, installer checks and APK ABI/ELF verification | BUILD-002 in ISSUES.md |
| `scripts/check-live-auth.mjs` | Read-only live settings/security probe | Its safe boolean report; not a user login test |
| `scripts/github-build-status.cjs` | Publish per-revision start/final reports over Git | `build-status` branch, not app data |
| `scripts/diagnose-build.cjs` | Historical diagnostic experiment | Not invoked by the current Android workflow |

The HTML references define product/design intent. The working app is native React Native components. Generated `android/` and `ios/` folders are ignored; durable changes belong in app config, plugins or documented scripts, not only generated output.

## 3. Local setup

Use Node 24, npm and Python 3. Run commands from the repository root.

```sh
npm ci
npm run check
npx playwright install chromium
npm run test:e2e
python3 scripts/test_android_installer.py
npm run export:android
npm run export:web
```

`npm ci` honors the lockfile. Public project defaults are bundled. A local `.env.local` can override public values; it is optional, ignored by Git and must not contain server secrets in public variables. `EXPO_PUBLIC_APP_ENV=development` enables developer preview controls; unknown/unset values default to production. Do not infer backend staging/live separation from this UI environment flag: the configured URL determines the backend.

For this managed workspace, use the writable npm cache:

```sh
npm_config_cache=/tmp/parentplus-npm-cache npm run check
EXPO_OFFLINE=1 EXPO_NO_TELEMETRY=1 npm_config_cache=/tmp/parentplus-npm-cache PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e
```

Expo offline mode skips metadata requests; it does not replace the backend or bypass TLS. Playwright starts its own Expo server on port 18081 and refuses an existing server. If a previous test process still owns the port, inspect it before stopping only that test process. Do not reuse an unknown server.

For interactive local UI work, `npm run web` or `npm start` runs Expo. Bundle exports are not APKs. For native previews use [the existing GitHub workflow](ANDROID_PREVIEW.md), whose environment provisions the SDK/Java/Gradle requirements. The build script regenerates native output with `prebuild --clean`. Do not run it over uncommitted manual native edits.

## 4. Database changes and deployment

- Migration 001 is confirmed installed. Do not tell the owner to recreate the project or rerun the initial setup.
- The owner has confirmed migration versions 001–004 installed via the filtered four-row dashboard result. Do not ask for repeat setup. Use [CLASS_SETUP.md](CLASS_SETUP.md) for the pending app/API and phone acceptance.
- The owner can use the generated `supabase/setup_after_001.sql` bundle from `npm run prepare:owner-sql`. `node scripts/prepare-owner-sql.mjs --check` verifies it without editing files.
- Preserve deployed migration history. Future behavior/schema changes need a new numbered migration, review of data preservation and corresponding database tests.
- Database tests use disposable PGlite plus simulated Supabase auth roles. They do not inspect or mutate the real project. PGlite success must be followed by relevant real API/device acceptance.
- SQL RPC means a named database function called through the API. `create_academy`, `save_student`, `archive_student`, `save_class_session` and `save_class_attendance_checked` are client function names after migrations 003/004. The old `save_attendance` and `save_class_attendance` become internal helpers; clients cannot bypass revision/context checks through them.
- Row Level Security (RLS) restricts rows an account may access. UI filters are convenience, not security. Privileged functions must validate ownership and use restricted execution/search-path privileges.
- Current scope is one owned academy per account. Parent contacts do not create authenticated parent identities. Changing either assumption needs a product/data-model decision, not just a UI change.

## 5. Testing and acceptance evidence

| Check | What it establishes | What remains separate |
| --- | --- | --- |
| TypeScript | Compile-time compatibility | Native/runtime behavior |
| Vitest unit checks | Validation, storage/crypto/diagnostics logic | Actual device modules and provider behavior |
| PGlite integration checks | SQL integrity, transactional behavior and emulated identity isolation | Deployed Supabase/API configuration and real identities |
| Native role source-contract check | Literal accessibility props accepted by installed Android enum | Actual screen/device rendering and other native failures |
| Playwright fictional-backend flows | Browser UI and real SDK interactions against fixtures | Real emails, real database, Android lifecycle/keyboard/storage |
| Android/web export | Target bundle can be produced | Native APK compilation, install or device acceptance |
| GitHub native build | APK compiled, signature verified, source/digest recorded | Launch, real user flows, production signing or Play approval |
| Live settings probe | Key/settings accepted and anonymous profile access denied | Registered-user access isolation, email flow or payment correctness |
| Guided phone acceptance | The specified real device/user journey works | Scenarios not actually exercised |

Candidate 0.3.0: TypeScript, 79 automated tests and 26 browser checks passed locally; both target exports pass. Its final native build and signature verification passed in run 43164824902, source 80bf1e7. Phone confirmation of the original repair and new workflows remains pending. Link new evidence in VALIDATION.md with source/build identity. Keep local, CI, owner-reported and independently verified outcomes distinct.

For each substantial module: confirm its acceptance criteria, test meaningful failure paths, perform the Android acceptance step, and record Built / Checks passed / Failures or blockers / Next action. Do not label a module complete because a table or screen exists.

## 6. Comments and code readability

Comments should explain responsibility, reasons, invariants and non-obvious limits. Keep straightforward code self-explanatory through clear names. Add a short comment when introducing:

- A storage or security boundary, privileged function, or unusual framework behavior.
- A retry/idempotency decision, transaction, request race or lifecycle cleanup.
- A unit conversion, data-retention rule, or constrained editing behavior.
- A workaround with a linked issue and the condition for later removal.

Keep comments adjacent to the rule they explain; update them with the code. Avoid claims such as "secure", "never fails" or "fully tested" without specifying the boundary/evidence. Never copy private records, secrets, email links or raw provider responses into examples/comments. Avoid broad refactoring during a targeted repair unless needed and independently verified.

New features should follow the current separation: screen → validation/model → API service → database operation. Auth lifecycle remains centralized. Shared SDK configuration belongs in `client.ts`; do not create a second client with a separate session store.

## 7. Product partnership and documentation cadence

The owner is a product partner, not a technical operator. Codex must help evaluate user journeys, priorities and scope tradeoffs as well as write code. Bring material product decisions with a recommendation, the user benefit, cost/complexity and acceptance criteria. Confirm decisions that materially alter agreed scope; routine implementation remains Codex's responsibility within authorized work.

**After a substantial implementation or architectural change:** update affected architecture diagrams, source comments, setup/runbook instructions and test/issue evidence in the same milestone. Include entry points, data flow, failure handling and any verification gap. Small code changes need only the documentation they actually affect.

**Once per active working day:** make one consolidated PRD/progress review. Update PROGRESS.md with the actual module position, tested vs untested outcomes, current build, blockers and next steps. Update PRD.md when a requirement/decision changes; if none changed, record the review date/outcome in progress without manufacturing a PRD change. The daily cadence is not an unattended scheduled job; perform it during active work, and catch up on the next active session if necessary.

**Immediately when material:** report a failed critical check, blocker, unexpected behavior, changed product assumption or scope decision. Do not wait for the daily summary. If an accepted PRD requirement changes, record it when the decision is made, then include it in the daily review.

Check our code/configuration before blaming external services. Distinguish observed facts, hypotheses, tests and results. Failed cancellations or absent reports are not proof of billing issues. Evidence from the queue repair is in ISSUES.md.

Use the current PRD requirement IDs to relate work to acceptance, and keep a short decision entry when making a meaningful product/technical choice: date, problem, decision, reason, alternatives that matter, consequence and evidence. Do not maintain daily copies of the PRD or duplicate conflicting status tables across many documents.

## 8. Ownership, release and support rules

- The owner cannot change administrator/network access. Existing Git transport and GitHub-hosted builds work; the Supabase dashboard remains the manual deployment route. Do not request repeat credentials or inaccessible admin changes.
- Give direct dashboard/file links and short phone checks. The owner should not interpret code or debug stack traces. Ask only for evidence/actions unavailable through authorized tools.
- Respect the latest owner pause/resume instruction; the latest instruction resumes feature development while the owner sets up the emulator later. Phone-control automation remains on hold. Documentation work does not authorize payment activation, purchases, parent notifications or public release.
- Source is on `codex/coach-foundation`; no PR/merge to main is recorded. Fetch/switch to the correct branch on another computer. Installed APKs require explicit updates.
- Preview development signing is separate from production-key custody and Play publication. Build artifacts expire; regenerate a verified build if needed.
- Keep diagnostic data separate from family content/financial audit records. Diagnostics now persist on the device on a best-effort basis with validated restoration, memory fallback and sign-out clearing. Native crash/remote reporting remains open; do not claim it is connected.
- Never log passwords/tokens/student details or automatically send reports to someone. Report sharing is a deliberate owner action.
- The Parent workspace is authorized and implemented in the current scope; preserve its verified-link, review and consent controls. Gateway collection remains disabled/shelved until separately implemented, tested and approved for the intended environment.

## 9. Before handing off a change

For this repository's Vercel integration, commits must map to a GitHub account with project access. The 14 November 2026 investigation found the inherited workspace author email was unmapped (`author: null` in GitHub's commit API), blocking `f791a32` before deployment. The authenticated repository owner is `appsworld2027` (ID `352282836`); this checkout uses its private GitHub email `352282836+appsworld2027@users.noreply.github.com` in repository-local Git configuration. On a new checkout, verify the authenticated account and `git var GIT_AUTHOR_IDENT` before committing; local Git configuration is not cloned. Preserve existing history and use a new commit for a retry. Verify GitHub's author mapping and the Vercel status on the new SHA; a successful local build alone does not prove deployment.

Explain what changed and why, point to the code/diagram and acceptance criterion, list executed checks plus their limits, identify the source/build, record open issues and give the next concrete step. For comment/document-only edits, verify links, diagram syntax and that executable code is unchanged; a new APK is unnecessary. Run relevant checks for actual behavior changes rather than adding tests that merely repeat the code.

## Module 5 entry points

Private observation code, transactional invariants and recovery paths are mapped in [OBSERVATIONS.md](OBSERVATIONS.md). Keep the UUID/revision and fixed-recipient guarantees intact when adding fields. Autosave uses inline feedback so typing does not dismiss the keyboard. Explicit server writes use the shared fixed notification row. Apply only migration 005 to the owner project already at 004.


## Module 6 entry points

[Fees](FEES.md) maps the immutable invoice/receipt ledger, four trusted write functions, durable exact-request recovery, correction rules and acceptance checks. Read it before editing `src/fees/` or migration 006. Pending fee recovery records intentionally survive sign-out, scoped to the same account/academy; do not add them to ordinary draft cleanup without a reconciliation design. Reusing a request with changed data must fail. Only manual receipts can use the manual correction operation. Keep test and real received totals separate. New checkouts still need the Git identity verification above for Vercel.


## Dependency security override

`package.json` scopes minimatch11.0.1 to Expo fingerprint to address GHSA-g3hv-75wg-m249 without downgrading Expo58. Before updating/removing it, read [security verification](SECURITY_VALIDATION.md), regenerate the Android fingerprint, and run the dependency/build regressions. Fingerprint's public matcher API and project hash were checked before accepting this override. Keep the lockfile committed and use `npm ci` in CI.

## 0.6.0 coach workflow handover

Read [workflow review](COACH_WORKFLOW_REVIEW.md) and PRD1.1 before changing the next module. Student profile/batch membership and monthly fee visibility take priority over gateway work. `src/roster/RosterScreen.tsx` now owns profile, batch roster and inline editor routes; `src/fees/summary.ts` defines monthly totals; `src/photos/` owns picker, byte validation, private uploads, optimistic attachment and signed previews. `tests/coach-workflows-database.test.ts` applies007/008 twice against PostgreSQL with emulated Storage metadata/RLS. `e2e/coach-workflows.spec.ts` covers both roster directions, direct receipts/retry, profiles and both photo journeys. These fixtures are not live Storage acceptance.

The existing project has001–006 installed. Only [combined007/008](UPDATE_007_008.md) is needed; it starts with BEGIN and returns two installed markers. Do not send/repeat the full setup bundle for this project. Old backends remain readable through the legacy student-column fallback, but new writes require007/008. No database update has been applied by the coding workspace. The native build checks merged APK permissions for absent camera/microphone access after adding the library picker. Signed photo previews expire after60seconds; interrupted orphan cleanup is a documented remaining limit.

## 0.7.0 photo onboarding source map

`src/onboarding/` owns picker/review/model/import service. `supabase/functions/scan-roster/handler.ts` is a dependency-injected, mocked-provider-tested HTTP handler; `index.ts` is the Deno entry. `supabase/config.toml` disables only legacy gateway verification: the handler verifies Auth and owner access itself. `scripts/prepare-scan-function.mjs` generates the single-file dashboard delivery; rerun/check it after handler changes. Migration009 owns service-only quotas and authenticated reviewed imports. Read [PHOTO_ONBOARDING.md](PHOTO_ONBOARDING.md) before deploying; no live provider key/function is configured. App permission changes intentionally add camera capture while continuing to forbid microphone access. Native build verifies this merged permission state. Do not copy server keys to EXPO_PUBLIC configuration.

## Cloud Vision0.8.0

Read current [PHOTO_ONBOARDING.md](PHOTO_ONBOARDING.md). handler.ts now invokes Google Cloud Vision, vision.ts conservatively maps explicit labels/word positions; the dashboard generator prepends both before the Deno entry. Deploy all three or the generated single file. Use GOOGLE_CLOUD_VISION_API_KEY only server-side; remove obsolete OpenAI deployment instructions. Missing010 is intentionally fail-closed because the handler calls reserve_vision_roster_scan, not009's daily-only operation. The quota tests use one PGlite engine; true multi-session lock acceptance is separate. Existing001–008 must not be rerun. Combined009/010 is a single owner transaction. Unknown OCR layouts return source lines for explicit review/names-only mapping; never silently assign fields from arbitrary text.

## 0.9.0 first-run review map

CoachSetupCard loads real roster counts on Today and opens RosterScreen through a consumed one-shot launch prop. SelectField provides native HTML select on web and an accessible modal picker on native, without another SDK dependency. ScanRosterScreen owns batch draft/create, automatic names-only candidates, explicit review/import and a confirmed-success/refresh state. RosterScreen reloads actual students/memberships before saved navigation. Do not call import_roster_scan again merely because refresh failed. Existing001–010, Google secret and deployed scan-roster do not need redeployment for this release. e2e/roster-scan.spec.ts covers the seven full-flow/recovery cases.


## Parent0.1 and shared typography

The new src/parent root is selected by /parent, with shared AuthProvider module=parent. Never route Parent-only users through AcademySetup or infer family links from contacts. Parent interface reads only family tables, whitelisted connections/permissions and approved feed. Migrations011/012 and delivered update_011_012.sql must stay consistent (npm run prepare:parent-sql and --check). Parent database tests execute the exact combined owner file twice. The source is React Native, not the prototype scripts. Typography.tsx uses the SDK-compatible expo-font and local OFL Bricolage asset; failure falls back to system text. New source/map and limits: PARENT_MODULE.md.

## 10. Rigorous feature delivery for every Codex session

This is the canonical Destination engineering procedure. Adapted from Source Engineering Standards / Feature Delivery Workflow / quality-gate mechanisms reviewed at `380adba`, using Destination Expo commands and current owner authorization. Do not create a parallel engineering standard, handoff or feature-audit document when this guide, current progress, existing QA/spec/plan or system comparison already owns that topic.

**Current branch rule:** work stays on `AM/consolidated`; source is read-only. New merges, live SQL/provider changes and release infrastructure need their applicable separate authorization. Reuse authorization already granted; do not ask the founder to choose routine technical implementation details. Historical instructions/examples do not override the current session.

**How Codex becomes consistent:** model retraining is not performed by editing a repository. Repository instructions supply durable context; executable tests/CI check outcomes; a reviewer examines what automation misses. These controls guide an invoked assistant and must be verified in the actual client. They install no unattended agent and cannot guarantee every future model obeys instructions.

### Existing document ownership and session bootstrap

| Topic | Existing owner to read/update |
| --- | --- |
| Instruction entrypoint and current permissions | `AGENTS.md`, latest session instructions |
| Current checkpoint, baseline/remaining work | `PROGRESS.md`; latest dated entries override older history |
| Product outcome and privacy decisions | `PRD.md`, `docs/PARENT_PRD.md`, `PRODUCT_DECISIONS.md` and relevant feature contract |
| Cross-repository capability status | `CONSOLIDATED_PRODUCT_ROADMAP.md`, `PARENTPLUS_SYSTEM_COMPARISON.md` |
| Runtime architecture and database authority | `ARCHITECTURE.md`, `CONSOLIDATED_DATABASE_DESIGN.md`, `LIVE_DATABASE_COMPARISON.md`; exact SQL/code remain evidence |
| Delivery/verification procedure | This guide; existing feature QA/spec/plan for detailed scenarios |
| Executed checks and remaining limitations | `VALIDATION.md` and relevant existing feature QA; raw output stays ignored under test-results or task scratch space |
| Mission closure and source independence | `CONSOLIDATION_ACCEPTANCE_LEDGER.md` |
| Collaboration/release and founder format | `SHARED_DEVELOPMENT_WORKFLOW.md`, `examples/FOUNDER_RESPONSE_REFERENCE.md` |

At the start, identify actual branch/full HEAD, dirty scope and accessible context; preserve unrelated work. Read the relevant feature callers, services, migrations and tests. A future clean session should answer what is live, what is candidate-only, what remains and which checks apply using Destination alone. Report missing context instead of inventing cross-chat memory.

### Required execution flow

Request → acceptance criteria → affected-system/threat review → scenario-to-test matrix → implementation/regression → selected automated checks → actual review → evidence/remaining gates → authorized checkpoint.

1. **Define observable outcomes.** Reuse the relevant existing PRD/spec/QA and allocate stable feature/scenario IDs there. State success, invalid/denied behavior, compatibility, included/excluded scope and release consequence of gaps. Do not call a table/screen/API “the feature” before the complete user flow works.
2. **Inspect dependencies and authority.** Follow UI → service/API → function/policy/Storage → data → response and all affected callers. Assess identity/tenant ownership, lifecycle, caches/drafts, provider/toolchain, migrations and repair. Make routine technical decisions with repository evidence; escalate only unresolved product/privacy decisions or missing authorization/prerequisites.
3. **Map every accepted scenario to an exact test identity or explicit gap.** Use the matrix below inside the existing feature QA/spec. Proposed tests are not passed tests. Tests should assert the user/security behavior, not mirror private implementation. Apply meaningful failing regression/reproduction first for defects and material new behavior; do not manufacture tests for prose-only changes.
4. **Implement and preserve existing journeys.** Use relevant Superpowers skills and locked dependencies. Keep server authorization authoritative; client flags/filtering are not access controls. Never activate founder dummy Auth or use live projects as test fixtures. Preserve existing valid regression tests.
5. **Run applicable checks and inspect complete results.** Use the command matrix below; preserve exit codes and count passing/failing/skipped tests. Diagnose missing prerequisites, run independent safe work and state any blocked gate exactly. Never weaken assertions or disable scenarios to obtain green output.
6. **Review independently when available and resolve findings.** Independent means another actual reviewer, not a second pass by the author. Use only authorized review tools; do not spawn agents merely because a skill example suggests it. If unavailable, disclose author review and leave independent review pending for the applicable merge/release gate. Each confirmed issue needs reproduction, correction and relevant retest.
7. **Publish truthful evidence in existing owner documents.** Record branch/full baseline, exact code/diff under review, commands/results, environment, mocks/provider boundaries, review findings, failures/skips/unrun checks and remaining release blockers. Later code changes invalidate affected results; documentation-only updates must label earlier code evidence with its actual tested snapshot. A commit, push, hosted CI result, live migration and installed-device acceptance are distinct facts.
8. **Complete only the authorized checkpoint.** Verify actual local/remote state after approved operations. Preserve AM-only work and separate live activation/merge decisions. Do not ask the founder to run available routine checks or make architecture choices the agent can resolve.

### Per-feature acceptance/test matrix

Maintain this table in the existing feature QA/spec/plan; no new central document is required.

| Scenario ID / outcome | Exact executable case(s), environment, actual result or gap, release impact |
| --- | --- |
| Happy path, persisted reopen and correction | Name the exact test title, not just a filename; record DB/browser/device/provider boundary. |
| Invalid input/response and empty/loading/error | Malformed/oversized/duplicate/unordered API rows; failure must not look like a successful empty view. |
| Permission boundaries | Anonymous/unverified/wrong account, other family/academy, revoked/expired/banned actor, changed intended email; direct API/table/Storage bypass as applicable. |
| Retry and recovery | Double submission, same key/same payload, changed payload, commit-with-lost-response, restart and corrupt/unavailable storage. |
| In-flight changes and concurrency | Late reply after context/child/account change; roster/session/link/consent change; both revocation-before-write and write-before-revocation orderings. |
| Dates, history and scale | DST gaps/folds, year/local-day boundaries, archived records, bounded pagination and data over service limits. |
| Migration and real environment | Rebuild installed history + exact candidate, preserved IDs/finance/links, old-client compatibility, forward repair and restore where affected. |
| User-facing accessibility/mobile | Accessible names/error/focus, phone layout, Android/iOS lifecycle/keyboard/permissions and actual provider integration where relevant. |

Scope each row to the feature's risk. Mark truly inapplicable scenarios with a reason. An uncovered acceptance/security requirement remains open; mark implemented narrowly enough to match evidence.

### Automated checks and what they prove

| Change / boundary | Applicable commands and separate gates |
| --- | --- |
| App logic/types/SQL contracts | `npm run check` = TypeScript + Vitest, including PGlite integration. It currently does not run ESLint. |
| User-visible flow or shared Auth/state | `npm run test:e2e`; fictional SDK/browser transport. Check relevant denial/recovery cases, then broad regressions for shared changes. |
| Native/web compatibility | `npm run export:web`, `npm run export:android`; exports do not compile/install an APK or test iOS. |
| Workspace locks/authority concurrency | `npm run test:workspace:postgres` with the documented explicitly disposable loopback DB or labeled test container. Never point this at Supabase. PGlite is not multiple independent PostgreSQL connections. |
| Android build-tool/ABI changes | Existing `scripts/test_android_installer.py`, `scripts/test_apk_architectures.py`, APK build and actual install/lifecycle gates as applicable. |
| Real email/Auth/Storage/OCR behavior | Authorized local/staging provider journeys; fictional responses cannot substitute. No secret/PII in artifacts. |
| Documentation/instruction/template only | Check full diff, paths/links, current facts and whitespace; no new APK or mirrored implementation tests needed. |

Run tests serially when they share a database/file/server; independent suites may run concurrently if they do not contaminate evidence. Choose broad regression for unknown/shared security or dependency impact. Optimize suite selection only when a reviewed executable dependency/coverage model supports it.

**Current enforcement limitations (17 November 2026):** the Destination has no executable requirement registry/impact selector/source-bound receipt gate, no lint command, and no Playwright forbidOnly/success-JUnit requirement. CI push triggers omit AM branches. Required GitHub review/check protection is not established by repository instructions. These are implementation follow-ups in the system comparison, not automation installed by this guide. Copying Source gate scripts unchanged would target the wrong Next.js/Python paths.

### Definition of Done and reporting

A development slice is verified only when its accepted outcomes have current applicable tests, meaningful denial/retry evidence, compatible data contracts, resolved blocking findings and updated owner documents. Report staging/device/provider/restore/independent review gates as pending where unrun. A broader feature cannot inherit completion from a narrow slice or a historical green run.

The handoff must say: what changed and why → actual evidence and limits → remaining product/release impact → one next action. Use the founder reference and explain necessary engineering vocabulary. Do not invent a completion percentage or promise persistent model memory.

## 11. Executable quality loop — 17 November 2026

`npm run quality:run` is the Destination-only execution loop: collect runtime Vitest identities (explicitly disable Vitest 5 static parsing so parameterized cases expand) and Playwright identities → validate every narrow unit/DB and browser scenario in quality/scenarios.json → capture executable/config/test/asset fingerprint → lint → types → unit/PGlite → headless browser → web/Android JS exports → exact JUnit and source/run/report verification → receipt. Unknown/shared changes take full regression. No AI scheduler or auto-merge process is installed.

`npm run quality:self-test` covers bad/missing/duplicate/renamed/skipped/failing/stale evidence and invalid registry mapping. `quality:plan` selects the full suite; it is not passing evidence. `quality:verify` validates current report identities, freshness and input/run identity; only the `quality:run` orchestrator creates the successful all-command receipt. Human Markdown prose is excluded from the execution-input hash so evidence can be documented after a run; review prose/links separately. These are source/report integrity checks, not protection against a malicious contributor rewriting both gate and tests.

CI now triggers on AM/**, MM/**, main, legacy Coach pushes, PRs and manual dispatch. Foundation runs the complete loop; separate PG17 jobs exercise workspace concurrency and standalone Parent migration/role isolation. The final gate requires all three jobs. Its workflow must actually run successfully; GitHub branch-protection configuration is a separate owner setting. Old section10 missing-lint/AM-trigger/browser-evidence statements describe the audit baseline and are superseded here for implemented mechanisms. Provider/native/restore/independent review remain distinct gates.

Add/change feature acceptance in the existing PRD/QA/spec, then add exact cases and reviewed narrow criteria to quality/scenarios.json; do not label broader product parity complete because regression cases exist. Machine output stays in ignored test-results and CI artifacts. Never attach real user sessions or secrets to traces. Hosted checks use fictional SDK transport and temporary Vercel access, with protection/auth cookies kept outside committed source and removed afterward.

Parent failures now carry the metadata-only PARENT_ATTENDANCE_FAILURE diagnostic and support reference, preserving bounded retention and safe user messaging. Do not log child names, contacts, tokens, query payloads or raw backend errors as debugging shortcuts.
