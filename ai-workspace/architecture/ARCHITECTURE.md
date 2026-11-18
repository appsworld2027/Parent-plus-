# How Parent Plus Coach works today

**Owner direction, 17 November 2026:** current deployment and product acceptance use the Expo web app on Vercel. Automated tests remain in GitHub Actions; deployed preview and browser acceptance use Vercel. APK build, installation, emulator and device-test workflows are retired. Historical APK artifacts and records below are not current release steps.

The current database compatibility model still differs by branch: AM branches target APVerse, while non-AM branches remain on MM until each feature adapter and complete regression pass. Read [the live comparison](LIVE_DATABASE_COMPARISON.md), [the target design](CONSOLIDATED_DATABASE_DESIGN.md) and [PROGRESS.md](../../PROGRESS.md) before treating a proposed workspace/Parent flow as live.


Reviewed: 15 November 2026. Current candidate0.8.0 uses the Cloud Vision flow appended below; earlier module descriptions are historical. Feature development has resumed; this describes existing code, including work whose live deployment is still pending. [Progress and acceptance](../../PROGRESS.md) is the status record; [PRD](../../PRD.md) defines the intended product.

## 1. The whole system

```mermaid
flowchart TD
    Coach["Coach using mobile or desktop browser"] --> Vercel["Vercel-hosted Expo web app"]
    Vercel --> UI["App screens: login, academy setup, roster, classes, attendance and observations"]
    UI --> Client["Supabase client: public project settings + signed-in session"]
    Client --> Auth["Supabase Auth: account, email verification, login"]
    Auth --> Email["Confirmation or recovery email to the coach"]
    Email --> Link["Coach opens the link on the same phone"]
    Link --> Client
    Client --> API["Supabase database API and database functions"]
    API --> Rules["Server ownership checks, access policies and data constraints"]
    Rules --> DB["Supabase PostgreSQL: academy and private app records"]
    DB --> API
    API --> UI
    Client --> Store["Phone SecureStore: saved session, verifier, diagnostics, one attendance draft and one private observation draft"]
    Developer["Developer edits source and tests"] --> Git["GitHub: source, plans, tests and migrations"]
    Git --> Actions["GitHub Actions: automated quality checks"]
    Git --> Preview["Vercel branch preview"]
    Actions --> Preview
    Preview --> Browser["Hosted browser acceptance"]
```

The hosted app talks directly to Supabase over HTTPS; it does not need a running laptop or Codex session. GitHub stores source and runs automated checks; Vercel hosts the web deployment. Branch preview availability and Supabase environment correctness must be verified independently. No custom application server or payment integration is deployed yet.

The roster paths require migration 002; classes/attendance require migrations 003/004. The owner has confirmed versions 001–004 installed through the filtered version query; app/API and device acceptance remain pending. Email receipt/login are owner-reported; the 0.2.1 crash repair is not yet phone-verified.

[Open the rendered system diagram](../validation/images/system-flow.png). It is a snapshot generated from the first Mermaid block above; refresh it when that flow changes.

## 2. What is stored where

| Location | Contents | Important limit |
| --- | --- | --- |
| GitHub development branch | App source, plans, SQL migrations, automated tests, fictional screenshots | Never store private student records or privileged credentials here |
| GitHub Actions | Automated check results and test evidence | A green CI result does not prove hosted provider or real-user behavior |
| Vercel | Web build and branch/production deployments | Verify the exact deployment and run hosted browser acceptance |
| Supabase Auth | User identities and authentication sessions managed by the provider | An academy contact record does not create a parent login |
| Supabase PostgreSQL | Academy, students, contacts, batches and enrolments; schema also exists for later modules | Table existence does not mean the feature is implemented |
| Android SecureStore | Session/verifier, bounded safe diagnostics, one attendance draft and one private observation draft through chunked adapters | Observation drafts include private note text; attendance drafts hold scoped IDs/statuses. No full offline roster cache |
| App memory | Current form entries, loaded records and current screen; diagnostic fallback when storage fails | Student/class-edit drafts are not durable; attendance is durable only after device-save confirmation |
| Web browser sessionStorage | Web sessions, diagnostics and private drafts through the same storage adapter | Reload tests do not validate Android SecureStore or persistence after closing the browser tab |

