# Product requirements: Parent Plus Coach

Version: 1.7 · separate Aurora Parent workspace and feedback-first Coach, 16 November 2026
Status: product requirement baseline. Reviewed against the owner’s app feedback: batch management and fees must follow the coach journey; both profile and observation photos are required. Current implementation, build evidence and acceptance gaps are tracked in [PROGRESS.md](PROGRESS.md) and [validation](docs/VALIDATION.md).
Working agreement: refresh technical docs after substantial changes; review PRD/progress once per active working day. Material requirement changes and critical blockers are recorded immediately. See [product decisions](docs/PRODUCT_DECISIONS.md) and [developer handover](docs/DEVELOPER_GUIDE.md).
Companion documents: [build sequence](BUILD_PLAN.md), [product plan](PRODUCT_PLAN.md), [Step 0 setup guide](STEP_0.md).


## Current priority — owner corrections, 16 November 2026

This overrides older pilot sequencing and payment gates below. The owner finds the working journeys extremely cumbersome, rather than reporting save errors. Parent feedback is the core outcome. First make batch/student/class setup straightforward, then save and review feedback and let the coach open WhatsApp for one reviewed guardian/message at a time. Shelve fee collection and gateway work. Existing fee records remain accessible, with no new collection work or data removal.

The owner subsequently authorised a separate Parent module from scratch and provided both original HTML prototypes. The first Aurora Parent slice is specified in [Parent PRD](docs/PARENT_PRD.md); its independent family permissions and explicit invitation connection are described in [Parent architecture](docs/PARENT_MODULE.md). Same Supabase/Auth credentials do not merge family and academy records.

The full feedback remains in the workspace. After a separate coach review, save a per-child immutable Parent handoff snapshot, including selected class media IDs. Hold it as awaiting_parent_link; the Parent app, verified family links, push worker and delivery/read receipts are not implemented. A phone/email/name match never authorises access. No automatic send follows a save or capture.

Class media requires recorded guardian permission before capture/selection and backend upload finalisation: separate photo, video and parent-sharing purposes; identify everyone pictured, including background students. A coach attests to permission already obtained and records guardian/evidence; this is not a verified parent-consent collection workflow. Withdrawal appends audit history, blocks new signed access and cancels pending handoffs containing that child's media. Issued preview URLs can remain usable for their remaining60seconds. Photos are limited to5MB, uploaded video clips25MB, at most30 prepared/ready items per class. Native in-app video/audio recording is not enabled; existing clips can be collected during class from the phone/library. No media transcoding/provider service is introduced.

The owner supplied both Coach and Aurora prototypes later on16November; they are preserved under docs/prototypes/. Use them as visual/product references, not as executable application code or proof that simulated actions work. Treat real coach usability and save/reopen as release evidence, separately from automated fixture checks. Detailed contracts and remaining gates: [feedback-first reset](docs/COACH_FEEDBACK_RESET.md).

## 1. Purpose and release target

Build a native Android app that lets an independent tutor or small academy manage its teaching operations without needing the future Parent Plus parent app.

Target: a small invited pilot within 1–2 days of implementation, subject to configuration access and passing release checks. Include gateway integration in test mode. Live money collection and Google Play publication have separate external prerequisites and release gates.

The HTML coach prototype is the interaction and visual reference, not production code. The larger parent HTML informs future integration boundaries only. This release must not become an HTML wrapper.

## 2. Users and boundaries

- Academy owner/coach: signs in and manages the academy's roster, sessions, attendance, observations, and fees. Pilot supports one owner per academy; staff roles follow later.
- Guardian: can open an explicitly shared hosted payment link. Does not need a Parent Plus account in this release.
- Product owner: a nontechnical operator who receives guided setup, simple validation tasks, and diagnostic references; is not expected to debug code.
- Parent/family owner: uses the separate Aurora workspace for family/child profiles, private plans/reminders/memories, together time and reviewed Coach feedback after explicit invitation. No automatic family/student merge occurs.

Multiple isolated test academies are required for security validation. Initial live payments are limited to one academy using its own approved merchant account. General multi-academy settlement is not included.

## 3. Success criteria

