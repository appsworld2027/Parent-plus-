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

Objective: integrate the current `main` tree into `AM/consolidated`, preserve the APVerse runtime selection, validate the merged app, and publish only the AM branch. This is a separate maintenance task; it does not complete the AI organization pilot above.

- Local checkout: `/workspace/parentplus`, branch `AM/consolidated`; merge is in progress from `origin/main` (baseline main `46b625eb1a4a933a365828441cb046bee4430430`, AM `a6d749978df5ef7e83ba5edf0ee269059f066725`).
- Resolved conflicts with AM authentication/runtime logic retained and Main interface/features integrated. Public client config is set to APVerse project `fmavpazczahxeusqbxuh`. The learning-context SQL remains under `supabase/candidates/`; no migrations or database writes were run. Android preview/APK workflow files were excluded per the retired workflow boundary.
- `npm run check`: PASS, 56 files / 639 tests; `npm run export:web`: PASS. Full browser regression PASS: 126/126. Targeted checks also passed: Needs You acceptance 10/10, Parent attendance 3/3, prototype visuals 4/4.
- Acceptance-test fixture fix: the local PostgREST transport now implements `in.(...)` recipient filters, which allowed the Needs You card to receive recorded-feedback recipients. The card is also refreshed whenever the Today tab is selected.
- Final local review: `git diff --cached --check` PASS; no unresolved paths; the learning-context SQL is only in `supabase/candidates/`; no Android preview/APK workflow is included. Remote refs were re-fetched and still match the baseline SHAs above.
- Existing draft PR #50 (`main` → `AM/consolidated`) remains open and conflicting before this push. It is the existing integration PR; do not create a duplicate or merge it automatically.
- Vercel environment/preview verification is unavailable: API access returned 403 and the Vercel CLI is not installed. Do not claim a hosted preview check or production deployment.
- No commit or remote push has occurred at this checkpoint. Next action: create the merge commit and push only `AM/consolidated`; then read back the remote SHA and inspect PR #50/CI state.
- Vercel environment/preview verification is unavailable: API access returned 403 and the Vercel CLI is not installed. Do not claim a hosted preview check or production deployment.
- No commit or remote push has occurred. Next action: finish the full E2E run, then continue the remaining review and branch checks.
