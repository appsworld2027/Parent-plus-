# Validation record

App version: 0.1.0. Module 0/1 records below were recorded on 11 November 2026. Module 2 is recorded on 12 November 2026 (Asia/Kolkata). Validation is current-instance evidence, not proof of a new machine's restored state. Later sections supersede earlier implementation status.

## Passed

Historical Module 0 baseline:

- Official Expo SDK 58 TypeScript template and compatible dependencies installed using npm with TLS/package integrity verification intact.
- `npm run typecheck`: passed.
- `npm test`: 14 tests passed in 2 files. Covers safe missing configuration, endpoint validation, server-key rejection, production-default developer-control protection, diagnostic capacity/privacy/clearing, and reference/timestamp behavior.
- `npm run test:e2e`: 3 browser tests passed against React Native web using system Chromium. Covers all five tab destinations, report generation/clearing without configuration leakage, and real error-boundary recovery.
- `npm run export:android -- --output-dir /tmp/parentplus-android-export`: Metro compiled 606 modules into an Android Hermes bundle.
- `npm run export:web`: compiled the React Native web target and produced a static web bundle.
- Browser screenshot visually inspected at 412 × 915. Fixed a missing-glyph arrow identified in that inspection.
- `.env.local`, dependencies, build output, and Expo runtime state are ignored by Git. The local public configuration is not committed.

## Not verified or not implemented

- No APK has been built or installed; no Android emulator/adb is available in this workspace. Native installation, device share sheet, keyboard, safe areas, and native crashes remain unverified.
- Expo account/project linking and signing are not configured. `eas.json` is prepared, not a submitted build.
- Supabase connectivity from this cloud instance remains blocked by network policy. Schema deployment is now confirmed by the owner's dashboard result; SDK/auth/API operations remain unverified against the real project.
- Supabase Auth and application tables, gateway integration, and actual teaching/fee workflows are not implemented in Module 0.
- Diagnostics are sanitized, bounded, in-memory reports. No remote ingestion, persisted support logs, native crash monitoring, or continuous support service exists yet.
- GitHub Actions workflow is present; its remote execution status has not been inspected. Source was committed and pushed successfully to `codex/coach-foundation`. No pull request or merge to `main` has been made.
- Dependency compatibility was taken from the installed official SDK map. External Expo/React Native Directory checks were unavailable; no claim is made that those external checks passed.

## Readiness decision

The local foundation passes its implemented automated checks and Android bundling. The full Module 0 native-device gate remains open until an installable build is configured and tested. Proceed with database/auth implementation while arranging build access; do not present this shell as a usable teaching or payment release.

## Module 1 database work

- Initial migration prepared at `supabase/migrations/202611110001_coach_foundation.sql`; dashboard guide at `docs/SUPABASE_SETUP.md`.
- Latest `npm run check`: TypeScript passed; 29 tests passed across 3 files (14 foundation checks plus 15 PostgreSQL checks).
- Database engine: PGlite, with test-only Supabase roles/identity emulation. Tests apply the migration twice, verify RLS on 12 exposed tables, two-account isolation, anonymous rejection, forged ownership denial, composite foreign keys, onboarding retries, attendance update/rollback/cancellation/archive behavior, invoice uniqueness, and financial write protection.
- A separate database test confirms conflicting existing application tables are preserved and setup stops before modifying them.
- Expo public configuration validates owner `appsworld2027` and Android package `com.parentplus.coach`. This is configuration validation, not Expo authentication, project linking, or a submitted build.
- Direct Supabase API recheck still received proxy CONNECT 403. The owner subsequently ran the SQL and supplied a screenshot showing migration `202611110001` with an applied timestamp. This verifies deployment from their dashboard, not live SDK/key validity or API/auth behavior from this cloud instance.
- The migration does not implement observation publication, fee/payment server operations, or remote diagnostic collection. Their tables are protected until subsequent modules add the corresponding server functions.

## Module 2 email login and academy setup

