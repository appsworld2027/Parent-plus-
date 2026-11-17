# Current owner step — website0.13.0 / Parent0.3

## Current development work: robust foundation

Next slice implemented: private workspace-authorized student/batch/class saves and profile/roster reads, with atomic contacts/enrolments, stale-edit checks and safe retries. [What this changes](../../ai-workspace/validation/WORKSPACE_ROSTER_QA.md). These are tested backend candidates; there is no new website flow or Supabase paste step from017. Existing accounts and installed001–014 remain.

Latest execution: the private server permission kernel and owner-only revocations are implemented and tested in disposable databases. See [what was tested](../../ai-workspace/validation/WORKSPACE_AUTHORIZATION_QA.md). This does not change the website yet. No SQL to copy/run: the remaining API/storage conversion and real Supabase staging must precede activation.

Owner authorised continuing multi-workspace work after clarification that Supabase staging and eventual schema/permission activation are required. F0contract and45case matrix are written; F1private storage candidate is tested only in disposable PostgreSQL. There is no production015 install script or workspace picker yet. Do not ask the owner to run supabase/candidates/ SQL or repeat001–014. First finish F2authorisation/APIs, then onboarding/UI and a rehearsed staging/cutover plan. Owner account setup/provisioning is needed later for real Supabase staging and production execution; no admin connection is present now. Their live test with a colleague is separate and has not been reported complete.

The pending guardian privacy preference is separate-private vs explicitly shared family spaces. Do not expand digital guardians until that model and per-link consent/delivery are implemented. Further details: [foundation](../../ai-workspace/architecture/MULTI_WORKSPACE_FOUNDATION.md), [release gates](../../ai-workspace/validation/MULTI_WORKSPACE_VALIDATION.md).

## Update014 installed — confirmed17November2026

Owner’s initial three-column diagnostic was all false. After rerunning the complete file, owner reports exact installed_update202611160014. Fresh anonymous API checks on the new approval table and both request RPCs now return401/42501, replacing missing-object404responses. Database/API activation is confirmed at that boundary. Do not repeat any SQL, Google key or scan-roster setup.

Both App checks43859794515 and Android43859794507 succeeded for runtime0791763. Hosted fixture tests4/4passed; actual signed-in account acceptance remains separate. No private data or writes were used in the activation probes.

## Next owner action

Open Coach and sign in with the existing account. Guide one actual class update through review/share and same-login Parent view. For a new connection: Parent submits the intended child, then Coach Today explicitly approves the verified email/child match; only then does the shared update become available. Same-login testing never skips approval. Old legacy links were reset by014 and need fresh verified connection/approval/re-sharing.

Coach: https://parent-plus-varcel-git-codex-coach-foundation-appsworld2027.vercel.app
Parent: https://parent-plus-varcel-git-codex-coach-foundation-appsworld2027.vercel.app/parent

Full rules: [PARENT_IDENTITY.md](../../ai-workspace/features/PARENT_IDENTITY.md). Email control plus Coach match approval is not independent proof of legal custody. Multiple guardians and academy staff remain separate work.
