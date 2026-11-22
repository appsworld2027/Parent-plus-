# Feature Contract: Coach "Needs you" — Overdue fees

Status: draft
Prototype reference: `founders/prototypes/ParentPlus_Coach_Tutor_App.html`, Coach Today screen, section "Needs you" (lines 322–327)
Roadmap: M2-41 Coach "Today" and "Needs you" list (slice: needs-you-fees-overdue)

## Why this feature
Coaches open Today to see what they must do next. The existing "Needs you" list already surfaces children who need feedback. Adding overdue fees gives coaches one consolidated action queue: both teaching follow-ups and payment follow-ups in one place, with one tap to act on each.

## In scope / Out of scope
- In: a second tappable item in the "Needs you" section — "N fees overdue" with the total pending amount — that opens the Fees screen filtered to overdue.
- In: the existing feedback item remains unchanged; both items can appear together.
- Out (later slices, need their own contracts): fee follow-up actions (reminder, check-in, plan) from the fee detail; parent-facing fee reminders; partial/overpaid states; attendance metrics tiles.

## Definitions
- **Overdue fee:** an invoice whose `due_on` is before today (in the academy timezone) and whose `balance_paise > 0` (i.e. not fully paid or voided). An invoice with `paid_paise > 0` but a remaining balance is still overdue.
- **Overdue count:** the number of distinct students who have at least one overdue invoice for an active enrolment today.
- **Overdue total:** the sum of `balance_paise` across all overdue invoices for those students, formatted as ₹ with Indian grouping (e.g. ₹12,500).

## Acceptance criteria
| ID | Given (starting situation) | When (user does) | Then (user sees) | Prototype screen |
|---|---|---|---|---|
| AC-01 | a signed-in coach with an academy that has 2 students with overdue invoices (₹3,500 + ₹2,000) and no feedback needed | opens Today | "Needs you" heading, then one item "2 fees overdue" with sub-text "₹5,500 pending" and a wallet icon (rose colour), chevron on the right | Needs you section |
| AC-02 | same as AC-01 plus 1 child needing feedback | opens Today | "Needs you" heading, then TWO items in order: first "1 child needs feedback" (star, grape), then "2 fees overdue" (wallet, rose) — both tappable with chevrons | Needs you section |
| AC-03 | the overdue fees item is showing | taps it | the Fees screen opens with the "Overdue" filter already selected and the list scrolled to the first overdue student | Fees screen (overdue filter) |
| AC-04 | an academy with no overdue invoices and no feedback needed | opens Today | "All caught up" and "New requests will show here"; no fee item, no feedback item | All caught up |
| AC-05 | an academy with 1 overdue invoice but the student's enrolment has ended | opens Today | "All caught up" (ended enrolments are not counted) | All caught up |
| AC-06 | an academy with 1 overdue invoice for an archived student | opens Today | "All caught up" (archived students are not counted) | All caught up |
| AC-07 | the device has no internet and the coach opens Today | opens Today | "Needs you list could not load. Reference: <ref>" (the same error pattern as the feedback item) | — |
| AC-08 | the data is loading | opens Today | "Checking…" muted line in the Needs you card; no count, no "All caught up" | — |
| AC-09 | an academy with 15 students with overdue invoices totalling ₹42,300 | opens Today | "15 fees overdue" with "₹42,300 pending" — count and amount are accurate for large data | — |
| AC-10 | an academy where a student has both an overdue invoice AND needs feedback | opens Today | BOTH items appear: "1 child needs feedback" AND "1 fees overdue" — each tappable to its own screen | — |

## Decisions agents may make alone (no founder needed)
- How the overdue data is loaded (separate query or combined), component and file names, caching, and code structure.
- Visual styling following the prototype's Coach theme (wallet icon, rose colour, chevron, card style) via `src/ui/prototypeTheme`.
- Changes to shared test support outside `e2e/acceptance/` if a fixture query is missing — recorded in the Demo Pack.
- The Fees screen already supports filter tabs (All / Overdue / Due / Paid); the tap navigation simply selects the "Overdue" tab.

## Must ask the founder if
- A user-visible behaviour is needed that no AC covers.
- An AC cannot be met as written.
- The change affects money, privacy, child safety, or data that users can't get back.

## Tests
Locked acceptance tests: `e2e/acceptance/coach-needs-you-fees-overdue.spec.ts` — one test per AC, titled with its AC ID.

## Change log
| Date | AC | Change | Founder decision link |
|---|---|---|---|