- Latest `npm run check`: TypeScript passed; 38 tests passed across 5 files. Added session chunk round-trips, failed-refresh rollback, concurrent-write serialization, clearing/corruption detection, input validation, owned recovery routes, and cryptography-adapter checks.
- Latest browser suite: 11 tests passed. Real Supabase SDK + React Native web screens with browser-side simulated transport; no real emails or project API operations. Covers form validation, safe errors, neutral sign-up/recovery messages, S256 challenges, session reload, sign-out/storage clearing, onboarding failure/retry, missing workspace connectivity, refusal of unverified accounts, recovery code exchange/password update, and the three foundation checks.
- Android Metro/Hermes export passed (674 modules); web export passed (275 modules). These are bundles, not an APK installation.
- Login screen screenshot at `docs/images/authentication.png` inspected at 412 × 915.
- Expo SecureStore adapter writes bounded ASCII chunks and commits a manifest only after all new chunks exist. Native adapter runtime and device credential storage are not verified by browser/Node tests.
- Expo Crypto supplies native secure random values and SHA-256 through an adapter. Standard UTF-8 encoding is provided where absent. Email-link actions refuse to proceed if the required crypto APIs are unavailable rather than use the SDK's weaker fallback. The adapter has known-digest and delegation checks, but still requires native-device validation.
- Direct cloud-to-Supabase access remains blocked. Actual email delivery, real verification/recovery, refresh against the provider, native links, Expo authorization/signing, and APK/device checks remain open. No real-payment functionality exists yet.
- Email URL/provider setup instructions are in `docs/AUTH_SETUP.md`; preserving email confirmation is required.

## Module 3 and Android preview preparation — 12 November 2026

- Version 0.2.0: TypeScript passed, 50 automated tests passed across 6 files, and 15 browser tests passed. New SQL tests exercise atomic student/contact/enrolment saves, duplicate/lost-response identity, foreign-academy rejection, archive/history preservation, guardian edits, and direct-write restrictions. Browser tests cover actual SDK/UI requests against a fictional transport, batch/student create/edit/reload/search/archive, save failure/retry, and unsaved navigation guards.
- Migration 002 is prepared and locally applied twice in tests. It has not yet been applied to the owner's Supabase project. No migration 001 rerun is requested.
- Latest Android Metro export passed at 678 modules. The native local build progressed through plugin compilation and native app/CMake setup after installing checksum-verified SDK tools, the correct platform 37.0, NDK, Gradle, and Java 17 toolchain.
- Native local build remains blocked by the Maven redirect to `repo.reactnative.dev`, denied by the coding environment. The settings-draft tool still cannot read its current configuration, so no unknown network rules were replaced.
- A GitHub native preview workflow and signature-checking build script are prepared. Remote execution/artifact/live-auth probe outcomes must be checked after push; this document does not claim a successful APK yet.
- Public Supabase connection defaults are now intentionally in `config/public-client.json` and bundled into the client. This supersedes the earlier local-only public-key choice. Privileged keys and personal records are excluded. `.env.local`, generated Android files, caches, artifacts and Python bytecode are ignored by Git.
- The preview uses its own package ID, development signing, and source-revision-aware diagnostic build identifiers. It is not a production signing/release setup.

### Confirmed remote result and current blocker

- GitHub run `43094369260` executed the real project's settings-only probe. It confirmed reachability, acceptance of the public key, email enabled, confirmation required, and anonymous profile reads denied. It did not register/login a user or send mail.
- That run ended in failure without an APK or build-stage error tail. Later diagnostic workflows have not published their reports yet; workflow syntax has been checked with checksum-verified official actionlint. Their absence is not proof of a specific permission/billing/queue cause.
- The native local source-build alternative was attempted using React Native's supported composite build. A full checksum-verified JDK 21 and platform CA trust configuration resolved missing-compiler/TLS setup issues. The alternative still encountered denied dependency destinations (Boost archive and React Native prebuilt references); it has not produced an APK. No TLS/signature/checksum checks were disabled.
- Latest phone-layout change: confirmations use visible modal dialogs, and opening forms resets scroll position. TypeScript and all 16 browser checks passed, including assertions that discard confirmation stays inside the viewport. Latest automated suite remains 50 passing tests.
- Roster screenshots use explicitly fictional records and a simulated backend; they do not prove live roster deployment or device behavior.
- APK download/installation and real email sign-in remain unverified. The owner supplied the failed step output; the diagnosis and replacement SDK installer are recorded below. No admin access changes are requested.

### SDK bootstrap repair

