# Feature Contract: Spotlight rotation (M2-18)

Status: DRAFT — founder standing permission. Roadmap: M2-18
Recommended rule: up to 3 children from today's non-cancelled classes, least recently observed first; never-observed first; children already observed today are skipped. History window 90 days.

## Acceptance criteria
| ID | Given | When | Then |
|---|---|---|---|
| SP-01 | children in today's classes | coach opens Today | "Spotlight today" lists up to 3 |
| SP-02 | a never-observed child and others observed | — | never-observed first, then oldest |
| SP-03 | line wording | — | "<name> · last observed N days ago" or "no recorded observation yet" |
| SP-04 | a child already observed today | — | skipped |
| SP-05 | archived child, enrolment ended/not started, batch without a class today, cancelled class | — | not picked |
| SP-06 | no classes today or no candidates | — | no card |
| SP-07 | data fails | — | card hidden |
| SP-08 | a spotlight line | coach taps it | opens Feedback to write the observation |
Out: pre-selecting the child in the form, per-batch rotation memory.
Tests: tests/spotlight.test.ts (SP-02..05); e2e/spotlight-rotation.spec.ts (SP-01,03,06,07,08).
