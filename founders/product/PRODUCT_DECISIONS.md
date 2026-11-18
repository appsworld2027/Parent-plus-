# Product decisions and assumptions

Recorded/reviewed: 12 November 2026. This captures existing choices and their consequences, not new feature authorization. Requirements remain in [PRD.md](../../PRD.md); implementation evidence remains in [PROGRESS.md](../../PROGRESS.md).

| ID | Current decision | Reason and consequence | State / evidence |
| --- | --- | --- | --- |
| PD-01 | Build the coach module before the larger parent app | A coach can manage teaching without waiting for family accounts. Guardian contacts do not automatically become users or receive notifications. | Owner direction; PRD sections 1–2 |
| PD-02 | Native Android first, using React Native/Expo | Delivers an installable app and a possible later cross-platform path. Android device acceptance is required; browser success alone is insufficient. | Existing APK installed; iOS is not verified |
| PD-03 | Email/password first | Provides the initial account flow without adding a phone/WhatsApp provider. Recovery/email limits still need production review; phone/WhatsApp login is not implemented. | PRD AUTH-01; owner reports confirmation/login |
| PD-04 | One academy owned per account in the current model | Keeps the first ownership boundary understandable. Staff roles and multiple owned academies require an explicit future model/product decision. | Current schema unique owner; live two-account tests still pending |
| PD-05 | Save a student, primary guardian and enrolments in one trusted transaction | Avoids partial records and duplicate identities after a lost response. Requires migration 002; UI supports additive memberships, not ending/restarting enrolment periods. | Implemented and locally tested; deployment unconfirmed |
| PD-06 | Hosted payment links with backend verification for the pilot | A guardian can pay without a parent app; app redirects alone must not mark invoices paid. Provider eligibility/merchant approval and server configuration remain required. | Planned PRD PAY-01–03; integration not built |
| PD-07 | Establish reliable current modules and documentation before more features | The observed Android failure demonstrates the need for device evidence and clearer diagnostics. Documentation/readability work is completed for the earlier checkpoint; the owner has now resumed implementation. Device evidence still gates acceptance. | Owner resumed after documentation checkpoint; repair still needs phone confirmation |
| PD-08 | Refresh technical docs at meaningful changes; consolidate product/progress review daily | Keeps the next developer oriented without duplicating every implementation event into the PRD. Important blockers and changed requirements are recorded immediately. | Owner working agreement; DEVELOPER_GUIDE.md section 7 |
| PD-09 | One device attendance draft, with explicit server revision comparison | Bounds private local storage and prevents silent replacement or stale multi-device overwrites. This is not full offline sync; the coach reconnects to validate the class after restart. | Candidate 0.3.0; model/SQL/browser checks pass, device acceptance pending |
| PD-10 | Protect class timing once attendance exists | Preserves the meaning of recorded attendance. Room/status corrections remain available; changing timing requires cancellation/replacement. | Enforced by migration 003; live deployment pending |
| PD-11 | One private observation device draft; explicit workspace saves and fixed recorded recipients | Protects unsent work, prevents silent audience expansion and distinguishes local persistence from recording. Conflicts require comparison or an explicit new draft. No parent delivery. | Candidate 0.4.0; migration 005 prepared; OBSERVATIONS.md and tests |

For a new material decision, record: date, problem, recommendation, user benefit, cost/complexity, owner decision if required, affected requirement IDs, acceptance evidence and remaining uncertainty. Revisit assumptions when evidence changes. Do not silently reduce required pilot scope or promise a launch date before the remaining gates are assessed.


### 14 November 2026 — Module 6 financial records

FEE-01 is unchanged. Invoices use the reviewed current full monthly batch fee for an enrolment overlapping the billing month, without automatic proration. The server derives and snapshots the amount; if the fee changed since review, creation is rejected for another review. Arbitrary invoice editing would lose the original billing decision, so correction uses an attributed void and replacement, only after mistaken manual payment records are reversed. Original receipts remain in history. Reversals correct records and do not perform refunds.

