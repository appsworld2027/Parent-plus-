# AI organization setup progress

Branch: MM/ai-organization-setup, based on current main (74de4bbb105641fb0ea3872d32e64296e407407d).

## Verified
- Inspected open draft PR #19. Its head is f74f7981deabecc2fe0a5eeaadc2189484d6ad9, based on older main f858aad85577c1e49ae24f06ba260778ecb83ddd, and its latest diff reports 163 files.
- Inspected current root AGENTS.md, ai-workspace/README.md, ai-workspace/development/DEVELOPER_GUIDE.md, consolidated product roadmap, and current GitHub Actions workflow.
- Existing repository already has extensive operating guidance, quality workflows and product requirements. Reuse those rather than installing duplicate systems.
- Local cloud checkout is AM/consolidated, clean. GitHub connector was used for remote inspection and setup branch content.

## Checklist
- [~] P1 Repository safety assessment: partially complete. Inspected repository guidance, roadmap, current checks, clean local checkout, PR #19 and current main. Existing product code and workflows are extensive. Not yet completed: full inventory of repository modules, settings/branch protections, complete framework compatibility evidence, and explicit safety assessment for adding AI tooling. No production changes made.
- [ ] P2 role cards and governance. 11 names/functional slots are listed, but no operational role instructions, permissions, measurable criteria, or tested governance workflow exist yet.
- [~] P3 Framework setup: partial feasibility checks only. Superpowers already exists in the repo and is documented. Spec Kit 1.4.2 generated Codex skills in a disposable workspace. Cezar 0.20.0 completed a mock Codex step and its local dashboard answered on loopback in a prior cloud task. These were not installed/configured on this branch. Live Cezar isolation, persistent settings, CI branch protections and repeatable integration tests remain unverified.
- [~] P4 One-team pilot: synthetic feedback implementation passed two tests in an isolated Docker container and GitHub Codex review reported no major findings for the prior pilot commit. This does not demonstrate a configured team or live orchestration.
- [ ] P5 founder conflict/decision simulation.
- [ ] P6 validate both teams.
- [ ] P7 end-to-end acceptance.
- [ ] Operating, recovery and maintenance guide.

## Founder milestone summary\n\n1. Repository safety: partial assessment completed. Inspection shows an established Expo app, detailed safety rules and CI. Full repo/module/settings review and formal go/no-go remain open.\n2. Cezar and Superpowers: Superpowers is already present. Cezar and Spec Kit have only been exercised in disposable mock/setup checks. They have not been integrated as live reusable workflows or fully acceptance-tested.\n3. Eleven agents: not configured. Names/slots are recorded in the master objective only.\n\n## Decisions
- Keep PR #19 untouched. Its current base predates latest main and its diff is unexpectedly broad.
- Use a separate MM branch from verified current main.
- Reuse existing GitHub Actions, repository Superpowers skills, scenario IDs, and documentation structure.
- Keep work synthetic and non-production. No merges or paid services.

## Blockers
- Codex GitHub MCP can read/write repository content, but repository settings and account-level access controls require direct capability verification.
- Live Cezar runner isolation and remote Codex network access require cloud validation before autonomous execution.
- Actual model usage/cost telemetry may not be exposed by chosen subscription route. Report measured values only when available.

## Usage and cost
- No new service or paid plan selected. Usage/cost tracking method is not yet verified.

## AM/consolidated integration checkpoint — 26 November 2026

Objective: integrate current `main` into `AM/consolidated`, retain APVerse runtime routing, validate the merge, and publish only the AM branch. This maintenance task is separate from the AI organization pilot above.

- Merge commit: `f99a7027853bf2b4d6ed425fedde0bd193ab44c1`; parents are AM baseline `a6d749978df5ef7e83ba5edf0ee269059f066725` and main baseline `46b625eb1a4a933a365828441cb046bee4430430`.
- Follow-up commits: `352cd1a` records validation evidence; `846ddb7` maps all 85 imported tests that were missing from `quality/scenarios.json`. `origin/AM/consolidated` reads back at `846ddb7b4b6b928ae82a3326396c985ade68dedb`; working tree is clean. Main remains at its original baseline. GitHub records existing PR #50 as merged at the merge commit; no duplicate PR was created.
- APVerse public client config remains on project `fmavpazczahxeusqbxuh`. Learning-context SQL is under `supabase/candidates/`; no migration was applied and no database writes were run. Retired Android preview/APK workflow files are not included.
- `npm run check`: PASS, 56 files / 639 tests. `npm run test:e2e`: PASS, 126/126. `npm run export:web`: PASS. Targeted browser checks: Needs You acceptance 10/10, Parent attendance 3/3, prototype visuals 4/4.
- The local PostgREST test fixture now supports `in.(...)` filters when loading feedback recipients; Today refreshes the Needs You count on tab selection.
- GitHub full-validation workflow `45842403584` PASS on `846ddb7`, including quality gate, foundation, workspace-concurrency PostgreSQL and parent-attendance PostgreSQL. Contract lock, protected paths, QA lab, and AI adapter checks PASS. Initial quality check revealed the unmapped imported tests; adding all 85 mappings made the final run pass.
- Vercel preview for `846ddb7` is READY at https://parent-plus-varcel-hqzydjbzk-appsworld2027.vercel.app. The Vercel project settings API returned 403 and no Vercel CLI is installed, so environment-variable details were not independently inspected. No production deployment or promotion was run.
- Final diff check passed; no unresolved merge paths remain. PR #50 is complete. The separate draft PR #15 (`AM/consolidated` → `main`) remains open for its existing documentation review; it was not merged or retargeted here.
