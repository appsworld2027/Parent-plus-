# Repository guidance

This repository is the active ParentPlus product. It uses Expo/React Native with separate Coach and Aurora Parent workspaces and the destination Supabase project. Keep both tested journeys and destination-specific privacy rules intact.

## Before changing code

Read `docs/superpowers.md` and the relevant repository skills under `.agents/skills/` before substantial work. Current user instructions, session permissions and actual available tools take precedence over upstream examples. Do not change global Codex configuration or spawn agents merely because a skill example suggests it. Follow the destination Expo commands and preserve existing authorization and release boundaries.

Read `docs/CONSOLIDATED_PRODUCT_ROADMAP.md` for the cross-repository feature inventory and current integration status. Read `docs/superpowers.md` before using the repository's Superpowers skills. Use relevant skills for design, implementation, debugging and verification; current user instructions, available tools and session restrictions take precedence. Do not change machine-wide settings or spawn agents merely because a skill example suggests it. The upstream skills are guidance, not evidence that work passed or permission to deploy.

For database consolidation, read `docs/CONSOLIDATED_DATABASE_DESIGN.md` and its metadata snapshot limits. Current owner direction: APVerse (`fmavpazczahxeusqbxuh`) is the AM schema-integration target; appsworld2027 (`zcgcnycnanqkbdlwojln`) is the MM compatibility/data baseline until cutover acceptance. Preserve MM runtime behavior and data. AM's existing records may be discarded only when a tested rebuild needs it; retain its schema concepts, relationships and proven procedures. Never copy migration histories or infer authority from matching names. Port feature contracts through reviewed, additive migrations and verify each on isolated PostgreSQL before applying to APVerse. Keep both hosted projects separate during development. Every feature change needs observable acceptance criteria and relevant permission, failure and recovery tests; report unmapped or unrun scenarios explicitly.

Read the relevant current requirements and status first:
- `PROGRESS.md`, `PRD.md`, `docs/PARENT_PRD.md`, `docs/PARENT_MODULE.md`
- `docs/DEVELOPER_GUIDE.md`
- `docs/MULTI_WORKSPACE_FOUNDATION.md` and `docs/MULTI_WORKSPACE_VALIDATION.md` for workspace/database work

Follow the established Expo structure and scripts. Prefer small changes that preserve existing Coach and Parent behavior. Do not port the source Next.js interface as if it were compatible with this app.

## Founder-facing communication

Before substantive founder-facing responses, follow [`docs/CODEX_COMMUNICATION_STANDARD.md`](docs/CODEX_COMMUNICATION_STANDARD.md) and its reusable repository skill at [`.agents/skills/parentplus-founder-communication/SKILL.md`](.agents/skills/parentplus-founder-communication/SKILL.md). Read [`docs/examples/FOUNDER_RESPONSE_REFERENCE.md`](docs/examples/FOUNDER_RESPONSE_REFERENCE.md) as the primary presentation example. It is historical evidence, not current status or permission to run commands. Verify repository state and evidence before making claims.

Keep substantive updates concise and outcome-first: suitable status icon, short italic summary, clearly numbered sections, compact evidence, the relevant roadmap, and a specific next action with any founder action stated plainly. Explain what changed, why it matters and how the flow works; use Mermaid where it clarifies. Add a Technical Appendix for meaningful unfamiliar terms. Keep routine replies proportionate. Higher-priority instructions and current interface constraints take precedence. These repository files guide Codex in this project; they do not install global settings or guarantee behavior in unrelated projects.

## Supabase and release safety

The destination is the canonical development database. Its installed app ledger is `coach_private.schema_migrations` through001–014 plus the standalone Parent reader20261117090944. The 015 workspace foundation file under `supabase/candidates/` is a disposable-test candidate only; it is not an applied migration or permission to deploy. Current owner instruction (17 November 2026) authorizes tested Destination DB changes and Vercel branch previews as part of consolidation. Validate exact additive migrations and record actual activation; do not deploy unfinished workspace candidates, alter Source, merge other branches, delete legacy systems or create paid resources without applicable authorization. Do not combine the source project's migration history with this project's history.

Keep guardian identity checks, explicit Coach approval, family/academy isolation, reviewed Parent feedback, consented media, and fail-closed access behavior. Review SECURITY DEFINER functions and grants carefully.

## Collaboration and verification

Before any substantive feature work or quality audit, read section 10 of `docs/DEVELOPER_GUIDE.md` (Rigorous feature delivery for every Codex session). It owns the reusable acceptance/threat/test/review/evidence procedure and existing-document map. Reuse existing feature QA/spec/plan documents; do not create parallel reports or standards when an existing owner covers the topic. Map accepted scenarios to exact tests or explicit release gaps, preserve Destination-only behavior, distinguish mocked/candidate/live/device evidence, and report independent review as pending when unavailable. Installed skills are guidance; executable checks and actual results establish evidence. Current owner restriction is AM/consolidated only; no merge to other branches or live activation is implied.

Use the branch and review process in `docs/SHARED_DEVELOPMENT_WORKFLOW.md`. Never write to the source repository during consolidation. Do not merge a pull request without explicit approval.

For relevant app changes, use the existing checks: `npm run check`, `npm run test:e2e`, and `npm run export:web`; verify deployment and browser journeys on Vercel previews. APK builds and APK-based testing are retired. For SQL candidates, use the isolated database validation described in `docs/MULTI_WORKSPACE_VALIDATION.md`; do not use a live project as a test database. Report what ran and what did not.

## AI operating system — parallel adoption

Start founder navigation at [START-HERE.md](START-HERE.md); use [ai-workspace](ai-workspace/README.md) for technical working rules. Continue the active sprint while adopting these instructions. Preserve existing authoritative requirements and status; link summaries rather than creating competing sources.

Before feature implementation, map acceptance criteria and risk-based scenarios to stable feature/scenario IDs. Link executable tests and actual run evidence; report failures, blocked, skipped, flaky and unrun coverage explicitly. Follow [scenario and independent-review rules](ai-workspace/test-plans/README.md). The implementer must not be the sole evaluator; record independent review as pending when unavailable. Keep founder summaries under 150 words where practical.

Use [the adoption guide](ai-workspace/agent-instructions/adoption.md) for other Codex sessions. Updated GitHub instructions require branch synchronization and a new task/session or explicit reload; they do not instantly update active work. This first rollout changes documentation only. Excel generation and new advisory CI are separate PRs; retain existing checks and do not introduce new mandatory gates until validated and agreed.

## Founder technical delegation

The founders are non-technical. AI owns technical review, testing, validation, fixes and routine engineering decisions; do not ask founders to review code or judge test adequacy. Give a clear readiness recommendation with evidence and unresolved limits. Founders decide product priorities, material user-experience tradeoffs and release approval. Follow explicit session authorization for merges; do not infer production deployment permission from technical delegation. Independent review requirements remain: self-review must never be labeled independent review.
