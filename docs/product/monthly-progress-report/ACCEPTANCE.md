# Feature Contract: Monthly progress report (M2-23)
Status: DRAFT — founder standing permission. Built only from facts already recorded; nothing sent automatically.
| ID | Given | When | Then |
|---|---|---|---|
| MR-01/02 | attendance for a month | coach prepares report on the student profile | "attended X of Y (Z late), missed N" for that month only, academy timezone |
| MR-03/06 | recorded observations | — | up to 3 newest notes of the month, blank skipped, each trimmed to 300 chars |
| MR-04/10 | nothing recorded | — | "Nothing was recorded this month." and no share button |
| MR-05 | month boundary | — | uses academy timezone |
| MR-07 | January | previous month | December of previous year |
| MR-08 | notes but no attendance | — | no "Classes:" line |
| MR-09 | facts exist | prepare this month | text with child name and counts shown |
| MR-12 | status other than present/late/absent | report | ignored, not counted as attended (unit) |
| MR-13 | batch-wide notes exist | report | never included; only notes written for this child alone (browser, no-notes case) |
| MR-11 | valid guardian phone on file | share | WhatsApp opens prefilled; otherwise a note explains how to add a number |
Out: automatic monthly sending, PDF, fee status, cancelled classes (excluded from counts). Tests: tests/monthly-report.test.ts, e2e/monthly-report.spec.ts (MR-09,10). MR-11 sharing NOT RUN in a browser (opens an external link).
Review fixes (independent agent, 28 Nov): month-range paged queries, one-child-only notes, per-class history queries, stale-result guard, key per student. NOT browser-covered: switching between two children (fixture has one), stale smart-defaults race.
