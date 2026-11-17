# Product and database sync: working notes

Status: **in progress**, 17 November 2026. These notes record an initial comparison, not a complete feature inventory or approval to deploy. Source `ankitmittal-madman/ParentPlus` main: `380adba9f73b3021a787dff72074df57f2a53634`. Destination baseline `codex/coach-foundation`: `d3b1d68244e4678fd0aeb71280806428c2c656a0`.

| Area | AM evidence | MM evidence | Working direction |
| --- | --- | --- | --- |
| Product journey | `docs/DEVELOPMENT_ROADMAP.md` describes coach setup, child connection, enrolment, attendance and parent visibility. PR #7 contains parent attendance and reports. | `ai-workspace/features/PARENT_MODULE.md`, `PRD.md` and `PROGRESS.md` describe separate Coach and Aurora Parent journeys, reviewed feedback and consented media. | Preserve both sets of product requirements; compare each journey and its acceptance evidence before selecting work. |
| Parent attendance | `apps/web/src/modules/parent-feed/parent-home.tsx` and source migration 053 provide child-scoped sessions, weekly facts and parent signals. Source `DEC-024` says parent reports do not write attendance or assert verified handover. | `ai-workspace/features/PARENT_MODULE.md` lists linked Coach schedule/attendance as remaining work; MM uses distinct family-child and academy-student IDs joined through approved links. | Design destination-native reads and signals, retaining verified-email and Coach approval. Do not copy source SQL or web components directly. |
| Workspace authorization | Source migration 053 checks workspace, enrolment and guardianship and exposes scoped functions. | `ai-workspace/architecture/MULTI_WORKSPACE_FOUNDATION.md` F1 is an isolated candidate. F2 permission/API coverage and F3 workspace UI are pending. | F2 must preserve existing 014 access and close direct API/storage paths before multi-workspace activation. Avoid presenting F1 as deployed. |
| Database history | Source migrations through 053 use workspaces, children and guardianships. | MM migrations through 014 use academies, students, families and approved links. | Keep histories separate and preserve IDs. Map concepts and test migration compatibility in disposable PostgreSQL before proposing live changes. |
| Engineering | Source `AGENTS.md`, `docs/ENGINEERING_STANDARDS.md`, Superpowers skills and source-specific Python quality gate reference Next.js paths and scripts. | MM `AGENTS.md`, Expo checks, browser tests and private SQL candidate tests already exist. PR #2 adopted JUnit evidence. | Evaluate portable practices and dependencies before adopting; do not copy instructions whose tools or scripts are absent. |

## Required follow-up

- Complete the feature and edge-case inventory against both codebases, distinguishing implemented behavior, test fixtures and hosted evidence.
- Map source and destination schema constraints, functions, grants and policies by domain; specify compatibility and rollback for any proposed destination migration.
- Assess Superpowers skills and dependencies against the destination and current session instructions; document which can be used without introducing broken references or conflicting approval rules.
- Design and test an incremental implementation in the destination, including wrong guardian, revoked link, cross-academy, retry and concurrent authorization cases.
- Review current roadmap and decision documents for contradictions; update a shared roadmap only after the comparison is complete.

No live database, source repository or deployment was changed by these notes.

## Parent attendance: concrete integration slice

The source's 10 November checkpoint records signed local browser journeys and isolated database tests; its 16 November `BUILD_PROGRESS.md` says PR #7 was published. Neither establishes real email delivery or hosted/device acceptance. Older entries in `FEATURE_SCENARIO_REGISTER.md` predate PR #7 and must not be used as the present status.

1. Resolve the current signed-in family owner and active approved `parent_coach_links` record for the selected `family_children` ID; derive the student and academy from that link, not client-provided student IDs.
2. Return only that student's permitted class, enrolment and saved attendance projection. MM's `class_sessions`, `enrolments` and `attendance` are academy-scoped; source's `schedule_sessions`, `enrollments` and `attendance_records` are different structures. Never grant the Parent broad base-table access.
3. Treat absent attendance as unrecorded. Source includes present/late/absent/make-up and exact weekly totals; verify MM status meanings and timezone handling before promising equivalent totals. Preserve source's rule that reports do not modify attendance or assert verified physical handover.
4. Recheck link, account, child, academy and enrolment authority inside every server operation. Explicitly test wrong account, other child/academy, rejected/pending/revoked link, archive, concurrent disconnect and stale client state.
5. If signals are introduced, bind a retry receipt to the account, link, session and complete request. Test duplicate and altered retries, expiry, lost responses and revocation while a request waits. A report is never an attendance write.
6. Prepare additive destination-native SQL only after the exact authorization and compatibility design is reviewed; test on disposable databases seeded with 001–014, including 014 guardian workflows. Real Supabase staging and live activation are separate gates.

## Engineering practice assessment

The source contains 15 Superpowers skill entrypoints and associated scripts/references. Its `using-superpowers` entrypoint asks agents to invoke skills automatically and its Codex reference discusses machine-level configuration and subagents. Those instructions cannot override the current session's tool, delegation, user or permission rules. A selective adoption must include complete referenced resources and verify compatibility rather than copying `AGENTS.md` alone. Source's source-specific Python quality gate depends on its own Next.js paths and requirement registry; MM's existing Expo workflow remains authoritative. Applicable transferable principles include requirement-to-test mapping, treating skipped or zero tests as failures, recording exact evidence and distinguishing fixture tests from real provider checks.
