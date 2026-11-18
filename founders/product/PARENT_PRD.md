# Parent Plus — Parent module requirements

Version0.2 ·18November2026. Authorised directly by the owner after re-sharing `Parent_Plus_Aurora.html` and the Coach prototype. This starts a separate Parent experience using the existing Supabase/Auth project. It supersedes the earlier blanket deferral of the parent app. Main Coach priorities remain easy teaching setup and reviewed parent feedback; fee collection stays shelved.

| ID | First-slice requirement | Acceptance |
| --- | --- | --- |
| PAR-01 | Separate Aurora Parent entry, shared existing account credentials | `/parent` has its own branding/navigation; Parent sign-in creates no academy; recovery returns to Parent |
| PAR-02 | Private family and child profiles | Create/edit/reopen child, optional birthday/colour, switch children; other parents/coaches cannot query family data |
| PAR-03 | Family plans, reminders, memories and together time | Actual server save/reopen/retry; per-child values and current-week totals; no seeded sample children or fake achievements |
| PAR-04 | Explicit connection to an academy student | Coach issues expiring single-use invite; Parent reviews identity and selects an owned child; no contact/name-based auto-linking |
| PAR-05 | Receive reviewed coach feedback | Only approved per-child snapshots for the active verified invitation link; raw/private notes remain private; disconnect revokes future access |
| PAR-06 | Parent control of class media permission | Separate photo/video/parent-sharing decisions; default deny; account-based denial cannot be raised by Coach; all group subjects checked on access |
| PAR-07 | Truthful media and delivery | Only selected approved media; short private previews; no automatic external messages or claims of push/read receipt |
| PAR-08 | Follow supplied visual reference with native components | Dark Aurora surfaces, header/artwork, child chips, typography and bottom navigation; never deploy the mock HTML as the app |
| PAR-09 / LRN-06 | View a child's Coach-reviewed curriculum journey, current stage and evidenced milestones | Per-curriculum child progression; current verified guardian connection; separately reviewed child-only snapshots; no planned-as-achieved claims, private raw notes or peer data. New requirement: UI/publication not built in private021 |

18November clarification: Parent feedback must interpret the Coach's spoken/typed observation against actual class content, curriculum goals and the child's stage/history, preserving uncertainty. It is not merely transcription/translation. [Learning design](../../docs/superpowers/specs/2026-11-18-learning-context-design.md) and [LRN scenario ledger](../../docs/LEARNING_CONTEXT_QA.md) define the first isolated backend slice and remaining UI, provider, publication and real-account gates.

First target is mobile web in the existing Vercel project; source remains React Native for later separate native packaging. One family owner and one active family connection per academy student are explicit first-slice limits. Existing Coach use does not depend on Parent onboarding.

Later feature phases: authorised Coach schedule/attendance mirror; richer progress/skills and milestones; private family multimedia capture; discovery/admissions/health; push/read receipts; caregivers and public release/retention/deletion/backup gates. `PARENT_MODULE.md` records exact data/access/activation behavior and current evidence limits. No payment/gateway development is part of this milestone.

## Signup and relationship clarification — 16 November 2026

The main website entry must offer “Sign up as a Coach” and “Sign up as a Parent”, each opening the matching registration and post-verification profile setup. Keep returning-user sign in and the same Auth credentials. Existing profiles reopen; navigation never grants ownership or creates duplicate profiles.

Relationship acceptance and remaining limits are recorded in [DATABASE_RELATIONSHIP_REVIEW.md](../../ai-workspace/architecture/DATABASE_RELATIONSHIP_REVIEW.md). Support siblings, multiple batches, and independent coaches with child-scoped approved feedback. Archiving a Coach student revokes unused invitations, blocks first claims and preserves existing approved text history until explicit disconnect. Multiple authenticated guardians/shared family membership remain an explicit extension requiring privacy and consent decisions; do not represent stored contact rows as authenticated guardians.

Same-login class feedback acceptance is specified in [SAME_LOGIN_FEEDBACK_FLOW.md](../../ai-workspace/features/SAME_LOGIN_FEEDBACK_FLOW.md): guided setup/explicit child linking, correct-child feed selection, reviewed snapshots only, and rejection of another parent’s connection. No new SQL activation is required.

Owner authorised closing the identity gap: [PARENT_IDENTITY.md](../../ai-workspace/features/PARENT_IDENTITY.md) now specifies verified recipient email plus separate Coach approval before feedback access, including the same-login test. New014 activation is required; earlier self-confirmed link behavior is superseded.