The public URL and publishable key in `config/public-client.json` are bundled client configuration. Database security depends on verified user identity, privileges, policies and constraints. A public key is not an owner/service-role credential. No service-role, SMTP, gateway or production-signing secret belongs in the client.

## 3. App startup and screen decisions

```mermaid
flowchart TD
    Start["Open app: index.ts installs native crypto support"] --> Root["App.tsx: safe-area provider + error boundary + FeedbackProvider + AuthProvider"]
    Root --> Session["Restore stored session and subscribe to auth events"]
    Session --> Gate["AuthGate chooses a screen"]
    Gate -->|"Loading session or academy"| Loading["Opening your workspace"]
    Gate -->|"No session"| Login["Login / registration / recovery form"]
    Gate -->|"Recovery session"| Password["Choose a new password"]
    Gate -->|"Session needs validation"| User["Verify user with Supabase and load owned academy"]
    User -->|"Verification or network error"| Retry["Reconnect / verify email / sign out"]
    User -->|"No academy yet"| Setup["Enter owner and academy name; create_academy RPC"]
    Setup --> User
    User -->|"Academy available"| Home["AppContent: Today and navigation"]
    Home --> Students["Students / batches management"]
    Home --> Support["Support and sanitized report export"]
    Home --> Classes["Schedule: dated classes and attendance"]
    Home --> Notes["Post: private observations, device drafts and workspace history"]
    Home --> Fees["Fees: monthly invoices and manual-payment history"]
```

File responsibilities:

- `index.ts`: installs crypto support before the auth client is imported, then registers the app.
- `App.tsx`: wraps providers, displays the workspace/navigation, and guards leaving feature forms with pending edits or writes.
- `src/auth/AuthProvider.tsx`: owns session/academy state, validates the user, handles email links and native refresh lifecycle.
- `src/auth/AuthGate.tsx`: renders the appropriate form, loading/error state, onboarding or workspace. It is a UI gate, not the database security boundary.

Development/test builds also allow **Explore interface preview**. That branch renders the shell without loading a real academy/roster. It grants no database permissions. Unknown/unset app environments default to production, hiding developer controls.

## 4. Registration, login and recovery

```mermaid
sequenceDiagram
    participant Coach
    participant Form as AuthGate forms
    participant SDK as Supabase SDK + storage adapter
    participant Auth as Supabase Auth
    participant Inbox as Coach email
    Coach->>Form: Submit registration or recovery request
    Form->>Form: Validate inputs, block repeat presses while busy
    Form->>SDK: signUp or resetPasswordForEmail
    SDK->>SDK: Generate PKCE verifier/challenge, save verifier on this device
    SDK->>Auth: Send email request with approved callback URL
    Auth->>Inbox: Send confirmation or recovery link
    Auth-->>SDK: Request result
    SDK-->>Form: Request result
    Form-->>Coach: Neutral confirmation message, errors show safe reference
    Coach->>Inbox: Open newest link on same device
    Inbox->>Auth: Verify emailed link
    Auth-->>Coach: Redirect to app callback with one-time code
    Coach->>SDK: App Linking handler exchanges code using saved verifier
    SDK->>Auth: exchangeCodeForSession
    Auth-->>SDK: Session or error
    SDK->>SDK: Save session through storage adapter
    SDK-->>Form: Auth event, validate user and load owned academy
```

PKCE binds the code exchange to the device that requested the link. The app accepts its own `parentplus-coach://auth/callback` and `/recovery` routes, or matching local web routes. It does not trust access tokens supplied in arbitrary URLs. The callback error path asks for a fresh link instead of logging codes/tokens.

