# Feature Contract: Attendance suggested from parent signals (M2-10)

Status: DRAFT — built under the founder's standing direction (28 Nov). Roadmap: M2-10. No database change (reads existing `parent_signals`, coach-only).

## Why
Parents already tell the coach "running late / missing today / dropped off". The coach should not have to retype that into attendance, but must stay in charge of what is saved.

## In / Out
- In: on an unmarked class, a button "Apply parent signals (N)" fills Missing today -> absent, Running late -> late, Dropped off -> present, only for children the coach has not marked. Nothing is saved until the coach taps Save.
- Out: auto-saving, overriding coach marks, signals from past days, new signal types, notifications.

## Acceptance criteria
| ID | Given | When | Then |
|---|---|---|---|
| SA-01 | signals for children in the class | rule applied | each signal maps to one mark (present / late / absent) |
| SA-02 | the coach already marked a child | apply | that mark is never changed |
| SA-03 | a signal for a child not in this class | apply | ignored |
| SA-04 | two signals for one child | apply | the newest one wins |
| SA-05 | unknown signal kind or no signals | apply | nothing suggested |
| SA-06 | suggestions exist | screen shows | wording says what parents told the coach and that nothing is saved until Save |
| SA-07 | a Missing today signal on an unmarked class | coach taps Apply parent signals | child shows absent as an unsent device draft |
| SA-08 | no signals | coach opens the class | no button |
| SA-09 | the signals cannot load | coach opens the class | no suggestion; manual marking still works |
| SA-10 | attendance already saved for the class | coach opens it | no suggestion |

## Agents may decide alone
Wording and placement. Must ask the founder before auto-saving anything or showing signals to other users.

## Tests
tests/signal-attendance.test.ts (SA-01..06), e2e/signal-attendance.spec.ts (SA-07..10). Hosted real-login check NOT RUN.
