# Repository guidance

## MM branch rule — owner instruction, 26 November 2026
`MM/development` is open for full AI development authority. This replaces the 18 November rule and its feature pause, and any older MM limit in this repository.
- On `MM/development`, without asking: build new features, refactor, commit, push, create and merge task branches into it, change dependencies, tests and docs, create preview deployments, and run migrations on disposable or local test databases only. "Disposable" means created for the test and thrown away; the canonical development database (ledger through 014) is not disposable and follows the Supabase rule below.
- Never change without a human-requested PR: `.github/workflows/**`, `.ai-org/**`, `CODEOWNERS`, repository variables and secrets. Background agents are off or on only by the founder (`UNATTENDED_AGENTS`, see AI Org AGENTS.md section 2).
- The AI Org loop (`ai/contract-*` branches, `docs/product/BACKLOG.md`) remains available. Quality gates and locked acceptance tests still apply.
- Still needs the founder: release to `main` (founder `/approve`); any change to the live or hosted database, real family or child data, or production settings; new paid services; force-push or deleting others' work. Never expose secrets (this repository is public).
- AM branches stay under AM's own rules. Sync `main` into `MM/development` normally, without force-push, before new work.

Before removing an old MM branch, preserve its exact tip in the canonical history/backup, recheck current remote SHA and ancestry, pass the complete existing regression/export/database checks and independent review, then delete only the inventoried contained MM refs. Branch cleanup never authorizes deleting application files or rewriting history.

This repository is the active ParentPlus product. It uses Expo/React Native with separate Coach and Aurora Parent workspaces and the destination Supabase project. Keep both tested journeys and destination-specific privacy rules intact.

## Before changing code

Read `docs/superpowers.md` and the relevant repository skills under `.agents/skills/` before substantial work. Current user instructions, session permissions and actual available tools take precedence over upstream examples. Do not change global Codex configuration or spawn agents merely because a skill example suggests it. Follow the destination Expo commands and preserve existing authorization and release boundaries.

Read `docs/CONSOLIDATED_PRODUCT_ROADMAP.md` for the cross-repository feature inventory and current integration status. Read `docs/superpowers.md` before using the repository's Superpowers skills. Use relevant skills for design, implementation, debugging and verification; current user instructions, available tools and session restrictions take precedence. Do not change machine-wide settings or spawn agents merely because a skill example suggests it. The upstream skills are guidance, not evidence that work passed or permission to deploy.

For database consolidation, read `docs/CONSOLIDATED_DATABASE_DESIGN.md` and its metadata snapshot limits. Never infer that a source table name or a copied migration has the same authority as a destination entity. Every feature change needs observable acceptance criteria and relevant permission, failure and recovery tests; report unmapped or unrun scenarios explicitly.

Read the relevant current requirements and status first:
- `PROGRESS.md`, `PRD.md`, `docs/PARENT_PRD.md`, `docs/PARENT_MODULE.md`
- `docs/DEVELOPER_GUIDE.md`
- `docs/MULTI_WORKSPACE_FOUNDATION.md` and `docs/MULTI_WORKSPACE_VALIDATION.md` for workspace/database work

Follow the established Expo structure and scripts. Prefer small changes that preserve existing Coach and Parent behavior. Do not port the source Next.js interface as if it were compatible with this app.

## Founder-facing communication

