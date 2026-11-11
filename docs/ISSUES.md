# Issue record

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
