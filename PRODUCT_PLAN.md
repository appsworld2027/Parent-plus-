# Parent Plus Coach — two-day pilot product plan

**Historical-plan notice, 17 November 2026:** newer owner direction in `PRD.md`, `founders/product/PARENT_PRD.md` and `founders/product/CONSOLIDATED_PRODUCT_ROADMAP.md` governs current development. Parent is now an implemented separate workspace; payment collection remains shelved. The original two-day sequencing below is not a delivery promise or an instruction to defer Parent again. Current release evidence and open gates belong in `PROGRESS.md`.

**Later owner authorisation,16November2026:** build the separate Aurora Parent workspace on the same Supabase/Auth project. Both original prototypes are now in founders/prototypes/. Read [founders/product/PARENT_PRD.md](founders/product/PARENT_PRD.md) and [ai-workspace/features/PARENT_MODULE.md](ai-workspace/features/PARENT_MODULE.md). This supersedes older parent-app deferral language; it does not activate device push, real payments or public release.


**Current owner priority (16November2026):** feedback-first, easy batch/class setup, coach-reviewed WhatsApp, held Parent snapshots and consented class media. Fee collection/gateway work is shelved. This supersedes older payment-first sequencing and no-parent-sharing exclusions below. See [current reset](founders/product/COACH_FEEDBACK_RESET.md) and PRD1.6. Exact prototype styling is blocked by the missing original Coach reference.


Status: revised implementation baseline. See [BUILD_PLAN.md](BUILD_PLAN.md) for the module sequence, testing gates, diagnostics, payment approach, and owner setup steps. That document governs the revised two-day scope.
Prepared: 11 November 2026. Target: an installable Android pilot within 1–2 days of implementation starting, assuming Supabase configuration and device testing are available promptly.

## 1. Product outcome

A tutor or small academy can manage students, plan classes, take attendance, write observations, and track fees in a real Android app. Data persists in Supabase and remains available after restarting the app.

This release is for a small, invited coach pilot. It does not include the parent app or guarantee a public Google Play release in two days. Store account verification, applicable testing requirements, and review operate on their own timelines.

Design reference: `ParentPlus_Coach_Tutor_App.html`. Future integration reference only: `ParentPlus_Borealis_Onyx_v4_6.html`. Rebuild the coach design as native screens; do not wrap the HTML in a WebView. The parent's Borealis appearance is not a redesign requirement for Coach.

## 2. Delivery constraints and defaults

- Build one Android coach app using React Native, Expo, and TypeScript.
- Use Supabase Auth, PostgreSQL, and private Storage. GitHub stores source, migrations, and documentation, never production records or credentials.
- One owner per academy in this pilot; one account may access only its own academy. Staff invitations and coach permission management follow later.
- Support ordinary online use, with clear loading, failure, retry, and unsaved-change feedback. No full offline synchronization in this deadline.
- Default academy timezone: Asia/Kolkata; store event timestamps in UTC and retain the academy timezone for display and schedule creation.
- Default currency: INR; store money in integer paise.
- Payment gateway integration is required, starting in test mode. No AI service, WhatsApp service, or parent account is required for the pilot. Live payments depend on merchant approval, secure configuration, and payment validation gates.
- Build automated checks and privacy-safe diagnostics from the foundation onward; the deadline does not override their release gates.
- Each milestone must work against a real configured backend. Sample data is development-only and must not be presented as a user's real records.

## 3. Must ship: day-one core

