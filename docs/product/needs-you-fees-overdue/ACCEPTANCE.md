# Feature Contract: Coach "Needs you" shows overdue fees

Status: draft (built 2026-11-27 on founder instruction; tests: tests/overdue-fees.test.ts, e2e/needs-you-fees.spec.ts. NOT covered: AC-07,08 states reuse existing, AC-14 TEST receipts depends on the DB view, offline run, full suite)
Prototype reference: `founders/prototypes/ParentPlus_Coach_Tutor_App.html`, Coach Today screen, section "Needs you" (line ~322)
Roadmap: M2-41 Coach "Today" and "Needs you" list

## Why this feature
Coaches need a single place to see everything that requires their attention today. "Needs you" already shows children needing feedback; it should also show overdue fees so coaches can act on both in one place.

## In scope / Out of scope
- In: a second item in "Needs you": "N fees overdue" with total pending amount (₹ formatted). Tapping opens Fees screen with current month's overview, overdue students listed first with an "Overdue" badge. Both feedback and fees items can appear together. Standard states: loading, error, empty, large data.
- Out (explicitly not in this feature): Fee follow-up actions (reminder/check-in/plan) from the fee detail; parent-facing fee reminders; partial/overpaid states in the Needs you summary; attendance metrics tiles; new filter tabs on the Fees screen.

## Definitions
- **Overdue fee:** an invoice where:
  - `due_on` < today (Asia/Kolkata timezone)
  - `balance_paise` > 0
  - invoice is NOT voided
  - student is NOT archived
  - student has an enrolment active today (enrolment.end_date IS NULL OR enrolment.end_date >= today)
- **TEST receipts:** any receipt with `source = 'TEST'` is ignored — it never counts as paid.
- **Counting:** the count is students, not invoices. A student with 2 overdue invoices counts once; the amount sums both remaining balances.
- **Partly paid:** an overdue invoice with a valid (non-TEST) receipt reducing the balance counts only its remaining `balance_paise`.

## Acceptance criteria
| ID | Given (starting situation) | When (user does) | Then (user sees) | Prototype |
|---|---|---|---|---|
| AC-01 | Coach with 2 students with overdue invoices (₹3,500 + ₹2,000), no feedback needed | Opens Today | "2 fees overdue" with "₹5,500 pending", wallet icon (rose), chevron | — |
| AC-02 | Same + 1 child needing feedback | Opens Today | TWO items in order: feedback (star, grape) then fees (wallet, rose) | — |
| AC-03 | Overdue fees item showing | Taps it | Fees screen opens with current month's overview, overdue students listed first with an "Overdue" badge | — |
| AC-04 | No overdue invoices, no feedback needed | Opens Today | "All caught up" and "New requests will show here" | — |
| AC-05 | Overdue invoice but enrolment ended | Opens Today | "All caught up" (ended enrolments excluded) | — |
| AC-06 | Overdue invoice for archived student | Opens Today | "All caught up" (archived students excluded) | — |
| AC-07 | Device offline | Opens Today | "Needs you list could not load. Reference: <ref>" | — |
| AC-08 | Data loading | Opens Today | "Checking…" muted line in Needs you card | — |
| AC-09 | 15 students with overdue invoices totalling ₹42,300 | Opens Today | "15 fees overdue" with "₹42,300 pending" — accurate for large data | — |
| AC-10 | Student has both overdue invoice AND needs feedback | Opens Today | BOTH items appear, each tappable to its own screen | — |
| AC-11 | 1 student with an overdue invoice (₹1,500), no feedback needed | Opens Today | "1 fee overdue" with "₹1,500 pending" (singular grammar) | — |
| AC-12 | Invoice due TODAY (due_on = today Asia/Kolkata), balance > 0 | Opens Today | "All caught up" (due today is NOT overdue) | — |
| AC-13 | Invoice overdue but voided, balance > 0 | Opens Today | "All caught up" (voided invoices excluded) | — |
| AC-14 | Overdue invoice paid only by a TEST receipt (source = 'TEST') | Opens Today | "1 fee overdue" with full amount pending (TEST receipts never count as paid) | — |
| AC-15 | Student has 2 overdue invoices (₹2,000 + ₹3,000), both partly paid leaving ₹500 and ₹1,000 balance | Opens Today | "1 fee overdue" with "₹1,500 pending" (counts student once, sums remaining balances) | — |

## Decisions agents may make alone (no founder needed)
- How the data is loaded, component and file names, caching, and code structure.
- Visual styling, following the prototype's Coach theme (wallet icon, rose colour, chevron, card style) via `src/ui/prototypeTheme`.
- Changes to shared test support outside `e2e/acceptance/` if a fixture query is missing — recorded in the Demo Pack.

## Must ask the founder if
- A user-visible behaviour is needed that no AC covers.
- An AC cannot be met as written.
- The change affects money, privacy, child safety, or data that users can't get back.

## Tests
Locked acceptance tests: `e2e/acceptance/coach-needs-you-fees-overdue.spec.ts` — one test per AC, titled with its AC ID.

## Change log
| Date | AC | Change | Founder decision link |
|---|---|---|---|
| 2026-11-23 | All | Incorporated founder /changes from issue #42: Fees screen navigation, singular/plural grammar, money edge cases, student-level counting | https://github.com/appsworld2027/Parent-plus-/issues/42 |