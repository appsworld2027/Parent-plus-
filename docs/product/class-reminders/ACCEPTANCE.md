# Feature Contract: Next-class reminder (M2-04)
Status: DRAFT — founder approved all work. One tap drafts and posts a reminder to the batch's families through the batch announcement (same channel and 7-day visibility; push comes with M2-40 delivery).
| ID | Given | When | Then |
|---|---|---|---|
| CR-01 | an upcoming scheduled class | coach views the day | "Remind families" button on that class |
| CR-02 | coach taps it | — | "Reminder: <batch> class today/tomorrow/<date> at <time> (<room>). See you there!" is posted to that batch; confirmation "Families notified." |
| CR-03 | cancelled, completed or already started classes | views | no reminder button |
| CR-04 | the post fails | taps | clear failure message; retry posts once |
| CR-05 | the room is empty | taps | message has no empty brackets |
Tests: tests/class-reminders.test.ts (CR-01..03,05); e2e/class-reminders.spec.ts (CR-02,04).