Owner screenshots confirm an interrupted secondary Android CLI download, before native compilation. Official self-contained command-line tools 20.0 successfully installed platform 37.0 in a clean local probe. Six installer regression checks and actionlint pass. The updated workflow records sanitized SDK-stage failures and retries only transient SDK transfers (at most three attempts). A new remote build is required before claiming an installable APK.

- Follow-up: the complete replacement installer exited successfully against the owned local SDK and verified platform 37.0, build tools 37.0.0, NDK 27b and CMake 3.22.1. Google tools emit an XML-version warning, but package installation and verification complete successfully.
- Repair source commit: `148546abc33ff38c18a6562df3bef867e1077f76`, pushed to `codex/coach-foundation`. Its remote start record has not yet appeared on `build-status`; push acceptance alone does not prove Actions execution. APK generation remains unconfirmed.
- Owner fallback without admin changes: open https://github.com/appsworld2027/Parent-plus-/actions/workflows/android-preview.yml and use **Run workflow**, selecting `codex/coach-foundation`, if there is no new run. Re-running the old failed run uses its old source and does not include this repair.

## First successful Android APK — 12 November 2026

- GitHub run [43100171391](https://github.com/appsworld2027/Parent-plus-/actions/runs/43100171391) published `success` at 2026-11-11T21:16:46.812Z for source `e4256b55eae46571bf9c46d04079f9f65be038e6`, approximately 10m29s after its start record. Retrieved proactively at 21:21:36Z.
- [Download preview artifact](https://github.com/appsworld2027/Parent-plus-/actions/runs/43100171391/artifacts/13892256981). GitHub packages it as a ZIP; extract `ParentPlus-Coach-Preview.apk`. Artifact retention is 14 days. Requires repository access.
- APK package `com.parentplus.coach.preview`, ARM64, development signed, 26,298,186 bytes. The build script ran `apksigner verify --verbose` before upload. SHA-256: `3d13fbd1bced10d4c5c7dbb40ddb9431c5c7bfe391137b8796a43f5762f30ce2`. Source SHA matches the successful workflow report.
- Real project's settings-only probe passed again: reachable, public key accepted, email enabled, email confirmation required, anonymous profile reads denied. This is not a real-user login test.
- Device installation, secure-storage behavior, email confirmation/recovery deep links, real login, roster migration 002 deployment and live roster writes remain unverified. This is an internal preview, not a production or Play Store release.
- Monitoring stops on this terminal success; there is no continuing background monitor. Next check is installation and email authentication on an actual Android device.

## Android success-message repair — version 0.2.1

The owner reports native app installation, confirmation email receipt and subsequent login. The owner also reports a crash after the in-app account-creation submission. Treat login as owner-reported, not independently observed. See ANDROID-001 in ISSUES.md.

The new native accessibility contract check failed on two unsupported status props before the repair. After the repair: TypeScript passed, 51 automated tests passed across 7 files, and all 16 browser tests passed. Browser tests include signup/recovery success messages and batch/student-save success notices; they retain their ARIA status semantics. Device confirmation of the fix and the replacement APK build are pending.

### Replacement APK verified in CI

- Run [43145465149](https://github.com/appsworld2027/Parent-plus-/actions/runs/43145465149) completed successfully at 2026-11-12T03:10:49.723Z for source `5c4c53be82e492b3faa3ec831376de57f720b7b6` (version 0.2.1 / versionCode 3). Its start record was at 03:02:32.423Z; elapsed approximately 8m17s. Proactively retrieved at 03:13:09Z.
- [Replacement artifact](https://github.com/appsworld2027/Parent-plus-/actions/runs/43145465149/artifacts/13911472972): development-signed ARM64 `com.parentplus.coach.preview`, 26,298,214 bytes. The pipeline ran APK signature verification before upload. SHA-256 `a8960174c6a0c9b228a100f1387297d25306898f04f07b5a7d29a5a3d59cdcc1`.
- Real settings-only auth check passed: reachable, key accepted, email enabled, confirmation required, anonymous records blocked. It did not send mail or create users.
- Remaining acceptance check: install as an update without clearing app data; use the existing confirmed account. Sign out if necessary, request one recovery email, and verify the confirmation message remains visible without app closure. This exercises the repaired success notice without duplicate registration. Phone confirmation is still pending.
- Build monitoring ended on terminal success; no unattended monitor remains active.

## Documentation and readability checkpoint — 12 November 2026

- Added current runtime/login/roster/data/diagnostic/build diagrams, a developer file map and handover, and an existing-product decision record. Recorded the owner agreement: affected technical docs after substantial changes; one consolidated PRD/progress review per active working day; material blockers/decisions immediately. Product requirements are unchanged.
- Added responsibility/invariant comments in 11 TypeScript/TSX source files. Compared before/after transpilation with comments removed: executable output is identical for every changed source file. TypeScript passes.
- Parsed and rendered all 8 Mermaid diagrams across ARCHITECTURE.md and PROGRESS.md with Mermaid 10.9.5 in Chromium. Inspected the rendered system overview and saved `docs/images/system-flow.png` from the first architecture block. All 48 checked local markdown-link targets exist; whitespace checks pass.
- This documentation/comment-only milestone does not change app behavior or release version. Full automated/browser suites and APK generation were not repeated; their last evidence remains the 0.2.1 repair build. Commit CI is deliberately skipped for this milestone to preserve the paused build state. Phone acceptance of that build, migration 002 deployment and feature work remain pending.

## Resumed build: classes, attendance and persisted diagnostics — candidate 0.3.0

- Owner resumed implementation after the documentation checkpoint. Version 0.3.0 / versionCode 4 adds dated class create/edit/cancel, present/late/absent with mark-all, actual-record Today class figures, one scoped device attendance draft, and best-effort device-persisted sanitized diagnostics.
- TypeScript passed; **76 automated tests across 9 files** passed. New SQL checks apply migration 003 twice and exercise owner/anonymous denial, direct-write restrictions, duplicate identities/occurrences, revision conflicts, full-roster atomic rollback, UTC/local-date boundaries and cancellation/history protection. Model checks cover DST gaps/folds, invalid dates, overnight classes, eligibility, bounded draft parsing and sign-out serialization. Diagnostic checks cover restart, invalid/private stored fields, expiry, storage failure and restoration/sign-out races.
- **24 browser checks passed** against fictional SDK transports. New flows cover class create/edit/cancel/reload, draft restart, server save/Today counts, failure retention, lost-response reconciliation, stale server comparison, sign-out clearing, navigation guards and missing-migration errors. These do not contact the real project or validate native SecureStore.
- Android Hermes export passed (688 modules) and web export passed (296 modules). Six Python SDK-installer regression checks passed. Native preview build outcome still requires remote verification.
- Screenshots `docs/images/classes.png` and `attendance.png` were inspected at 412×915, using explicitly fictional records. They do not prove live deployment/device acceptance. Architecture diagrams and handover have been updated with the new flow and current limits.
- Migrations 002/003 are not confirmed deployed. Migration 001/settings must not be repeated. [Classes setup](CLASS_SETUP.md) supplies the ordered deployment/version checks and phone acceptance steps. Existing email crash repair still lacks phone confirmation.
- Native/remote crash telemetry, full offline roster/schedule cache, student/class-edit durable drafts and multiple concurrent device drafts are not implemented. Persisted diagnostics do not capture every native crash or abrupt termination; storage is best-effort and failures remain visible.

### Final class-context hardening

- Initial candidate source `10b996836b51e0461f19cd2bf4935c8ec1b1e7c6` built successfully in run 43163487986 at 05:52:06Z, with signature-verified APK and all live-settings booleans true. That artifact is superseded by the class-context hardening below; do not hand it off as the final candidate.
- Migration 004 adds the owner-checked class fingerprint wrapper and revokes direct client access to the previous wrapper. Published migration 003 is preserved. A moved/cancelled class cannot accept attendance from an old open screen even if its attendance revision is unchanged.
- Reopening attendance refreshes roster eligibility. Explicit API rejection never becomes success through subset comparison; lost-response reconciliation requires a complete current roster, matching class context and an advanced server revision.
- TypeScript and **79 automated tests across 10 files** passed; **26 browser flows** passed, including moved-class rejection and newly enrolled child refresh. A generated owner bundle applies 002/003/004 after 001; a read-only consistency check prevents migration/bundle drift. Final native rebuild remains pending.
