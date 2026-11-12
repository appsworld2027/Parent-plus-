# Android preview build and real login checklist

## Build/download links

Current checkpoint: final version **0.3.0** built successfully in [run 43164824902](https://github.com/appsworld2027/Parent-plus-/actions/runs/43164824902) from `80bf1e725a8897c7a27dc7ddea17d2a1985db8db`. [Download its artifact](https://github.com/appsworld2027/Parent-plus-/actions/runs/43164824902/artifacts/13920265830), extract the ZIP and install the APK as an update. This is the final class-context-checked build; the earlier 0.3.0 candidate run 43163487986 is superseded. Apply the [combined database update](CLASS_SETUP.md) before the live classes/attendance acceptance journey. The email success-message repair is included but still needs phone confirmation. See [current progress](../PROGRESS.md).

No owner admin/network changes or Expo authorization are required for this working preview route. The earlier SDK bootstrap and shared-queue build problems were repaired; do not ask for the old failed-step screenshots again.

- [Android preview builds](https://github.com/appsworld2027/Parent-plus-/actions/workflows/android-preview.yml)
- [Regular automated checks](https://github.com/appsworld2027/Parent-plus-/actions/workflows/checks.yml)

Open the latest successful Android preview run for `codex/coach-foundation`. Under Artifacts download **ParentPlus-Coach-Preview**, unzip it, and copy `ParentPlus-Coach-Preview.apk` to the Android phone. A workflow file being present does not mean a successful artifact exists: check the actual run outcome first.

The workflow builds a standalone ARM64 Android preview (Android 7.0/API 24 or later). It includes its JavaScript bundle and does not require a laptop Metro server or an Expo account login. It uses a separate application ID `com.parentplus.coach.preview` and development signing; store/production signing is not completed by this preview.

Android may ask you to allow installation from the browser/file app used to open the APK. Enable it for that installation source as needed, then install **Parent Plus Coach Preview**. If installation fails, share the message; do not troubleshoot Android tools yourself.

## What the build checks

- TypeScript and the local automated suite.
- Checksum-verified SDK tools and Gradle distribution, Java 17 toolchain plus Java 21 runtime.
- Compilation of the actual native app, then APK signature verification.
- A SHA-256 digest and source-commit record alongside the artifact.
- A separate live-project probe: public key accepted, email enabled, confirmation required, and anonymous profile reads denied. It never creates users, sends messages, or logs records/keys. Read its actual result; a simulated browser test does not establish these outcomes.

The small build-status JSON records are saved on a separate `build-status` branch so the coding agent can inspect CI progress over Git when the REST API is blocked. No APK is stored in Git history. Artifacts expire after 14 days.

## Connection configuration

`config/public-client.json` supplies the project's public URL and publishable key for connected builds without additional owner steps. These values are intentionally shipped to every app client and grant no owner/service privileges. Server-role, database, SMTP, gateway, and signing secrets must never be added there. Environment variables can override the public defaults.

## First real login test

1. Install the preview on a physical Android phone.
2. Register using an inbox you control; keep the new password private.
3. Open the newest confirmation email on the same phone. If it arrives in a browser instead of the app, note the message rather than sending the email URL/code to Codex.
4. Sign in, create the academy, then close/reopen the app and verify the workspace returns.
5. Sign out. Request password recovery, open the newest link on the same phone, set a new password, and sign in again.
6. Report completion or a sanitized screenshot/error reference.

Supabase default email delivery can restrict recipients/rate. If delivery fails, it needs diagnosis or an approved SMTP provider; keep email confirmation enabled. An APK and server settings probe do not by themselves prove the real email/device journey passed.

For the current app, apply the [combined 002/003/004 update](CLASS_SETUP.md) before roster/classes tests; do not repeat 001.
