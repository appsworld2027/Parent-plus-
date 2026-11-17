# Focused hosted Google Cloud Vision QA — 0.8.0

Date:15 November2026UTC. Source:`3f7d4fc14eb5c54356c193ae533f936daa8ad6cf`.
Deployment:https://vercel.com/appsworld2027/parent-plus-varcel/BLC2ZUMFyAKkW59CxLKTX2pzGZy5

**5/5 hosted scan cases pass**,0 failures,skips or flaky results. Start03:48:35.228UTC; duration17.072seconds. No old browser suite was repeated. A temporary copy changed only test import paths and added disclosure/fallback screenshots; canonical actions/assertions were retained.

Covered with fictional function/import transport against the actual Vercel-served app:

1. Populated name,age,guardian and phone review; corrections, existing-student linking and explicit confirmation before import.
2. Unknown import outcome locks changes and retries the same request without duplicate profiles.
3. Unconfigured scanning saves nothing and preserves manual entry.
4. Unknown OCR layouts expose recognized text and explicit names-only review without a second scan request.
5. Shared monthly quota refusal preserves manual entry and saves no students.

The fixture requires `recognizer=cloud-vision-v1`; successful cases verify the deployed client supplies the new protocol marker. The real provider/function was never invoked. Updates009/010, function deployment and server-side key remain configuration gates; no live OCR, paid use, authenticated production import or provider accuracy acceptance is claimed.

## Runtime and minimal real smoke

The hosted manifest is0.8.0. Asset:`/_expo/static/js/web/index-eff8f16d18ac3691a10256c7b7379cd2.js`.
SHA-256:`cfd78c27221540ea4d067ce49bfc7667df9f60ddd8b1a1fa311ad8c2ad25bbf8`.

Phone sign-in and direct recovery route return HTTP200; invalid email/empty password are rejected locally. No horizontal overflow or page exceptions. Zero real backend writes and zero Google/OpenAI provider requests were made. No anonymous SQL or live function probes ran.

The served client contains the Google Cloud Vision disclosure and protocol marker, but not the Google provider endpoint or `x-goog-api-key` request-header code. Focused compiled-client scans found0 Google API-key-format, Supabase secret-key-format and private-key PEM matches. This is a scoped leak check, not a comprehensive security audit; no real server key was configured or inspected.

`google-disclosure.png` and `recognized-text-fallback.png` were captured during the five cases and visually inspected. Provider/privacy text is visible before photo selection. The fallback shows recognized names and an explicit names-only action, with no guessed profile details.

Sanitized reports/screenshots are preserved. Temporary share capability, cookies, browser state, config and screenshot-only test copy are removed after verification; see cleanup.json. No tracked source was edited during this hosted QA.
