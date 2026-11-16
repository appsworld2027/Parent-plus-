# Parent Plus — Coach and Parent

Two separate React Native workspaces on the existing Supabase/Auth project:

- [Coach](https://parent-plus-varcel-git-codex-coach-foundation-appsworld2027.vercel.app): teaching batches, students, classes/attendance, saved feedback, reviewed WhatsApp and consented class media.
- [Parent](https://parent-plus-varcel-git-codex-coach-foundation-appsworld2027.vercel.app/parent): Aurora family/child profiles, private plans/reminders/memories, together time and explicitly connected, coach-reviewed feedback.

Current shared build **0.11.0**, Parent module **0.1.0**, branch `codex/coach-foundation`, runtime source `b014c0a`. Development is active. The owner supplied both original prototypes under `docs/prototypes/`; the working app is built from native components, not their mock scripts. Fee collection is shelved. The first Parent deliverable is mobile web; a separate Parent APK and broader prototype features are later work.

**New data activation remains:** run only the prepared [combined011/012 update](supabase/update_011_012.sql) in the existing Supabase project. Existing001–010, Google key and scan-roster are already complete and must not be repeated. New Parent/media features fail closed until this one new update is installed. [One-step owner guide](docs/OWNER_NEXT_STEP.md).

[App checks43829864988](https://github.com/appsworld2027/Parent-plus-/actions/runs/43829864988) passed201automated checks,76browser cases and web/Android JS exports. [Focused hosted QA](docs/DUAL_WORKSPACE_HOSTED_QA.md) passed14/14 on the published bundle with fictional records. [Coach Android build43829864994](https://github.com/appsworld2027/Parent-plus-/actions/runs/43829864994) passed compilation and verification; phone installation/acceptance and real distinct-account/new-schema testing remain open. This is a development preview, not a public release or a universal security certification.

Start with [current progress](PROGRESS.md), [Coach requirements](PRD.md), [Parent requirements](docs/PARENT_PRD.md), [Parent architecture/access](docs/PARENT_MODULE.md) and [developer guide](docs/DEVELOPER_GUIDE.md). [Local and browser evidence](docs/DUAL_WORKSPACE_QA.md) distinguishes automated fixtures from actual account/device acceptance.

```sh
npm ci
npm run check
npm run test:e2e
npm run export:web
npm run export:android
node scripts/prepare-parent-sql.mjs --check
```

Family and academy records are independently protected. A coach-issued expiring invitation links a family child explicitly to a student; contact/name matching grants no access. Parent sees only reviewed per-child snapshots and currently authorised media. API/service secrets never belong in public app configuration or GitHub.