The current release passes when a coach can authenticate, create batches/students and dated classes simply, save attendance and feedback, review a guardian/message and open WhatsApp, and reopen the saved teaching records. Reviewed Parent handoffs and consented media must persist safely after their new database update. Real phone/WhatsApp and live-data acceptance are separate gates. Fee collection is shelved under the latest owner correction.

Records remain correct after restarting the app. Repeated submissions do not duplicate attendance or payments. Another academy cannot access those records. Failures produce useful recovery guidance and sanitized diagnostic references. Required tests have executed and their results are documented.

Screens that merely show sample data or success messages do not satisfy these criteria.

## 4. Priority definitions

- P0: required for this pilot; an incomplete P0 is reported as a release blocker.
- P1: include only after P0 gates pass and time remains.
- Later: excluded from this release.

## 5. Functional requirements

| ID | Priority | Requirement | Acceptance evidence |
| --- | --- | --- | --- |
| AUTH-01 | P0 | Email/password registration, verification, sign-in, recovery, and sign-out | Real verification/recovery email flows work on Android; invalid/expired links are handled |
| AUTH-02 | P0 | Secure session restoration and academy onboarding | Restart restores an authorized session; interrupted onboarding retries safely; sign-out removes private cached state |
| ORG-01 | P0 | Owner creates academy name, timezone, and currency defaults | Ownership is enforced server-side; app cannot select another owner's academy |
| STU-01 | P0 | Add/edit/archive students and guardian contacts; select existing batches and create a batch inside the student form | Saved values persist; history survives archiving; contact data alone grants no account access |
| STU-02 | P0 | Open a student profile showing photo, age, assessed proficiency, guardian and batches; add a batch from that profile | Age/level persist and remain visible after reopen; joining a batch retains other memberships and profile values; grouped form fields have clear labels and spacing |
| STU-03 | P0 | Scan a printed/readable handwritten register or admission form from student entry or a batch; review/edit/skip extracted rows, select a target batch and link existing students | No save before explicit confirmation; unreadable details stay blank; age/level never inferred from appearance; exact retries do not duplicate imports; profile/contact data is preserved for existing students; private on-device OCR or an authenticated recognition service with cost limits is required |
| BAT-01 | P0 | Create/edit batches; open a batch roster; add existing students or create a student directly in the batch | New students inherit the chosen batch; existing student profiles are not overwritten; one student can attend multiple batches without duplication |
| SCH-01 | P0 | Create/edit/cancel dated sessions with start/end and location | Changes affect the selected occurrence; cancelled sessions remain distinguishable |
| ATT-01 | P0 | Present/late/absent, mark all present, atomic attendance save | Save/reopen/retry returns one correct record per session/student; partial batch saves cannot silently succeed |
| OBS-01 | P0 | Text observation for selected child or batch; draft and recorded states | Draft survives restart; recorded audience is fixed explicitly; failed save retains entered text |
| FEE-01 | Later | Monthly overview of distinct students, expected/collected/pending fees, batch summaries and student drilldown; record receipts from a student row | Unbilled eligible students contribute to pending totals; no invoice-creation prerequisite; trusted charge/receipt save atomically; snapshots and corrections remain auditable |
| PAY-01 | Later | Authenticated server creates/reuses invoice payment link; coach shares explicitly | Guardian can use hosted test checkout without parent app; app cannot override trusted invoice amount |
| PAY-02 | Later | Verify payment server-side and reconcile pending state | Only validated provider paid/captured state creates a gateway payment; invalid/replayed events do not corrupt balances |
| PAY-03 | Later | Clearly distinguish test/live, manual/verified, and pending/paid | Test payment never appears as live collection; redirect alone cannot mark paid; refunds/excess payments are visible for review |
| HOME-01 | P0 | Today dashboard from persisted data, with useful empty states | Sessions and figures match records; no fabricated attendance or engagement metrics |
| SUP-01 | P0 | Diagnostic reference, build version, sanitized report export | Controlled error can be traced without logging personal content or credentials |
| ACC-01 | P0 | Account/settings, privacy information, and deletion workflow for external distribution | Workflow is tested and retention consequences are explained; archiving is not represented as deletion |
| MED-01 | P0 | Private profile photos; consented class photo/video collection and reviewed feedback attachments | Record permission for everyone pictured before capture/upload; separate sharing permission; private access; existing observation photos stay readable; no automatic parent delivery |
| DEL-01 | P0 | Coach-reviewed WhatsApp handoff for saved feedback | International guardian number and message preview; explicit confirmation; user sends in WhatsApp; no false sent/delivered status |
| DEL-02 | P0 | Persist reviewed per-child Parent snapshots and optional consented class media | Atomic snapshot/retry; awaiting verified parent connection; cancel unsent handoff; no Parent push worker or family linking implied |
| OBS-02 | P1 | Improvement, next focus, skills, milestone, home suggestion, preparation fields | Values persist and remain distinct from delivered parent content |
| SCH-02 | P1 | Bounded recurring-session generation | Preview, duplicate prevention, and per-occurrence editing work |

