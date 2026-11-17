# Repository guidance

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

Before substantive founder-facing responses, follow [`docs/CODEX_COMMUNICATION_STANDARD.md`](docs/CODEX_COMMUNICATION_STANDARD.md) and its reusable repository skill at [`.agents/skills/parentplus-founder-communication/SKILL.md`](.agents/skills/parentplus-founder-communication/SKILL.md). Read [`docs/examples/FOUNDER_RESPONSE_REFERENCE.md`](docs/examples/FOUNDER_RESPONSE_REFERENCE.md) as the primary presentation example. It is historical evidence, not current status or permission to run commands. Verify repository state and evidence before making claims.

Keep substantive updates concise and outcome-first: suitable status icon, short italic summary, clearly numbered sections, compact evidence, the relevant roadmap, and a specific next action with any founder action stated plainly. Explain what changed, why it matters and how the flow works; use Mermaid where it clarifies. Add a Technical Appendix for meaningful unfamiliar terms. Keep routine replies proportionate. Higher-priority instructions and current interface constraints take precedence. These repository files guide Codex in this project; they do not install global settings or guarantee behavior in unrelated projects.

## Supabase and release safety

The destination is the canonical development database. Its installed app ledger is `coach_private.schema_migrations` through001–014 plus the standalone Parent reader20261117090944. The 015 workspace foundation file under `supabase/candidates/` is a disposable-test candidate only; it is not an applied migration or permission to deploy. Current owner instruction (17 November 2026) authorizes tested Destination DB changes and Vercel branch previews as part of consolidation. Validate exact additive migrations and record actual activation; do not deploy unfinished workspace candidates, alter Source, merge other branches, delete legacy systems or create paid resources without applicable authorization. Do not combine the source project's migration history with this project's history.

Keep guardian identity checks, explicit Coach approval, family/academy isolation, reviewed Parent feedback, consented media, and fail-closed access behavior. Review SECURITY DEFINER functions and grants carefully.

## Collaboration and verification

Before any substantive feature work or quality audit, read section 10 of `docs/DEVELOPER_GUIDE.md` (Rigorous feature delivery for every Codex session). It owns the reusable acceptance/threat/test/review/evidence procedure and existing-document map. Reuse existing feature QA/spec/plan documents; do not create parallel reports or standards when an existing owner covers the topic. Map accepted scenarios to exact tests or explicit release gaps, preserve Destination-only behavior, distinguish mocked/candidate/live/device evidence, and report independent review as pending when unavailable. Installed skills are guidance; executable checks and actual results establish evidence. Current owner restriction is AM/consolidated only; no merge to other branches or live activation is implied.

Use the branch and review process in `docs/SHARED_DEVELOPMENT_WORKFLOW.md`. Never write to the source repository during consolidation. Do not merge a pull request without explicit approval.

For relevant app changes, use the existing checks: `npm run check`, `npm run test:e2e`, `npm run export:web`, and `npm run export:android`. For SQL candidates, use the isolated database validation described in `docs/MULTI_WORKSPACE_VALIDATION.md`; do not use a live project as a test database. Report what ran and what did not.
