# Parent Plus Coach

Native Android coach app using React Native, Expo SDK 58, and TypeScript. The parent app is deferred. See [PRD](PRD.md) and [build plan](BUILD_PLAN.md).

Development is stopped at the owner’s request. Current progress has been saved; resume only when requested. Physical-phone automation is also on hold. See [the current progress checkpoint and journey chart](PROGRESS.md).

Version 0.3.1 has a successful native Android build with signature verification. The owner installed 0.2.0 and reports email confirmation/login. Version 0.2.1 repairs unsupported Android success-message accessibility props; device acceptance remains pending.

Modules 0–3: app foundation, initial database schema, email authentication/academy onboarding, and students/guardian contacts/batches are implemented to varying verification levels. Migration versions 001–004 are owner-confirmed installed; real app/API and roster device checks remain pending. Latest local checks for candidate 0.3.0: TypeScript, 79 automated tests and 26 browser tests passed.

Version 0.3.0 adds classes/attendance, a real-record Today class summary and device-persisted diagnostics. [Phone acceptance](docs/CLASS_SETUP.md) remains pending; the migrations are installed. Observations, invoices/manual payments, gateway integration and remaining release/privacy/backup/native-monitoring gates remain open. This is an internal preview, not a complete teaching or payment pilot. See [roster setup](docs/ROSTER_SETUP.md) and [Android preview](docs/ANDROID_PREVIEW.md).

Version 0.3.1 adds [fixed action feedback](docs/ACTION_FEEDBACK.md) so results remain visible while scrolling. Database versions 001–004 are already confirmed installed; no SQL change is needed for this patch.

## Start here

- [How the app actually works](docs/ARCHITECTURE.md): system, login, roster-save, data and build diagrams.
- [Product decisions](docs/PRODUCT_DECISIONS.md): scope choices, tradeoffs and current assumptions.
- [Developer handover](docs/DEVELOPER_GUIDE.md): file map, setup, tests, security boundaries and the working agreement.
- [Current progress](PROGRESS.md): completed work, verification limits and the next acceptance steps.

Update affected technical docs after substantial changes. Review PRD/progress once per active working day; flag important blockers and product decisions immediately. This is an active-session practice, not an unattended scheduled service.

## Local development

Use Node 24 and npm. From this repository:

```sh
npm ci
cp .env.example .env.local
npm start
```

Public project defaults are now bundled in `config/public-client.json` so connected previews can build without manual account setup. `.env.local` can override them. These are client-visible URL/publishable settings, not privileged credentials. Never add service-role, database, SMTP, gateway, or signing secrets there or in an `EXPO_PUBLIC_` variable. Config presence does not establish a working backend.

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

GitHub Actions app checks run from `.github/workflows/checks.yml`; the native preview uses `.github/workflows/android-preview.yml`. Successful APK build evidence is saved in [validation](docs/VALIDATION.md). Treat automated checks, native builds and actual phone acceptance as separate results.

## Diagnostics

Support is available through the question-mark button. Reports accept only known error codes and safe metadata, are capped at 30 events, and persist on the device when storage is available. Restoring strips unknown fields and removes events older than 14 days; sign-out clears reports. Report sharing is deliberate; remote monitoring is not enabled. Development/test mode includes controlled failure checks; unset/unknown environments default to production and hide them.

See [validation](docs/VALIDATION.md), [issue record](docs/ISSUES.md), and [your next step](docs/OWNER_NEXT_STEP.md).
