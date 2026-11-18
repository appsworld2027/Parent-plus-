# Parent Plus Coach: module-by-module build and support plan

# Current delivery direction — 17 November 2026

The owner moved deployment and browser acceptance to Vercel and retired APK builds, APK-based tests, emulator and device acceptance. This supersedes historical Android pilot steps below; retain their records only as history. Current changes use the existing lint/type/unit/database checks, Playwright, web export, GitHub Actions and exact Vercel preview acceptance.


**F2 kernel checkpoint,17November2026:** current-account/scoped class/feedback/history/finance decisions and owner-only revocation functions are implemented only as an isolated private candidate. [Execution and limits](ai-workspace/validation/WORKSPACE_AUTHORIZATION_QA.md). Complete public/API/storage conversion and staff lifecycle are still F2work; no production change or owner installation step follows this checkpoint. The existing F3–F5 gates remain.

**Current foundation priority,17November2026:** owner wants robust multi-academy/independent/admin-only/Parent separation and authorised continuing implementation. Follow [foundation contract](ai-workspace/architecture/MULTI_WORKSPACE_FOUNDATION.md) and [release gates](ai-workspace/validation/MULTI_WORKSPACE_VALIDATION.md). F0design/inventory is written; F1private SQL candidate is tested only in disposable databases. Next F2converts server permissions and scoped APIs, F3onboarding/workspace UI, F4real Supabase staging plus migration rehearsal/backup/compatibility, F5live acceptance and measured rollout. These supersede the old single-owner build assumptions. No production SQL015 is delivered now; installed001–014 and existing accounts remain. Earlier milestone descriptions below are history.

**Later owner authorisation,16November2026:** build the separate Aurora Parent workspace on the same Supabase/Auth project. Both original prototypes are now in founders/prototypes/. Read [founders/product/PARENT_PRD.md](founders/product/PARENT_PRD.md) and [ai-workspace/features/PARENT_MODULE.md](ai-workspace/features/PARENT_MODULE.md). This supersedes older parent-app deferral language; it does not activate device push, real payments or public release.


**Current owner priority (16November2026):** feedback-first, easy batch/class setup, coach-reviewed WhatsApp, held Parent snapshots and consented class media. Fee collection/gateway work is shelved. This supersedes older payment-first sequencing and no-parent-sharing exclusions below. See [current reset](founders/product/COACH_FEEDBACK_RESET.md) and PRD1.6. Exact prototype styling is blocked by the missing original Coach reference.


Prepared: 11 November 2026.
Scope: native Android coach app first; larger parent app later.
This revises the original product plan to require payment integration, automated testing throughout, and diagnostic support for a nontechnical owner.

## 1. What the two-day target means

Target a tested Android pilot with email login, student and batch management, dated classes, attendance, text observations, invoices, and gateway integration in test mode. A parent can pay through a hosted payment link without installing a parent app.

Two days is an aggressive target, not a promise that every external service will be approved or every defect resolved. Live money collection additionally needs an approved merchant account and payment-specific verification. Google Play publication is a separate milestone. If required tests fail, fix or report the blocker rather than claim the app is ready.

Optional for this deadline: photo uploads, rich skill/milestone fields, recurring schedule generation, and visual polish beyond usable native screens. Defer these before reducing test coverage of core behavior. Parent screens, chat, phone/WhatsApp login, AI, and discovery remain outside scope.

## 2. How we work together

### My responsibilities

- Write application code, migrations, backend functions, automated checks, and configuration instructions.
- Run the checks available in the environment, investigate failures, and keep a record of fixes and remaining issues.
- Explain setup in plain language, one service at a time, using the actual screens available when we reach that step.
- Give a short report after each module: what works, what was tested, what failed, and what remains blocked.
- Prepare Android builds and investigate reported bugs using available diagnostics and reproduction steps.
- Maintain setup, release, and troubleshooting documentation so future Codex sessions can continue the work.

### Your responsibilities

- Own the Supabase, gateway, Expo/build, and eventual Google Play accounts.
- Complete sign-in, identity/business verification, banking details, billing decisions, and service approvals where required. I cannot perform identity verification for you.
- Enter secrets through secure settings when instructed; never paste passwords, private API keys, or recovery codes into chat.
- Install the test app on your phone and try short, plain-language tasks I provide. You do not need to read code or diagnose failures.
- When a problem occurs, use the app's planned Report a problem action and tell me the reference number, what you tapped, and what you expected. A screenshot is useful if it excludes sensitive information.

I can debug when you return to a session with the relevant repository and approved diagnostic access. This is not continuous background monitoring or a guarantee of zero bugs. The plan makes faults easier to find, limits their effects, and preserves the information needed to fix them.

