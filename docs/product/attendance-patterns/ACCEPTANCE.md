# Feature Contract: Attendance patterns and drop-out alerts (M2-12)

Status: DRAFT — founder standing permission to take recommended options. Source: docs/product/BACKLOG.md "attendance-patterns". Roadmap: M2-12

## Why
A child who quietly stops coming is the first sign of a drop-out. The coach should see it on Today without scanning every register.

## Recommended rule (assumed, founder may change)
Alert when a child has been marked **absent in the last 3 marked classes of a batch** they are enrolled in (late counts as attending). An unmarked class ends the streak (we never alert on missing data). Cancelled and future classes are ignored. Window: classes in the last 45 days.

## In / Out
- In: a "Needs you" style card on Today listing child, batch and streak length; nothing shown when no alerts.
- Out: messaging the parent, push notifications, configurable thresholds, charts.

## Acceptance criteria
| ID | Given | When | Then |
|---|---|---|---|
| AP-01 | a child absent in the 3 latest marked classes of their batch | coach opens Today | "Attendance alerts" lists "<name> · <batch> · absent 3 classes in a row" |
| AP-02 | a child absent only 2 in a row | coach opens Today | no alert for that child |
| AP-03 | absent, absent, absent but an older present | opens Today | alert shows streak 3 (counts the leading run only) |
| AP-04 | the latest marked class is present or late | opens Today | no alert (streak broken) |
| AP-05 | an unmarked class sits inside the streak | opens Today | streak ends at the unmarked class |
| AP-06 | cancelled or future classes | opens Today | they are ignored |
| AP-07 | an archived child, or an enrolment ended or not started | opens Today | no alert |
| AP-08 | no alerts | opens Today | the card is not shown (no clutter) |
| AP-09 | more than one child | opens Today | longest streak first, then name |
| AP-10 | the data fails to load | opens Today | the card is hidden; the rest of Today still works |
| AP-11 | attendance belongs to another academy | any | never shown (queries are academy-scoped; RLS enforced by the existing tables) |

## Agents may decide alone
Wording, ordering, layout. No new database objects: reads existing `class_sessions`, `attendance`, `students`, `enrolments`.

## Must ask the founder if
It needs a hosted database change, notifications (paid) or messaging parents.

## Tests
Pure rules tests/attendance-patterns.test.ts (AP-01..07, 09); browser spec e2e/attendance-patterns.spec.ts (AP-01, 02, 08, 10). AP-11 relies on existing RLS and is NOT RUN against a live database.