## 6. Core journeys

### Teaching
Sign in → create academy → create batch → add student and contact → enrol student → schedule session → save attendance → save/record observation → reopen app and inspect history.

### Fees
Open monthly students/collected/pending overview → choose batch → choose student → record a received payment (trusted monthly charge created underneath when needed). Gateway stage: create gateway test link → share via Android's share sheet → guardian completes hosted checkout → backend verifies payment → invoice balance updates. Display Pending verification while the outcome remains uncertain.

### Error recovery
Action fails → preserve form/draft → show actionable message and reference → retry safely or export sanitized report → owner shares reference with Codex → reproduce/investigate → fix and add regression coverage → revalidate affected workflow.

Do not claim background support monitoring exists. Diagnostic availability depends on tested instrumentation and authorized access during a support session.

## 7. Payment integrity rules

- Gateway credentials and webhook secrets are server-only. App contains only public configuration.
- Backend authorizes the invoice and derives amount/currency; it never trusts arbitrary client values.
- Validate provider signatures using documented raw-body verification, provider IDs, mode, amount, currency, and final payment state.
- Deduplicate event/payment IDs and update ledger state atomically. Handle delayed/out-of-order notifications and multiple attempts.
- Use server-side lookup to reconcile lost webhooks. Do not rely on mobile callback success.
- Reject creation for settled invoices; handle already-open links and simultaneous attempts, flag excess payments for review.
- Track refund/reversal state or flag for reconciliation. Automated refund execution is excluded.
- Start in test mode; live activation requires merchant approval, secure live settings, passing tests, current cost review, and explicit authorization for real transactions.

Razorpay hosted links are the initial India/INR candidate, subject to eligibility, supported behavior, and current terms. No provider price or approval has been verified yet.

## 8. Data and future parent contract

Core records: profiles, academies, students, student contacts, batches, enrolments, class sessions, attendance, observations and recipients, invoices, payments, gateway attempts/events, and restricted diagnostics. Add media only if P1 ships.

- Use stable IDs, audit timestamps, database uniqueness constraints, and same-academy foreign-key validation.
- Keep academy student records separate from future family-managed child identities. Linking later requires verified authorization, never automatic merging by name or contact details.
- Snapshot invoice amounts and recorded observation recipients.
- Store event instants in UTC; render and create sessions using academy timezone. Default Asia/Kolkata. Currency default INR, amounts in integer paise.
- Academy records do not imply access to a family's private calendar, recordings, memories, or other academy content.
- Keep coach observations attributable. Future derived insights must not masquerade as original coach statements.
- Use versioned migrations in GitHub; production records and secrets stay outside source control.

## 9. Reliability, security, and usability

- Enforce Row Level Security on exposed tables and private Storage access, tested through direct API requests with independent accounts.
- Preserve user-entered work through recoverable failures; label local unsynced drafts honestly. Full offline synchronization is excluded.
- Make retries safe; prevent accidental duplicate submissions and double payments. Do not silently retry charge-creating operations without idempotency protection.
- Handle expired login, missing configuration, unavailable network, timeouts, and stale payment state explicitly.
- Use accessible labels, readable contrast, sensible touch targets, Android keyboard handling, and supported reduced-motion behavior.
- Do not ship clickable controls that falsely imply messaging, notifications, receipt delivery, or parent access.
- Support app startup without a native crash on the selected supported Android baseline; record tested device/OS/build versions. Broader compatibility remains unverified until tested.
- Verify backup/export and restore arrangements before storing live records; do not assume free-tier backup guarantees.

## 10. Diagnostics requirements