| Area | Included behavior | Acceptance check |
| --- | --- | --- |
| Authentication | Email/password registration, verification, sign-in, sign-out, password recovery, session restoration | A verified user can sign in on Android, reopen the app, recover access, and sign out |
| Academy setup | Name, owner display name, timezone, currency default | First login creates the owner's academy; subsequent logins reopen it |
| Students | Add, list, edit, archive; guardian name and optional contact details | Changes persist; archived students retain historical records |
| Batches | Create/edit batch, assign students, set room and default monthly fee | A student can belong to more than one batch without duplicate student records |
| Schedule | Create individual dated sessions, list by date, edit or cancel a session | Two sessions in the same batch have independent dates and statuses |
| Attendance | Present, absent, late, mark all present, explicit save | Saving twice updates the same session/student record; reopening shows saved values |
| Class observations | Save and edit a text observation for one student or a whole batch; draft/recorded status | A saved draft survives restart; a recorded observation preserves its selected recipients |
| Today dashboard | Today's sessions and counts derived from saved records | Empty accounts show useful empty states; cancelled sessions are clearly labelled |

Day-one completion means an installed Android build completes this entire journey: sign in → create academy → add batch and students → create session → save attendance → record observation → restart and verify saved records.

## 4. Day-two additions, in priority order

| Priority | Feature | Acceptance check |
| --- | --- | --- |
| 1 | Monthly fee invoices and manual payments | One invoice per enrolment and billing month; partial payments, balances, and overdue status calculate correctly; repeated submissions do not create duplicates |
| 1 | Gateway payment links and verified payment updates | A guardian can use hosted checkout without the parent app; only verified server-side provider state updates an invoice; failures and duplicate notifications are handled |
| 2 | One photo per observation | Upload to private Storage, view with authorized access, retry on failure, enforce a small documented file-size limit; no public bucket |
| 3 | Structured feedback | Optional what improved, working on next, skill tags, milestone, try-at-home text, and next-class preparation text persist without requiring parent delivery |
| 4 | Weekly recurring schedule creation | Generate a bounded set of dated sessions, preview before saving, prevent duplicates, and edit/cancel a single occurrence |

Student history should expose saved attendance and observations using the existing data. Keep analytics limited to clearly defined figures the recorded data supports.

Day two must reserve time for device testing, security verification, recovery flows, and producing a repeatable Android build. Feature work stops if it threatens those checks.

## 5. Explicit cut line

If the schedule slips, remove recurring schedule generation first, then structured feedback extras, then photo uploads. Individual dated sessions and text observations remain usable. Fee tracking and gateway integration are required by the revised scope. If their gates do not pass, report the release as incomplete; do not silently remove them or turn on real-money collection to meet the date.

Never cut database access policies, core persistence, basic error handling, or Android installation validation to fit more features. Never leave prototype buttons that claim an action succeeded when no action happened.

## 6. Not in this release

- Parent screens, guardian account claiming, family profiles, shared care, Life Book, Together, goals, Pip, and discovery.
- Parent chat, push notifications, automatic reminders, delivery/read receipts, and parent engagement analytics.
- Incoming parent trial requests, public academy listings, featured placement, and academy subscriptions.
- Custom checkout, automated refunds, platform splits, multi-merchant onboarding, subscription mandates, tax invoicing, and accounting exports. Hosted gateway checkout is included; manual payment entries remain separately identified.
- Phone/WhatsApp OTP, Google sign-in, video/audio uploads, transcription, and AI-generated feedback.
- Staff invitations, granular staff roles, multi-branch administration, CSV imports, and full offline synchronization.
- Development-only component galleries and sample metrics from either HTML prototype.

The UI may offer a normal phone dialer or user-initiated share sheet later, but neither should be represented as authenticated messaging or verified delivery.

## 7. Screens and navigation

Keep the coach reference's five destinations: Today, Schedule, Post, Students, and Fees, with Fees visible only when implemented. Add authentication, first-run academy setup, and a small account/settings screen.

- Today: actual sessions, attendance work remaining, and fee totals when available.
- Schedule: date selection, sessions, create/edit/cancel actions, and batch management.
- Post: choose batch/session, audience, text, and draft/record action; include a private photo with a saved draft; structured extras follow later.
- Students: batch filter, student editor with inline batch creation, profile photo, and batch roster pages that add existing or new students.
- Fees: monthly students/collected/pending overview, batch cards, student drilldown and receipt entry; invoice history/corrections are secondary.
- Account: sign-out, password recovery entry, privacy notice, and account-deletion workflow before external distribution.

