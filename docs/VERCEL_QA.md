# Vercel hosted verification — 14 November 2026

App version: **0.5.0**. Project: `appsworld2027/parent-plus-varcel`.

[Hosted branch app](https://parent-plus-varcel-git-codex-coach-foundation-appsworld2027.vercel.app) · [verified deployment](https://vercel.com/appsworld2027/parent-plus-varcel/9rjTrmYM5LMjZx2xh2jyo13xqxqT) · source `4ce4e26ba77cf63522b36d08db2f48105f845a18`.

The preview remains protected by Vercel Authentication. The owner supplied an authorized share link for testing; its access token and temporary browser state are not stored in this repository. Deployment protection was not disabled.

## Hosted browser result

**44 flows passed**, zero failures, skips or flaky results, in approximately 3 minutes 24 seconds. These ran against the actual Vercel-served application bundle using the existing fictional Supabase transport fixtures:

| Area | Passing flows |
| --- | ---: |
| Authentication, recovery and session cleanup | 8 |
| Classes and attendance | 9 |
| Visible save/failure feedback | 4 |
| Invoices, manual payments and recovery | 9 |
| Observations and drafts | 9 |
| Students and batches | 5 |

The nine fee flows include partial/paid balances, fixed invoice amounts, exact-request retry after a lost response and restart, reversal/void/replacement history, validation/navigation guards, failed device storage, changed server balance, missing schema, stable pagination, corrupt recovery data, and explicit TEST labels for preserved manual and gateway test receipts.

The four local `foundation.spec.ts` flows intentionally require development-only preview/failure controls. They were excluded from the production-hosted run; separate hosted checks confirmed those controls are absent as intended. They are covered by the local development regression, not claimed as production-hosted passes.

The runtime was tested through deployment source `3f59cd61a2627167e0100c703114e2649de1cbf1`; the later workflow/documentation deployment `4ce4e26` was rechecked and serves the identical JavaScript bundle. SHA-256: `584cccb23c3f32ec4add400032ed0249f15103f7309720ac8ed128cb3f5c6813`.

## Real hosted and backend checks

- The real sign-in screen loads on phone (412 × 915) and desktop (1280 × 900), with no horizontal overflow or page exceptions. Invalid email and empty-password submissions are rejected locally. These checks sent no real Supabase write requests.
- Initial JavaScript loading returns HTTP 200; cached loading returns the expected HTTP 304. Root `/` and direct `/auth/recovery` navigation both return HTTP 200 app HTML.
- The deployed bundle points to the repository's intended public Supabase configuration. Settings-only checks confirm endpoint reachability, acceptance of the publishable key, email enabled, and email confirmation required. Anonymous profile access is denied.
- Zero-row, read-only API probes return HTTP 404 / `PGRST205` for `observation_versions` and `fee_invoice_balances`. The relations needed by updates 005 and 006 are not yet available through the real API. Deployment of those updates remains an owner setup gate.

No real user login, registration email, recovery email, observation, invoice, payment or refund was created by this hosted verification. Fixture-based success does not establish real authenticated Supabase persistence, two-account isolation on the deployed project, or Android/native storage acceptance. Follow [the fees setup and acceptance guide](FEES.md) for those remaining checks; do not repeat already-installed updates 001–004.

## Defects found and repaired before acceptance

1. Device-save failure incorrectly suppressed the unsaved fee navigation warning because an in-memory pending request was treated as durable. The screen now distinguishes durable and memory-only recovery, and the browser flow verifies the warning and retained request.
2. Preserved manual test receipts lacked a TEST label, and the test aggregate was incorrectly described as gateway-only. Labels now reflect test mode for either source; real balances exclude both kinds of test receipt.
3. Vercel initially returned HTTP 404 for direct password-recovery links. The SPA rewrite in `vercel.json` repairs that route; the hosted recovery flow and a direct route check both pass.

Private temporary traces, screenshots and browser access state were used during verification. They are not repository artifacts. The hosted paid-invoice screenshot was visually inspected: the fixed success notification, Paid state and zero outstanding amount are legible at phone width.