Uncertain financial writes retain the exact request in scoped device storage, including across sign-out, until resolved on the same account/academy. Dropping that identity on navigation/sign-out could turn a lost response into a duplicate receipt. Ordinary unsent fee form edits remain in memory with a navigation prompt. Native storage/API acceptance remains pending. See [fees recovery and limits](../../ai-workspace/features/FEES.md).


### Owner correction — batch and monthly-fee journeys, photos

The owner explicitly requires a navigable batch roster with existing/new student addition, inline batch creation in the student editor, monthly summary-first fee tracking with batch/student drilldown, and both profile and observation photos. PRD1.1 records the accepted change. Internal invoices stay as trusted snapshots and secondary correction history; they are not the coach's starting action. A new trusted operation atomically creates an unissued monthly charge and records the manual receipt, retaining the durable exact-request recovery path. New auto-created charges use the billing month's end as due date; existing due dates remain fixed. Both photo locations are now required, superseding the earlier optional-photo cut line. See COACH_WORKFLOW_REVIEW.md for definitions, limits and acceptance.

## Register-photo onboarding — owner request

Photo-assisted roster entry is required from both Add Student and a batch. Extraction is a suggestion, never direct enrolment or face identification. A separate authenticated server calls OpenAI; the ChatGPT subscription does not supply app API usage. Coaches review/skip/correct rows and explicitly choose existing matches, with no automatic fuzzy merges or overwrites. One atomic import and exact request receipts protect retries. Identical new names are blocked by this importer and require manual review. Initial per-academy quotas bound ordinary usage; provider project budget/alerts are separate global controls. Native camera capture is now authorized; microphone remains excluded. Image/provider activation requires external account setup and is not claimed complete by fixture tests.

## Cloud Vision selected —0.8.0

The owner explicitly requested Cloud Vision integration after reviewing alternatives. Replace the inactive OpenAI reader with one DOCUMENT_TEXT_DETECTION call and deterministic reviewed field mapping. Unknown layouts stay unassigned; optional names-only interpretation reuses the same OCR result. Changing qualified labels/column order must not create wrong students or guardian associations: unknown form sections end contact scope, header words require proximity, changed sections fall back to text. Provider-aware client protocol blocks older OpenAI-labelled clients before Google requests. Only explicit user confirmation imports rows. Add a shared900UTCmonth reservation via010 while keeping009 daily/cooldown quotas. Cost protection is app-scoped, not a promise about other provider/account usage. Google Cloud/Supabase activation remains external and pending.

## First-run roster ownership — owner correction16November

The coach's own names, batches and persisted profiles must be visible early in setup. Put the batch/photo flow on Today, show real counts, create/select batches inline, auto-populate names-only candidates and review through dropdowns before explicit save. Source text is supporting evidence, not the primary student list. Known-success write/read-refresh failure is a distinct state from unknown write outcome: never re-import because a read failed. Reuse existing server/API configuration and preserve existing profiles when linking matches.


## PD-20 —16November2026: feedback-first reset

Owner correction overrides PD-06/payment-first release sequencing and the prior exclusion of coach-reviewed parent sharing. Prioritise easy batch/class operation and saved feedback→reviewed WhatsApp. Hold approved per-child snapshots for a future verified Parent link; do not build a parent app or claim push delivery now. Capture/upload photos or existing video clips only after purpose-specific guardian permission is recorded for all pictured subjects. Consent recording is a coach attestation with evidence, not remote guardian verification. Fee collection is shelved without deleting the existing ledger. Exact visual fidelity awaits the absent Coach prototype. Evidence/acceptance boundaries: COACH_FEEDBACK_RESET.md and PROGRESS.md.


## PD-21 —16November2026: separate Aurora Parent workspace

Owner explicitly starts Parent from scratch on the existing Supabase/Auth project and supplies both prototypes. Rebuild native components with separate /parent branding/navigation and family ownership; never embed mock HTML or seed its example children. Shared credentials do not merge family/academy records. Initial1familyowner per academy student connects only by an explicit48-hour single-use coach invitation; parent reviews the student mapping. Only reviewed snapshots and freshly authorised media reach the Parent feed. Account-recorded parent media refusals are authoritative. First deliverable is mobile web; separate Parent APK, push and wider prototype tooling remain later. Exact combined011/012 is prepared for one owner transaction; no old setup repeat.
