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