Email/password sign-in uses `signInWithPassword` and then the same session/academy validation. Recovery displays a password-update form; it does not enter the normal workspace first. A registration success message is neutral so it does not reveal whether someone else's account exists.

Native session storage writes bounded ASCII chunks and commits a manifest after the new chunks exist. The previous committed session is retained if a write fails; old chunks are cleaned after commit. Writes are serialized. Device lock/storage failures remain possible and need real-device testing. Native foreground/background events start/stop token auto-refresh.

On sign-out, the app uses local-session sign-out, clears its loaded academy and diagnostics, and removes saved session state through the SDK. This action is not account deletion or a command to log out every other device.

Version 0.2.1 uses `role="status"` with a polite live region for success notices. `accessibilityRole="status"` is rejected by the installed Android implementation even though browser/type checks previously accepted it. See [ANDROID-001](../validation/ISSUES.md).

## 5. Loading and saving the roster

```mermaid
flowchart TD
    Open["Open Students with an owned academy"] --> Load["loadRoster: students + primary contacts + batches + enrolments"]
    Load -->|"All requests succeed"| List["Show roster; filter/search in memory"]
    Load -->|"Missing migration or request error"| LoadError["Show setup/retry error; do not invent an empty roster"]
    List --> Edit["Open form; reuse existing UUID or create one new UUID"]
    Edit --> Draft["Edit in-memory draft; guard unsaved navigation"]
    Draft --> Validate["Validate form; disable controls while saving"]
    Validate -->|"Student"| RPC["save_student database function"]
    Validate -->|"Batch"| Batch["Batch upsert protected by database policies"]
    RPC --> Check["Validate owner, student, batch membership and input"]
    Check --> Transaction["Save student + primary contact + added enrolments atomically"]
    Transaction -->|"Any error"| Keep["Roll back; preserve form for retry using same UUID"]
    Transaction -->|"Success"| Refresh["Close form, show notice and reload roster"]
    Batch --> Refresh
    Batch -->|"Error"| Keep
    Keep --> Validate
```

Code path: `RosterScreen.tsx` (forms/state) → `model.ts` (validation and money parsing) → `service.ts` (SDK queries/RPCs) → migration 002 (trusted transaction).

The service's academy filters narrow queries; server policies remain responsible for authorization. The four roster reads are not one database snapshot. A request error fails the combined load, rather than showing partial data as a trustworthy complete roster. On a failed refresh, previously loaded data may remain visible with the error; the new combined result is not committed. A version counter prevents an older request overwriting a newer result or writing after unmount.

A new student UUID is generated when opening the form and retained for retries. The database serializes writes for that UUID. If a response is lost after the commit, retry updates the same identity instead of creating a second student. This is retry protection, not an offline sync queue.

`save_student` validates ownership explicitly because it is a privileged database function with a restricted search path. The student, primary guardian contact and new enrolments commit together. Migration 002 revokes direct client inserts/updates to those three tables; batches still use ordinary policy-protected writes. Archiving uses a separate owner-checked function and retains history. It is not deletion.

Enrolment editing is additive. Existing memberships are retained; moving/ending/reactivating enrolments is deferred. A blank guardian name clears the primary contact if validation permits it; it does not delete unrelated contacts. Saving contact details sends no invitation or notification.

Money is parsed as integer paise from decimal text. For example, ₹2,500.50 becomes 250050 paise. A batch's default fee is not an invoice or a payment.

## Classes and attendance flow — migrations 003/004