## 3. Technology and account decisions

| Component | Choice | Purpose |
| --- | --- | --- |
| Android app | React Native + Expo + TypeScript | Native screens, device installation, reproducible builds |
| Identity and database | Supabase Auth + PostgreSQL | Email accounts and durable records with academy access controls |
| Media | Supabase private Storage, if photo scope ships | Authorized photo upload and viewing |
| Backend payment operations | Supabase Edge Functions or equivalent approved server runtime | Keep payment secrets out of the app; verify gateway notifications |
| Source and checks | Existing GitHub repository + CI | Versioned changes and automated regression checks |
| Payment pilot | Razorpay hosted payment links, subject to current eligibility and approved access | A practical default for an India/INR pilot; validate suitability before committing to the provider |
| Diagnostics | Structured app/backend errors and restricted diagnostic storage | Troubleshooting without exposing family records or payment credentials |

The initial live-payment pilot is one academy collecting fees into its own approved merchant account. Do not collect fees for unrelated academies into the platform owner's bank account by default. Independent academies need an approved multi-merchant onboarding/settlement design; that is beyond this two-day implementation.

Supabase plugin access is not assumed. Use dashboard configuration and versioned migrations, or another connection explicitly permitted by the organization's policies. An unavailable plugin must not be treated as permission to bypass an administrative restriction.

## 4. Costs and financial commitments

Payment configuration requires development effort. Test-mode transactions generally do not move real money; confirm the selected provider's current terms. Real transactions normally incur gateway charges and applicable taxes. Rates, supported methods, settlement terms, onboarding fees, and any recurring charges must be verified against the merchant's current provider agreement before enabling live collection. No current price quote has been obtained for this plan.

| Service | Early pilot expectation | Possible cost trigger |
| --- | --- | --- |
| Gateway | Start with test mode | Live transaction fees, applicable taxes, and provider-specific services |
| Supabase | A small test project may fit a free plan | Database, storage, egress, functions, backups, or production-plan needs |
| Email delivery | Choose a provider with suitable trial/free allowances if available | Verified production email delivery and volume |
| Expo/build service | Use available build allowances where sufficient | Queues, build quotas, or paid-plan requirements |
| GitHub and CI | Use available repository/CI allowances | Paid repository features or CI usage beyond allowances |
| Google Play | Not needed for direct APK testing | Developer registration and applicable account requirements |
| Error monitoring service | Optional; not a required paid dependency initially | Retention, alerting, or volume beyond a selected service's allowances |

Illustration only: if a merchant agreement charged 2% plus 18% GST on that fee, a ₹1,000 transaction would cost ₹23.60 in gateway fees and fee tax. This is arithmetic, not a verified Razorpay quote or a guarantee for UPI. Decide whether the academy absorbs charges before launch; do not silently add fees to parents.

Before any paid plan, chargeable verification transaction, or live money operation, explain the actual terms and obtain explicit authorization. Prepare and test configuration first wherever possible.

## 5. Module 0 — project foundation, tests, and diagnostics

Build:
- Native navigation matching the coach reference, reusable form controls, configuration validation, and separate development/test/live settings.
- Automated type checks and meaningful unit/integration test commands, connected to GitHub CI once repository access permits.
- App-wide error boundary, safe API error handling, request reference IDs, and build/version labels.
- A diagnostic screen with connectivity/backend reachability, last failed action, sanitized report export, and Report a problem.
- An issue log recording symptoms, cause when known, fix, regression test, and status. Record executed checks in a validation report; do not pre-mark checks as passed.

Test gate:
- The Android app launches; missing configuration produces a useful explanation.
- An intentionally triggered failure is logged and shown as a recoverable message.
- Logging failure does not crash the app or prevent the original action from completing.
- Automated checks execute locally; record GitHub CI execution separately from local results.

Owner action: access or create service accounts. No coding required.

## 6. Module 1 — database and access protection

Build:
- Versioned schema for academy owner, students, guardian contacts, batches, enrolments, sessions, attendance, observations/recipients, invoices, payments, and payment events.
- Database rules restricting each account to its academy, server-only payment verification fields, and constraints preventing cross-academy links and duplicate records.
- A disposable test dataset and a safe way to reset only test data. Never run broad reset commands against live records.

Test gate:
- Two independent test accounts cannot read or change each other's records, even through direct API calls.
- An unauthenticated request is rejected; a forged academy ID cannot grant access.
- Invalid relationships, duplicate attendance, and duplicate provider payment IDs are rejected or safely handled.
- Migrations apply successfully to an empty test database.

Owner action: create the Supabase project. I provide dashboard steps or exact migration instructions, then verify the result through the app/approved connection.

