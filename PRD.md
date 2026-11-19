# Parent Plus Full Product PRD

Parent App and Coach/Tutor App requirements, shared platform and launch criteria

*Version 1.0 \| 19 November 2026 \| Draft for founder and product review*

This is the repository’s full-product requirements draft. It sets the direction for both apps and the shared platform. See [current implementation and validation status](PROGRESS.md) and the [revised prototypes](founders/prototypes/README.md).

The [earlier Coach PRD](https://github.com/appsworld2027/Parent-plus-/blob/26bc034cc995a657bbb1bf51a5064c36ad96088d/PRD.md) and the [Parent first-slice requirements](founders/product/PARENT_PRD.md) retain detailed requirements for the existing application. The [original Word document](founders/product/Parent_Plus_Full_Product_PRD.docx) preserves the supplied draft.

## Product review and relationship to the current app

This is a proposed full-product direction for founder review. It does not by itself approve a release scope, change the current pilot priorities, or describe behavior already present in the app. Use [current progress](PROGRESS.md), the [Coach pilot requirements](https://github.com/appsworld2027/Parent-plus-/blob/26bc034cc995a657bbb1bf51a5064c36ad96088d/PRD.md), the [Aurora first-slice requirements](founders/product/PARENT_PRD.md), and the [consolidated roadmap](founders/product/CONSOLIDATED_PRODUCT_ROADMAP.md) to understand implementation and previously agreed boundaries.

The revised prototypes are interactive design references. Their local state, sample records, previews, simulated sends, and success messages do not prove persistent or connected behavior. The prototype feature map itself marks identity, provider verification, shared APIs, permissions, media, messaging, payments, support, and marketplace functions as requiring backend or operational services. Treat prototype interactions as design intent until their acceptance criteria pass against the real app and authorized service.

### Changes that need product reconciliation

| Area | Full-product proposal | Existing first-slice or pilot boundary | Review required before delivery |
| --- | --- | --- | --- |
| Account access | Phone OTP is the initial path, with a supported alternative undecided. | Existing Coach pilot requirements specify email and password with verification and recovery. The Parent slice reuses the existing account credentials. | Agree on account methods and migration or coexistence behavior before changing authentication. |
| Guardians and child access | Multiple guardians and helpers with delegated permissions. | The Parent first slice limits family ownership and active connections. Multi-guardian authority remains a later decision. | Define who may invite, what each role can see or change, and how consent and revocation work. |
| Discovery and trials | Public provider discovery, listing trust, trial requests, capacity, and enrollment conversion. | Marketplace and trial services are not implemented in the current Parent slice. | Choose the first provider segment, verification policy, geography, booking rules, and release boundary. |
| Payments | Parent payment records, provider invoices, collections, reconciliation, refunds, and billing. | Fee collection and gateway work are shelved under the current Coach pilot direction. | Reconfirm commercial model and explicitly sequence payment work before treating these requirements as active delivery. |
| Parent and provider data | Shared identity, enrollment, session, consent, messaging, and API records. | The current app has distinct family and academy records and an explicit invitation connection. Shared login does not merge family and academy ownership. | Specify the canonical data model and safe migration path while preserving existing authorization and isolation. |
| Family development and progress | Unified development history, class evidence, and family activities across the product. | Private family records stay separate. Coach feedback is reviewed and shared through explicit, child-scoped connections. | Define each shared data category, evidence standard, consent, and historical access behavior. |
| Platform and launch | Responsive web/mobile-ready experiences, broad operating workflows, analytics, support, and safety operations. | Current app delivery and release gates are tracked separately in progress and validation records. | Select platform, MVP scope, legal/geographic constraints, owners, and measurable launch gates. |

Until these decisions are resolved, the phased P0/P1/P2 sequence in this draft is a recommendation for discussion, not an approved commitment. New functionality should retain the current app's verified identity, explicit child connection, reviewed feedback, consented media, and fail-closed access rules.

This PRD defines the complete intended product across the Parent and Coach/Tutor experiences. It translates the product audit and mapped prototypes into modules, submodules, functional requirements, shared data rules, acceptance outcomes, and a phased delivery boundary. It distinguishes prototype concepts from production requirements; screens in the HTML demos do not imply that accounts, messaging, bookings, payments, or shared data are live.

## 1. Product summary

Parent Plus is a connected operating and development platform for families and children’s activity providers. Parents organize their child’s classes and family activities, understand development over time, and act on coach feedback. Coaches and tutors manage their provider workspace, classes, attendance, communication, progress updates, and collections. Both apps must use the same identity, enrollment, session, consent, and communication records.

Product loop: a parent discovers or connects with a provider, requests a trial, and enrolls a child; the provider delivers dated sessions and records attendance and observations; the parent receives a permission-checked update and can prepare for the next session; billing and support stay consistent across both sides.

| **PRD field**             | **Definition**                                                                                                                                                                        |
|---------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Primary users             | Parents/guardians; independent tutors; academy owners; coaches/instructors; academy staff; internal support/moderation roles.                                                         |
| Primary outcome           | Weekly active connected families: a family linked to a real provider that completes or receives a meaningful class-related or family-development interaction in a week.               |
| Product boundary          | Two role-based experiences over one shared platform. Parent and provider workspaces have distinct permissions and workflows.                                                          |
| First customer assumption | Independent tutors and small academies are the initial provider segment; confirm before committing the MVP.                                                                           |
| Platforms                 | Responsive web/mobile-ready app experiences; specific native app, web, and offline scope remains a product decision.                                                                  |
| Evidence status           | Based on the product audit and Parent/Coach HTML prototypes updated with PP-F01–PP-F27 traceability. All live-service behavior below is a requirement, not a claim of implementation. |

## 2. Goals and non-goals

### 2.1 Goals

- Provide secure parent and provider sign-in with one identity and multiple authorized roles/workspaces.

- Create a dependable child–family–provider–class enrollment relationship that controls every data view and action.

- Complete the connected core journey from discovery and trial through attendance, feedback, parent action, and payment status.

- Give providers a fast daily workflow for classes, attendance, updates, schedule changes, and follow-up.

- Give parents a clear next action, a unified view of classes across providers, useful progress evidence, and control over sharing.

- Make consent, safety, access revocation, support, and auditability part of the product foundation.

- Measure activation and recurring value using defined events and trustworthy data.

### 2.2 Non-goals for initial release

- Advanced generative AI coaching, child diagnosis, or automated developmental claims.

- A broad social network, public child profiles, or unrestricted group sharing.

- Featured paid placement, complex ad products, or a large public marketplace before provider quality and demand are validated.

- Institutional enterprise administration beyond the access, staff, and reporting needs validated with the first customer segment.

- Treating clicks, streaks, arbitrary percentages, or screen opens as proof of child progress or product-market fit.

## 3. Users, roles and access model

| **Role**            | **Typical responsibilities**                                                                       | **Default access boundary**                                                                   |
|---------------------|----------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------|
| Primary guardian    | Creates family, manages children, approves participation and sharing, handles billing and support. | Family workspace and authorized child records; can invite/remove guardians subject to policy. |
| Co-guardian         | Coordinates classes, views updates, manages permitted child settings.                              | Only children and actions granted by the primary guardian or governing policy.                |
| Helper/caregiver    | May need schedule or pickup information.                                                           | Narrow, explicit permissions; no default access to sensitive progress or payment records.     |
| Independent tutor   | Manages provider profile, classes, sessions, attendance, updates and fees.                         | Only own provider workspace and currently assigned/authorized children.                       |
| Academy owner/admin | Manages provider, team, classes, billing configuration and oversight.                              | Workspace administration; sensitive child data only where operationally necessary.            |
| Coach/instructor    | Runs assigned sessions and records attendance and observations.                                    | Assigned batches/students and allowed class functions only.                                   |
| Support/moderation  | Resolves support cases, disputes and safety reports.                                               | Case-scoped, time-limited access with reason capture and audit trail.                         |

Identity answers who the person is; role answers what actions the person may take; enrollment answers which child is linked to which provider, class, and time period. Authorization must evaluate all three plus consent and workspace membership. A parent who also teaches uses one verified identity with separate role-aware workspaces.

## 4. End-to-end journeys

### 4.1 Parent to provider and back

> 1\. Parent signs in or creates an account using a verified contact method; existing accounts are recognized.
>
> 2\. Parent creates a family, adds one or more children, chooses initial goals, and reviews the relevant consent choices.
>
> 3\. Parent explores providers/classes or joins via an invitation; marketplace information shows eligibility, price, terms, availability and trust signals.
>
> 4\. Parent requests a trial for a specific child and time. The system reserves capacity or clearly indicates that the request is awaiting provider confirmation.
>
> 5\. Provider accepts, declines, or proposes an alternate time. Both sides see the same state and receive delivery-confirmed notifications.
>
> 6\. On acceptance, the system creates the trial/session and, after parent confirmation or completion of agreed enrollment rules, the enrollment relationship and permissions.
>
> 7\. Provider records attendance against the dated session, then shares an individual or audience-controlled update when consent allows.
>
> 8\. Parent receives the update, sees what happened and suggested preparation/home activity, and can respond or ask for support.
>
> 9\. Provider issues an invoice or records a supported collection; payment status changes only after transaction evidence and reconciliation.
>
> 10\. When a family transfers or exits, future access is revoked promptly while permitted historical records follow retention policy.

### 4.2 Provider daily workflow

> 1\. Provider opens Today and sees dated classes, pending trials, attendance actions, messages, and overdue fee follow-up from reliable records.
>
> 2\. Provider opens a class/session roster and records present, late, absent, or excused status per child.
>
> 3\. Provider corrects an attendance entry with a reason; the system retains prior value, actor, and timestamp.
>
> 4\. Provider creates a child-specific update using a reusable feedback snippet, skill/milestone selection, and optional home activity.
>
> 5\. Provider attaches approved media only after checking child-level consent and recipients.
>
> 6\. Provider publishes; parents receive the update only after authorization checks and successful event creation. Delivery failures remain visible and retryable.
>
> 7\. Provider manages schedule changes, fee items, and support cases through explicit states rather than optimistic success messages.

## 5. Parent App requirements

### P1. Identity, onboarding and family workspace

**Purpose.** Help a parent access the product, establish the family context, add children gradually, and recover safely.

**Traceability.** PP-F01, PP-F02, PP-F04, PP-F05, PP-F18, PP-F21, PP-F27

#### P1.1 Welcome and account entry

Explain the value of organizing classes, understanding progress, and spending meaningful time together.

- Offer sign in, create account, and existing-invitation paths without implying an account exists until verified.

- Use phone OTP as the initial supported path; allow a supported alternative if selected for launch.

- Detect an existing verified identity and direct the user to sign in or recover access instead of creating a duplicate.

#### P1.2 OTP, recovery and session management

Make identity verification reliable and resistant to abuse.

- Enforce code expiry, resend cooldown, attempt limits, rate limits and safe error copy.

- Provide change-number, retry, recovery and support escalation paths.

- Provide sign-out, session expiry, device/session revocation and account deletion entry points.

#### P1.3 Family and child setup

Create a family workspace and child profiles using progressive profiling.

- Capture the minimum initial child data required for class matching and safety; make optional fields explicit.

- Support multiple children and always show the active child in family-scoped screens.

- Record guardian relationship and permissions; support invitation acceptance, duplicate detection and revocation.

- Allow initial goals such as classes, coordination, activities together, or progress visibility.

#### P1.4 Role and workspace switching

Allow the same identity to use parent and provider workspaces without mixing data.

- Show available workspaces and active role clearly.

- Switching roles must re-evaluate permissions and clear stale sensitive screen state.

- An invitation to an existing family must link the verified identity rather than create a duplicate household.

**Acceptance outcomes**

- A verified parent can resume a session and recover access without creating a second family.

- A user with two children can switch the active child and sees the correct child-specific classes, updates, and consents.

- An invited guardian receives only explicitly granted access; revocation removes future access and is audited.

### P2. Parent home and next action

**Purpose.** Surface the most useful current action and a concise view of family activity, not unsupported or fixed metrics.

**Traceability.** PP-F14, PP-F15, PP-F25

#### P2.1 Action queue

Prioritize items such as confirm trial, prepare for class, review coach update, respond to schedule change, or resolve fee status.

- Every action includes source record, due date/state, and a deep link to the relevant workflow.

- Completed, dismissed, or expired actions update according to their actual backend state.

- Do not show success, payment, attendance, or engagement numbers from hard-coded values.

#### P2.2 Family and provider summary

Show upcoming sessions and current provider relationships across all authorized children.

- Support multiple providers and display the source provider for each item.

- Show empty states that explain how to connect a class or provider.

- Use event timestamps and explicit stale/loading/error states.

#### P2.3 Weekly preparation

Offer a parent-controlled preparation checklist tied to upcoming classes.

- Checklist items can be viewed, completed, and reopened where appropriate.

- Provider-specific materials must be visible only to enrolled families.

- Preparation reminders respect parent notification preferences.

**Acceptance outcomes**

- A parent can identify the next action and reach its source record in one selection.

- Dashboard summaries reconcile to the underlying class, session, trial, update, and fee records.

- When records cannot load, the UI shows an error or last-updated time rather than false zeroes.

### P3. Class calendar and schedule

**Purpose.** Provide a unified, reliable calendar for children’s sessions, activities, and schedule changes across providers.

**Traceability.** PP-F08, PP-F15, PP-F27

#### P3.1 Calendar views

Support agenda and week views with child/provider filters.

- Show session date, local time, location or delivery mode, provider, child, and status.

- Distinguish provider sessions, trials, family activities, and tentative events.

- Prevent duplicate display when a session is updated or rescheduled.

#### P3.2 Recurring sessions and exceptions

Represent recurring schedules as rules plus dated occurrences.

- Support holidays, cancellations, reschedules, capacity changes, and conflicts as explicit dated events.

- A reschedule must update the same canonical session and notify affected guardians after commit.

- Preserve the original schedule in audit history; do not silently overwrite history.

#### P3.3 Missed-class recovery

Show eligible missed sessions and available make-up options.

- Eligibility follows provider policy and session/attendance state.

- Parent can request a make-up time; provider response is visible and tracked.

- An accepted make-up creates a distinct dated session/booking without erasing the original absence.

**Acceptance outcomes**

- A coach’s committed schedule change appears identically in the parent calendar.

- Cancelled or rescheduled instances remain distinguishable from the recurrence rule.

- The app never reports a change as saved until the shared schedule record commits.

### P4. Explore and provider marketplace

**Purpose.** Help parents find suitable providers using accurate, transparent information and a safe conversion path.

**Traceability.** PP-F03, PP-F07, PP-F17, PP-F20

#### P4.1 Search and eligibility

Search by activity, age group, location/service area, delivery mode, and availability.

- Filters must be explainable and return only active listings approved for discovery.

- Show why an activity/provider is a fit or what eligibility information is missing.

- Support no-result and location-permission-denied states.

#### P4.2 Provider and class profiles

Display provider identity, verification state, classes, ages, delivery mode, location, schedule, price, capacity, cancellation terms and trial availability.

- Mark which claims are verified and when; do not present unverified qualifications as verified.

- Clearly separate one-time, recurring, trial, and additional charges.

- Reviews must come from verified participation and follow moderation/appeal policy.

#### P4.3 Listing trust and moderation

Provide report listing, complaint, suspension, and appeal paths.

- Unapproved, suspended, or expired providers are not bookable.

- A provider suspension blocks new discovery and booking while authorized historical access follows policy.

- Marketplace moderation actions are recorded with actor, reason, and time.

**Acceptance outcomes**

- A parent can compare a class using eligibility, price, schedule, cancellation policy, provider trust, and trial availability.

- A listing cannot be booked if it is inactive, suspended, full, or not approved.

- Review authorship is tied to a verified trial/enrollment record; moderation does not silently erase audit history.

### P5. Trial booking and enrollment

**Purpose.** Create a real, stateful conversion workflow linking a child, guardian, provider, class, and dated trial.

**Traceability.** PP-F05, PP-F07, PP-F17, PP-F27

#### P5.1 Trial request

Let an authorized guardian select a child and available slot, review terms, and submit a request.

- Validate current capacity atomically to prevent oversubscription.

- Create a unique request with requester, child, class, chosen slot, expiry, and status.

- Prevent duplicate active requests for the same child/class/slot unless policy permits.

#### P5.2 Provider response

Allow provider to accept, decline with a reason, or propose an alternate slot.

- Parent must confirm an alternate before it becomes booked.

- Expired requests release any reserved capacity and notify both parties.

- Every transition has actor, time, previous state, and resulting state.

#### P5.3 Enrollment lifecycle

Create enrollment after the defined acceptance/confirmation steps and manage transfer, pause, exit, or completion.

- Enrollment determines which provider staff may access the child and for what period.

- Transfers create a new relationship and revoke prior future access according to policy.

- Exit retains only records that the retention policy permits; guardian access is clearly explained.

**Acceptance outcomes**

- Two concurrent trial requests cannot consume the same final capacity slot.

- Parent and provider see the same trial status and dated details after each committed transition.

- Ending enrollment revokes future operational access and creates an auditable event.

### P6. Together activities and family development

**Purpose.** Support useful family activities that complement provider classes without making unsupported developmental claims.

**Traceability.** PP-F15, PP-F16, PP-F22

#### P6.1 Activity discovery

Offer age-appropriate activity ideas, filters, time/material requirements and clear instructions.

- Activity content states intended use and any safety/material considerations.

- Parent can save/favorite activities and select the active child.

- Advanced AI-generated plans remain deferred until validated and safety-reviewed.

#### P6.2 Activity logging

Allow a parent to log an activity as completed and optionally capture a private note.

- Log date, child, activity, and parent actor; edit/delete follows audit and retention rules.

- Do not treat completion counts or badges as a clinical or educational assessment.

- Family activity data is excluded from provider access unless the parent explicitly shares it.

**Acceptance outcomes**

- Activity instructions remain available after save and are associated with the selected child.

- Completion contributes to the family timeline only after save succeeds.

- AI or gamified recommendations are feature-flagged and excluded from initial launch unless approved.

### P7. Progress, class updates and development history

**Purpose.** Give parents timely, contextual, permission-checked evidence from coaches and sessions.

**Traceability.** PP-F09, PP-F10, PP-F11, PP-F12, PP-F16, PP-F18, PP-F19

#### P7.1 Attendance and class timeline

Show dated session attendance and provider updates for each enrolled child.

- Attendance status is sourced from a dated session record and can show correction history when appropriate.

- Separate attendance, participation, coach-observed skills, parent activities, and milestones.

- Label source and date for each observation; do not imply longitudinal trend from a single entry.

#### P7.2 Coach observations and home activities

Display structured feedback, skills, milestones, and suggestions for home practice.

- Show coach identity, class/session, date, intended recipient, and visibility scope.

- Parents can acknowledge or ask a question where messaging is enabled.

- Use plain language and avoid diagnosis, prediction, or unsupported claims about a child.

#### P7.3 Development-history sharing

Let the parent choose whether to share selected history with an authorized provider.

- Default to private; show exactly which records and provider will receive access.

- Allow revocation, with the point at which access ends clearly stated.

- Log share grants and revocations and apply them to API and media access.

**Acceptance outcomes**

- An update for one child is never visible to an unrelated family or provider.

- Revoking a share blocks future access; permitted historic data handling follows retention rules.

- Parent can distinguish measured/observed records from sample, estimated, or incomplete information.

### P8. Memories and media

**Purpose.** Allow families to retain selected memories while protecting child images and sensitive media.

**Traceability.** PP-F11, PP-F18, PP-F19, PP-F21

#### P8.1 Secure upload and storage

Upload images/video as authenticated objects with metadata and access controls.

- Use private storage by default, encrypted transport/storage, expiring access URLs, and malware/content checks appropriate to service design.

- Do not store filename labels as a substitute for an uploaded media object.

- Bind every media object to owner, child, consent state, audience and retention policy.

#### P8.2 Sharing and consent

Check child-specific guardian consent and recipient authorization before creating or serving media.

- Group posts must not expose a child to unrelated families.

- Consent withdrawal blocks future access and triggers retention/deletion workflow where required.

- Support report, takedown, and safeguarding escalation.

**Acceptance outcomes**

- An unauthorized user cannot retrieve media through direct URL, API, cache, or shared post.

- Upload failure is visible and retryable; the post cannot claim success until the object and post record are committed.

- Consent and every material audience change are auditable.

### P9. Parent fees and payment records

**Purpose.** Give parents an accurate view of amounts due, supported payment actions, and verified receipts.

**Traceability.** PP-F13, PP-F20, PP-F21, PP-F23

#### P9.1 Fee ledger and invoices

Show provider, child, invoice period, line items, due date, status, and terms.

- Distinguish invoice issued, payment pending, paid, failed, refunded, disputed, and overdue.

- Parent sees only invoices tied to authorized family enrollments.

- Invoice history remains immutable; corrections issue a credit/reversal record.

#### P9.2 Payment and receipt

Use an approved payment flow or clearly indicate offline payment handling.

- Mark paid only from a verified gateway callback or authorized reconciled offline record.

- Idempotently process payment callbacks and reconcile transaction to invoice.

- Issue receipt only after verified payment; support refund and dispute states.

**Acceptance outcomes**

- A failed or pending transaction never appears as paid.

- A duplicate callback cannot create duplicate receipts or ledger entries.

- Parent can open a fee dispute or contact support without losing invoice context.

### P10. Parent inbox, notifications and preferences

**Purpose.** Deliver relevant, consent-aware communications and make delivery state visible.

**Traceability.** PP-F12, PP-F20, PP-F21

#### P10.1 Notification center

Collect class, trial, schedule, attendance, update, fee, support and account events.

- Each notification deep-links to an authorized record and checks access at open time.

- Support read/unread, archived, and delivery state where channels provide it.

- Respect quiet hours, channel preferences, and mandatory security/service notices.

#### P10.2 Messaging

Provide persistent parent-provider conversations scoped to an enrollment or support case.

- Enforce participants and child-context access on every read/write.

- Support moderation/reporting, blocking/escalation, retention, and attachment rules.

- A send action distinguishes queued, sent, delivered, failed and read when the channel supports each state.

**Acceptance outcomes**

- A message or notification is not presented as delivered until the delivery service confirms it.

- Access revocation blocks new message access according to retention policy.

- Parents can change nonessential channel preferences and see the result.

### P11. Parent privacy, account settings and support

**Purpose.** Give parents control and a clear route to resolve safety, account, class, and payment issues.

**Traceability.** PP-F18, PP-F19, PP-F20, PP-F21, PP-F27

#### P11.1 Consent and privacy center

Manage guardian, media, group-audience, development-history and notification choices.

- Show purpose, scope, recipient, date granted, and withdrawal action for each consent.

- Do not bundle optional media consent with account creation or class enrollment.

- Use policy and legal review for the child-data rules applicable at launch; the product must not claim compliance before review.

#### P11.2 Data access and account lifecycle

Provide export, correction, deletion, sign-out, and account closure requests.

- Authenticate requests and show status through completion.

- Apply retention schedules to financial, safety, attendance, communication and media records.

- Notify affected guardians when shared access is changed, subject to safeguarding/legal constraints.

#### P11.3 Support and safety reporting

Create cases for safeguarding, provider complaints, schedule disputes, refunds, data requests, and technical problems.

- Capture category, affected child/class, evidence, urgency and contact preference.

- Provide case ID, status, expected response path, escalation and closure reason.

- Restrict sensitive reports to authorized case handlers and audit access.

**Acceptance outcomes**

- Guardian can view and revoke each optional consent without contacting support.

- Support case status persists and can be reopened or escalated according to policy.

- Account/data requests retain evidence of authorization and completion.

## 6. Coach/Tutor App requirements

### C1. Provider identity, onboarding and verification

**Purpose.** Help an independent tutor or academy establish a verified provider workspace and publish only after review.

**Traceability.** PP-F01, PP-F03, PP-F04, PP-F17, PP-F18, PP-F21, PP-F27

#### C1.1 Sign-in and provider account

Use the shared identity service with provider role enrollment.

- Existing parent identity can add a provider role without duplicate credentials.

- Verify contact method and support recovery, expired OTP, retries and account lockout safely.

- Record legal/provider entity and account owner distinctly from staff users.

#### C1.2 Provider profile and verification

Capture provider type, name, service area, subjects, age groups, delivery modes and qualifications.

- Collect evidence required by provider-verification policy and show verification status.

- Separate submitted, under review, approved, rejected, expired and suspended states.

- Keep private verification evidence out of public profiles and unauthorized staff views.

#### C1.3 Classes, prices and discovery review

Set up classes, age/eligibility, schedule, capacity, fees and policies before listing.

- Require a complete profile and review outcome before public discovery.

- Make all commercial terms and trial availability transparent to parents.

- Provide a preview and explicit publish action; preview is not publication.

**Acceptance outcomes**

- Unverified providers cannot appear as verified or publish into bookable search.

- Suspension disables new discovery and booking and triggers defined access review.

- Provider can see and correct rejection reasons through an auditable review workflow.

### C2. Provider workspace, academy staff and roles

**Purpose.** Support independent tutors, academies, multiple workspaces and controlled staff access.

**Traceability.** PP-F04, PP-F05, PP-F19, PP-F21, PP-F27

#### C2.1 Workspace and membership

Represent provider workspace, owner, staff membership and multiple provider affiliations.

- A tutor may belong to multiple academies with distinct workspace contexts.

- Switching workspace changes available students, classes, fees and settings.

- Every action records the acting user and workspace.

#### C2.2 Staff invitations and permissions

Invite staff using individual identities and least-privilege roles.

- Never require credential sharing.

- Support invite pending, accepted, expired, revoked and removed states.

- Owners assign staff to specific batches/students and permitted functions.

#### C2.3 Staff offboarding and provider suspension

Revoke access quickly while preserving permitted business history.

- Removing staff ends access tokens/sessions and future record access.

- Suspended provider state blocks sensitive operations and starts a support/review path.

- Audit access grants, changes, removal and suspension decisions.

**Acceptance outcomes**

- A coach cannot open a child who is outside currently assigned scope.

- Removing a staff member blocks access on subsequent requests and invalidates active sessions within defined security limits.

- Staff permissions are visible to owners and can be changed without modifying the user identity.

### C3. Classes, batches and enrollment roster

**Purpose.** Let providers configure offerings and maintain rosters based on canonical enrollment records.

**Traceability.** PP-F05, PP-F07, PP-F08, PP-F17, PP-F27

#### C3.1 Class and batch setup

Define class offering separately from batch/cohort and dated sessions.

- Store age/eligibility, location/mode, instructor assignment, recurrence, capacity, price and cancellation policy.

- Prevent incompatible values (for example capacity below current enrollment) unless an authorized override is recorded.

- Changes to publicly displayed terms require parent visibility and policy-based re-confirmation.

#### C3.2 Roster and enrollment state

Show active, trial, pending, paused, transferred and exited relationships with guardian contacts where authorized.

- Roster membership derives from enrollment records, not local-only student arrays.

- Transfers preserve the correct historical provider/session links while changing future access.

- Only authorized guardians are eligible for invitations, messages and child updates.

**Acceptance outcomes**

- Trial acceptance and enrollment consume capacity in one transaction.

- A child leaving a batch no longer appears in future operational rosters.

- Historical attendance and updates remain associated with the correct provider and period.

### C4. Today dashboard and work queues

**Purpose.** Give a provider a reliable daily view of work requiring attention.

**Traceability.** PP-F07, PP-F09, PP-F12, PP-F13, PP-F14, PP-F20, PP-F25

#### C4.1 Today schedule

List dated sessions, expected rosters, instructor, venue/mode and current status.

- Use the shared schedule source and local time-zone display.

- Separate scheduled, in progress, completed, cancelled and rescheduled sessions.

- Show offline/loading/error states where relevant.

#### C4.2 Action queues

Surface trial decisions, attendance not recorded, failed update delivery, overdue fee follow-up and support cases.

- Each queue item has source record, age/due date, current owner and next action.

- Closing a queue item requires the underlying state to change or a documented dismissal reason.

- Order by urgency and policy, not static demo values.

#### C4.3 Provider metrics

Calculate attendance, collections and engagement only from defined records and time windows.

- Provide a metric definition and drill-down to contributing records.

- Label partial/incomplete data and suppress misleading percentages when sample size is insufficient.

- Do not use fixed illustrative metrics in production.

**Acceptance outcomes**

- A dashboard count matches the records in the corresponding queue for the same time and workspace.

- A coach can reach the required attendance or trial action directly from Today.

- Data freshness and calculation period are visible for reported metrics.

### C5. Session scheduling and changes

**Purpose.** Manage recurring schedules through dated session occurrences and durable change states.

**Traceability.** PP-F08, PP-F15, PP-F27

#### C5.1 Schedule rules and dated sessions

Create recurrence rules and materialize occurrences for a defined horizon.

- A dated session has stable ID, start/end time, timezone, venue/mode, instructor, class and status.

- Handle holidays, closures, daylight/time-zone changes and one-off exceptions.

- Avoid duplicate occurrences during rule edits or sync retries.

#### C5.2 Cancellation, reschedule and conflict resolution

Allow authorized staff to cancel or propose a new time with affected families identified.

- A change is saved only after the session record commits.

- Show who is affected and gather required guardian confirmation for material changes.

- Notify after successful commit and preserve previous values in the audit log.

#### C5.3 Make-up sessions

Create separate make-up opportunities linked to the missed session and policy.

- Track request, proposed slot, acceptance, completion and expiry.

- Prevent double booking and enforce capacity.

- Do not convert an absence to attendance because a make-up was offered.

**Acceptance outcomes**

- Parent and provider calendars show the same committed session state.

- A failed reschedule remains unchanged and shows a clear error/retry state.

- Schedule changes notify the right guardians once, with duplicate event delivery handled idempotently.

### C6. Trial management and enrollment conversion

**Purpose.** Process trial requests with atomic capacity, explicit outcomes and shared parent visibility.

**Traceability.** PP-F05, PP-F07, PP-F12, PP-F17

#### C6.1 Trial queue

Show requests with child, class, slot, guardian contact, expiry and status.

- Only assigned staff with permission can access the request.

- Filter new, awaiting parent, accepted, declined, expired and completed requests.

- Avoid duplicate notifications or repeated capacity holds.

#### C6.2 Accept, decline and propose alternate

Provide an explicit response and optional reason or alternate slot.

- Acceptance creates the confirmed trial session and capacity reservation atomically.

- Alternate slots require parent confirmation before booking.

- Decline and expiry release capacity and provide a clear reason/state.

#### C6.3 Convert to enrollment

Create or update a canonical enrollment after required parent/provider confirmation.

- Carry forward authorized guardian, child, provider, class, policy and start date.

- Prevent overlapping active enrollments where prohibited by product policy.

- Produce the correct roster, parent calendar, fee schedule and access grants.

**Acceptance outcomes**

- The final available place can be allocated to only one confirmed trial/enrollment.

- All sides see matching state after accept/decline/alternate/expiry.

- Enrollment creation grants only scoped, time-bounded permissions.

### C7. Attendance and session completion

**Purpose.** Record attendance per child per dated session with correction history.

**Traceability.** PP-F09, PP-F14, PP-F19, PP-F25

#### C7.1 Attendance capture

Record present, late, absent, excused, or another approved status for each enrolled child.

- Attendance key is the dated session plus child; do not store one mutable status per batch.

- Support efficient mark-all-present followed by exceptions and preserve per-child results.

- Only assigned staff can record attendance within the session window or permitted correction period.

#### C7.2 Correction and audit

Allow correction with reason, actor, timestamp, prior state and new state.

- Do not overwrite history or let a correction silently change historical metrics.

- Notify guardians if policy requires notice of a material correction.

- Audit export/report scopes require role authorization.

**Acceptance outcomes**

- Two sessions for the same batch on different dates have independent attendance records.

- A corrected record preserves both prior and new status with reason and actor.

- The parent history and provider report reflect the same source record.

### C8. Feedback, progress and class updates

**Purpose.** Make it fast to create individual, useful, privacy-safe updates tied to a real session.

**Traceability.** PP-F10, PP-F11, PP-F12, PP-F16, PP-F18, PP-F19

#### C8.1 Update composer

Compose individual or appropriately scoped class updates with coach identity, date and session link.

- Support skills, observed milestones, narrative notes, and suggested home activities.

- Templates/snippets are editable and never auto-publish without coach review.

- Draft, scheduled, publishing, published, failed, corrected and removed states are explicit.

#### C8.2 Recipient and audience controls

Resolve authorized guardians from active enrollment and consent.

- Default to individual child audience; class-wide content must not disclose unrelated child data.

- Check consent at create and delivery time for media and sensitive content.

- Show recipient preview before publishing.

#### C8.3 Secure media upload

Upload files to private storage and attach only after successful upload and consent check.

- Validate size/type, secure access and retain upload state.

- A filename alone is never treated as attached media.

- Failed upload or notification does not report a completed post.

**Acceptance outcomes**

- A published post is visible only to its authorized recipients.

- A coach sees the exact intended audience before sending.

- Parents receive a post only after the shared record and media/consent checks succeed.

### C9. Coach-parent messaging and announcements

**Purpose.** Support persistent conversations and operational announcements with delivery state and safeguards.

**Traceability.** PP-F12, PP-F18, PP-F20, PP-F27

#### C9.1 Enrollment-scoped conversations

Create a thread associated with family, child/enrollment and provider.

- Only permitted guardians and assigned provider staff can read or send.

- Handle enrollment end, staff change, blocking, reporting and retention.

- Show sent/delivered/failed state according to the channel capability.

#### C9.2 Announcements

Send operational notices to a valid selected batch or affected guardian set.

- Preview recipient count and exclude families without current authorization.

- Support schedule, closure and policy notice templates with editable content.

- Track partial delivery, retries and failures; avoid false success.

#### C9.3 Communication templates and follow-up

Use reusable templates for fee reminders, class preparation, missed sessions and follow-up.

- Templates are reviewed, localized and tied to relevant records.

- Fee reminders must not disclose a child’s financial details to unrelated recipients.

- Follow-up queues clear only on a recorded outcome.

**Acceptance outcomes**

- A message is durable and available in the correct thread after refresh/device change.

- Audience preview and delivery report match the selected authorized recipients.

- Failed delivery remains visible with retry/escalation options.

### C10. Fees, invoices and provider billing

**Purpose.** Let providers issue accurate charges, reconcile collections and manage disputes without manually asserting payment proof.

**Traceability.** PP-F13, PP-F20, PP-F23

#### C10.1 Provider fee plans

Configure class fee, billing cadence, trial charge, discounts, due date and cancellation/refund policy.

- Changes apply prospectively unless explicitly approved and communicated.

- Commercial model (subscription, transaction fee, or combination) remains an open decision.

- Show fee-plan version and effective dates.

#### C10.2 Invoice lifecycle

Issue itemized invoices and track draft, issued, due, paid, failed, void, disputed and refunded states.

- Invoice amount is derived from approved fee plan and enrollment/adjustment records.

- Manual payment entry requires authorized evidence and reconciliation status; staff cannot simply toggle paid.

- Corrections use credit notes or reversal records.

#### C10.3 Payment reconciliation and follow-up

Match gateway or offline collection to invoice and provider settlement.

- Use idempotent transaction IDs and reconciliation queue for unmatched/partial amounts.

- Issue receipt only after verified collection.

- Refunds and disputes link to original invoice and payment.

**Acceptance outcomes**

- Provider and parent fee status derives from the same ledger state.

- A payment cannot be confirmed without transaction evidence or approved reconciled offline handling.

- An unmatched transaction appears in a reconciliation queue and cannot be silently discarded.

### C11. Provider insights, account, safety and support

**Purpose.** Provide trustworthy reporting and operational controls for provider accounts.

**Traceability.** PP-F14, PP-F18, PP-F19, PP-F20, PP-F21, PP-F25, PP-F27

#### C11.1 Insights and reports

Report attendance, enrollment, collection and communication using defined periods and formulas.

- Every measure includes definition, source, timezone and freshness.

- Allow drill-down to authorized records and export under role controls.

- Do not use fixed values or equate engagement with child progress.

#### C11.2 Provider settings

Manage profile, schedule defaults, notification preferences, privacy, data export/deletion, security and billing configuration.

- Settings changes are validated and audited.

- Sensitive owner-only actions require appropriate role and possibly re-authentication.

- Show provider verification and review status.

#### C11.3 Safeguarding and support

Report safety concerns, disputes, complaints, cancellation/refund issues, profile issues and account access problems.

- Support cases have urgency, assignee, status, SLA policy, evidence and closure reason.

- Restrict sensitive case access and audit each view/change.

- Allow platform moderation to suspend listings/accounts and provide appeal workflow.

**Acceptance outcomes**

- A report metric can be traced to its source records and definition.

- Provider settings cannot grant staff broader access than workspace policy permits.

- A safety report can be escalated without exposing the reporter to the reported party.

## 7. Shared platform and cross-app services

### S1. Identity, authorization and workspaces

**Purpose.** Provide one canonical identity and enforce role, workspace, enrollment and consent checks on every operation.

**Traceability.** PP-F01, PP-F04, PP-F05, PP-F18, PP-F21, PP-F27

#### S1.1 Identity

Unique user ID, verified contact methods, recovery, sessions and account status.

- Do not use email/phone alone as a mutable primary key.

- Support linking identities only after verification and conflict handling.

- Define account disabled, suspended, deleted and recovery states.

#### S1.2 Authorization policy

Evaluate role, workspace membership, assignment, enrollment state, consent and record scope.

- Enforce server-side; UI hiding is not authorization.

- Deny by default and minimize data returned to clients.

- Re-check permissions on reads, writes, media access, search and notification deep links.

**Acceptance outcomes**

- Automated policy checks deny access to unrelated children across every API surface.

- Role changes take effect consistently across sessions within defined revocation latency.

- Authorization decisions can be audited without logging unnecessary sensitive content.

### S2. Canonical data model and shared API

**Purpose.** Make both apps interfaces over one shared source of truth.

**Traceability.** PP-F05, PP-F06, PP-F07, PP-F08, PP-F09, PP-F13, PP-F26

#### S2.1 Core entities

At minimum define User, Role, Workspace, Family, GuardianMembership, Child, Provider, StaffMembership, ClassOffering, Batch, Session, TrialRequest, Enrollment, Attendance, Observation, MediaAsset, MessageThread, Invoice, Payment, SupportCase, Consent and AuditEvent.

- Use stable IDs, created/updated timestamps, status, actor and workspace ownership where applicable.

- Represent dated session separately from class recurrence and batch.

- Represent enrollment with start/end/state and guardian/provider relationship.

#### S2.2 API and event contracts

Version API/event contracts for trial.requested, trial.accepted/declined, enrollment.created/ended, session.updated, attendance.saved, observation.published, payment.reconciled and message.delivery.updated.

- Use idempotency keys for retried commands/events.

- Define validation errors, authorization errors, conflict responses and retryable failures.

- Document event owner, payload, ordering expectations and consumer behavior.

**Acceptance outcomes**

- A committed change is visible to both authorized app surfaces from the shared record.

- Duplicate requests/events do not duplicate bookings, attendance, messages, or payments.

- Cross-app data contracts have documented ownership and versioning.

### S3. Notifications and external integrations

**Purpose.** Connect push/SMS/email, media, verification and payment providers with observable delivery state.

**Traceability.** PP-F03, PP-F11, PP-F12, PP-F13, PP-F17

#### S3.1 Delivery orchestration

Route messages and notifications by preference, urgency, template and supported channel.

- Record queued/sent/delivered/failed where channel supports it.

- Retry transient failures safely; avoid duplicate user-visible communications.

- Keep a durable inbox record even when push/email delivery fails.

#### S3.2 Payment integration

Use gateway callbacks, signature verification, idempotency, refunds and reconciliation.

- Never trust client-side success redirect as payment proof.

- Store only permitted transaction references and minimize card/payment data exposure.

- Provide operational reconciliation for delayed/missing callbacks.

#### S3.3 Media and identity verification

Use private object storage and a provider verification workflow.

- Use short-lived access and ownership/consent metadata for child media.

- Keep verification artifacts private and retain only as policy permits.

- Monitor integration outages and expose safe operator queues.

**Acceptance outcomes**

- Provider outages produce visible pending/failed states and recovery queues.

- Callbacks are authenticated and idempotent.

- Sensitive objects cannot be fetched by guessing IDs or reusing expired links.

### S4. Audit, retention and data lifecycle

**Purpose.** Provide durable records of sensitive actions and implement data lifecycle policy.

**Traceability.** PP-F18, PP-F19, PP-F20, PP-F21, PP-F27

#### S4.1 Audit events

Record actor, workspace, action, record, timestamp, reason, old/new state where appropriate, and request correlation ID.

- Append-only for sensitive transitions; ordinary users cannot edit/delete audit entries.

- Protect audit data from unauthorized access and minimize child-content capture.

- Audit attendance corrections, consent, sharing, staff access, payment state, media and moderation.

#### S4.2 Retention and deletion

Define retention by data category and legal/operational requirement.

- Support export, correction, deletion, anonymization, legal hold and account closure paths.

- Deleting one guardian does not accidentally orphan child records or remove another guardian’s authorized access.

- Record completion and exceptions for data requests.

**Acceptance outcomes**

- Sensitive changes have attributable history and cannot be silently overwritten.

- Retention jobs are observable and auditable.

- Account exit revokes access while applying the documented retention rules.

### S5. Safety, moderation and support operations

**Purpose.** Provide workflows and staffing controls to respond to child safety, privacy and marketplace trust issues.

**Traceability.** PP-F18, PP-F20, PP-F27

#### S5.1 Safety and complaint casework

Accept reports from parents, providers and staff; triage urgency; route to trained handlers.

- Limit case access by role and assignment.

- Support suspension, evidence preservation, escalation, response, resolution and appeal.

- Avoid exposing reporter identity or sensitive details beyond operational need.

#### S5.2 Policy and legal review

Maintain policy versions for consent, child data, media, retention, cancellation, refund and provider verification.

- Obtain legal review for India launch and laws/requirements in force at launch.

- Capture version and acceptance timestamp for required terms.

- Treat compliance sign-off as a release gate, not a prototype assertion.

**Acceptance outcomes**

- Urgent safety cases can be escalated and account/provider access can be restricted promptly.

- Policy acceptance can be proven for the relevant user and version.

- Moderation decisions are reasoned, audited and appealable where policy allows.

### S6. Analytics and experimentation

**Purpose.** Measure real customer outcomes with event definitions and data quality controls.

**Traceability.** PP-F14, PP-F22, PP-F25, PP-F26

#### S6.1 Core events

Instrument signup, child created, provider verified, discovery, trial requested/accepted, enrollment started/ended, session attended, update viewed/actioned, payment reconciled and support resolved.

- Attach pseudonymous identifiers, timestamps, workspace and source while minimizing sensitive child data.

- Document event semantics and exclude test/demo data from production measures.

- Monitor missing, duplicate, late and inconsistent events.

#### S6.2 Product outcomes

Report activation, supply, value, retention, commercial reliability and operational quality.

- Define weekly active connected family and cohort windows.

- Distinguish parent value from app opens and coach usage from raw login counts.

- Gate advanced dashboards/experiments on data quality and validated decisions.

**Acceptance outcomes**

- Every published KPI has an owner, numerator, denominator, time window and source.

- Metrics can be reconciled to underlying product events.

- Experiments do not expose children to unsafe or unreviewed experiences.

## 8. Core business rules and state models

| **Object**            | **Minimum states / transition rules**                                                                                                                                   |
|-----------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Trial request         | Requested → awaiting provider → alternate proposed / accepted / declined / expired / cancelled → completed. Capacity reserve/release follows each committed transition. |
| Enrollment            | Pending → active → paused / transferring → ended. Active access depends on role, workspace, consent and enrollment dates.                                               |
| Session               | Scheduled → in progress → completed; or cancelled/rescheduled. Recurrence rule is separate from dated occurrence.                                                       |
| Attendance            | Unrecorded → present / late / absent / excused; correction creates a new audited version.                                                                               |
| Observation/update    | Draft → reviewed → publishing → published / failed → corrected / removed. Audience and consent checked before serving.                                                  |
| Invoice/payment       | Draft → issued → due → pending / paid / failed / disputed / refunded / void. Paid requires verified/reconciled transaction evidence.                                    |
| Provider verification | Draft → submitted → under review → approved / rejected / expired / suspended. Only approved active profiles are discoverable/bookable.                                  |
| Support case          | Submitted → triaged → assigned → in progress → waiting → resolved / closed / reopened. Sensitive case access is scoped and audited.                                     |

## 9. Non-functional requirements

| **Area**       | **Requirement to define and verify before launch**                                                                                                                                            |
|----------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Security       | Server-side authorization on every request; secure sessions; rate limiting; encryption in transit and at rest; secret management; vulnerability review; least privilege; secure media access. |
| Privacy        | Data minimization; purpose limitation; guardian consent; recipient controls; export/correction/deletion; retention schedules; legal review; privacy-safe logs and analytics.                  |
| Reliability    | Durable writes; idempotent commands; observable retries; graceful integration failure; backups and tested recovery; clear service ownership.                                                  |
| Performance    | Set measurable response-time and upload targets after expected usage and device/network profile are agreed; monitor p50/p95 and failure rates.                                                |
| Accessibility  | Readable text, adequate contrast, keyboard/screen-reader support, focus management, non-color status cues, accessible OTP and form errors.                                                    |
| Localization   | Store timestamps in a canonical timezone-aware format; display user-local time; prepare for Indian phone, currency and date formats; confirm languages for launch.                            |
| Compatibility  | Define supported browser, OS, device and low-bandwidth behavior before pilot; verify responsive screens and media upload limits.                                                              |
| Observability  | Structured logs, metrics, traces, delivery queues, audit events and operational alerts with sensitive data minimization.                                                                      |
| Data integrity | Constraints for unique attendance/session/child, capacity, enrollment overlap, payment idempotency and foreign-key relationships.                                                             |
| Supportability | Admin tooling for lookup, resend/retry, reconciliation, case management and access review must be permissioned and audited.                                                                   |

## 10. Prioritization and release gates

### 10.1 Deployment readiness status

**Current assessment on 19 November 2026: tested development candidate; deployment readiness is unverified.** The full-product scope and P0/P1/P2 sequencing remain draft recommendations. Passing automated checks, producing a preview, or merging documentation does not establish that the product is safe or complete to deploy. Current evidence is recorded in [PROGRESS.md](PROGRESS.md), [validation](ai-workspace/validation/VALIDATION.md), [hosted verification](ai-workspace/validation/VERCEL_QA.md), [roster and Parent flow review](ai-workspace/validation/BROKEN_FLOW_QA.md), and the [Parent first-slice requirements](founders/product/PARENT_PRD.md).

Earlier MM commits have strong test evidence: commit `9e2a534` passed full CI, and commit `a401e1a` records 13 passing disposable Supabase service journeys. Those results do not verify the current `MM/Consolidated` head or current production. Independent QA found no CI runs for that exact branch tip, and main contains different runtime files. The current repairs are recorded on `MM/development`, while this product-documentation update is on `MM/Consolidated`. Several deployment-critical journeys and operational controls remain unverified. Current branch policy permits MM development on `MM/development` and requires a separate explicit owner instruction for main promotion or release.

The practical next release target, if founders approve it, is a narrowly scoped invitation-only Coach and Aurora Parent pilot using the currently implemented, verified connection and reviewed-feedback flows. Phone OTP, public marketplace/trials, multi-guardian expansion, payment collection, and broad public launch are not part of that recommendation until their product, legal, operational and technical gates are approved.

### 10.2 Release stages

| Stage | Intended audience | Entry condition | Exit evidence |
| --- | --- | --- | --- |
| Development | Product team and fictional test data | Change is on the authorized working branch with its feature and privacy boundaries recorded. | TypeScript, unit, browser, database and export checks pass for the affected change; failures and skipped coverage are recorded. |
| Preview validation | Named internal testers using a protected preview and approved test accounts | Preview is built from the exact reviewed commit; target project, backend and data environment are confirmed. | Parent and Coach browser journeys pass against the preview; no cross-family, cross-academy or cross-child disclosure; failures/retries preserve accurate state; preview source/build identity is recorded. |
| Invited pilot | Explicitly invited families and providers in the approved geography | Founders approve scope, pilot cohort, consent/legal copy, support coverage and operational owner. Required live backend and device checks pass. | End-to-end real-account acceptance passes for sign-in/recovery, child linking, class/session, feedback review, media consent where enabled, access removal, support and recovery. Pilot measures have owners and a review date. |
| Public production | Intended public customer population | Pilot exit review accepts safety, reliability, support and commercial evidence; production change is approved and rollback is rehearsed. | Exact production build and configuration are recorded; post-deploy smoke, error monitoring, support escalation and rollback readiness pass. |

Promotion must use the same reviewed source and a clearly identified target environment. Preview success is not production acceptance. A release checklist must link each release-blocking requirement to a passing test or documented owner decision, name the responsible person, and record build/commit, environment, observed result and remaining risks.

### 10.3 Required go/no-go gates

Do not approve an invited pilot or public release until each applicable gate has evidence for the exact candidate and intended environment.

| Gate | Required evidence before go | Current status from repository evidence |
| --- | --- | --- |
| Product scope | Founder-approved MVP, audience, geography, supported client platforms and explicit included/deferred feature IDs. | **Open.** Full-product scope and P0/P1/P2 sequence remain draft recommendations. |
| Identity and account recovery | Real sign-up/sign-in, email delivery/recovery, expired/invalid link, restart, sign-out and account reuse across intended roles. | **Partial.** Prior hosted/settings and owner-reported checks exist; fresh real-account recovery and full role-workspace acceptance remain open. |
| Authorization and child safety | Two-family/two-child and cross-provider tests on the release backend; verified guardian connection; revocation; staff role limits; no stale-access path. | **Partial.** Disposable local Supabase runs pass core isolation journeys. Real hosted app/account authorization acceptance and guardian expansion decisions remain open. |
| Core Parent–Coach journey | With fictional accounts on the exact release candidate, verify sign-in/recovery, explicit selection of the child when claiming an invitation, separate Coach approval, child-only reviewed feedback, sibling/outsider denial, pending-request coexistence and disconnect revocation. | **Not accepted.** Browser fixtures and disposable-service journeys exist on earlier commits; full hosted app-to-service acceptance for the current candidate is absent. |
| Data and media | Save/reopen/retry, media consent by purpose and pictured child, private access expiry, withdrawal, deletion/retention, backup and restore verified. | **Partial.** Consented media and local service journeys have coverage; retention cleanup, full deletion/restore and real hosted access remain open. |
| Reliability and recovery | Targeted outage, timeout, conflict, duplicate, capacity, queue retry and rollback scenarios pass; service targets and alert ownership are agreed. | **Open.** Some idempotency/concurrency paths pass automated tests; production targets, full operational monitoring, load and restore evidence are not established. |
| Client acceptance | Supported browser/OS/device list; responsive, accessibility and low-bandwidth checks; physical device flows for release platforms. | **Open.** Earlier CI includes web/Android exports and browser suites, but exports do not establish physical-device acceptance; hosted browser journey evidence for the latest candidate remains open. If Android is in pilot scope, require installed-device login, recovery, restart/storage and linked-family checks. |
| Legal, privacy and support | Geography-specific legal/privacy review, consent and retention copy, support escalation, safeguarding/dispute handling and data-subject request process. | **Open.** Prototype and draft requirements identify these needs; operational/legal sign-off is not recorded. |
| Billing and commercial controls | If billing is in scope, approved commercial model, provider eligibility, server verification, reconciliation, refund/dispute handling and test/live separation. | **Deferred/open.** Fee collection is shelved in current Coach direction; do not enable payment collection until separately approved and accepted. |
| Release operations | Protected target, reviewed production configuration, secret ownership, backup/restore, rollback rehearsal to a known artifact, change owner, post-deploy smoke and incident response. | **Open.** Existing Vercel preview/hosted checks do not establish the deployed source for the exact current candidate, a rehearsed rollback, backup/restore, or operational readiness. |

Additional current release blockers: investigate the reported possible live child-link mismatch and missing batches before including affected families. Do not inspect or change private records without an authorized, bounded account review. Actual-service attendance/classes/fees, media consent and expiry, load/recovery, and legal/support operations remain unaccepted where those capabilities are in scope. Keep private SQL candidates `015–021` inactive unless a separately approved staging and migration/rollback plan exists.

**Go/no-go rule.** A failed or unrun applicable gate is not a pass. Record a no-go when authorization, child safety, consent, data integrity, recovery, support, or exact-build/environment identity is uncertain. A founder may approve a narrower pilot by explicitly deferring features, but may not waive applicable safety, privacy, or legal obligations.

### 10.4 Deployment acceptance record

For every candidate release, attach a concise record with:

- Candidate commit, app version, build artifact hash, deployment URL and target environment.
- Backend project/environment and installed migration versions, verified without exposing credentials.
- Scope and feature IDs included, deferred and disabled.
- Results for automated, hosted browser, real-service, device, authorization, accessibility, backup/restore and security checks, with links to evidence.
- Open defects with severity, owner and disposition; support/on-call contact and incident path.
- Rollback target, rehearse result, data-recovery limits and post-release monitoring window.
- Named decision owner and dated go/no-go decision.

No PRD or CI result alone authorizes production deployment, live database changes, payment activation, real parent messaging, or release expansion. Those actions require the applicable explicit owner approval and environment-specific verification.

| **Phase**                              | **Scope**                                                                                                                                                                                                                | **Exit gate**                                                                                                                                                                      |
|----------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| P0 — Foundation and launch-critical    | PP-F01, F02, F04–F07, F11, F18, F26–F27; identity, family/provider workspace, enrollment/permissions, shared API/model, consent/privacy baseline, trial booking, secure media model, support path and connected journey. | A real parent can sign in, add child, request a trial; provider accepts; enrollment and access are correct; test update reaches only authorized guardian; no false success states. |
| P1 — Dependable operations             | PP-F03, F08–F13, F15–F16, F19–F21, F23; provider verification, dated schedules, attendance, updates, messaging, payment reconciliation, support, audit, parent prep/recovery and account controls.                       | Pilot providers can run classes and correct records; parents receive reliable updates; billing and schedule exceptions reconcile; support and access revocation work.              |
| P2 — Validated growth and optimization | PP-F17, F22, F24–F25; marketplace expansion, advanced analytics, gamification/AI decisions, pricing experiments, deeper integrations.                                                                                    | Demand, provider quality, unit economics and repeat value justify added complexity; metrics pass quality checks.                                                                   |

The sequence is a recommendation, not a founder-approved commitment. Feature IDs retain their audit priority meanings; module dependency and release sequencing may group IDs across priorities when a safe working journey requires it.

## 11. Success measures

| **Measure**                          | **Definition / decision use**                                                                                                |
|--------------------------------------|------------------------------------------------------------------------------------------------------------------------------|
| Weekly active connected families     | Family has active provider enrollment and at least one meaningful class-related or family-development interaction in a week. |
| Signup to first child                | Share of verified parent accounts completing family and child setup; diagnose onboarding friction.                           |
| Signup to first enrollment           | Time and conversion from verified account to first active enrollment.                                                        |
| Verified supply                      | Active, reviewed providers with available, eligible classes by location/subject.                                             |
| Trial conversion                     | Requested → accepted → attended → enrollment conversion, with expiry/decline reasons.                                        |
| Coach operational adoption           | Share of completed sessions with attendance recorded within the agreed period.                                               |
| Useful update rate                   | Share of eligible sessions with a permission-checked coach update and parent view/action.                                    |
| Four-week connected-family retention | Share of activated families still completing a meaningful interaction in week four.                                          |
| Cross-app consistency                | Rate of divergent/missing states for trial, enrollment, schedule, attendance, update and payment events.                     |
| Payment reliability                  | Successful verified/reconciled transactions and time to resolve unmatched transactions.                                      |
| Safety/support quality               | Case response/resolution time, access revocation time, repeat complaint and moderation outcomes.                             |

Every metric needs an owner, numerator/denominator, date window, data source, exclusion rules, and minimum sample policy. Do not set targets until a baseline and pilot cohort are defined.

## 12. Open product decisions

- Positioning: family development companion, class marketplace, or connected coach–parent operating platform. Current recommendation is to lead with the connected experience and keep Together as a differentiator.

- Initial provider segment and geography; independent tutors/small academies are the current assumption.

- Commercial model: provider subscription, transaction fee, parent payment flow, or combination; pricing remains unvalidated.

- MVP boundary for provider verification, marketplace discovery, messaging and payments.

- Supported client platforms, offline expectations, notification channels and launch languages.

- Guardian authority model, caregiver permissions, provider staff roles and dispute/appeal policy.

- Applicable legal requirements, consent language, retention periods, age rules and operational escalation model.

- Whether to permit parent-controlled development-history sharing beyond the current enrollment and which exact data categories can be shared.

## 13. Assumptions, dependencies and risks

| **Type**   | **Item**                                                                  | **Implication**                                                                           |
|------------|---------------------------------------------------------------------------|-------------------------------------------------------------------------------------------|
| Assumption | Initial provider focus is independent tutors/small academies.             | Validate workflows and permissions with actual providers before final scope.              |
| Dependency | Shared backend, identity, media storage, notifications and payments.      | Both apps cannot ship as a connected product until contracts and ownership are agreed.    |
| Dependency | Provider verification and support operations.                             | Marketplace quality requires people/process as well as UI.                                |
| Risk       | Child data/media exposed through incorrect recipient or stale enrollment. | Consent checks and relationship-based authorization are release blockers.                 |
| Risk       | False success for reschedule, message, payment or booking.                | UI must reflect durable service state; failure states and retry ownership are required.   |
| Risk       | Metrics appear precise despite sample or fixed data.                      | Metric definitions, source drill-down and data quality gates are required.                |
| Risk       | Commercial/payment policy unresolved.                                     | Avoid building irreversible billing assumptions before founder decision and legal review. |
| Risk       | New feature scope expands before core loop works.                         | Defer AI, gamification and featured listing investment pending measured demand.           |

## 14. Feature ID traceability

The PP-F IDs below are stable identifiers shared with the audit document and the Parent and Coach/Tutor HTML prototypes. The PRD turns each mapped gap into product scope. A feature ID marks traceability; it does not mean that the corresponding production capability is already implemented.

| **Feature ID** | **Audit gap / requirement**                                                    | **PRD coverage**                                              |
|----------------|--------------------------------------------------------------------------------|---------------------------------------------------------------|
| PP-F01         | Identity, OTP sign-in, existing-account detection and recovery                 | Parent onboarding; Coach provider onboarding; shared identity |
| PP-F02         | Parent household, child profile, goals and progressive onboarding              | Parent family workspace                                       |
| PP-F03         | Provider setup and verification                                                | Coach onboarding; Parent provider trust details               |
| PP-F04         | One identity with parent/provider roles and workspaces                         | Parent role switch; Coach workspace/team                      |
| PP-F05         | Enrollment relationship and guardian/provider access                           | Parent trial/enrollment; Coach roster; shared authorization   |
| PP-F06         | Shared backend, API and canonical data model                                   | Shared platform architecture                                  |
| PP-F07         | Real trial request, capacity, response and confirmation                        | Parent Explore; Coach trial queue                             |
| PP-F08         | Dated schedules, recurrence and durable exceptions                             | Both calendars and schedule management                        |
| PP-F09         | Attendance per dated session and correction history                            | Coach attendance; Parent timeline                             |
| PP-F10         | Feedback, skills, milestones, home activities and snippets                     | Coach update composer; Parent progress                        |
| PP-F11         | Secure media upload and recipient controls                                     | Coach updates; Parent media/privacy                           |
| PP-F12         | Persistent messages, announcements and delivery state                          | Both inboxes; Coach communication                             |
| PP-F13         | Invoices, verified payments, reconciliation, refunds and receipts              | Both fee views; shared ledger                                 |
| PP-F14         | Defined metrics and actionable queues from reliable records                    | Both dashboards and insights                                  |
| PP-F15         | Parent next action, all-provider classes, weekly prep and recovery             | Parent Home/calendar; Coach schedule interface                |
| PP-F16         | Evidence-based progress and parent-controlled history sharing                  | Parent progress; Coach observations                           |
| PP-F17         | Marketplace search, eligibility, transparent terms and verified reviews        | Parent Explore; Coach public profile                          |
| PP-F18         | Child privacy, guardian consent, retention and legal safeguards                | Both privacy controls; shared policy                          |
| PP-F19         | Audit history for attendance, access, posts and payments                       | Both histories; shared audit service                          |
| PP-F20         | Support, disputes, complaints, cancellations, refunds and suspension           | Both support entry points; operations                         |
| PP-F21         | Account, consent, privacy, notification, export and deletion settings          | Both settings experiences                                     |
| PP-F22         | Validate or defer AI, gamification, featured listings and complex analytics    | Both roadmap/feature map                                      |
| PP-F23         | Validate provider subscription, transaction fee and billing lifecycle          | Coach billing; Parent payment implications                    |
| PP-F24         | Founder decisions: positioning, first customer, MVP and shared ownership       | Product governance                                            |
| PP-F25         | Measure acquisition, activation, supply, value, retention and reliability      | Shared analytics                                              |
| PP-F26         | End-to-end acceptance, pilot gates and cross-app reliability                   | Shared release plan                                           |
| PP-F27         | Multiple guardians/children/providers, transfer, staff changes and offboarding | Both family/workspace lifecycle                               |

## Appendix A. Minimum cross-app acceptance scenarios

| **Scenario**          | **Expected outcome**                                                                                                   |
|-----------------------|------------------------------------------------------------------------------------------------------------------------|
| Account reuse         | A parent who adds a tutor role signs into both workspaces with one identity; data and menus remain role-scoped.        |
| Guardian invitation   | Second guardian accepts an invitation; access is limited to selected children and can be revoked.                      |
| Trial capacity race   | Two requests compete for the final place; only one can be accepted and the other receives a correct conflict outcome.  |
| Trial alternate       | Provider proposes another slot; parent must confirm; both calendars update only after confirmation.                    |
| Enrollment end        | Family exits provider; future roster and message access are revoked; allowed history remains under retention rules.    |
| Attendance correction | Coach records attendance then corrects it with reason; parent history and audit reflect the correction.                |
| Media consent         | Coach attempts upload with media consent off; system blocks sharing and explains how the guardian can grant consent.   |
| Group update audience | A group update contains no unrelated child detail and is delivered only to authorized guardians.                       |
| Schedule failure      | A reschedule service fails; provider and parent continue to see prior committed schedule and receive no false success. |
| Payment callback      | Duplicate/late payment callbacks reconcile once; parent receipt and provider ledger match.                             |
| Notification outage   | Push delivery fails; durable inbox item remains, failure is visible, and retry does not duplicate the message.         |
| Provider suspension   | Suspended listing is not discoverable/bookable; open enrollments follow a reviewed safety and support plan.            |

## Appendix B. Definition of ready and definition of done

### Definition of ready

- User/problem and affected role are identified.

- Feature ID and source gap are linked.

- State changes, authorization and consent requirements are specified.

- Failure, retry, edge and support paths are included.

- Analytics and privacy impact are identified.

- Dependencies and unresolved founder/legal decisions are visible.

### Definition of done

- Acceptance criteria pass across parent and provider roles.

- Server-side authorization, consent, audit and data lifecycle rules are implemented.

- Loading, empty, error, retry and stale states are handled.

- Cross-app source records reconcile; duplicate delivery and concurrency are handled.

- Accessibility, supported devices, security and privacy checks meet agreed gates.

- Operational dashboards, support playbooks and release notes are ready.

- Pilot owners review real journey evidence before expanding rollout.

## Source basis and boundary

This PRD is derived from the Parent Plus Complete Product Audit and GPT Handoff document and the mapped Parent App and Coach/Tutor HTML prototypes available on 19 November 2026. The PRD is a detailed product specification draft. It does not establish that any prototype feature is live, decide unresolved commercial or legal questions, or replace technical architecture, data protection review, UX design, API contracts, or an implementation-level test plan.