```mermaid
flowchart TD
    Date["Choose date in academy timezone"] --> List["Load real sessions and roster context"]
    List --> Edit["Create / edit / cancel via save_class_session"]
    Edit --> Protected["Ownership and batch checks; protect timing after attendance"]
    Protected --> List
    List --> Open["Open attendance: load server revision and saved marks"]
    Open --> Compare["Compare this owner's device draft with server context"]
    Compare -->|"Changed revision or class"| Choice["Explicitly choose server records or review device draft"]
    Compare -->|"Matching context"| Marks["Mark present / late / absent or mark all"]
    Choice --> Marks
    Marks --> Local["Save one scoped draft on this device; show unsent status"]
    Local --> Submit["Coach explicitly saves to class"]
    Submit --> Server["save_class_attendance_checked: verify revision and complete roster; atomic write"]
    Server -->|"Confirmed"| Done["Advance revision; clear device draft; Today reads saved records"]
    Server -->|"Error or lost response"| Read["Read server state to reconcile; never auto-overwrite"]
    Read -->|"Desired marks already saved"| Done
    Read -->|"Not confirmed"| Keep["Keep device draft; reconnect and compare"]
```

Code: `ClassesScreen.tsx` owns screen/form state; `model.ts` converts academy wall time, validates classes and selects students enrolled on the local class date; `service.ts` calls Supabase; `drafts.ts` validates and serializes the device draft. `TodayClasses.tsx` queries current sessions rather than inventing figures.

Times are stored as UTC timestamps, entered/displayed in the academy IANA timezone. Invalid dates, non-positive durations, daylight-saving gaps and repeated ambiguous times are rejected. The current form supports years 2000–2100.

One active attendance draft is stored per device, scoped to owner/academy/session, with marks, server revision and a class fingerprint. No names or contacts are copied into that draft. A different class cannot silently replace it; explicit discard/resume is offered. It survives restart only if the write completed and storage remains available.

On reopen, the app verifies server context before restoration. Changed class/revision requires a choice. A save locks the class and checks its canonical date/batch/status fingerprint, expected attendance revision, all currently eligible students and the existing attendance constraints. A stale save is rejected; only uncertain network outcomes trigger a read-only comparison against the complete refreshed roster and an advanced revision. An explicit server rejection remains an error even if an older saved subset matches. Student/enrolment changes can require review; this is not a multi-device automatic merge.

Clients cannot directly insert/update classes or call the old attendance function after migrations 003/004. Trusted functions validate ownership. Cancelling retains history and blocks further attendance writes; recorded attendance prevents timing/batch edits. Room/status edits remain possible.

## 6. Current data relationships

Relationships below describe migration 001 plus the prepared 002/003/004 changes. The owner has now confirmed versions 001–004 installed; actual app/API acceptance remains pending.

```mermaid
erDiagram
    AUTH_USER ||--o| PROFILE : has
    AUTH_USER ||--o| ACADEMY : owns
    ACADEMY ||--o{ STUDENT : contains
    ACADEMY ||--o{ BATCH : contains
    STUDENT ||--o{ CONTACT : has
    STUDENT ||--o{ ENROLMENT : joins_through
    BATCH ||--o{ ENROLMENT : receives
    BATCH ||--o{ CLASS_SESSION : schedules
    CLASS_SESSION ||--o{ ATTENDANCE : records
    ENROLMENT ||--o{ ATTENDANCE : qualifies
```

One academy is owned per account in this version. Migration 002 permits at most one primary contact per student. Composite foreign keys prevent a child, batch and enrolment being connected across academies. Current enrolment uniqueness is per academy/student/batch pair, not a history of repeat enrolment periods.

Migration 003 adds attendance revisions and trusted class/attendance writes to `class_sessions` and `attendance`; the corresponding app workflows are implemented and their installed versions are owner-confirmed; real app/API acceptance is pending. `observations` and `observation_recipients` now have Module 5 workflows, with private `observation_versions` added in migration 005 (deployment pending). `fee_invoices` and `fee_payments` now have Module 6 invoice/manual-payment workflows, requiring migration 006 (deployment pending). Gateway webhook/event processing is not implemented.

## 7. Errors and diagnostics

