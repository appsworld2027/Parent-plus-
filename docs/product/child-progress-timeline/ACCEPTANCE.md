# Feature Contract: Child progress timeline

Status: DRAFT — founder standing permission to take recommended options. Source: docs/product/BACKLOG.md "child-progress-timeline".

## Why
Parents see coach updates as one long list. A dated timeline lets them see growth over months at a glance.

## Recommended design (assumed)
Parent-side, no database change: the existing reviewed coach feedback for the chosen child is shown newest first under month headings ("November 2026"), with a count of updates. Only reviewed feedback already visible to that parent appears.

## In / Out
- In: month grouping, count line, newest first, per child.
- Out: charts, scores, skills tracking, attendance in the timeline, coach-side timeline.

## Acceptance criteria
| ID | Given | When | Then |
|---|---|---|---|
| CT-01 | feedback in two different months | parent opens Home | two month headings, newest month first |
| CT-02 | several updates in one month | opens Home | one heading, updates newest first beneath |
| CT-03 | feedback | opens Home | a line "N updates from your coaches" (singular "1 update") |
| CT-04 | no feedback | opens Home | existing empty card; no headings or count |
| CT-05 | feedback for another child | switches child | only the chosen child's updates and months |
| CT-06 | month boundaries | reviewed 30 Nov late evening UTC in a +5:30 zone | grouped by the family's own timezone date |
| CT-07 | a family timezone is missing | opens Home | falls back to Asia/Kolkata |

## Agents may decide alone
Wording, layout. Must ask founder for: scoring, charts, new data collection, hosted DB changes.

## Tests
Pure rules tests/progress-timeline.test.ts (CT-01..03, 05..07); browser spec e2e/child-progress-timeline.spec.ts (CT-01..04).
