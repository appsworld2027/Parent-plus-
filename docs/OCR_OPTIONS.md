# OCR alternatives for coach onboarding

Reviewed15November2026 against official product documentation. The owner wants register-photo → student fields without assuming a paid ChatGPT/Gemini integration. Research is complete enough to identify a practical route; no replacement OCR engine, paid account, provider key or cloud resource was activated. The existing0.7 photo review/import interface is reusable. The prepared OpenAI reader remains inactive.

## Recommended pilot candidate: Google Cloud Vision document OCR

Use DOCUMENT_TEXT_DETECTION for a single register photo. Google documents handwriting detection and returns text blocks, words and positions; a field-mapping step can turn recognizable columns into reviewed student rows without a general-purpose LLM. Coach-labelled column mapping/templates are safer than guessing which name or phone belongs to which child. Keep manual correction, row skips, existing-name matching and explicit atomic import confirmation.

Published pricing lists the first1,000 Document Text Detection units each month at no charge; a single image with just this OCR feature normally consumes one unit. This is a shared provider allowance, not1,000scans per coach, and billing-account attribution/other usage must be checked before activation. A billing-enabled Cloud account is normally required and usage beyond the allowance is chargeable. Use a dedicated app configuration and an authenticated app-side reservation limit below the verified remaining allowance, counting retries/unknown outcomes before sending requests; never rely on billing alerts as a hard spending stop. Existing10/day/academy reservations alone are insufficient to protect an app-wide monthly free allowance. No storage/other recognition features should be added implicitly.

Google's Cloud Vision data-use FAQ says submitted content is not used to train/improve its Vision features. Online synchronous image operations process image data in memory without persisting it to disk; other request metadata/transient retention and the applicable service agreement still matter. These are Cloud Vision terms, not the unpaid Gemini terms. This is not a guarantee of total zero retention or automatic legal suitability for every school.

The language table lists Hindi OCR and distinguishes handwriting script support: Latin is supported, Devanagari handwriting is experimental. Do not promise accurate Hindi handwriting from generic Hindi OCR support. The owner was asked whether lists are English, Hindi or both; no reply is assumed. Validate actual handwriting/layout and student/contact association using fictional or anonymised registers before choosing the final engine or claiming extraction quality. No real Cloud Vision call or account-specific quota check was possible without a configured account.

## Other viable routes

| Tool | Cost model | Fit and limits |
| --- | --- | --- |
| Google ML Kit Text Recognition v2 | On-device SDK, no OCR API charge | Useful private/offline Android route for printed Latin/Devanagari and other supported scripts. Native integration is required; it does not run directly in the Vercel browser app. Handwritten register accuracy needs testing and is not established by its printed-script support. |
| Microsoft Azure Vision Read | Published F0 tier:5,000transactions/month,20/minute, subject to resource/region eligibility | Dedicated printed/handwritten OCR. Current standalone Read handwriting list includes English but not Hindi; Hindi print support is separate. One image/page/operation can consume transactions; do not equate the full allowance with a guaranteed number of complete register imports. Account setup required. |
| PaddleOCR / PaddleOCR-VL | Open-source software; compute/hosting is separate | Real local/self-hosted document/table/handwriting candidate, including multilingual model families. Need language/layout benchmarks and deployment sizing. A model/server is not an automatic fit for Vercel static hosting or a small Supabase Edge Function. Free licence does not mean free operated infrastructure. |
| Microsoft TrOCR handwritten | MIT-licensed model; compute/hosting separate | Recognizes handwritten single-line images; a whole register still needs page/line detection, row/column reconstruction and field mapping. Not a complete drop-in register importer. |

Do not use Tesseract as the main handwriting promise: its own FAQ says it was designed for printed text and handwriting will not work very well. Google ML Kit Digital Ink recognizes stylus/finger stroke sequences, not photographed paper, so it is also not a substitute for this photo workflow. A document-scanner crop/deskew API alone does not perform recognition or student-field mapping.

## Implementation boundary

Recognition reads words; app code maps them to name/age/guardian/contact columns; the coach confirms the result. No recognizer may infer age/proficiency from a face or silently attach one person's phone to another student. Reuse the existing review UI/import RPC, replace only the recognition stage and add provider-wide cost reservations if a cloud route is selected. Printed/local recognition and uncertain handwriting must be described accurately. The alternative is researched, not yet embedded or activated.

## Official sources

- Cloud Vision handwriting: https://cloud.google.com/vision/docs/handwriting
- Cloud Vision pricing: https://cloud.google.com/vision/pricing
- Cloud Vision data use: https://cloud.google.com/vision/docs/data-usage
- Cloud Vision languages/handwriting scripts: https://cloud.google.com/vision/docs/languages
- ML Kit text recognition: https://developers.google.com/ml-kit/vision/text-recognition/v2
- ML Kit on-device overview: https://developers.google.com/ml-kit
- ML Kit Digital Ink: https://developers.google.com/ml-kit/vision/digital-ink-recognition
- Azure Read OCR: https://learn.microsoft.com/en-us/azure/ai-services/computer-vision/overview-ocr
- Azure OCR languages: https://learn.microsoft.com/en-us/azure/ai-services/computer-vision/language-support
- Azure pricing: https://azure.microsoft.com/en-us/pricing/details/cognitive-services/computer-vision/
- Azure OCR data processing: https://learn.microsoft.com/en-us/azure/foundry/responsible-ai/computer-vision/ocr-data-privacy-security
- PaddleOCR: https://github.com/PaddlePaddle/PaddleOCR
- TrOCR model card: https://huggingface.co/microsoft/trocr-base-handwritten
- Tesseract FAQ: https://tesseract-ocr.github.io/tessdoc/FAQ.html