```mermaid
flowchart LR
    Action["Form / network operation fails"] --> Safe["Known safe message + generated reference"]
    Safe --> Visible["Fixed in-app result notification outside page scrolling"]
    Safe --> Buffer["Bounded validated diagnostics: device persistence with in-memory fallback"]
    Buffer --> Inspect["Coach explicitly prepares a support report"]
    Inspect --> Share["Native share sheet or selectable web report"]
    Render["React screen-render error"] --> Boundary["ErrorBoundary: recoverable screen"]
    Boundary --> Buffer
    Native["Native crash / OS termination"] -. "coverage gap" .-> Missing["No persistent native crash reporting connected"]
```

Raw exceptions, form contents, email links and tokens are not added to reports. Reports retain only allowed codes/references/time/build/action. Reports now persist through the device adapter when available. On restoration, unknown fields and events older than 14 days are discarded; the buffer is bounded to 30 records. Sign-out clears reports and the attendance/observation device drafts. Storage failures keep diagnostics in memory and expose an unavailable-storage status. Writes are best-effort and an abrupt termination can interrupt a pending write. Error boundaries cover React rendering, not every native failure or asynchronous rejection. They must not be represented as comprehensive crash monitoring.

UI guards preserve edits during handled failures and block navigation while saves are pending. Student and class-edit forms are in memory. Attendance marks persist only after the device draft confirmation. A restart needs network access to validate the class before restoring attendance; full offline roster/schedule editing and automatic sync are not implemented.

See [action feedback](../features/ACTION_FEEDBACK.md) for the 0.3.1 notification path. Success/info/error notices reserve a fixed row outside scrolling; device-draft messages explicitly do not assert a class save. Notice text remains in UI memory, separate from persisted enumerated diagnostic metadata.

## 8. Code-to-Vercel delivery

```mermaid
flowchart TD
    Code["Developer changes code and scenarios"] --> Local["Run lint, types and unit/database checks"]
    Local --> Git["Push to authorized AM branch"]
    Git --> CI["GitHub Actions: automated checks and evidence"]
    Git --> Preview["Vercel: branch preview build"]
    CI --> Gate{"Required checks pass?"}
    Gate -->|yes| Browser["Run hosted browser scenarios on exact preview"]
    Gate -->|no| Fix["Repair and repeat the loop"]
    Browser --> Gate2{"Product and security acceptance?"}
    Gate2 -->|yes, with release approval| Production["Promote/deploy through Vercel"]
    Gate2 -->|no| Fix
    Fix --> Local
```

This is the current web deployment path. GitHub CI and Vercel builds are separate checks; a passing app test does not prove that a protected preview is accessible or connected to the right Supabase project. Confirm the exact preview URL, branch and project target before hosted acceptance. APK and emulator steps are retired.

## 9. What is deliberately outside the current working flow

Post implements private observations and drafts; see [its flow and recovery rules](../features/OBSERVATIONS.md). Migration 005 is prepared but not deployed. Fees implements monthly invoices and manual payment records; see [its workflow](../features/FEES.md). Schedule now manages classes and attendance; Today queries actual dated sessions and counts classes with an attendance save. It does not claim every later roster change has been reconciled, and fee/observation dashboard figures are not implemented. There is no payment checkout, verified-payment backend, parent login/invitation, WhatsApp login, or parent-notification delivery. The larger parent app is deferred. Refer to [PROGRESS.md](../../PROGRESS.md) before planning new work.

## Module 5: observations

