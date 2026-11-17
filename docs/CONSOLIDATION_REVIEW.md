# ParentPlus consolidation review

Reviewed 17 November 2026. Source remains read-only. Vercel and GitLab remain out of scope as requested.

## Verified Git state

| Repository | Current evidence |
| --- | --- |
| AM source `ankitmittal-madman/ParentPlus` | `main` and `docs/reconcile-parentplus-status-2026-11-16` both at `380adba9f73b3021a787dff72074df57f2a53634`; 8 merged PRs; no tags. Intelligent Quality and Founder Browser Quality runs succeeded on this SHA. |
| MM destination `appsworld2027/Parent-plus-` | Default `main` is the minimal README baseline `0db8f745b3e53b18eddf9e6866bdc65afa706a46`. Active Expo code is on `codex/coach-foundation`, now at `2febefe3312d663e2217746cba9502cf994eced2`; legacy `build-status` and the preserved MM consolidation branch remain. No tags. |

`MM/parentplus-sync-20261117` starts from the verified `codex/coach-foundation` commit above. Source and destination branches are separate histories; this is a selective integration, not a history merge. Visible branches report `protected: false`; do not assume review checks are enforced by GitHub rules.

## Architecture and capability decisions

| Source evidence | Decision for MM |
| --- | --- |
| Source is a Next.js/React web app. Its parent attendance Home and session reports were added in source PR #7 and use source-specific RPCs in migration 053. | **DEFER the feature port.** Preserve it as a roadmap candidate. Rebuild only after destination workspace authorization (F2) and a destination-native privacy/API design; do not copy Next.js UI or migration 053. |
| Source quality gate depends on `apps/web`, Next.js, a Python requirement registry, and source-specific report/receipt scripts. | **Do not copy wholesale.** Destination already has Expo typecheck, 245 unit tests, 87 browser tests, web/Android exports and a separate Android APK workflow. The source gate would add a second, incompatible test control plane. |
| Source `AGENTS.md` depends on source-only project context and Superpowers files that do not exist in MM. | **Do not copy wholesale.** Keep MM's destination-aware `AGENTS.md`; the founder response reference is already copied as a style example. |
| Source frontend CI uses least-privilege `contents: read` and validates/uploads JUnit test evidence. | **ADOPT the portable part** in destination `.github/workflows/checks.yml`: read-only token permissions plus validated JUnit evidence retained as a CI artifact. No new dependency. |
| Destination provides Coach and Aurora Parent in Expo/React Native, verified guardian email, explicit Coach approval, reviewed feedback, consented media, and destination-specific family/academy boundaries. | **KEEP destination implementation and access model.** Do not replace it with source table names, policies, or assumptions. |

## Supabase boundary

Keep destination migration history 001–014 and its academy/student/family/guardian schema as canonical. Source has a separate 001–053 history and materially different workspace/child/guardianship model. Names that look similar are not proof of compatible contracts. The destination's private 015 workspace foundation remains an isolated candidate, not an applied migration. This sync does not alter either database or copy live data.

## This sync change and verification

The new branch applies the portable CI practice only; no source application code or database migration is copied. Local verification on the destination branch: TypeScript passed; 245/245 unit tests passed and the generated JUnit file validated with zero failures, errors or skips; 87/87 Playwright tests passed; Expo web and Android exports passed; workflow YAML parsed; `git diff --check` passed. The initial browser run lacked Chromium and the initial Expo export lacked a runner settings directory; after installing Chromium and using an isolated `/tmp` settings path, the checks passed.

GitHub Actions must still run on the PR head. Local results do not prove hosted CI or branch-protection enforcement. No live Supabase change, production deployment, Vercel review or GitLab review is included.

## Follow-up

1. Open one MM PR for this workflow improvement and review its hosted checks.
2. Keep parent attendance reporting deferred until the multi-workspace authorization foundation and release gates are satisfied.
3. Revisit source infrastructure and backup integration later, when Vercel and GitLab are back in scope.
