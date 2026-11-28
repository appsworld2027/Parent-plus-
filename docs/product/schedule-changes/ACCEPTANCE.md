# Feature Contract: Schedule changes (M2-05)

Status: DRAFT — founder standing permission to take recommended options. Roadmap: M2-05
Already existed: create (extra class), edit/move (until attendance is saved), cancel via status. New: one-tap Restore and a Holiday action.

## Acceptance criteria
| ID | Given | When | Then |
|---|---|---|---|
| SC-01 | a cancelled class | coach views the day | a "Restore class <batch> at <time>" button shows |
| SC-02 | coach taps Restore | — | class returns to scheduled; confirmation "Class restored." |
| SC-03 | a scheduled or completed class | views the day | no Restore button |
| SC-04 | a day with scheduled classes | coach taps "Mark this day as a holiday" and confirms | every scheduled class without saved attendance becomes cancelled; "Holiday set: N classes cancelled." |
| SC-05 | classes with attendance already saved, or already cancelled | holiday | they are left untouched |
| SC-06 | no scheduled classes on the day | holiday | the dialog says there is nothing to cancel; nothing changes |
| SC-07 | coach declines the dialog | — | nothing changes |
| SC-08 | a save fails part-way | holiday/restore | a clear retry message with a reference; list reloads showing true state |
| SC-09 | extra class | coach uses Create a class | existing behaviour unchanged (regression) |

Out: messaging families about the change (no notifications service), recurring holiday calendar (M2-07), weather (M2-08).
Tests: tests/schedule-changes.test.ts (SC-01,03,05,06 rules); e2e/schedule-changes.spec.ts (SC-01,02,04,07). SC-08 NOT RUN (failure injection needs a fixture flag).