See [the complete observation flow](../features/OBSERVATIONS.md#data-flow-and-recovery). The screen validates inputs and persists one scoped device snapshot, then explicitly calls `save_observation`. The function checks academy ownership, revision, batch/class and enrolments; one transaction writes the note, fixed recipient set and private version. Recorded scope cannot be changed. Exact retries return the existing version. Restart compares the snapshot with server state; conflicting text is copied only by an explicit new-draft action. Sign-out invalidates queued observation writers before removing device copies. No parent delivery exists.

## Monthly invoices and manual-payment ledger — 0.5.0

Fees now implements FEE-01; see [workflow, recovery and owner update](../features/FEES.md). The screen calls trusted operations to create an invoice from a reviewed current batch fee, record a manual receipt, reverse a mistaken manual record, or void an invoice without active payments. Invoice amounts, names and original payment rows are retained; corrections add attributable history. Only one active invoice exists per enrolment/month. Voiding permits a replacement while preserving the old record.

The app persists an immutable, account/academy-scoped pending request before calling the API. Unknown outcomes freeze that request until an exact retry confirms it; failed device persistence prevents sending it. Resolved requests are cleared. These recovery records intentionally survive sign-out for the same account; ordinary unsent fee form edits remain in memory with navigation guards. Financial references/reasons never enter diagnostics.

Migration 006 serializes billing mutations per owned academy. The RLS-protected invoker view computes real received, test, outstanding and excess amounts from unreversed ledger entries; `get_fee_invoice` returns a consistent detail snapshot. Test gateway money cannot settle a real invoice. No payment-link service, provider credentials, webhook verification, online collection or refunds are implemented. Migrations 005/006 are prepared, not confirmed deployed. The parent app and native/live acceptance remain separate gates.


## Coach workflow correction —0.6.0

[The workflow review](../validation/COACH_WORKFLOW_REVIEW.md) maps the owner-required journeys. Roster pages now expose current batch membership and create/add students from either entry point. `add_batch_students` mutates only membership, leaving profile/contact data intact. Fees computes the full month's eligible and issued-charge summaries from paged RLS reads before batch/student drilldown. `collect_student_fee` creates a trusted missing charge and receipt in one academy-serialized transaction; exact-request recovery is shared with the existing ledger. Invoice history/corrections remain secondary.

Private profile and observation media use `coach_photos` metadata and the private parentplus-coach-photos bucket. Storage policies validate the owned academy/entity path; metadata references storage.objects by foreign key. `attach_coach_photo` locks its entity and storage reference, compares the prior path, and forbids changing recorded media. The client uses short-lived signed URLs and image-only selection. Updates007/008 are prepared, not deployed; existing001–006 must not be repeated.

## 0.7.0 register onboarding

The scanner is the first custom server feature: authenticated app → Supabase Edge Function → Auth/owner check → service-only quota reservation → OpenAI image extraction → editable client review → owner-scoped atomic import RPC. AI never writes student records. Vercel continues serving the web bundle; scans call Supabase directly so protected Vercel previews do not obstruct Android. No server credentials enter the bundle. This server is prepared but not deployed; [activation and limits](../features/PHOTO_ONBOARDING.md) are explicit. The earlier statement that no custom server exists describes deployed0.6 behavior.

## 0.8.0 Cloud Vision reader

App capture/choose → authenticated scan-roster Edge Function → Auth and academy ownership → new010 shared monthly plus009 daily/cooldown reservation → exactly one Cloud Vision DOCUMENT_TEXT_DETECTION call → explicit-label/word-position mapping → editable coach review → confirmed atomic import. Credentials remain in the server x-goog-api-key header; no GPT/Gemini or image-storage service is invoked. Unclear layouts return recognised lines; names-only fallback is local and does not invoke the provider again. The provider-aware client marker prevents old OpenAI-disclosing versions reaching Google. Actual deployment/key and missing009/010 remain pending; source implementation is not live activation. See PHOTO_ONBOARDING.md.

## 0.9.0 first-run roster flow

Today now reads the owner's roster for real student/batch counts and offers direct setup. RosterScreen consumes a one-time launch signal; ScanRosterScreen owns inline batch creation, common batch/proficiency dropdowns and automatic candidate review. Successful import IDs trigger a separate backend refresh; navigation into saved batch/profiles is enabled only when records/memberships are readable. Known-success refresh failures retry only the read. Backend Cloud Vision/SQL001–010 remain unchanged. See PHOTO_ONBOARDING.md.
