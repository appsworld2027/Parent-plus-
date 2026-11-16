# Developer handover and working agreement

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
- Keep the parent app deferred and gateway collection disabled until separately implemented, tested and approved for the intended environment.

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
