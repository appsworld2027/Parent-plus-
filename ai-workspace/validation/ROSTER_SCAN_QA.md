# Focused hosted roster-scan QA — 0.7.0

Date:14 November2026UTC. Source:`a7c5170f234f3b2c6e537e38b1fe808dd5a11a59`.
Deployment:https://vercel.com/appsworld2027/parent-plus-varcel/6h2gCYYxnd5JhMWiJdap7frSHBrY

**3/3 new hosted cases pass**,0 failures,skips or flaky results,10.373seconds. Start20:27:00.744UTC.

Only the new roster-scan cases ran; the prior51 hosted flows were not repeated. A private temporary copy changed only test import paths and added one screenshot; all canonical assertions/actions were preserved.

Covered on the actual Vercel-served app with fictional Supabase/function/import transport:

1. Review/correct extracted names and age, choose an existing matching student, and save only after explicit confirmation.
2. Unknown import outcome locks editing and retries the same request without duplicate profiles; copy does not incorrectly claim nothing was saved.
3. Unconfigured scanning saves no records and leaves manual student entry available.

Minimal real phone-sized smoke confirms version0.7.0, HTTP200 sign-in, no horizontal overflow or page exceptions, developer preview absent, invalid email/empty password rejected locally, and direct recovery routing HTTP200. Zero real Supabase writes and zero provider requests were sent. The real Edge Function/key/update009 remain a configuration gate; this is not live AI extraction or authenticated production import acceptance.

Served asset:`/_expo/static/js/web/index-eda7dcd5fed38e61df383ed6779d16b9.js`.
SHA-256:`6eab4dfe0babbda9dd0307c93999d60bd88b269625fa37ac3130712c03b5731d`.

`compact-scan-review.png` shows the top of the phone review. The existing dismissible Signed-in notification uses viewport space; student rows are below and remain scrollable. The notification was not treated as a new blocking defect, and no screenshot/test rerun was made.

Sanitized test/smoke reports and application screenshots are preserved. Temporary preview capability, cookies, browser-state/config files and screenshot-only test copy are removed after testing; see cleanup.json. No tracked source was changed by this hosted QA.