Safe fields: UTC time, reference/correlation ID, module/action, build/platform, error code, retry information, and pseudonymous ownership identifiers where needed.

Prohibited: passwords, tokens, keys, payment instruments, full webhook payloads, student names/contact details, observation bodies, images, audio, or private family content.

Diagnostics must be access restricted, size limited, validated, and rate limited. Logging must not break normal app or webhook handling. Maintain a bounded local fallback and deliberately shared sanitized export. Remote diagnostic retention target is 14 days with cleanup; financial audit retention is separate.

Assess supported native crash reporting and test coverage explicitly. A JavaScript error boundary does not catch every native crash or OS termination.

## 11. Verification and release gates

1. Foundation: app launches, checks execute, controlled error is recoverable and traceable.
2. Data/auth: clean migration, account isolation, real email flows, secure restart/sign-out behavior.
3. Teaching: end-to-end persistence, duplicate protection, attendance/draft recovery under network failure.
4. Billing: calculation tests and immutable invoice history; manual entries separately identified.
5. Gateway: real provider sandbox journey plus automated invalid-signature, mismatch, replay, delayed-event, failure, cancellation, reconciliation, refund-state, and excess-payment checks.
6. Release: actual Android installation, core regression checks, sanitized diagnostics, environment/secret inspection, privacy/deletion checks, and documented limitations.

Run relevant checks at each module, then critical regression checks on the release build. Document passed/failed/blocked/not-run outcomes separately. A test-mode-only build may be labelled a test pilot; it may not be described as ready for real collection.

## 12. Exclusions and fallback order

Later: parent app, family linking implementation, staff roles, phone/WhatsApp OTP, chat, automated notifications, AI, video/audio, public discovery, subscriptions, automated refunds, tax invoicing, and multi-merchant settlements.

If time is short, cut recurring schedule generation, rich feedback, then photos. Keep P0 payment integration, security, persistence, diagnostics, and release tests. Report unmet required work rather than silently changing scope.

## 13. Responsibilities and dependencies

Codex handles code, tests, diagnosis, migrations, build configuration, and documentation in authorized sessions. Owner handles account ownership, business/bank verification, secure credential entry, billing approval, and guided device checks.

Required dependencies: Supabase project, approved backend access or dashboard deployment route, functional email sender/redirects, gateway test access and webhook route, Android build/signing access, and a test phone. Start gateway verification early; do not block independent application work on pending live approval.

Follow [STEP_0.md](STEP_0.md) to begin. Account/project creation does not establish that backend connectivity, tests, or application behavior work; verify them during implementation.


## Owner workflow clarification

The user rejected the invoice-first and batch-edit-only implementation after using the app. The monthly overview and navigable batch membership are core product behavior, not optional polish. Internal invoices remain an integrity mechanism and a secondary history/correction view. Collected means payments credited against the selected billing month; it is not a separate cashbook grouped by payment date. Count distinct students overall and memberships within each batch. Preserve issued fee amounts when defaults change. Unissued monthly fees remain visible as pending; a voided charge is not silently recreated as debt.

The owner additionally requires a dedicated student profile, visible age and proficiency, direct batch joining from that profile, and improved form grouping/spacing. Both photo locations are explicitly confirmed by the owner. The original plan references ParentPlus_Coach_Tutor_App.html, but the reference HTML is absent from this checkout/history. Saved product notes and the owner’s explicit journeys govern this correction; exact prototype visual parity is not claimed without the original file.

## Photo onboarding decision

A coach selects or captures one register/form image (JPEG/PNG/WebP up to5MB, at most50 student rows). The app sends it to a signed-in, academy-authorized server function that calls an image-capable OpenAI API. Results are editable suggestions: name, explicitly stated age/proficiency and guardian contact fields. Names retain their written script. Missing/uncertain fields are not invented; unsupported details are not silently saved as profile fields. A portrait alone cannot identify/enrol children. Review matching existing names, skip unwanted rows, select a batch or none, then explicitly confirm. Import is one atomic transaction; existing profiles are linked without edits. Identical-name new imports require manual review rather than automatic duplication.

