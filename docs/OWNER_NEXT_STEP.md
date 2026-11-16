# Current owner step — website0.11.2 / Parent0.1

**The source review and tests are complete for the current one-household model.** Website0.11.2 is published and hosted signup checks pass3/3. Use the new011–013 package below. Do not repeat existing setup. Multiple-guardian expansion still awaits privacy/consent choices and is not included.

New entry: **Sign up as a Coach** and **Sign up as a Parent** open their own registration forms. Existing credentials remain shared; signing in opens the existing workspace or the appropriate academy/family setup. Signed-in space links remain navigation for testing and existing accounts.

The owner has supplied both original prototypes. The separate Parent workspace is built at:
https://parent-plus-varcel-git-codex-coach-foundation-appsworld2027.vercel.app/parent

Coach stays at:
https://parent-plus-varcel-git-codex-coach-foundation-appsworld2027.vercel.app

Both use the existing Supabase account credentials. Parent has its own navigation and private family records. The shared app build is0.11.2; Parent module0.1.0. Publication/build identities and exact current status are in PROGRESS.md. First-slice scope and limits are in PARENT_MODULE.md.

## Current blocker

The candidate offers role-specific signup entry points and signed-in workspace links. Parent records remain blocked because011–013 has not been confirmed installed; a relevant zero-row API probe still returns missing parent_families. Activation requires one owner run of the new prepared package. Do not substitute repeated refreshes or old setup scripts.

## Only new setup: one combined update

Existing database001–010, Google key and scan-roster are complete. Do not repeat them. The new family/consent/reviewed-delivery capabilities require only `supabase/update_011_013.sql` (all three new versions in one transaction). It contains no credentials, sample children or payment activation. The exact file is exercised twice in disposable database tests and checked against all three versioned migration sources.

Guide one action at a time. First open the prepared file on GitHub and use **Copy raw file**; do not copy surrounding chat instructions or manually edit code. Then open a new blank query in the existing Supabase SQL editor and run the complete copied file. Success ends with three installed_update rows:

- 202611160011
- 202611160012
- 202611160013

File: https://github.com/appsworld2027/Parent-plus-/blob/codex/coach-foundation/supabase/update_011_013.sql
Editor: https://supabase.com/dashboard/project/zcgcnycnanqkbdlwojln/sql/new

This workspace has not run new SQL on the live project. Until this single new update is installed, new Parent/media capabilities show an activation message; existing ordinary Coach feedback/WhatsApp and teaching flows remain available. No extra Google/WhatsApp provider key or new Supabase project is required.

## Then one small acceptance journey

Use fictional records and the owner's own test number. Parent: sign in→create family→add child. Coach: student profile→Create Parent invitation. Parent: Explore→Connect a coach→review the identity and select the child. Coach: save feedback→review for Parent→approve. Parent: Refresh and reopen the approved note. Separately test guardian photo/video/sharing choices and a small class media item. No external notification is sent automatically, and no real parent should receive a test message.

Later gates include real distinct-account isolation, native phone installation/camera/session behavior, media format/large-upload checks, retention/deletion/backup and broader prototype features. Current Parent deliverable is mobile web, not a separate installed Parent APK. Fee collection stays shelved.


## Published verification

Runtimeb014c0a is published;201automated checks,76browser cases,14focused hosted cases and the native Coach build all pass. The verified Coach APK is [here](https://github.com/appsworld2027/Parent-plus-/actions/runs/43829864994/artifacts/14208786600); this is not a Parent APK. The remaining new-data activation is the single combined SQL file above, followed by real account/device acceptance.

Relationship audit and explicit limits: [DATABASE_RELATIONSHIP_REVIEW.md](DATABASE_RELATIONSHIP_REVIEW.md). Migration013 adds archive/invitation lifecycle protection without rewriting011/012. The old011/012-only package is retained as historical source; the new candidate uses011–013.