Use “Draft saved” and “Observation recorded.” Do not say “Parents notified,” “Receipt sent,” or show read/engagement percentages. No parent delivery occurs in this release.

## 8. Data model and future parent boundary

Implement only tables required by shipped features:

- `profiles`: authenticated adult identity and display name.
- `academies`: owner, name, timezone, currency.
- `students`: academy-scoped roster records, display name, optional age information, archive status. Collect only necessary details.
- `student_contacts`: academy-scoped guardian contact details; these do not confer authenticated access.
- `batches` and `enrolments`: teaching groups and student membership with active dates and fee defaults.
- `class_sessions`: batch, start/end timestamp, room, and scheduled/completed/cancelled status.
- `attendance`: unique session/student status and audit timestamps.
- `observations` and `observation_recipients`: author, session/batch context, draft/recorded status, text fields, and explicitly saved recipients.
- `observation_media`, if shipped: private object path, upload metadata, and observation relationship.
- `fee_invoices` and `fee_payments`, if shipped: billing period, due date, amount, manual payments, and audit metadata.
- Server-managed payment links/attempts and deduplicated gateway events: provider references, test/live mode, verification state, and reconciliation results. See BUILD_PLAN.md for the payment contract.

Enforce ownership and same-academy relationships in the database, including references between sessions, students, batches, and observations. Do not rely on hidden buttons or client-provided academy IDs for authorization.

Future parent integration will add verified guardian links and an explicit mapping from academy student records to family-managed child profiles. Do not automatically match or merge children using names, ages, email addresses, or phone numbers. A coach must not gain access to private family records through that mapping.

Keep observations attributable to their author and session. Save audience membership when recording a whole-batch observation so future enrolment changes do not silently change its recipients. Distinguish a coach's original observation from any future parent summary or AI interpretation.

Future parent calendars can reference the same class sessions. Future home suggestions can consume structured observation fields. Neither requires building a parent feed, family database, notification worker, or event bus now.

## 9. Security and reliability requirements

- Enable Row Level Security on every exposed application table and appropriate private Storage policies.
- Verify with two independent accounts that neither can read or change the other's academy records or photos, including direct API requests.
- Use database constraints and atomic operations for duplicate prevention and related writes. Ensure a multi-record attendance save cannot silently leave a partial success.
- Validate email, dates, amounts, required fields, and file types/sizes. Do not record sensitive values in logs.
- Only the project URL and publishable key go in the app. Service-role keys, database credentials, and email-provider secrets remain server-side or in secure configuration.
- Preserve attendance/history when students are archived. Document deletion and retention behavior separately from archiving.
- Warn before discarding unsaved forms. On a failed save, retain the entered values and make retry safe. Never imply unsynced data is saved remotely.
- Show honest states for empty data, upload failures, expired sessions, and unavailable networking.

## 10. Build sequence and time allocation

These are focused work allocations, not guaranteed completion times. Use the existing isolated checkout; no additional worktree is needed.

| Window | Work | Exit condition |
| --- | --- | --- |
| Day 1, first 2 hours | App scaffold, environment wiring, migrations, access policies, Android build feasibility | App launches on a device and reaches Supabase |
| Day 1, next 2 hours | Auth and academy setup | Verified login, session restoration, recovery flow |
| Day 1, next 3 hours | Students, batches, enrolments, dated sessions | Coach creates a usable roster and teaching day |
| Day 1, final 3 hours | Attendance, text observations, dashboard | Core journey passes after app restart |
| Day 2, first 6 hours | Fee ledger, gateway test-mode payment links, verified webhooks, and reconciliation | Required payment tests pass; optional photos/structured fields follow only if time remains |
| Day 2, final 4 hours | Device tests, security checks, fixes, signed build, handover | Release candidate and known limitations documented |