## 7. Module 2 — authentication and academy onboarding

Build: email registration, verification, password recovery, secure session persistence, sign-out, and first-run academy creation. Store tokens through an appropriate secure device storage mechanism.

Test gate: valid and invalid login; duplicate registration without inappropriate account disclosure; verification; expired recovery link; successful Android recovery redirect; restart restores the session; sign-out clears private local state; interrupted academy creation retries safely.

Owner action: configure email delivery and redirect URLs with my guided instructions; open test emails. A real email-delivery check is required.

## 8. Module 3 — students, contacts, and batches

Build: add/edit/archive student, guardian contacts, batch creation, multiple enrolments, and lists with useful empty states. Contacts are not verified parent accounts.

Test gate: required-field validation; two students with the same name remain distinct; multiple enrolments work; double-tapping save does not duplicate a record; archived students retain history; failed saves preserve entered form values.

Owner action: try a sample tutor setup using fictional students. Do not load real children's records until access controls pass.

## 9. Module 4 — sessions and attendance

Build: dated sessions, date selection, room/time editing, cancellation, present/late/absent, and explicit atomic attendance save. The dashboard reads actual records. Preserve local unsent attendance as a draft where appropriate and label its sync state.

Test gate: date/time boundaries in academy timezone; cancelled-session behavior; mark all; edit saved attendance; repeated submission; connection loss; app restart with a local draft; reconciliation after a save succeeds but the response is lost. A second save must not create a second attendance record.

Owner action: create a class, mark attendance, close/reopen the app, and follow a short airplane-mode recovery test. I supply the steps and assess the results.

## 10. Module 5 — observations and drafts

Build: text observations for a child or batch, durable drafts, explicit saved recipients, edit flow, and unsaved-change protection. Add optional photos/structured fields only after the required core and payment gates are secure.

Test gate: draft survives restart; individual content does not expand to the class; changing a batch's roster does not silently change a recorded observation's audience; invalid recipients are rejected; failed save preserves text. If photos ship, test size/type limits, interrupted uploads, private access, and orphan-upload cleanup.

Owner action: record a fictional observation and confirm it reappears. The interface says Observation recorded; it does not claim a parent was notified.

## 11. Module 6 — invoices and manual payment records

Build: invoices for a billing month, immutable amount snapshots, due dates, outstanding balances, manual payments labelled as manual, and a clear distinction from gateway-verified payments. Avoid arbitrary editing of paid invoices; require an auditable correction path.

Test gate: unpaid/partial/paid/overdue calculations; valid amount ranges; duplicate submissions; billing month rollover; enrolment fee changes do not rewrite existing invoices; unauthorized totals/status edits are rejected. Manual entries must not masquerade as gateway verification.

Owner action: verify example fees and due dates in rupees. No real money is moved in these checks.

## 12. Module 7 — payment gateway

Parent journey without a parent app:
1. Coach chooses an invoice and requests a payment link.
2. An authenticated backend reads the trusted invoice amount and creates or reuses the gateway link. The mobile app cannot set an arbitrary collectible amount.
3. Coach explicitly shares the link using Android's share menu. No messages are sent automatically.
4. Parent opens the provider's hosted checkout and pays using methods available to that merchant.
5. The provider notifies our backend. The backend verifies the signature, provider identifiers, amount, currency, test/live mode, and successful captured/paid state before recording payment.
6. The invoice updates from the verified ledger. A browser success screen or return to the app never marks it paid by itself.

Reliability requirements:
- Keep secrets in server settings; never embed them in the APK, GitHub, or logs.
- Deduplicate provider event/payment IDs and update the ledger atomically. Handle duplicate, delayed, and out-of-order notifications.
- Verify webhook signatures using the provider's documented algorithm and raw request body.
- Reconcile pending payments using server-to-server provider lookup when notifications are delayed or missed. Show Pending verification until resolved.
- Handle expired links, cancelled checkout, failed payment, late settlement events, amount mismatch, and multiple attempts without collecting twice against an already settled invoice.
- Establish provider behavior for link retries and simultaneous payments; record and flag any excess payment instead of discarding it or automatically refunding it.
- Keep test/live records separate. Refund events must be recorded or flagged for reconciliation so a refunded charge is not silently represented as retained money. Automated refunds remain deferred.

Test gate:
- Successful test payment; failed payment; abandoned checkout; expired link.
- Invalid signature; wrong amount/currency; unauthorized link creation.
- Replayed/duplicate/out-of-order event; webhook outage and reconciliation.
- Lost app connection after payment; already-paid invoice; separate manual and gateway entries; refund-state visibility.
- A real provider sandbox end-to-end flow is required in addition to automated simulated-event tests. Record each outcome.

