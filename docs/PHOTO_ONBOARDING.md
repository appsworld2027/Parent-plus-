# Register photo onboarding —0.7.0

Coach journey: Students → Scan student list, or open Add a student → Scan a student list instead, or open a batch → Scan student list into this batch. Select a clear register/admission-form image; Android also offers on-demand camera capture. Mobile browser camera choices depend on its file picker. Review and correct every extracted row, skip rows, choose one target batch or none, resolve name matches using existing profiles, then confirm once. Missing names are initially skipped; exact matching names are not automatically linked. Existing student contact/profile values are never updated by imports. Imports do not issue fees, send invitations or notify anyone.

Coaches use their normal app login; they do not need individual ChatGPT accounts or API keys. The app owner configures the private integration once. The image-capable OpenAI API reads explicit names, whole-year ages, listed learning levels and guardian contacts. Names retain their original script. No age/level inference from faces or appearance; no child identification from portraits. Unknown fields stay blank. Readable handwriting can work but must be reviewed. Other register fields are not silently persisted. One JPEG/PNG/WebP up to5MB and50rows per scan; larger/cropped lists require another page. The server rejects incomplete/truncated provider responses rather than silently importing part of one.

## Required activation — not yet deployed

Existing001–008 remain installed. Source for [only009](UPDATE_009.md) adds reviewed atomic imports and private daily quota/receipt tables. `scan-roster` is a Supabase Edge Function; [single-file dashboard source](../supabase/scan-roster-dashboard.ts) is generated from the tested handler/index by `node scripts/prepare-scan-function.mjs`. Deployment can use the Supabase dashboard editor with that file, or the developer CLI below. No Supabase deployment token or OpenAI API key is available in the coding workspace. This is a concrete external setup dependency, not a completed live feature. UI/manual entry and fixture tests work without a provider key, but real scans do not.

Owner setup is guided one step at a time. Use the project's Edge Function Secrets page for `OPENAI_API_KEY`; never paste credentials into chat, GitHub, EXPO_PUBLIC settings or app code. OpenAI API billing is separate from a ChatGPT subscription. Use a separate restricted project key and a small project budget/alerts appropriate for the pilot. Model defaults to gpt-4.1-mini and can be overridden server-side with ROSTER_SCAN_MODEL. The function uses Supabase's built-in URL/anon/service credentials; no service-role credential goes to the client. Existing Vercel deployment protection stays enabled because app scans call the authenticated Supabase function directly.

Developer deployment after authorized dashboard/CLI access:

```sh
supabase functions deploy scan-roster --project-ref zcgcnycnanqkbdlwojln
```

The checked-in config disables the legacy gateway JWT check; the handler instead calls Auth to validate every bearer token and checks academy ownership using that user's JWT before reserving quota or contacting OpenAI. Do not remove these handler checks. CORS is stateless bearer authentication, never cookie-based authorization. Provider requests use store:false, fixed provider URL, structured output,40-second timeout and bounded tokens. Responses and errors are no-store, sanitized; neither photos, OCR content nor credentials are logged. The register is held transiently, not saved in academy Storage or the photo library. AI-provider abuse-monitoring/retention terms still apply; store:false is not a zero-retention guarantee. Native camera apps/OS behavior is outside app retention guarantees.

## Integrity and cost controls

The server bounds streamed upload bytes before multipart parsing, validates image signatures and verifies owner access. A service-role-only quota reservation is atomically serialized per academy:10attempts per UTC day with10seconds between attempts. Provider failures can consume a reservation and may incur API cost. A provider project budget is a separate useful global control; the per-academy quota is not a universal spending cap.

The import RPC locks the academy, validates1–50reviewed rows and100KB payload maximum, preserves existing profiles, checks current batch/student ownership and saves all rows atomically. An exact request UUID/payload retry returns the original IDs, even after later profile changes; changed payloads are rejected. Case/whitespace normalized existing names are flagged/rejected for new imports, including archived matches. Legitimately identical names require manual entry/profile review. No fuzzy match automatically merges students. Following an unknown outcome, the UI freezes the reviewed payload for an exact retry; it does not persist extracted PII on device. After closing/reloading, check the roster before scanning again. Duplicate-name checking prevents a second unchanged new-name import; it is not general human identity resolution.

## Verification boundaries

Unit, PostgreSQL, handler and browser tests use fictional records and a mocked provider; none spend API credits. Full handler authentication/quota/payload tests do not replace deployed Edge Function and real camera acceptance. Live extraction quality, real provider billing, camera behavior, signed-in import/reopen and cross-account isolation must be checked after activation with fictional data.
