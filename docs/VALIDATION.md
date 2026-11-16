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

### Final 0.3.0 native result

- [Run 43164824902](https://github.com/appsworld2027/Parent-plus-/actions/runs/43164824902) reported **success** at 2026-11-12T06:06:08.354Z, retrieved proactively at 06:06:17Z, for source `80bf1e725a8897c7a27dc7ddea17d2a1985db8db`. Build start was 05:57:51.592Z: approximately 8m17s. Source matches the class-context wrapper and generated owner bundle.
- [Final APK artifact](https://github.com/appsworld2027/Parent-plus-/actions/runs/43164824902/artifacts/13920265830): package `com.parentplus.coach.preview`, ARM64, development signed, 26,345,566 bytes. Pipeline APK signature verification passed. SHA-256 `d15f64d79ea2244d528aa55ba9e6909918b1af9dbbf71c8d5cb5b476715ddade`. This supersedes the initial 10b9968 candidate.
- The final live settings-only probe passed all five booleans at 05:59:10Z. It did not create users, send emails or read private records.
- Earlier local evidence for final source: TypeScript, 79 automated checks and 26 browser flows passed. Native compilation provides Android bundle/compile validation for the final additional guards; their live/device behavior remains unverified.
- All source/docs are on the development branch. Monitoring stops on terminal success; no unattended monitor remains. Owner still needs to apply/verify the combined 002/003/004 update and complete guided phone acceptance using the final APK. No real collection or public release is enabled.

### Owner database deployment confirmation — 12 November 2026

- Owner first supplied a successful combined-update execution result, then ran the requested migration-version query filtered to 001–004. The follow-up screenshot shows four rows, confirming the expected installed version set. Migration 001 retains its earlier timestamp; upgrades 002–004 show `2026-11-12 06:57:00.026915+00`.
- This is owner dashboard/version evidence, not a direct database connection or an end-to-end app/security test. Do not request another initial setup or repeat the upgrade script. Next action: install the verified final 0.3.0 APK, verify the email success-message repair and complete the guided roster/classes phone tests.

## Visible action feedback — candidate 0.3.1

- Added a shared fixed in-app notification row outside auth/workspace scrolling. Errors stay visible until acknowledged/replaced; explicit success/local-draft distinctions and saved class/attendance summaries avoid assuming a server save from a device draft. No timer hides results.
- 79 automated tests passed. The full 30 browser flows passed, followed by 21 targeted auth/classes/feedback checks after final summary/wording changes. New tests verify entire notification inside the viewport while scrolled, repeated identical saves, failed archive dialog closure, persistent failure, retained server state, distinct local/server status and no stale success during a held request.
- Inspected `docs/images/feedback-success.png` and `feedback-error.png` at 412×915. All records are fictional. Current Android build/phone acceptance is still pending; app version 0.3.1 / versionCode 5. No new migration or setup permissions are needed.

### Verified 0.3.1 APK result

- [Run 43176931524](https://github.com/appsworld2027/Parent-plus-/actions/runs/43176931524) reported **success** at 2026-11-12T07:48:12.225Z for source `73805fa2c5bb60d77095b7ad19dc5ded8a7b2b53`, retrieved proactively at 07:48:46Z. Started at 07:40:06.128Z, approximately 8m06s.
- [Download artifact](https://github.com/appsworld2027/Parent-plus-/actions/runs/43176931524/artifacts/13924941624): ARM64 `com.parentplus.coach.preview`, development signed, 26,351,470 bytes; pipeline signature verification passed. SHA-256 `6d359a7ec5edf9e04fecc58b41767388896d3c4bbddcfcb927b90f370cf34239`. Source contains the fixed feedback host/provider and 0.3.1 metadata.
- All live settings-probe booleans passed at 07:42:01Z. The probe does not create users, send emails or read private records.
- No schema change: owner-confirmed 001–004 remain the required installed versions. Phone acceptance of visible notifications and server attendance/restart is still pending. Source comments and feedback/architecture docs are updated; all nine architecture/progress diagrams render and current feedback documentation links resolve.
- Monitoring stopped on terminal success. No unattended monitor remains active.

## Windows Intel compatibility packaging — candidate 0.3.2

- The owner supplied Windows / Intel Core Ultra 7 for manual emulator checks. The existing ARM64-only APK is not the correct artifact for a standard x86_64 image. Candidate 0.3.2 / versionCode 6 packages both `arm64-v8a` and `x86_64` with unchanged application features and backend schema.
- Four new Python checks verify dual-ABI acceptance, missing emulator libraries, mislabeled CPU headers and unexpected ABI rejection. All passed. Existing six installer checks, Python compilation and actionlint passed. The native workflow runs the new guard against the actual built APK before upload and records architecture/library counts.
- TypeScript and the 79-test suite are rerun for this source metadata/build change; native build result remains pending. Existing browser evidence is retained separately; no emulator/device runtime is claimed. Physical-phone automation and feature work remain on hold.

### Verified 0.3.2 dual-architecture APK

- [Run 43186145925](https://github.com/appsworld2027/Parent-plus-/actions/runs/43186145925) reported **success** at 2026-11-12T08:58:45.616Z, retrieved proactively at 08:59:04Z, for source `21cb70a0e8769c92a8e8743c78051029b65f442b`. Start record 08:49:50.689Z; approximately 8m55s.
- [Download artifact](https://github.com/appsworld2027/Parent-plus-/actions/runs/43186145925/artifacts/13928512623): package `com.parentplus.coach.preview`, development signed, 43,525,950 bytes. Architectures `arm64-v8a` and `x86_64`, with **17 packaged native libraries per architecture**; all ELF headers/machine types checked. APK signature verification passed. SHA-256 `3499ebaa4f1ff8b306bda6e0d8b73ad2e9a6e609885991ea7f59e79774197c23`.
- Local TypeScript and 79 tests passed. Four architecture guard checks, six installer checks, Python compilation and workflow syntax checks passed. App behavior is unchanged from the feedback fix; existing browser evidence remains separately recorded. All live settings-probe booleans passed at 08:51:31Z.
- This establishes CPU packaging and native compilation, not execution on the owner's Intel Windows emulator. Emulator setup/install/login/feedback/attendance acceptance remains pending. No phone-control connection, emulator automation or product feature work was started. No schema update is needed. Monitoring stopped on terminal success.

## Module 5 candidate 0.4.0 — private observations, 12 November 2026

- TypeScript passes; **95 automated tests across 12 files pass**. New PostgreSQL checks apply 005 twice, verify ownership/anonymous/direct-write rejection, atomic recipients/version history, immutable recorded scope, attributable text corrections after roster changes, stale-edit rejection, exact retry identity and class-local eligibility. Device tests cover scoped whitelisted snapshots, corrupt/oversized data, coalescing, conditional cleanup, sign-out writer invalidation and explicit storage failure. The shared chunk adapter now supports explicit discard of a corrupt index.
- **39 browser flows pass** in the final full regression suite, including nine observation flows. These exercise local-only vs workspace saves, restart recovery, fixed recorded audience, text correction/history, widening confirmation, lost responses, conflict copying, safe errors, sign-out warnings, device write failure, corrupt-index removal, equal-timestamp history pagination and a 501-student paged roster. One new corrupt-index recovery case found and drove the storage fix, rather than being dismissed as an external problem.
- Android Metro/Hermes export passed at 695 modules before the final storage-recovery adjustment; the successful native CI build compiled the final source. Final web export passes at 304 modules. Native [run 43225589808](https://github.com/appsworld2027/Parent-plus-/actions/runs/43225589808) succeeded for source `f8eb60a886d3ac6bcb8ea059cf6a5467232e4994`. Ten existing SDK/bootstrap and APK architecture regression tests pass with `PYTHONPATH=scripts`.
- Mermaid parsed/rendered all ten architecture/progress/observation diagrams. The main system snapshot is refreshed for the new module. A 412 × 915 fictional recorded-note screenshot was visually inspected and saved at `docs/images/observation-recorded.png`; its notification remains visible outside the scroll area. The SQL owner bundle is regenerated and its exact-source check passes; no database connection/deployment was made by that script.
- Migration 005 remains **prepared, not deployed**. These are disposable PGlite and browser transport-fixture results, not real account operations. Native SecureStore, real Supabase saves/conflicts, email recovery and owner phone/Windows-emulator acceptance remain open. The module sends no parent notifications or payments.

### Verified 0.4.0 native result

- [APK download](https://github.com/appsworld2027/Parent-plus-/actions/runs/43225589808/artifacts/13948107259); terminal success at `2026-11-12T13:22:26.601Z`, start `13:15:44.592Z` (about 6m42s). Result retrieved proactively through the `build-status` Git branch. The status path is tied to the exact source SHA, not inferred from another run.
- Package `com.parentplus.coach.preview`, development signed, 43,567,642 bytes; signature verification and both requested ABIs pass, with 17 ELF-verified native libraries each. APK SHA-256 `d3faf689030bfa7f0732f33dbd6c1cd94189d8ba66acfa3be8f5adea25bd5737`.
- Live settings check at `13:17:24.313Z`: endpoint reachable, public key accepted, email enabled, confirmation required, anonymous profile records blocked. No actual account login, observation request or migration deployment was performed by this settings-only check.
- Migration 005, real Supabase isolation/persistence, native SecureStore/recovery and phone/Windows-emulator acceptance remain pending. Artifact retention is 14 days. Monitoring ends on success; no unattended service remains running.

### Module 6 local verification — 14 November 2026

- Candidate 0.5.0 / Android versionCode 8. TypeScript and **111 automated checks across 14 files pass**. New PostgreSQL tests apply 006 twice and exercise immutable trusted fee/name snapshots, overlapping enrolment months/year rollover, active-month uniqueness, amount/date/request validation, partial/full totals, exact payment retries, attributable reversals, void/replacement, gateway test/live separation/excess flags, direct-write/anonymous/foreign-account rejection and RLS-protected consistent detail reads. Model tests cover date/status/money boundaries and scoped whitelisted device recovery.
- **47 browser flows pass with one worker**, including eight fees flows: invoice/manual receipt persistence and snapshots, lost-response retry across reload, correction/void/replacement, validation/navigation/busy guards, actionable missing update, storage failure/no API write, stale balance rejection, equal-timestamp pagination with concurrent insertion and unreadable recovery data. All use fictional Supabase transport; no real account or financial operation was made. A 412×915 paid-invoice screenshot was visually checked after the closing modal unmounted and saved at `docs/images/fees-paid.png`.
- Web export passes at 308 modules; Android Metro/Hermes export passes at 699 modules. Ten build-tool regression checks pass. SQL bundle exact-source check and `git diff --check` pass. Ten Mermaid diagrams parse/render, including the new fee recovery flow and updated workspace navigation.
- Initial test issues were investigated: a billing test attempted a student-name update through a direct path correctly revoked by an earlier migration; its privileged fixture setup was corrected. The owner-bundle guard expected four upgrades and was updated to five for 006; the complete 111-check rerun passed. A parallel browser run passed 46/47 but timed out on the class-create/edit/cancel flow; the retained trace shows initial bundle navigation consumed 23.8 seconds of its 30-second budget. The complete one-worker rerun passed all 47, including that class flow in 5.8 seconds. No product guard or timeout threshold was weakened.
- Native APK build and owner-requested hosted Vercel tests follow this local checkpoint. Migration 006 and previously prepared 005 are not confirmed deployed. Native SecureStore, real Supabase account isolation/persistence and actual phone/Windows-emulator acceptance remain open. No gateway integration, collection or parent messages are enabled.

#### Testing-agent review follow-up

The owner-requested testing agent found two concrete edge cases before hosted acceptance. A failed device write left the pending panel in memory but incorrectly suppressed tab-navigation warnings, and preserved legacy manual/test receipts lacked a TEST label. The source now tracks durable persistence separately, guards leaving a memory-only fee request, shows an explicit memory-only warning, labels every test-mode receipt TEST, and calls the aggregate Test payment records. TypeScript and all **nine focused fee browser flows pass**, including assertions for the previously unguarded navigation and a preserved manual/test plus gateway/test ledger. One intermediate navigation assertion ran during the closing modal's fade and matched two Keep editing buttons; it now waits for the prior confirmation to unmount before testing the next dialog. No business validation was weakened.

Vercel deployed `e15ac47` successfully; GitHub's foundation CI passed for that SHA. The agent initially encountered Vercel Authentication, then reached the hosted app using an owner-provided Share link. Share tokens and browser session state are intentionally excluded from source/docs. The two reviewed fixes are being deployed in a forward commit before the hosted regression run. Direct real Supabase login/writes still require a test identity and deployed migrations; fixture-hosted results must be labelled separately.

#### Hosted recovery-route repair

The agent verified the owner-authorized preview link works and checked the actual hosted sign-in screen. Read-only real Supabase settings checks passed: reachable, public key accepted, email enabled, confirmation required, anonymous profile access blocked. No real login/signup/email or record write was sent. The agent also reproduced a real web-hosting defect: root HTTP200, direct `/auth/recovery` HTTP404. `vercel.json` now routes SPA deep links to the exported index; JSON validation and TypeScript passed before deployment. Hosted regression is prepared with private access cookies, without storing the Share capability in source, and excludes only the four deliberately development-only interface-preview tests. The web-only follow-up used the existing `[diagnose-only]` job gate, but workflow-level concurrency still cancelled the running native build. The Android workflow now ignores Vercel routes and browser-only test files, preventing these unrelated changes from cancelling APK builds. A fresh final-source APK build is required; no cancelled build is represented as successful.


#### CI timing follow-up

GitHub's full regression on `062aa74` passed 47/48 browser tests; the remaining flow found two Keep editing buttons while an earlier invoice confirmation was fading out. The shared invoice helper now waits for that confirmation to unmount, as the save/review sequence requires. This changes test sequencing only and retains the navigation/busy assertions. Workflow YAML parsing, diff checks and all nine billing browser flows pass before this follow-up is committed.

#### Security and dependency follow-up

At the owner's explicit request for thorough error/leakage checks, a tracked-source credential-pattern scan found no secret/private-key patterns in 126 files. Safe zero-row anonymous API probes to all 12 existing record tables returned401; relations introduced by005/006 returned404. No private rows were fetched. The new [security matrix](SECURITY_VALIDATION.md) records scope and remaining real-account/native gates.

Full npm audit found one moderate underlying minimatch DoS advisory through Expo fingerprint (three package entries; no high/critical). A scoped override to minimatch11.0.1 preserves Expo58. Actual Android fingerprint generation succeeds before/after with the same hash and22 sources; ignore/negation/dotfile checks pass. The testing agent independently compared6,028 matcher results across44 patterns and137 paths, all equivalent. TypeScript and111 automated checks pass after installation; the new full audit reports zero known vulnerabilities. Native and Vercel build results for this final dependency source are checked separately; earlier cancelled APK attempts are not successes.


#### Final GitHub regression result for `cdd321e`

[App checks43625002459](https://github.com/appsworld2027/Parent-plus-/actions/runs/43625002459) completed successfully: TypeScript,111 automated checks, all48 browser flows, web308-module export and Android699-module export. Browser completion was18:12:13UTC; final Android export18:12:46UTC on14November. The Vercel agent rechecked the final dependency deployment and confirmed the same byte-identical tested production bundle. [The hosted report](VERCEL_QA.md) records44 applicable production flows; local development's additional four foundation controls are correctly absent in production. Private temporary preview-access artifacts were removed after verification.


#### Final native result

Run43625002448 completed successfully (about8m15s), exact sourcecdd321e, report18:17:12UTC. Packagecom.parentplus.coach.preview,0.5.0/versionCode8,development signed,43,606,218bytes. CI signature and ELF/ABI validation pass with17 libraries each forarm64-v8a andx86_64. APK SHA2566cdfff1270888c77c8be757faf69a5124a2b88badd722c9faf4e28f6cb9ddd40. [APK artifact](https://github.com/appsworld2027/Parent-plus-/actions/runs/43625002448/artifacts/14126395027). The workspace artifact download received403 from the artifact-storage host, so no independent local binary/manifest inspection is claimed. Real settings-only check passed at18:11:37UTC. Monitoring ended on terminal success; cancelled predecessor builds are superseded. Actual native/app/API acceptance remains pending.


### Owner-reported005 installation and independent API check

After an initial editor42601 error, the owner reports Success, no rows returned. Read-only live probes changed from404 to401/42501 for observation_versions; a zero-row observations query selecting revision/audience/updated_at/updated_by/recorded_at also returns401. No private record body was fetched. Fee balances remain404/PGRST205. The original observation database suite was rerun:8 tests pass. Internal deployed configuration cannot be read with the public client key, so the owner is supplied the read-only verifier in VERIFY_OBSERVATIONS.md. Its8 correct-state checks and5 unsafe-fixture detections were verified locally. Live internal verification and authenticated persistence/isolation remain pending; no successful write is inferred from a fixture test.


###005 live configuration verification completed

The owner supplied live screenshots showing all three RLS flags=true, exactly one authenticated owner-only policy per table, and all five remaining checks=true (migration registration, five required columns, no direct authenticated/anonymous writes, protected function settings/grants, and installed-body match). Combined with independent zero-row anonymous401 probes, the005 installation/security configuration is verified. Actual authenticated note persistence, two-account API isolation and native acceptance remain separate.006 is the next pending installation; do not repeat005 or earlier updates.

## 0.6.0 workflow correction — pre-publication

TypeScript and all136 automated tests across17 files pass. The prior53 browser flows passed; subsequent direct-fee restart/retry passed, and12 focused roster/workflow flows passed after the student-profile addition (includes the seven new coach workflow cases). The final production web export passes (320 modules); the earlier Android export passed707 modules. The final profile mobile layout check passes after dismissing its notification for the screenshot. Dependency audit reports zero vulnerabilities. Ten Python build checks passed; the final APK manifest permission guard compiles and awaits the native build. Local metadata/RLS emulation verifies immutable photo objects, referenced-object deletion denial, ownership and invalid-path/tenant/anon rejection, optimistic replacement, recorded-photo lock, atomic receipts/retry and preserved student/contact/membership details. Live migrations007/008 and real Storage bytes/signed-URL acceptance remain pending. The hosted0.5.0 report is historical until0.6.0 agent verification completes.

Publication source00790839: GitHub App checks43633663774 succeeds (136 automated,55 browser, both production exports). Vercel deployment succeeds; testing agent passes51/51 hosted fixture flows in168.526seconds with exact compiled bundle identity and public mobile/desktop/recovery smoke. See VERCEL_QA.md for bounded secret-scan evidence and live acceptance limits. The owner requested the consolidated copyable007/008 script and guidance on when to run it.

Owner installation checkpoint: screenshot shows202611150007 and202611150008 from the final installed_update query. The combined transaction is owner-confirmed installed. Focused zero-row live API probes for coach_photos/entity_id and students/proficiency_level return401/42501, no missing-schema code. Node fetch first encountered environment proxy ECONNREFUSED; the proxy-aware urllib probe succeeded. No records were read/written. This does not establish full internal policy configuration or authenticated/Storage-byte acceptance. Native43633663760 succeeds for00790839,44,096,070bytes,17libraries per ARM64/x86_64, development signing, merged camera/microphone permissions absent; SHA256797c0cf36d3c33ba0ddf52d555db63129be644b9fe4aca9ee59f393fedd7ad88.

## 0.7.0 photo onboarding — local checks

TypeScript and158 automated tests across20files pass with serial database/WASM initialization. Prior parallel runs hit older PGlite30-second setup timeouts (classes then roster); one-worker/nonparallel execution passes all158 in37.41seconds. Assertions/timeouts are unchanged.18 independent backend cases cover authenticated owner checks, private-audit denial, quota spacing/daily maximum, atomic rollback/replay, normalized-name duplicate rejection, streamed-byte limits, schema validation, malformed/truncated provider output and redacted failures. Three model cases verify conservative fields, explicit existing-name resolution and a whitelisted import payload; generated single-file deployment consistency is checked too.

Three new browser flows pass with fictional transport: batch scan/edit/link/confirm, interrupted import safe retry, and unconfigured scanner/manual-entry fallback. Final compact layout rerun/publication results follow separately. Web and Android exports pass before the final compact/static-import adjustment. No provider credentials, Edge Function deployment,009 installation, real extraction or API spending occurred. Existing001–008 installation remains unchanged.

0.7 publication result on final runtimea7c5170: [App checks43637366494](https://github.com/appsworld2027/Parent-plus-/actions/runs/43637366494) succeeds,158automated checks/20files,58browser flows, final web323modules and Android710modules exports. The final compact layout passes locally including name/age correction, and a targeted test verifies that uncertain saves do not claim nothing saved. [Focused hosted QA](ROSTER_SCAN_QA.md):3/3 new cases in10.373seconds, no old51-flow rerun, minimal real login/version/recovery smoke, zero real backend writes/provider calls. Six temporary access/config/browser-state/test-copy files were removed, with zero remaining capability matches. Native43637366483 is still pending terminal verification.009, function deployment/private API credential and live extraction/import acceptance remain open.

## Cloud Vision0.8.0 — local verification

TypeScript and all181automated checks across22files pass (42.59seconds, serial DB initialization). New/updated focused coverage:12mapping cases (English/Hindi geometry, explicit multi-field forms, low-confidence/unknown data, changed labels/headers, quotas50rows, rotated geometry and malformed provider envelopes);10handler cases (Auth→ownership→newquota→fixedGoogleURL, header-only key, exactlyonefeature/image, bounded upload, redacted errors, no text/unknown layout and incompatible provider-protocol rejection);8monthlyquota PostgreSQL cases (roles/privategrants,900globalcap, queued limit/cooldown boundaries, rollback and UTC rollover);5review-model cases including bounded source text and names-only interpretation. PGlite's single engine is not real multi-session concurrency acceptance.

The agent independently reproduced3material mapper hazards: teacher-name suffixes, far-apart Guardian/Phone headings and changed repeated-header order. All were fixed and independently rechecked; unknown scopes/layouts now fall back rather than misassociate students/contacts. Five browser scan workflows pass before the final fixture marker assertion: populated/corrected fields and explicit confirmation, exact retry after lost outcome, missing-service/manual fallback, raw-text names-only fallback without a second provider request, and monthly-limit refusal. No liveGoogle/provider requests, real records or paid usage. Source/migration/dashboard-file consistency passes. Publication and final browser/CI evidence follow.

Final local provider-marker browser run:5/5pass in24.6seconds. The fixture now rejects requests lacking cloud-vision-v1, proving the client sends the new protocol. No student/import call occurs before the confirmation button. Source SQL/dashboard generators match their tested inputs and git diff whitespace checks pass. Source is ready for publication; no live provider/account/deployment activation occurred.

0.8 final runtime3f7d4fc: [App checks43673787137](https://github.com/appsworld2027/Parent-plus-/actions/runs/43673787137) succeeds with181automated/22files,60browser cases, web323modules and Android710modules exports. [Focused hosted QA](CLOUD_VISION_QA.md) passes5/5scan cases in17.072seconds, no oldsuite rerun. Google disclosure/protocol marker are present, no provider endpoint/key header code is in the served client, and bounded credential-pattern scans find no matches. Zero real provider calls/writes occurred. Six temporary access/browser/config/test-copy files were removed. Provider/function/009010 remain undeployed; actual OCR accuracy and native acceptance remain separate. Native43673787088 is still running.

Latest status check: native0.8 run43673787088 completed successfully. The final documentation deploymentb67e981 also has successful Vercel status. This supersedes earlier native-pending entries; physical installation/camera/session acceptance and actual Cloud Vision activation remain open. No app code or live backend was changed by this status update.

16November live readiness recheck: scan-roster with the public apikey responds OPTIONS200{} and unsigned POST401UNAUTHORIZED, both no-store. The prior default Hello example is no longer returned. This verifies deployed custom-handler routing and unsigned-request denial at response level, not exact source bytes, Google credential validity, real OCR, signed-in import or isolated-account behavior. No photos/provider calls/records were sent or changed. Owner-confirmed001–010 and storedGoogleSecret remain complete; do not repeat setup.

## First-run roster setup0.9.0 — local checks

TypeScript and182automated checks/22files pass in42.69seconds. New automatic-name review checks keep pure names straightforward but require explicit selection when unassigned ages/contact columns could confuse student/guardian identities.7/7focused browser cases pass in33.3seconds: first Today setup with actual counts; inline batch creation and preserved review; common batch dropdown changes; populated name/age/level/guardian/phone; explicit save; success→batch/profile→reload persistence; locked unknown-outcome exact retry; confirmed-save refresh failure with read-only retry/no second import; cancelled/failed scan retaining batch/manual path; existing profile preservation; names-only automatic candidates without another scan; monthly quota refusal. All use fictional transport and make no real OCR/database calls. Screenshots090-setup-saved.png and090-setup-profile.png were visually inspected. No SQL/function/secret changes were made. Hosted/full CI/native results follow.


0.9 final runtime ccb5d246: [App checks43794966145](https://github.com/appsworld2027/Parent-plus-/actions/runs/43794966145) succeeded with182automated checks/22files,62browser cases, web325modules and Android712modules exports. [Focused hosted QA](COACH_SETUP_QA.md) passes7/7 in22.850seconds on the served0.9.0 Vercel bundle. Mobile setup/review/saved/profile screenshots were inspected. No real backend writes or Google calls occurred. Temporary hosted access/config/state files were removed with zero remaining capability matches. Native43794966062 remains building; real confirmed import/reopen and physical-device acceptance remain pending. Existing backend setup is retained.


## Two workspaces0.11 / Parent0.1 —16November2026

[Detailed evidence](DUAL_WORKSPACE_QA.md):201unit/database checks across27files, TypeScript,76browser cases and web/Android JS exports pass locally. Parent database tests execute the exact delivered one-transaction011/012 file twice and cover family RLS, explicit invite hashing/expiry/replay, reviewed per-child feedback, consent and stale-disconnect protection for a replacement family. Independent read-only test-agent inspection found the stale-disconnect defect, now fixed/regression-covered; no further material access/consent bypass was found. Browser journeys include real SDK fixture-based two-module linkage, Parent recovery return, child/profile/event/todo/time persistence and consented media/WhatsApp/retry paths. Copyright/licence UI and copy-only cleanup followed the full browser pass; final types/exports pass. No real SQL/parents/provider calls occurred. Publication/CI/native evidence follows; live011/012 and actual user/device acceptance remain separate.