Owner action: create the merchant account, complete business/bank verification, add secure test credentials and webhook secret, and register the backend webhook URL with my step-by-step guidance. Activate live mode only after merchant approval and the live-readiness gate. If necessary, a separately authorized small live transaction validates production configuration; test mode alone does not prove live collection.

## 13. Module 8 — release and recovery

Build: a signed APK, build/version display, privacy notice, a tested deletion process, diagnostic export, setup/runbook documentation, and a known-issues list. Define who owns and can restore signing/build credentials. Verify the available backup/export and restore approach before live records; do not assume a free plan supplies production backups.

Test gate:
- Install on a real Android phone and complete the core journey against the selected backend.
- Re-run critical regression and access tests on the release candidate.
- Verify app restart, expired login, connection loss, payment status recovery, and failure messages.
- Check the actual built app contains no server credentials and points to the intended test/live environment.
- Record which tests were automated, device-tested, failed, blocked, or not run. Screenshots alone are not evidence of persistence or payment correctness.

Owner action: install the APK and complete a short acceptance checklist. You are validating that the workflow makes sense, not taking responsibility for technical debugging.

## 14. Error logging contract

Collect only what helps diagnose an error: reference ID, UTC timestamp, build version, platform, module/action, safe error code, request correlation ID, retry count, and a pseudonymous account/academy identifier where necessary. Keep error diagnostics separate from auditable attendance/payment changes.

Never log passwords, auth tokens, API keys, payment instruments, full webhook bodies, student names, guardian contact details, observation text, photos, audio, or family memories. Redact server responses before logging. Do not forward arbitrary console output to remote monitoring.

Restrict diagnostic access to authorized support operators; normal academy accounts cannot browse system-wide logs. A client report is untrusted input: validate size/schema, authenticate where possible, rate-limit ingestion, and do not permit arbitrary writes to diagnostic tables. Payment-webhook handling must still work when diagnostic storage is unavailable.

Keep a bounded local diagnostic buffer if remote reporting fails, avoid retaining it after sign-out, and let the user inspect a sanitized export. Default remote diagnostic retention target: 14 days, enforced by cleanup; financial audit retention is a separate documented policy. Log export is deliberate, not an automatic message to anyone.

An app screen cannot reliably capture every native crash or operating-system termination. Assess a supported crash-reporting integration during foundation work; disclose any configuration requirement or coverage gap. Do not promise remote crash coverage until tested on an actual build.

## 15. Build order and release decisions

- Day 1: modules 0–5, with a test gate after each. Start gateway account setup and Android build feasibility immediately because they can block later work.
- Day 2: modules 6–8 and payment end-to-end checks. Add optional photos/structured fields only if the required gates leave time.
- Keep a passing regression baseline; tests added for each defect should reproduce its failure before the fix where practical.
- No public launch or real collection while a critical security, data-loss, or payment-integrity bug remains open.
- If the two-day target is missed, provide the working build, exact incomplete modules, test evidence, blockers, and next steps. Do not substitute an HTML demo or describe test-mode payments as live.

Every module handover uses this format: Built / Checks passed / Failures or blockers / Your next action. A failed check is an engineering task to investigate, not a request for the owner to debug code.

## 16. First guided setup sequence

These are the service-level steps; exact clicks will be given when implementation reaches each service, since dashboards and account eligibility differ.

1. Supabase: sign in, create the development project, retain the database password securely, and locate project URL/publishable key. I prepare the schema and walk you through its application.
2. Email: configure the selected sender, verification/recovery templates and redirects, then receive a real test message.
3. Gateway: open the merchant account, enable available test access, supply secrets securely, and configure the webhook endpoint I provide. Complete live merchant verification in parallel.
4. Build service: sign in to Expo if used and authorize the project/build connection. I configure and validate the Android build path.
5. Android: install the pilot, follow my small test checklist, and report any error reference. I investigate and fix failures.
6. Release: review test results and actual service charges before separately enabling live payment collection or publishing to Google Play.

Current status, 14 November 2026: development has resumed. Candidate 0.5.0 implements Module 6 invoices and manual-payment records, with immutable snapshots, derived balances, auditable reversal/void workflows and durable exact-request recovery. Local/browser and native results are recorded in [current progress](PROGRESS.md). The verified 0.4.0 APK remains the installed-build reference until a replacement native build succeeds. Database 001–004 is owner-confirmed installed; 005/006 remain prepared, not confirmed deployed. Module 7 gateway test integration and Module 8 release gates remain open. Phone-control automation remains on hold. No live collection or parent delivery is enabled.
