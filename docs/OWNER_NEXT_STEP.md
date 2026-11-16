# Current owner steps —0.8.0

The website and Android build0.8.0 pass. Cloud Vision review/import code is built;181automated checks,60browser flows and5hosted scan fixture cases pass. [Evidence](CLOUD_VISION_QA.md).

## Completed activation steps

- Google project/credential setup is owner-reported complete; GOOGLE_CLOUD_VISION_API_KEY is owner-confirmed saved in Supabase Secrets. Its value was never shared or inspected here.
- Supabase001–010 are owner-confirmed installed. Do not rerun scripts.
- scan-roster is deployed at the correct endpoint and the owner confirmed the legacy JWT toggle saved OFF.
- Fresh16November endpoint checks return OPTIONS200{} and unsigned POST401UNAUTHORIZED with no-store headers, matching the custom handler instead of the old Hello template. Do not repeat the code-paste/deployment steps without new evidence of a problem.

## Immediate next step

Refresh the Vercel app to0.8.0, sign in and scan one fictional register from Students → Scan student list. Review names/age/guardian/contact associations before confirming import; reopen the saved student to check persistence. This is the first real Cloud Vision acceptance test and will consume an OCR attempt. Credential validity/provider access/handwriting quality are not proved by the unsigned endpoint checks.

The app enforces900shared attempts/UTCmonth plus10peracademy/day and10second spacing. Provider free entitlement and other account usage remain separate. No OpenAI/Gemini or individual coach Google key is required. Manual entry remains available.

Later acceptance: actual profile/observation Storage behavior, two-account isolation, fee/class/attendance save/reopen, phone installation/camera/session restart/sign-out and final owner usability review. No claim of complete live acceptance is made by fixture tests. Keep credentials out of chat.
