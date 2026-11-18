# Learning context — requirements and scenario evidence

18 November2026. Private021 after015–020. Requirements LRN-01–05; design: [curriculum-aware feedback](superpowers/specs/2026-11-18-learning-context-design.md). Related58-item catalogue features remain incomplete. No UI/provider/live acceptance is inferred from SQL tests.

## Observable acceptance and executable scenarios

Database preconditions: disposable001–014 plus private015–021; fictional two academies, two same-batch children, a foreign child, owner/admin-only user, actual instructor, substitute, finance and ineligible accounts. Each case starts an isolated transaction; named tests state actions and expected results.

| Feature/scenarios | Category/priority | Expected result | Executable evidence | Current result |
| --- | --- | --- | --- | --- |
| LRN-01-SC-001–004 | Integrity/permission/recovery P0 | Immutable curriculum versions, strict bounded input, exact replay, no stale or ineligible publication | `tests/learning-context-database.test.ts` named IDs | PASS in disposable tests |
| LRN-02-SC-001–003 | Product/integrity P0 | Individual stages per curriculum, explicit remapping, dated placements, no inferred mastery | Same file | PASS in disposable tests |
| LRN-03-SC-001–002 | Integrity/roles P0 | Immutable plan revisions with valid objectives; admin planning is distinct from teaching evidence | Same file | PASS in disposable tests |
| LRN-04-SC-001–006 | Evidence/privacy/recovery P0 | Exact recorded single-child source, no draft/group/foreign/future claims; append-only teacher corrections and safe replay | Same file | PASS in disposable tests |
| LRN-05-SC-001–006 | Isolation/security P0 | Bound child-specific dated context; no PII/raw notes/peer data; current eligibility, revocation, RLS/private grants and no live ledger change | Same file | PASS in disposable tests |
| LRN-05-SC-007–010 | AI boundary/reliability P0 | Bounded advisory request; plan is not attainment; no IDs/contact data in provider input; missing/oversize rejected | `tests/learning-feedback-context.test.ts` | PASS in disposable tests |
| LRN-05-SC-011 | Concurrency P0 | Actual PG connections serialize plan/placement/read, revoke/evidence writes and identical evidence replay | `scripts/test-workspace-concurrency.mjs`, four learning cases | PASS,29/29total |

Independent reviewer: existing `/root/vercel_testing`; final review of implementation commit`c72c0e6c744d4d593ae16c95918097d259daf939` found no material remaining blocker for this private slice. Independent focused run:51/51PASS across2files,4.92seconds. The PostgreSQL29/29run was executed by the implementer and inspected by the reviewer, not independently rerun. Subsequent documentation-only evidence updates do not change the reviewed implementation; hosted CI identity/results are recorded in PR17. Initial risk/code review found four concrete issues: exact source revision authorship, colleague withdrawal via a new note, missing structural workspace/version/stage references, and completed-class rejection. Authorship, withdrawal and completed-class regressions were observed failing before their fixes. Direct privileged-insert tests verify the added composite FKs. A separate cap regression exposed absent truncation metadata; the bounded output now explicitly marks it.

## Actual execution

- Targeted database/request builder: **51/51PASS**,5.02seconds,0failed/skipped (44database cases and7request-builder cases). The initial setup path typo and absent history rows in the shared fixture were corrected; they are not credited as behavioral REDs. A temporary test without021 then initialized correctly and failed with the expected missing publication operation.
- Independent PostgreSQL17 connections: **29/29PASS**, including four actual new learning races. Each confirms expected blocker relationships, committed values and no forbidden writes/duplicate receipts. No remote database is permitted by the runner.
- Initial full TypeScript+regression: TypeScript PASS;469PASS,2existing migration-bundle checks blocked by sandbox child-processEPERM. Fresh full rerun with required local execution permission: **TypeScript and471/471tests across38files PASS**,80.75seconds,0failed/skipped. No assertions or production rules were weakened to address the sandbox restriction.
- Logs: `/tmp/parentplus-learning-targeted.log`, `/tmp/parentplus-learning-postgres.log`, `/tmp/parentplus-learning-check-final.log`; missing-operation/review REDs use `/tmp/parentplus-learning-*-red.log`. Workspace logs may expire; [PR17](https://github.com/appsworld2027/Parent-plus-/pull/17) records final source/CI evidence.

Eight new RLS tables, immutable records/receipts and eight private definer functions remain inaccessible to anon/authenticated/service roles. Same-workspace/version/stage FKs, normal source-author checks and parent-handoff noncreation are covered. Completed classes support post-class feedback inside existing authority windows. Current assessment facts are an explicitly teaching-visible summary, not permission to read past teachers' notes; context has at most10latest applicable goal assessments and marks truncation. One curriculum per class plan and bounded curriculum sizes are first-slice limits. The existing exclusive authority anchor serializes same-workspace activity; real load/lock/pool benchmarks remain required.

UI/accessibility/native/browser: NOT APPLICABLE to this private no-UI slice; existing app regression checks remain CI gates. Actual Coach/Parent curriculum/plan/journey screens, speech recognition, AI output quality, provider privacy/cost/latency, reviewed Parent learning snapshots and real Supabase staging are NOT BUILT/NOT RUN. Load/capacity1000students/100coaches, media retention, migration/restore and stale-client cutover remain separate release gates. Do not run021 on live Supabase or present it as an owner paste script.
