# Module 0 validation

Date: 11 November 2026. App version: 0.1.0. Validation is current-instance evidence, not proof of publication or a new machine's restored state.

## Passed

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
- Supabase connectivity from this cloud instance remains blocked by network policy. No schema, auth workflow, or API operation is claimed as verified.
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
- Direct Supabase API recheck still received proxy CONNECT 403. Live key validity, SQL deployment, auth behavior, and API behavior remain unverified. No further unchanged retries are required.
- The migration does not implement observation publication, fee/payment server operations, or remote diagnostic collection. Their tables are protected until subsequent modules add the corresponding server functions.
