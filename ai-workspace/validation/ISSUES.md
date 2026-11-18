# Issue record

## AUTH-RECOVERY-002 — Live reset redirect and email-tab proof

17November2026: the owner reported that a real reset email opened a page at localhost:3000. Deliberately invalid routing probes confirmed the live Supabase Site URL fallback for both default and explicit public callback paths. Owner changed Site URL to the normal public origin; repeat probes now resolve to the public root and `/auth/recovery`. No additional redirect-field edit or database migration was necessary; no account password or real email was changed/sent by the coding environment.

Code inspection and observed failing regressions exposed additional browser issues: tab-only PKCE proofs were unavailable in a fresh email tab; the SDK flow ID was removed before exchange; cross-tab SDK session broadcasts could replace another tab's displayed account state; later Parent intent could override an earlier Coach email; shared cleanup indexes let one tab's logout erase another tab's pending proof. Candidate0.13.2 uses addressed expiring proof slots, local cleanup ownership, per-document SDK channels/stable persisted key mapping, and explicit flow/module callbacks. Direct `/auth/recovery` opens a request form without creating a session. Existing sessions/native SecureStore and password policy remain. [Current setup and acceptance boundaries](../database/setup/AUTH_SETUP.md); exact verification/release evidence is in PROGRESS.md and the PR.

## ENV-001 — Direct backend access blocked

- Status: external limitation, not resolved.
- Symptom: cloud HTTPS proxy rejects connections to the selected Supabase project with CONNECT 403.
- Impact: database/authentication/live-backend checks cannot currently run from this cloud instance.
- Route forward: prepare migrations for the Supabase dashboard and verify through the app on an authorized device; do not represent this as an installed plugin requirement.

## ENV-002 — Default package/scaffold state directories are read-only

- Status: resolved for the verified local workflow.
- Symptom: npm/create-expo-app attempted to write under the restricted home directory.
- Correction: install the official Expo blank TypeScript template package, use a writable npm cache under `/tmp`.
- Validation: dependency install, TypeScript, tests, and Android/web bundle export passed. Run Expo offline to use its installed compatibility map instead of blocked external metadata services.

## ENV-003 — Test package registry request returned 502

- Status: resolved.
- Symptom: unversioned Vitest package metadata requests failed and npm entered automatic retries.
- Correction: stopped the failing install, checked the official registry's smaller latest-version endpoint, and installed the explicit version with automatic fetch retries disabled.
- Validation: Vitest installed and 14 tests passed; exact dependencies are in package-lock.json.

## Reporting a new issue

Record app version, safe error reference, expected/observed behavior, known cause, correction, regression check, and open/resolved status. Never paste private student content or credentials here.

## TEST-001 — Authentication fixtures did not isolate requests

- Status: resolved for the current local browser suite.
- Symptom: initial route-based browser fixtures did not intercept SDK calls as expected; six new authentication tests failed. Initial server/configuration isolation changes alone were insufficient.
- Correction: the test runner uses a dedicated port and refuses existing servers. Authentication tests now install a fictional fetch transport before app/SDK startup and block unexpected external fetch destinations. Native/application auth code is unchanged by the fixtures.
- Validation: all 11 browser tests passed, including different failure/success paths, SDK endpoint-call assertions, S256 challenges, session reload/clearing, and password recovery. This is simulated-backend evidence, not evidence of live Supabase reachability.

## BUILD-001 — Native toolchain and dependency download

- SDK manager initially tried a restricted home directory. Resolved through the supported ANDROID_USER_HOME under `/workspace/.parentplus`.
- Android 37 uses package `platforms;android-37.0` in the current repository manifest; installing the older-style `android-37` name did not provide it. Installed the correct official package.
- Java 17 was missing. Downloaded official Temurin 17.0.21+9, verified its SHA-256, and configured the Gradle toolchain while retaining Java 21 as runtime. Gradle then compiled the Kotlin plugins and reached the native app/CMake tasks.
- Remaining local blocker: Maven redirects React Native's AAR to `repo.reactnative.dev`, denied by this environment's outbound policy. The editable environment draft tool still cannot read configuration. Neither checksums nor TLS verification were disabled, and the artifact was not substituted with untrusted content.
- Route forward: a standard GitHub Actions Android build, with public client settings, signature verification, and a live settings-only auth check. Remote execution still needs confirmation from the actual workflow/status record.

## UI-001 — Batch checkbox accessibility

- Browser test found that an enrolled/selected batch did not expose a checked state on the web accessibility tree.
- Added explicit aria-checked while retaining native accessibility state. The selection/reload/disabled-existing-enrolment browser check then passed.

## UI-002 — Confirmations on long forms

- Inline discard/archive confirmations could appear above or below the current scroll position.
- Replaced with modal dialogs, dismissed the keyboard when requesting navigation, and reset scroll on form/tab changes. Navigation remains blocked while a save is pending.
- Validation: all 16 browser checks pass, including in-viewport confirmation assertions. Native phone keyboard/back-button behavior still needs device testing.

