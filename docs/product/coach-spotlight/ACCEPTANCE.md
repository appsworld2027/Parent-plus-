# Feature Contract: Coach "Spotlight today" — who to observe today (M2-18)

Status: approved by blanket founder approval 2026-11-27 (recommended option); built by Claude, self-reviewed only (independent review pending).
Roadmap: M2-18 Spotlight rotation (who to observe today), P0.

## Why
A coach cannot watch every child every class. Today should quietly suggest the few children in today's classes who have gone longest without a recorded note, so attention rotates fairly.

## In / Out
- In: a "Spotlight today" card on Today listing up to 3 children from today's non-cancelled classes, ranked by who has gone longest without a recorded note (never-noted first, then oldest last note; ties by name). Each row: child, class, and "No note yet" or "Last note N days ago". Tap opens the existing feedback screen. States: loading, error, empty.
- Out: AI suggestions, per-parent reactions, notifications, changing how notes are written, any database change.

## Definitions
- **Noted:** the child is a recipient of an observation with status = recorded (drafts never count). Student-level and batch-level notes both count when the child is a recipient.
- **Candidate:** a non-archived child with an enrolment active on today's date in a class that is on today's schedule and not cancelled. A child in two classes appears once.
- **Days ago:** whole calendar days between the note's date and today in the academy time zone (Asia/Kolkata).

## Acceptance criteria
| ID | Given | When | Then |
|---|---|---|---|
| SP-01 | A class today with enrolled children | Coach opens Today | A heading "Spotlight today" is shown |
| SP-02 | Child has never had a recorded note | Opens Today | Row shows the child, the class name and "No note yet" |
| SP-03 | 5 candidates: 2 never noted, 3 noted 2, 9 and 20 days ago | Opens Today | Exactly 3 rows: the 2 never-noted (by name) then the 20-days-ago child |
| SP-04 | Child's last recorded note was 3 days ago / 1 day ago / today | Opens Today | "Last note 3 days ago" / "Last note 1 day ago" / "Last note today" |
| SP-05 | A child is enrolled in a batch with no class today | Opens Today | That child is not listed |
| SP-06 | Today's only class is cancelled | Opens Today | No Spotlight card |
| SP-07 | Archived child, or child whose enrolment ended | Opens Today | Not listed |
| SP-08 | Child has only a draft note | Opens Today | Treated as "No note yet" |
| SP-09 | Spotlight row showing | Taps it | The "Feedback for parents" screen opens |
| SP-10 | No class today | Opens Today | No Spotlight card |
| SP-11 | Every candidate has a recorded note today | Opens Today | A muted line "Everyone in today's classes has a note today"; no rows |
| SP-12 | Notes cannot be read | Opens Today | One line "Spotlight could not load. Reference: <ref>"; the rest of Today still works |
| SP-13 | A child is in two classes today | Opens Today | Listed once |
| SP-14 | 600 candidates, 580 never noted | Opens Today | Exactly 3 rows (the first 3 never-noted by name) |

## Decisions made by the AI (recommended, per blanket approval)
- Cap of 3 rows; all-time recorded notes decide the ranking; a tap goes to the existing feedback screen, not a new per-child screen.
## Tests
`e2e/acceptance/coach-spotlight.spec.ts` (locked); browserless: `tests/spotlight.test.ts`, `tests/component/Spotlight.test.tsx`; workbook `testing/workbooks/coach-spotlight.xlsx`.
