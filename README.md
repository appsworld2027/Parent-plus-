# Parent Plus Coach

Native Android coach app using React Native, Expo SDK 58, and TypeScript. The parent app is deferred. See [PRD](PRD.md) and [build plan](BUILD_PLAN.md).

Implementation is paused at the owner's request. See [the saved progress checkpoint and journey chart](PROGRESS.md) before resuming.

## Current state

Module 0 foundation: native component navigation, safe configuration checks, error boundary/recovery, sanitized in-memory diagnostic reports, and automated tests. Teaching screens remain labelled placeholders, not completed features.

Module 1: the initial database migration has been applied by the owner and its version confirmed in the Supabase dashboard. PostgreSQL access-control tests run locally. Expo owner is configured as `appsworld2027`; build authorization is separate.

Module 2: email sign-up/sign-in/recovery, secure native session storage, and academy onboarding are implemented and tested using simulated backend responses. Live email delivery, actual SDK operations, native deep links, and Android installation remain unverified. Follow [email setup](docs/AUTH_SETUP.md). Payments are not implemented.

## Local development

Use Node 24 and npm. From this repository:

```sh
npm ci
cp .env.example .env.local
npm start
```

Supply only the public Supabase URL and publishable key in `.env.local`. Never use a service-role or gateway secret in an `EXPO_PUBLIC_` variable. The local file is ignored by Git. Missing config does not prevent startup. Config presence does not establish a working backend.

For this restricted cloud workspace, use `npm_config_cache=/tmp/parentplus-npm-cache` for npm and `EXPO_OFFLINE=1 EXPO_NO_TELEMETRY=1` for Expo commands. Offline mode skips external Expo metadata calls; package versions were selected from the installed official SDK compatibility map. It does not disable TLS or package integrity verification.

Each cloud task already has an isolated checkout. Use it directly; do not create a worktree unless requested.

## Checks

```sh
npm run check
npx playwright install chromium
npm run test:e2e
npm run export:android
npm run export:web
```

On machines with system Chromium, use `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e`. Browser tests start their own local Expo server on port 18081 and refuse an existing server. Authentication tests install a simulated transport before app startup; they do not send real emails or call live Supabase. They verify the React Native web target and SDK/UI behavior, not Android device behavior or actual provider delivery.

`export:android` verifies Metro's Android bundle; it does not create an installable APK. A native APK requires build/signing setup and validation on a device. `eas.json` defines an internal APK profile and a production AAB profile; no Expo account/project has been linked or build submitted.

GitHub Actions checks are prepared in `.github/workflows/checks.yml`. Source has been pushed to `codex/coach-foundation`; remote workflow results have not yet been inspected. Local test results are documented separately.

## Diagnostics

Support is available through the question-mark button. Reports accept only known error codes and safe metadata, are capped at 30 events, and clear when the app restarts. Report sharing is deliberate; remote monitoring is not enabled. Development/test mode includes controlled failure checks; unset/unknown environments default to production and hide them.

See [validation](docs/VALIDATION.md), [issue record](docs/ISSUES.md), and [your next step](docs/OWNER_NEXT_STEP.md).