## BUILD-002 — Interrupted secondary Android CLI bootstrap

- GitHub run 43094369260 downloaded the command-line tools archive, then failed inside the new SDK launcher's secondary download: `gzip decompression failed: Peer disconnected`. App compilation never started. Owner screenshots establish this cause.
- Correction: use Google's self-contained command-line tools 20.0, verified against its official repository SHA-1, while keeping the app's SDK/platform/NDK versions unchanged. Add bounded transfer retries and sanitized SDK-stage failure evidence. No access changes are needed for this route.
- Validation: tools 20.0 successfully listed and installed platform 37.0 into a clean local SDK root. Six regression checks cover interrupted-transfer retries, bounded timeouts, fatal-access failures, checksum/path rejection and log redaction. Workflow syntax passes actionlint. The replacement remote APK build still needs verification.

## BUILD-003 — Preview workflows remain queued

- Owner screenshots show all later Android workflows queued after the first failed native build; attempts to cancel older diagnostic runs return a generic GitHub error. This does not establish a billing or service-outage cause.
- The original workflow used a shared `android-preview` concurrency group. Commit e6a1090 switched cancellation off, allowing an older active run to hold the group. This is a plausible contributor, not a confirmed cause: queued runner jobs, account limits, and GitHub service failures cannot be distinguished from the available UI/status evidence.
- Controlled correction: move current builds to `android-preview-sdk20-v2-${{ github.ref }}` and cancel superseded previews within that new branch-specific group. The old group's lock cannot directly serialize the new group; account-wide runner availability can still affect it. No admin changes are required.
- Validation: actionlint validates the workflow. A start record for the new source revision is required before claiming it executed; a successful APK report is separately required before claiming the build works. Do not create repeated diagnostic workflows if this test remains queued.

- Observed result: after only the concurrency isolation change, GitHub published a real `running` record for source e4256b55eae46571bf9c46d04079f9f65be038e6 at 2026-11-11T21:06:17.910Z, run https://github.com/appsworld2027/Parent-plus-/actions/runs/43100171391. This strongly implicates the legacy group as the queue blockage. It does not establish which old run held it, explain the UI cancellation failures, or prove APK success.

- BUILD-002/BUILD-003 follow-up: run 43100171391 completed successfully and uploaded a signature-verified APK after the installer and queue isolation repairs. Both repairs are verified for this run. Legacy cancellation errors were not independently diagnosed and do not block this preview artifact.

## ANDROID-001 — App closes after successful account-creation email request

- Owner reports receiving the email, later confirming/signing in, but the app closed immediately after tapping Create account / Send email in the app. No device crash stack is available.
- Concrete code defect found: the success text used `accessibilityRole="status"`. The installed RN 0.88.1 Android `BaseViewManager.setAccessibilityRole` calls `AccessibilityRole.fromValue`, whose enum does not include STATUS and throws for unsupported values. This differs from the separate ARIA `Role` enum, which includes STATUS. The same unsupported prop appeared in roster save notices.
- Repair for version 0.2.1 (Android versionCode 3): use `role="status"` with `accessibilityLiveRegion="polite"` in both success-message locations. Preserve browser status semantics and native announcements. No auth or database settings change is involved.
- Regression: a TypeScript-AST test validates all literal accessibilityRole props against the installed native Android enum. It failed on exactly those two locations before the fix, then passed. TypeScript and all 51 tests passed; all 16 browser checks passed, including signup/recovery and roster-save notices. These are source-contract/browser checks, not an emulator or device reproduction.
- The defect matches the reported timing, but without a device crash log this does not prove it was the owner's sole crash cause. Updated APK installation and a non-duplicating recovery-email success test on the phone remain necessary. Existing logs are bounded in-memory application diagnostics, not persistent native crash telemetry.

- ANDROID-001 follow-up: the 0.2.1 APK compiled, passed signature verification and was uploaded by run 43145465149. Code defect repaired and build verified; device confirmation remains open. Do not mark the owner-reported crash resolved solely from the CI result.

## DATA-001 — Lost-response and competing attendance saves

- Risk addressed before live acceptance: independently saved attendance from another device could be replaced by an older device draft; a lost response could misrepresent a committed save as missing.
- Migration 003 serializes through a class-row lock and revision check, requires all eligible active students, reuses the existing atomic validation and revokes client bypass routes. A changed revision requires explicit comparison. Client reconciliation only reads server state and never automatically overwrites it.
- SQL and browser checks pass for stale saves, invalid/incomplete marks rolling back, draft retention and lost-response reconciliation. Native/deployed acceptance remains open.

## LOG-001 — Diagnostic references disappeared on restart

