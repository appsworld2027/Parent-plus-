# ParentPlus — Coach and Parent

**[Open the app](https://parent-plus-varcel.vercel.app)** — use this normal production address. Branch/PR preview links can require a separate Vercel account sign-in. [Latest hosted verification](ai-workspace/validation/VERCEL_QA.md).

ParentPlus is a mobile-first Expo/React Native application with two workspaces:

- **Coach:** manage academies, batches, students, sessions, attendance, feedback, and consented class media.
- **Aurora Parent:** manage family and child profiles, private plans and memories, and view explicitly connected, Coach-reviewed feedback.

The destination Supabase project is the canonical development database. Its installed application migrations are recorded through **014** in `coach_private.schema_migrations`. The private workspace foundation under `supabase/candidates/` is a disposable-test candidate only; it is not an applied migration. Do not run candidate SQL against a live project.

## Start here

- [Current progress](PROGRESS.md)
- [Coach requirements](PRD.md)
- [Parent requirements](founders/product/PARENT_PRD.md)
- [Parent access design](ai-workspace/features/PARENT_MODULE.md)
- [Developer guide](ai-workspace/development/DEVELOPER_GUIDE.md)
- [Multi-workspace foundation](ai-workspace/architecture/MULTI_WORKSPACE_FOUNDATION.md)
- [Validation and release gates](ai-workspace/validation/MULTI_WORKSPACE_VALIDATION.md)
- [Consolidation decision](founders/decisions/CONSOLIDATION_REVIEW.md)
- [Shared development workflow](ai-workspace/development/SHARED_DEVELOPMENT_WORKFLOW.md)

## Local development

```sh
npm ci
npm run check
npm run test:e2e
npm run export:web
npm run export:android
```

Use fictional data in tests. Keep guardian verification and explicit Coach approval, academy/family isolation, reviewed Parent feedback, and consented media protections intact. Never commit secrets or personal records.

The source Next.js repository is reference material for product workflows and selected engineering practices; it is not the target application stack. Keep its migration history separate from this repository. GitLab and Vercel review is deferred from the current consolidation.

- [Founder documentation](founders/README.md)
- [AI and technical documentation](ai-workspace/README.md)
