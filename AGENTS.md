# Repository guidance

## Current MM branch rule — owner instruction,18November2026

All MM development belongs on the single canonical `MM/development` branch. Do not implement or commit on `main`, create new `MM/<task>` branches, or automatically merge/push MM work into `main`. The owner's latest instruction supersedes the earlier17November promotion authorization. A future main release/merge requires a new explicit owner instruction. Keep AM branches, legacy codex branches, production settings and live Supabase untouched unless separately authorized. New feature development remains paused; current authorized maintenance is the owner-reported roster/Parent-flow defect investigation, scoped repairs and verification. This does not authorize unrelated features or a main release. See [shared workflow](docs/SHARED_DEVELOPMENT_WORKFLOW.md) and [consolidation evidence](docs/MM_BRANCH_CONSOLIDATION.md).

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

Use [`docs/examples/FOUNDER_RESPONSE_REFERENCE.md`](docs/examples/FOUNDER_RESPONSE_REFERENCE.md) as a presentation and teaching-style example: lead with the outcome, explain the plain-English meaning and next action, show concise evidence, and include a Technical Appendix when useful. It is a historical example, not a source of current status or permission to run commands. Verify repository state and evidence before making claims; adapt the format to the task rather than copying irrelevant sections.

For substantive founder updates, use the reference's outcome-first flow: a visible outcome and relevant icon, a short italic overview, compact two-column evidence, and an unmistakable next action. Explain meaningful technical terms in a brief Technical Appendix when needed. Use headings only when allowed by the current session's higher-priority instructions. Keep trivial replies short. Never promise cross-session memory; this file and the linked reference provide the durable repository instructions.

## Supabase and release safety

The destination is the canonical development database. Its installed app migration ledger is `coach_private.schema_migrations` through 014. The 015 workspace foundation file under `supabase/candidates/` is a disposable-test candidate only; it is not an applied migration or permission to deploy. Do not apply SQL, alter live data, production configuration, secrets, or release infrastructure without separate explicit authorization. Do not combine the source project's migration history with this project's history.

Keep guardian identity checks, explicit Coach approval, family/academy isolation, reviewed Parent feedback, consented media, and fail-closed access behavior. Review SECURITY DEFINER functions and grants carefully.

## Collaboration and verification

Use the branch and review process in `docs/SHARED_DEVELOPMENT_WORKFLOW.md`. Never write to the source repository during consolidation. Do not merge a pull request without explicit approval.

For relevant app changes, use the existing checks: `npm run check`, `npm run test:e2e`, `npm run export:web`, and `npm run export:android`. For SQL candidates, use the isolated database validation described in `docs/MULTI_WORKSPACE_VALIDATION.md`; do not use a live project as a test database. Report what ran and what did not.

## AI operating system — parallel adoption

Start founder navigation at [START-HERE.md](START-HERE.md); use [ai-workspace](ai-workspace/README.md) for technical working rules. Continue the active sprint while adopting these instructions. Preserve existing authoritative requirements and status; link summaries rather than creating competing sources.

Before feature implementation, map acceptance criteria and risk-based scenarios to stable feature/scenario IDs. Link executable tests and actual run evidence; report failures, blocked, skipped, flaky and unrun coverage explicitly. Follow [scenario and independent-review rules](ai-workspace/test-plans/README.md). The implementer must not be the sole evaluator; record independent review as pending when unavailable. Keep founder summaries under 150 words where practical.

Use [the adoption guide](ai-workspace/agent-instructions/adoption.md) for other Codex sessions. Updated GitHub instructions require branch synchronization and a new task/session or explicit reload; they do not instantly update active work. This first rollout changes documentation only. Excel generation and new advisory CI are separate PRs; retain existing checks and do not introduce new mandatory gates until validated and agreed.

## Founder technical delegation

The founders are non-technical. AI owns technical review, testing, validation, fixes and routine engineering decisions; do not ask founders to review code or judge test adequacy. Give a clear readiness recommendation with evidence and unresolved limits. Founders decide product priorities, material user-experience tradeoffs and release approval. Follow explicit session authorization for merges; do not infer production deployment permission from technical delegation. Independent review requirements remain: self-review must never be labeled independent review.

## AppsWorld AI Organization (v2) — added 20 November 2026 by Ankit

This product is run with the AppsWorld AI Organization handbook at https://github.com/appsworld2027/parent-plus-ai-org (start with its `AGENTS.md` §0 "Native first" and §1 "Founder contract", and `playbooks/ai-pm.md` for product work). Work natively at full speed and tag the role you are playing (Maya, Arjun, Dev, Quinn, Rex …). Product settings for agents live in `.ai-org/manifest.json`. **The owner instructions above in this file — branch rules, merge approval, Supabase and release safety — take precedence over the AI Org handbook in this repository.** Background agents are triggered by `ai:*` labels through `.github/workflows/ai-agents.yml`; they open pull requests but never merge them here without explicit founder approval.

## Quality system (AppsWorld AI Org §7A)
- Every feature follows AI Org `AGENTS.md` §7A: founder-approved Feature Contract at `docs/product/<feature-slug>/ACCEPTANCE.md` → locked acceptance tests in `e2e/acceptance/` (PR label `ai:contract`) → build PR stacked on the contract branch → independent review → Demo Pack.
- Build PRs never add, edit, delete, skip or focus tests in `e2e/acceptance/`; the `Contract lock` check fails them.
- Claude Code runs `.claude/hooks/quality-gate.sh` when it tries to finish: `npm run check` must pass first (max 5 rounds, then `ai:blocked`). `QUALITY_GATE=off` is for founder-only manual sessions.

## AI Org loop (added 2026-11-22 by Ankit)
- Founders approve with a one-line reply on the item the agents link: `/approve` or `/changes <what>` (also `/next`, `/stop`). Only usernames in `.ai-org/manifest.json` `governance.founders` count; one founder's approval is sufficient (see `governance/DECISIONS.md`).
- The AI Org loop controller may merge an approved, green **build** PR into its `ai/contract-*` feature branch. Only a founder `/approve` on the Demo Pack ships the feature PR to `main`. This is the explicit approval required above.
- What gets built next: first unchecked line of `docs/product/BACKLOG.md`, one feature at a time.