- The original diagnostic buffer was in memory, limiting investigation after app closure. Candidate 0.3.0 persists allowed metadata through a chunked device adapter, reconstructs/validates saved fields, bounds count/age on restoration, and invalidates queued writes at sign-out. Storage failures degrade to a visible memory-only report state.
- Automated/browser restart, corruption/private-field stripping, storage-failure and sign-out-race checks pass. Native persistence and share-sheet behavior remain to be tested. This repair does not provide native crash stacks or remote monitoring.

- DATA-001 review follow-up: an attendance revision alone does not detect edits made to an as-yet-unmarked class. Added migration 004 with canonical class-context checking, preserving published 003. Reopening refreshes roster context; explicit rejected saves are not reconciled as success against an old matching subset. SQL/model/browser regressions pass. The final hardened APK and live/device checks remain pending.

- DATA-001/LOG-001 build follow-up: final source 80bf1e7 compiled and passed signature verification in run 43164824902. Build verification is complete; deployment and Android phone acceptance remain open. The earlier internal 10b9968 APK is superseded.

## UI-003 — Action results could be out of view

- Owner reported no clear success/failure on the phone. Existing result text was near the top of the page ScrollView, allowing a saved form or long roster to hide it. This is a feedback defect; screenshots show stored roster/class data and a device-only attendance draft, not a confirmed server-attendance failure.
- Candidate 0.3.1 adds a fixed result row outside scrolling, explicit server/local-draft statuses, persistent Dismiss, repeat-result publication, cleared stale success while pending, and class-time/attendance-count summaries. Failed archive/discard dialogs close before displaying their failure. Auth/account/diagnostic action results use the same system.
- 79 automated checks and 30 browser flows passed; 21 affected auth/classes/feedback checks passed after final wording changes. Four new browser regressions verify viewport visibility, same-message repeats, modal failure, pending status and local/server outcomes. Native build/phone checks remain pending. No SQL changes.

- UI-003 build result: source 73805fa passed native compilation/signature verification and uploaded the 0.3.1 APK in run 43176931524. Code/browser/native-build checks passed; phone visibility/feedback acceptance remains open. No SQL change is needed.

## 12 November 2026 — observation recovery fault checks

- **Unreadable storage index blocked explicit discard:** the chunked storage adapter parsed the index before deleting it, so a corrupt index made both restore and removal fail. An added browser fault test reproduced a disabled editor after discard. Explicit removal now deletes the index even when parsing fails, and cleans known chunks when the index is valid. Added a storage regression check plus the browser recovery path. SecureStore cannot enumerate unknown orphan chunks after index corruption; full Android app-data removal is the complete-wipe route in that exceptional case. Ordinary valid-draft deletion removes its indexed chunks.
- **Device write failure vs server save:** manual observation saves first persist the exact request snapshot. If that fails, the request is not sent, the text stays in the open editor, and feedback explicitly says the device draft was not saved. It does not falsely claim a retained new device copy. The prior indexed copy remains available when a replacement write fails before commit.
- **Upgrade-bundle assertion:** adding migration 005 correctly made the generated bundle contain four upgrades rather than three. Updated the bundle contract test; initial migration 001 remains excluded. The owner already at 004 is instructed to apply only 005.
- Confirmation dialogs use a brief fade. Screenshot/error assertions now wait for the closing dialog to leave before checking the fixed outcome notification; a transient closing dialog is not treated as a second active action result.

### 14 November 2026 — billing review before hosted acceptance

- Device-storage failure created an in-memory pending fee request, but the navigation callback treated every pending request as durable and disabled the unsaved-entry warning. Fixed by tracking confirmed persistence separately; failed persistence keeps the warning and an explicit memory-only message. The browser regression checks that no payment API write occurs, changing tabs prompts, and Keep editing retains the retry request.
- Legacy schema permits manual/test receipts. The new screen originally labelled all manual rows alike while excluding test amounts from totals. Fixed by applying TEST to every test-mode history entry and naming the aggregate Test payment records. A browser fixture verifies manual/test and gateway/test remain visible and excluded from real outstanding.
- Both findings came from the hosted-testing agent's source review while Vercel preview access was being arranged. Nine focused fee browser flows and TypeScript pass after the repairs; real API/native acceptance remains separate.

### 14 November 2026 — Vercel password-recovery routing

The hosted-testing agent confirmed the deployed root loaded with HTTP 200 while `/auth/recovery` returned Vercel NOT_FOUND/404. The Expo web export is a single-page app; Vercel needed an index fallback for deep links. Added `vercel.json` with the standard catch-all rewrite to `/index.html`; the agent must verify direct recovery navigation and ordinary JavaScript asset loading on the next deployment. Authentication tests now derive the expected recovery origin from Playwright's baseURL and assert production developer controls are absent while retaining local diagnostic cleanup coverage. These are web hosting/test changes. The existing native job-skip marker still allowed workflow concurrency to cancel an APK build, so browser-only and Vercel config paths are now excluded from Android workflow triggers. A fresh final-source build is recorded separately.