The register image is not saved in app Storage or as a profile photo. It is transmitted to the AI provider; provider processing/retention terms still apply even with store:false. Coaches see this before choosing an image. No AI API secret is shipped in the app. Initial quota10 attempts per academy per UTC day with10-second spacing, reserved atomically on the server before a provider request; failed provider attempts may count. AI API usage is billed separately from ChatGPT. A server function, private provider credential and update009 are activation dependencies, not claimed as live until deployed. Native capture requests camera access on demand, microphone remains blocked; browser picker camera choices depend on the device. Manual entry remains available.

## OCR cost clarification —15November2026

The owner requires investigation of dedicated text/handwriting-to-field tools rather than assuming paid chatbot APIs. A general LLM is not a mandatory dependency: recognition plus coach-reviewed column/field mapping may implementSTU-03. [OCR options](docs/OCR_OPTIONS.md) records current official pricing/privacy/language evidence and recommends evaluating Cloud Vision document OCR, with on-device ML Kit for appropriate printed/native cases. Cloud allowances are shared service/account quotas, not per-coach entitlements; a free-mode integration requires an enforced provider-wide usage stop as well as academy limits. Hindi handwritten support/accuracy must be tested separately from printed Hindi. Provider selection/real-sample accuracy remain open; the current OpenAI implementation is prepared but inactive. No OCR replacement is claimed built by this research update.

## Cloud Vision integration —0.8.0

The owner explicitly selected Google Cloud Vision: choosing/capturing a register must send it to the secure recognition service, populate supported fields and request coach confirmation. Replace the inactive OpenAI reader with DOCUMENT_TEXT_DETECTION (one image/one feature); no GPT/Gemini fallback or provider key in clients. Explicit labelled admission forms and recognisable table headers are mapped to student/age/guardian/contact/learning-level fields. Keep original scripts, explicit ages only and unassessed levels when missing. Show recognised text and a coach-selected names-only fallback for unclear layouts; this reuses OCR output without another provider call. Existing imported/profile values are preserved and no records save until confirmation.

Per-academy10/day/10second spacing remains; add an atomic app-wide900attempts per UTC month reservation before Google calls, counting failed/unknown provider outcomes. This limits app requests; free entitlement is governed by Google's billing rules/other usage and must be checked at activation. Recognition accuracy and row/contact association still need real-register acceptance. Google Cloud billing/API enablement, private GOOGLE_CLOUD_VISION_API_KEY, function deployment and missing009/010 are external activation dependencies. Existing001–008 must not be repeated. The0.7 OpenAI setup instructions are historical.

## First-run coach confidence flow —0.9.0

The owner identifies onboarding as a core product requirement: the coach should see their real batch/student names in the app immediately. Today must prominently offer Create batch and scan students, with counts from the owner's real roster. Batch choice/creation comes before capture and stays available in review through a dropdown. Creating a batch must preserve any extracted student review. A readable names-only result must automatically populate editable student candidates instead of stopping on raw text or requiring a hidden conversion action. Never fabricate missing age/contact/proficiency values.

Review shows name, age and a proficiency dropdown, expandable guardian/contact fields, selection/skips and explicit existing-profile linking. A single common batch dropdown applies to this confirmed import. Confirmation remains mandatory. After a successful transaction, show saved students and direct View batch/Open profile actions using fresh backend reads. A failed roster refresh after a known-success save must retry only the read, never run a second import or claim the write is uncertain. Matching profile/membership records must be loaded before opening saved profiles. The flow must preserve records across reload and reflect counts on Today. This is a frontend workflow correction using installed001–010 and the deployed scan-roster function; no Google secret/SQL/function setup repeat is authorized or needed just for0.9.

## Same-login class-to-Parent acceptance — 16 November 2026

The owner prioritises one complete end-to-end feedback journey and explicitly requests the same login for both roles for now. Coach opens a saved class, records feedback for the selected child/attendees, reviews the exact saved text/recipients/media and shares to Parent. Saving a private note alone must not publish. A visible per-child action opens the corresponding Parent journey in the same tab/session. Missing family/child setup is guided; explicit child selection and invitation confirmation are still required. Existing own connections open the correct child; another parent's connection must never be impersonated or replaced. Parent reads only authorised reviewed snapshots and can reopen after refresh. Details and limitations: docs/SAME_LOGIN_FEEDBACK_FLOW.md. This requires no new SQL beyond the installed001–013; ordinary email verification/recovery and consent rules remain enforced.
