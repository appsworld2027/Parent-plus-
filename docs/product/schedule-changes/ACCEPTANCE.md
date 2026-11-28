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


## Telling families (added after founder feedback: a holiday parents never hear about is unfinished)
A schedule change is not complete until families are told. The notice reuses the live batch announcement (parents of children enrolled in that batch see it on the child's card for 7 days); no new paid service. Push/SMS delivery stays with M2-40.
| ID | Given | When | Then |
|---|---|---|---|
| SN-01 | an upcoming scheduled class | coach cancels it (status or Edit) | linked families of that batch get "Class update: <batch> on <day> at <time> is cancelled." |
| SN-02 | a cancelled upcoming class | coach restores it | families get "...is on again." |
| SN-03 | an upcoming class | coach moves its time | families get "...moved from <old> to <new>." |
| SN-04 | a holiday on a day with classes in 2 batches | coach confirms | one notice per batch ("Holiday: no <batch> class on <day>."), not one per class |
| SN-05 | optional note typed (e.g. "Diwali") | cancel/holiday/move | the note (max 200 chars) is appended |
| SN-06 | the schedule saved but a notice failed | — | the coach is told families were NOT notified; a "Send notice to families" button retries only the failed notices; no duplicates for those already sent |
| SN-07 | the coach confirms a holiday | — | the dialog says families will be notified; the result says "Families of N batches notified." |
| SN-08 | a class that already started or is in the past | any change | no notice (nothing to tell) |
| SN-09 | a class created new, or an edit that changes no time/status | save | no notice |
Limits (honest): the unsent-notice retry lives on screen only (lost if the app is closed); parents see notices in the app, there is no push/SMS/WhatsApp until M2-40; "extra class" creation sends nothing (coach can use Announce on Today).
Out: recurring holiday calendar (M2-07), weather (M2-08).
Tests: tests/schedule-changes.test.ts, tests/schedule-notice.test.ts (SN-01..05,08,09); e2e/schedule-changes.spec.ts (SC-01,02,04,07, SN-04,05,06,07). Edit-form cancel/move notices are covered by pure tests only; SC-08 partial-save failure NOT RUN.
