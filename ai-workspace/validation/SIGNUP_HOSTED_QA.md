# Hosted signup entry QA — 0.11.2

Source `91ea632fa0f193acbea5a4cd320f4e593df4b4ff`; successful Vercel deployment `KT6cTDLyHZ2TfmQjBXy7WtUnSHk4`.
Canonical preview: https://parent-plus-varcel-git-codex-coach-foundation-appsworld2027.vercel.app
Checked 2026-11-16T09:13:25.831Z.

All3 requested `e2e/workspace-entry.spec.ts` cases passed in 15.287s,0 skipped/flaky/unexpected failures: role-specific signup and returning-user sign-in; authenticated shared-session Coach→Parent profile setup→Coach dashboard; unsaved Coach form navigation protection. No older suites repeated.

Direct `/parent/signup` and `/coach/signup` returned200. Clean screenshots `parent-signup-phone.png` and `coach-signup-phone.png` were visually inspected at412×915: distinct workspace identity, signup links, confirmation fields, email verification/onboarding copy and return-to-login are readable. Static smoke recorded0 JavaScript page errors and0 backend/provider requests.

Served asset `/_expo/static/js/web/index-e22f918e49c7a405bbb867c2f2d11f3f.js` returned200; SHA256 `4651c4659c5b352a685917f9f11ed032bf01cff757700583edf01f4b12144923`. Coach0.11.2 and Parent0.1.0 markers confirmed. The source revision marker91ea632 is absent from the client bundle; exact-source evidence is GitHub's successful Vercel commit status and deployment identity, captured alongside this asset digest. Bounded Google API-key/Supabase-secret/private-key pattern checks found0matches.

Authenticated tests used fictional in-browser transport fixtures only. No real signup/email, family data, SQL, database writes, OCR/provider calls, parent contacts or messages. Static smoke blocked backend/provider hosts. Database activation remains separate and was not tested. This tests production-hosted interface behavior, not acceptance of unapplied updates011–013.

No tracked source edits. Temporary private bootstrap script, Playwright configuration and cookie/browser state were removed after this sanitized evidence was saved. No access capability or private browser state retained in the report.
