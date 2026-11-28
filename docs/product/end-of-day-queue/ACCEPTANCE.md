# Feature Contract: End-of-day review queue (M2-17)

Status: DRAFT — founder standing permission. Roadmap: M2-17

## Why
At the end of class the coach needs one place showing what is still unfinished.

## Acceptance criteria
| ID | Given | When | Then |
|---|---|---|---|
| EQ-01 | a class that started today with no attendance saved | coach opens Today | "Wrap up today" lists "N class(es) need attendance" |
| EQ-02 | feedback drafts exist | opens Today | the card lists "N feedback draft(s) to finish" |
| EQ-03 | tapping the attendance line / the drafts line | — | opens Schedule / Feedback |
| EQ-04 | cancelled, future, other-day or attendance-saved classes | opens Today | not counted |
| EQ-05 | nothing pending | opens Today | no card |
| EQ-06 | data fails to load | opens Today | card hidden, rest of Today works |
Out: pending parent approvals (already shown elsewhere), push reminders.
Tests: tests/wrap-up.test.ts (EQ-01,02,04 + wording); e2e/end-of-day-queue.spec.ts (EQ-01,03,05,06).
