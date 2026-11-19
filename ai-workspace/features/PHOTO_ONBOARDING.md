# First-batch photo onboarding —0.9.0

Today → Create batch and scan students → choose a batch dropdown or create one inline → photograph register → automatically populated editable list → review batch and details → confirm → saved student list → open batch/profile. Counts on Today come from real owner data. Creating a batch is its own explicit save and retains student-review edits; cancelling the scan keeps that batch.

Name/age/proficiency are visible in the review, with dropdowns for common batch assignment and proficiency. Guardian/contact fields expand for editing. Readable names-only OCR automatically becomes candidates for coach review; source text is secondary rather than a blocking first screen. Possible existing matches require explicit linking; existing profile values are preserved. Missing/unreadable details are not invented.

A successful import returns confirmed IDs. The app separately refreshes profiles/memberships and enables View batch/Open saved profile only after those records are readable. A failed refresh preserves known-success status and offers a read-only retry; it does not submit the import again. Unknown write outcomes retain the locked exact retry behavior. Profiles and batch membership must survive reload.

This release uses the existing deployed Cloud Vision function, saved secret and installed001–010. No server/SQL/provider configuration needs repeating for the frontend workflow correction. Current live recognition evidence is the owner's report that names appear; real field accuracy, confirmed saves/reopening and native acceptance still need owner acceptance.

---

The following0.8 provider/security/deployment details remain applicable; their original pending-setup language is historical, superseded by the activation checkpoints in PROGRESS.md.

# Cloud Vision register onboarding —0.8.0

Students → Scan student list; Add Student → Scan a student list instead; or Batch → Scan student list into this batch. Capture/choose a register photo and the app immediately sends it to its authenticated Supabase function. That function calls Google Cloud Vision DOCUMENT_TEXT_DETECTION, then deterministic mapping fills supported student fields. Coach reviews/corrects/skips, chooses the target batch and explicitly confirms. No provider can create students, issue fees, invite guardians or send messages. Existing profiles are linked without edits.

## Extraction behavior

A single JPEG/PNG/WebP up to5MB is sent inline to Google; no Cloud Storage bucket, OpenAI or Gemini call is used. Map explicit labelled form fields and table columns by OCR word positions. Header aliases support English/Hindi; only explicitly written ages/learning levels are copied, no DOB/face/grade inference. Generic contacts carry a guardian-confirmation warning; explicit student-phone/email columns are ignored. Unsupported columns are not silently appended to profile fields. Low-confidence/unreadable cells remain blank or flagged. Hindi handwriting quality remains unverified despite script support.

Review includes recognised source text. Unknown layouts do not produce invented structured fields: show raw text and a coach-chosen names-only option. Names-only interpretation does not call Google again; it leaves age/guardian/contact/level blank/unassessed and warns about headings/guardian names. One clear names-only line per student is required. Correct arbitrary/complex layouts manually. Up to50student rows and200source-text lines are shown, with truncation warnings. OCR text is held in screen memory, not device persistence/diagnostics. Provider text and API errors are not logged. No real recognition-quality acceptance is claimed from fixtures.

## Cost reservations

Migration010 adds a new service-only reserve_vision_roster_scan operation. An advisory lock serializes one shared monthly budget across academies; it checks900attempts/UTCmonth, then invokes009's existing10/UTCday and10second academy reservation. Both counters commit together before Google is called. Failed/unknown provider attempts remain consumed. Missing010 fails closed rather than using009's daily-only quota. Cloud Vision requests contain exactly one DOCUMENT_TEXT_DETECTION feature and one image. No additional recognition features or paid AI fallback are enabled.

Google's published free allowance is not per coach. Confirm eligible free usage/billing-account rules and other usage before activation; this app's900-request cutoff is not a universal Google Cloud spending guarantee. Google Cloud billing/account/resource and any unrelated hosting charges remain outside this counter. Prefer a dedicated app configuration and API-restricted key. Quota refusal preserves manual entry; there is no client-controlled override.

## One-time activation — still pending

Existing001–008 are installed. Apply only [combined009/010](../database/setup/UPDATE_009_010.md), one transaction returning two markers. It adds private import receipts, daily quotas and the shared monthly counter. Do not rerun initial setup.

Enable the Cloud Vision API on the owner's Google Cloud project with billing configured. Store GOOGLE_CLOUD_VISION_API_KEY in Supabase Edge Function Secrets, never chat/source/EXPO_PUBLIC settings. Restrict the key to Cloud Vision and use it only server-side. Supabase supplies its builtin Auth/service credentials. No OpenAI key, model setting, Google Cloud Storage bucket or individual coach Google account is needed.

Deploy the scan-roster Edge Function. `supabase/functions/scan-roster/index.ts` is the Deno entry; handler.ts verifies Auth and current academy ownership before reserving quota; vision.ts maps OCR output. [Single-file dashboard source](../../supabase/scan-roster-dashboard.ts) is generated from all three files by `node scripts/prepare-scan-function.mjs`. The local source generator/test must match the deployed function. A developer with configured CLI access can use:

```sh
supabase functions deploy scan-roster --project-ref zcgcnycnanqkbdlwojln
```

The checked-in function config disables legacy gateway verification; the handler always verifies the bearer token through Auth and uses that user's JWT for the owner lookup. Do not remove these checks. Clients must send recognizer=cloud-vision-v1. The handler rejects older clients before quota/provider calls so the old OpenAI disclosure cannot silently send a register to Google. Refresh/update to0.8 before using the new service.

No secret/deployment token is available in the coding workspace, so real provider calls/function/009/010 deployment have not been performed by the code change.

## Data processing and verification

Before image selection, coaches see that the register is transmitted to Google Cloud Vision. The app does not save the register as a profile/observation photo or into academy Storage. Google's [data-use policy](https://cloud.google.com/vision/docs/data-usage) describes online processing and says submitted content is not used to train/improve Vision. This is not a guarantee about every metadata record, device/OS cache or zero retention. The recognition response is no-store; only explicitly confirmed student fields enter the academy database and private retry receipt.

Mocked provider, English/Hindi geometry/form fixtures, review/import browser flows and PostgreSQL quotas are tested independently. All test provider requests are mocked and spend no credits. Real Cloud configuration, recognition on representative handwriting, row/contact association, native camera behavior and two-account production import acceptance remain activation checks. The existing exact-request atomic import and duplicate checks are reused.

## Published test evidence

[Focused hosted report](../validation/CLOUD_VISION_QA.md) records5/5scan cases and minimal real smoke on0.8.0; the full GitHub pipeline passes. Fictional disclosure/fallback screenshots: [before choosing a photo](../validation/images/080-google-disclosure.png) and [recognised-text review](../validation/images/080-recognized-text-fallback.png). No real provider credentials/data were used and actual activation remains pending.