Follow the AI Org [founder response standard](https://github.com/appsworld2027/parent-plus-ai-org/blob/main/standards/FOUNDER_RESPONSE.md). The local [reference](ai-workspace/instructions/examples/FOUNDER_RESPONSE_REFERENCE.md) is a teaching-style example only. Never promise cross-session memory.

## Supabase and release safety

The destination is the canonical development database. Its installed app migration ledger is `coach_private.schema_migrations` through 014. The 015 workspace foundation file under `supabase/candidates/` is a disposable-test candidate only; it is not an applied migration or permission to deploy. Do not apply SQL, alter live data, production configuration, secrets, or release infrastructure without separate explicit authorization. Do not combine the source project's migration history with this project's history.

Keep guardian identity checks, explicit Coach approval, family/academy isolation, reviewed Parent feedback, consented media, and fail-closed access behavior. Review SECURITY DEFINER functions and grants carefully.

## Collaboration and verification

Use the branch and review process in `docs/SHARED_DEVELOPMENT_WORKFLOW.md`. Never write to the source repository during consolidation. Do not merge a pull request without explicit approval, except into `MM/development` and `ai/contract-*` branches under the MM branch rule above.

For relevant app changes, use the existing checks: `npm run check`, `npm run test:e2e`, `npm run export:web`, and `npm run export:android`. For SQL candidates, use the isolated database validation described in `docs/MULTI_WORKSPACE_VALIDATION.md`; do not use a live project as a test database. Report what ran and what did not.

## AI operating system — parallel adoption

Start founder navigation at [START-HERE.md](START-HERE.md); use [ai-workspace](ai-workspace/README.md) for technical working rules. Adopt these instructions alongside current work. Preserve existing authoritative requirements and status; link summaries rather than creating competing sources.

Before feature implementation, map acceptance criteria and risk-based scenarios to stable feature/scenario IDs. Link executable tests and actual run evidence; report failures, blocked, skipped, flaky and unrun coverage explicitly. Follow [scenario and independent-review rules](ai-workspace/test-plans/README.md). The implementer must not be the sole evaluator; record independent review as pending when unavailable.

Use [the adoption guide](ai-workspace/agent-instructions/adoption.md) for other Codex sessions. Updated GitHub instructions require branch synchronization and a new task/session or explicit reload; they do not instantly update active work. This first rollout changes documentation only. Excel generation and new advisory CI are separate PRs; retain existing checks and do not introduce new mandatory gates until validated and agreed.

## Founder technical delegation

The founders are non-technical. AI owns technical review, testing, validation, fixes and routine engineering decisions; do not ask founders to review code or judge test adequacy. Give a clear readiness recommendation with evidence and unresolved limits. Founders decide product priorities, material user-experience tradeoffs and release approval. Follow explicit session authorization for merges; do not infer production deployment permission from technical delegation. Independent review requirements remain: self-review must never be labeled independent review.


## AppsWorld AI Organization (v2) — added 20 November 2026 by Ankit

This product is run with the AppsWorld AI Organization handbook at https://github.com/appsworld2027/parent-plus-ai-org (start with its `AGENTS.md` §0 "Native first" and §1 "Founder contract", and `playbooks/ai-pm.md` for product work). Work natively at full speed and tag the role you are playing (Maya, Arjun, Dev, Quinn, Rex …). Product settings for agents live in `.ai-org/manifest.json`. **The owner instructions above in this file — branch rules, merge approval, Supabase and release safety — take precedence over the AI Org handbook in this repository.** Background agents are triggered by `ai:*` labels through `.github/workflows/ai-agents.yml`; they open pull requests; they may merge into `MM/development` and `ai/contract-*` branches under the MM branch rule and the loop controller, and never merge to `main` without a founder `/approve`.

## Quality system (AppsWorld AI Org §7A)
- Every feature follows AI Org `AGENTS.md` §7A: founder-approved Feature Contract at `docs/product/<feature-slug>/ACCEPTANCE.md` → locked acceptance tests in `e2e/acceptance/` (PR label `ai:contract`) → build PR stacked on the contract branch → independent review → Demo Pack.
- Build PRs never add, edit, delete, skip or focus tests in `e2e/acceptance/`; the `Contract lock` check fails them.
- Claude Code runs `.claude/hooks/quality-gate.sh` when it tries to finish: `npm run check` must pass first (max 5 rounds, then `ai:blocked`). `QUALITY_GATE=off` is for founder-only manual sessions.

## AI Org loop (added 2026-11-22 by Ankit)
- Founders never act on GitHub. They decide in their AI chat; the assistant posts `/approve` or `/changes <what>` (also `/next`, `/stop`) on the item for them, as the founder's own account. Testing happens only on the Vercel link.
- Agents never commit to `main`: it accepts changes only through pull requests (branch protection, 2026-11-23). Contract docs go on `ai/contract-<slug>`. Only usernames in `.ai-org/manifest.json` `governance.founders` count; one founder's approval is sufficient (see `governance/DECISIONS.md`).
- The AI Org loop controller may merge an approved, green **build** PR into its `ai/contract-*` feature branch. Only a founder `/approve` on the Demo Pack ships the feature PR to `main`. This is the explicit approval required above.
- What gets built next: first unchecked line of `docs/product/BACKLOG.md`, one feature at a time.

## Founder standing direction — recorded 28 Nov 2026 (founder, in chat)
- AI works autonomously on the whole product build with full authority over routine work: features, tests, refactors, docs, branches, `MM/development`, additive migrations and Edge Function deploys on the dev project `parentplus-dev`, disposable test databases, and tools reachable from the cloud session.
- Do not pause or ask the founder for permission already granted here. Ask only for a real product decision, or for something only the founder can supply (an account login, a credential entered through the secure form, a payment).
- No local-machine dependency: do not ask the founder to run commands, download files, install apps or use a device. Prefer cloud-only routes.
- Every coach action that affects families must also reach families; every alert must give a next action.
- Unchanged hard gates (founder's earlier rules): release to `main` needs founder `/approve`; no real family or child data and no production settings or database changes; no new paid service without the founder; never put secrets in chat or the repository; no destructive change to existing data.
- Write or update a session checkpoint (`docs/product/checkpoints/`) at every milestone and before any hosted change.
  
