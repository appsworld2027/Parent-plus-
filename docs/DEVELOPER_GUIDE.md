# Developer handover and working agreement

Reviewed: 12 November 2026. Start with [current progress](../PROGRESS.md), then [how the system works](ARCHITECTURE.md). The owner has stopped feature development and placed phone-control automation on hold. Read the current checkpoint before taking action; a sync request authorizes saving progress, not resuming implementation.

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
| `scripts/build_support.py`, `test_android_installer.py` | Safe build-error redaction and installer regression checks | BUILD-002 in ISSUES.md |
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
- Respect the latest owner pause/resume instruction; the latest instruction is Stop; only checkpoint syncing is currently authorized. Documentation work does not authorize payment activation, purchases, parent notifications or public release.
- Source is on `codex/coach-foundation`; no PR/merge to main is recorded. Fetch/switch to the correct branch on another computer. Installed APKs require explicit updates.
- Preview development signing is separate from production-key custody and Play publication. Build artifacts expire; regenerate a verified build if needed.
- Keep diagnostic data separate from family content/financial audit records. Diagnostics now persist on the device on a best-effort basis with validated restoration, memory fallback and sign-out clearing. Native crash/remote reporting remains open; do not claim it is connected.
- Never log passwords/tokens/student details or automatically send reports to someone. Report sharing is a deliberate owner action.
- Keep the parent app deferred and gateway collection disabled until separately implemented, tested and approved for the intended environment.

## 9. Before handing off a change

Explain what changed and why, point to the code/diagram and acceptance criterion, list executed checks plus their limits, identify the source/build, record open issues and give the next concrete step. For comment/document-only edits, verify links, diagram syntax and that executable code is unchanged; a new APK is unnecessary. Run relevant checks for actual behavior changes rather than adding tests that merely repeat the code.