An APK for direct installation is the pilot target. Produce an AAB for Google Play when the required account and signing configuration are available. Prefer Expo build tooling; establish build-service access and signing feasibility early rather than discovering a blocker at the end.

## 11. Configuration and user inputs

Needed early:

1. A Supabase development project, with its project URL and publishable key. Configure secure credentials through environment settings, not chat or GitHub.
2. Email verification and recovery redirect configuration. Production email delivery needs a configured SMTP provider; built-in test delivery is not a production plan.
3. An Android phone and a test email inbox for real installation and authentication checks.
4. Expo account/build access if using hosted Android builds. Build quotas and plan limits must be checked when choosing the build path.
5. Academy display name and app label; use “Parent Plus Coach” and a configurable academy name until supplied.
6. A gateway merchant account with test credentials and webhook configuration; live credentials and merchant approval are needed for real collection. Pilot one academy collecting into its own merchant account. Confirm the merchant model before onboarding independent academies for live payments.

The disabled Supabase plugin is not a dependency. Prepare versioned SQL migrations and use an approved CLI/database connection if available. Otherwise provide the migrations for the user to run in Supabase SQL Editor, then verify the resulting schema from the app. Respect organization restrictions; do not assume another connection method is authorized merely because a plugin is unavailable.

No live Supabase connection, email delivery, Android build service, or device behavior has been verified as part of writing this plan. If backend configuration is pending, app scaffolding and migration preparation can proceed, but backend-dependent milestones remain incomplete.

## 12. Release gate and handover

Before declaring the pilot usable:

- Install and open the release candidate on a real Android device.
- Complete authentication, password recovery, session restoration, and sign-out.
- Complete the day-one core journey using actual Supabase persistence.
- Verify account isolation for records and media with two accounts.
- Verify attendance updates and repeated saves; test lost connectivity during a save.
- Verify unpaid, partial, fully paid, and overdue cases, including duplicate submission handling. Gateway integration must pass its test-mode matrix; live collection stays disabled until its separate gate passes.
- If photos ship, verify private access, failure recovery, and unauthorized access denial.
- Run TypeScript checks and relevant automated tests for access rules, attendance persistence, and fee calculations; confirm tests actually execute.
- Include a truthful privacy notice and a tested account-deletion process before distributing to external users; document any legitimate retention of academy records.
- Document installation, configuration, migrations, build steps, shipped features, deferred features, and known issues.

Deliverables: GitHub source changes ready for review; versioned Supabase migrations; configuration instructions without secrets; an installable Android artifact when build prerequisites are available; validation evidence; and a prioritized follow-up backlog.

Success is a narrow app a coach can actually use. It is not the number of prototype screens reproduced.


### Owner correction after app review

Batch rosters, membership from either entry point, summary-first monthly fees and both photo locations are now required. This overrides the earlier optional-photo cut line. Preserve the ledger and access controls while simplifying the visible journey. Implementations and current acceptance limits are in PROGRESS.md and COACH_WORKFLOW_REVIEW.md.

### Photo-assisted onboarding

Students/Add Student and batch pages must offer register/form capture or image selection, AI extraction, review/edit/skip, existing-name linking and explicit confirmed import. This is a required workflow addition; details and external activation dependencies are in [PHOTO_ONBOARDING.md](ai-workspace/features/PHOTO_ONBOARDING.md), PRDSTU-03 and migration009. No real AI service is activated by the source change alone.

### Cloud Vision implementation selected

The owner chose Cloud Vision for capture→auto-fill→confirmation. Candidate0.8.0 replaces the unactivated GPT reader, reuses confirmed imports and adds conservative text/table mapping plus a shared monthly attempt limit. [Current behavior and activation](ai-workspace/features/PHOTO_ONBOARDING.md) supersedes the initial provider choice; no real scans are accepted until the private function/key and missing009/010 are configured.
