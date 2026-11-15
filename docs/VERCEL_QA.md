# Latest Vercel verification —0.8.0

[Cloud Vision0.8report](CLOUD_VISION_QA.md): runtime3f7d4fc,5/5hosted scan cases plus minimal version/login/recovery/disclosure smoke pass. Full GitHub type/unit/browser/export pipeline passes. These are fixture/transport tests, not liveOCR acceptance: the private Google key, function and009/010 activation are pending. Prior reports below are historical.

---

# Latest Vercel verification —0.7.0

[Focused0.7 report](ROSTER_SCAN_QA.md): final runtimea7c5170,3/3 new scan cases pass plus minimal real login/version/recovery smoke. No old51-flow hosted rerun, real AI calls or database writes. GitHub's full58browser/158automated checks and both exports pass. Scanning is not activated until009 and the private server function/provider setup are complete. Prior0.6 and0.5 reports below remain historical evidence.

---

# Vercel hosted verification — version0.6.0

Project `appsworld2027/parent-plus-varcel`; runtime source `00790839c85f9c9f54861f1dc9ab383e3ed0b891`. [Hosted app](https://parent-plus-varcel-git-codex-coach-foundation-appsworld2027.vercel.app) · [deployment](https://vercel.com/appsworld2027/parent-plus-varcel/28Gt28KXoE2kCxkqiLWmzSpf2NyF).

**51/51 hosted browser flows pass**, zero failures/skips/flaky results,168.526seconds, started19:45:34.156UTC on14November2026. Groups: auth8, classes9, new coach workflows7, feedback4, fees9, observations9, roster5. These use fictional Supabase/Storage transport against the real deployed bundle. Four dev-only foundation cases are excluded here and pass in the full55-case GitHub suite.

The testing agent confirmed deployed JS `index-ba97a58955091f7b3c383fd68e91fd4d.js` matches the local0.6.0 production export byte-for-byte, SHA256 `d9e891ed4891903677eb725497517bae3c3577b4a957750cb93770bf1663ef47`. Real mobile/desktop/recovery smoke passed, zero page errors and zero backend writes. Public auth settings respond; the existing fee view denies anonymous reads; new coach_photos was absent before installation. Subsequently the owner installed007/008; a focused zero-row probe now denies anonymous metadata reads with401/42501, without a missing-schema error. The compiled bundle scan found no private-key, Supabase-secret, gateway-secret, webhook-secret or service-role-JWT patterns; expected public publishable configuration is present. This pattern scan is bounded evidence, not a guarantee against every possible leak.

Visual review confirms the batch roster, fee totals and prominent age/proficiency. The profile screenshot's base roster fixture lacks photo metadata handling and shows a fixture-induced unavailable preview; dedicated photo flows passed. Temporary authorized Share capability/browser state stayed outside source and six temporary access files were cleaned up. Real authenticated saves and actual Storage bytes/signed URLs still require live acceptance after the now-installed007/008 update. Deployment protection remains enabled.

---

The following0.5.0 report is historical.

# Vercel hosted verification — 14 November 2026

App version: **0.5.0**. Project: `appsworld2027/parent-plus-varcel`.

[Hosted branch app](https://parent-plus-varcel-git-codex-coach-foundation-appsworld2027.vercel.app) · [verified deployment](https://vercel.com/appsworld2027/parent-plus-varcel/C8LDT2CA4kWLxe7PPPMWxapmnLYS) · source `cdd321e95f6e5dee18b209c0fc3e87461d6a8ac1`.

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

The runtime was tested through deployment source `3f59cd61a2627167e0100c703114e2649de1cbf1`; later workflow/documentation source `4ce4e26` and dependency-security source `cdd321e` were rechecked and serve the identical JavaScript bundle. SHA-256: `584cccb23c3f32ec4add400032ed0249f15103f7309720ac8ed128cb3f5c6813`. Final bundle, root/recovery routes, static-asset loading and phone/desktop production smoke were reverified at approximately **18:10:55 UTC** on `cdd321e`; all passed with zero page errors and zero real Supabase writes.

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
