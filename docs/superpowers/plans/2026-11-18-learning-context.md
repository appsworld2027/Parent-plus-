# Learning Context Implementation Plan

> Execute inline using the repository planning, TDD and verification skills; reuse the independent testing agent for final review. User has already authorized development and delegated routine engineering choices. No new production approval flow is inferred from skill examples.

**Goal:** Build the tested private learning-context foundation for curriculum-aware feedback.

**Architecture:** Private additive021 follows015–020 and their academy→workspace→actor lock order. Normalized immutable facts and scoped reads precede any AI/provider or Parent publication integration.

**Tech Stack:** Existing PostgreSQL/PGlite, TypeScript and Vitest; no dependency changes.

**Spec:** `docs/superpowers/specs/2026-11-18-learning-context-design.md`.

## Constraints and review focus

- Preserve001–014 and Parent identity/consent; no live SQL, provider, accounts or messages.
- Fixed same-workspace references; current authority checked before request replay.
- Unknown stage/version, co-instructor source, group evidence, future classes and unplanned goals must not turn into false learning claims.
- Immutable versions and dated placement must preserve earlier source meaning; exact retries never roll back newer state.
- Bound context and clearly distinguish actual observation, planned content and assessment. No whole-class/private family data in model requests.

## Task1 — Structured learning records and context

Files: `supabase/candidates/202611180021_learning_context.sql`, `tests/learning-context-database.test.ts`.

- [x] Write failing curriculum/placement/plan/evidence/context and authority/privacy/replay tests using existing disposable fixtures.
- [x] Observe missing-operation failures.
- [x] Implement normalized curriculum version, stage, objective, placement, plan, plan-objective, assessment and receipt tables; RLS/private grants and immutable triggers.
- [x] Implement guarded curriculum publish, plan save, placement, assessment and context functions, with bounded input/output and exact revision provenance.
- [x] Run targeted SQL tests; fix concrete failures and recheck reapplication/security.

## Task2 — Provider-independent request boundary

Files: `src/learning/feedbackContext.ts`, `tests/learning-feedback-context.test.ts`.

- [x] Observe a failing request-builder test.
- [x] Implement an explicitly advisory single-child request with source references, distinct plan/evidence/note sections, bounded size and review-only instructions. No provider SDK, secrets or execution tools.
- [x] Verify missing context, oversized/untrusted inputs, unsupported versions and no auto-mastery/publication behavior.

## Task3 — Review, evidence and handover

Files: `PRD.md`, `docs/PARENT_PRD.md`, `docs/CONSOLIDATED_PRODUCT_ROADMAP.md`, `docs/LEARNING_CONTEXT_QA.md`, `PROGRESS.md`, developer guide.

- [x] Add stable requirement/scenario IDs before implementation and keep actual evidence separate from targets.
- [x] Run TypeScript/full automated tests and actual PostgreSQL checks appropriate to new SQL. Existing runtime has no new UI; explain why browser/provider/device reruns are excluded unless changes justify them.
- [x] Commit a concrete candidate; obtain independent review of exact commit and address findings with regressions.
- [x] Push and open a focused PR; existing CI regression/export checks must pass before any authorized merge. Do not activate Supabase candidate.
- [ ] Report completed slice, tests, source/PR, explicit UI/provider/Parent/staging/scale limits and next implementation step.
