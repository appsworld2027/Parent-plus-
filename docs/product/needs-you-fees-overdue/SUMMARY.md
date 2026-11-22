# Summary: Coach "Needs you" — Overdue fees

## Problem
Coaches need a single place to see everything that requires their attention today. The "Needs you" section on Today already shows children who need feedback. It should also show overdue fees so coaches can act on payment follow-ups with one tap.

## Who
Coaches and tutors using the Coach Today screen.

## What we will build
- A second item in the "Needs you" section: "N fees overdue" with the total pending amount (₹ formatted with Indian grouping).
- Tapping it opens the Fees screen pre-filtered to "Overdue".
- Both the feedback item and the fees item can appear together; order: feedback first, then fees.
- Standard states: loading ("Checking…"), error (with reference), empty ("All caught up"), large data (accurate count/amount).

## What we will NOT build
- Fee follow-up actions (reminder, check-in, plan) from the fee detail — later slice.
- Parent-facing fee reminders — later slice.
- Partial/overpaid states in the Needs you summary — later slice.
- Attendance metrics tiles — separate feature.

## How the founder will test it (3 steps)
1. Sign in as a coach with an academy that has at least one student with an overdue invoice (due date before today, balance > 0).
2. Open the Today tab — verify "Needs you" shows "X fees overdue" with the correct total amount.
3. Tap the item — verify the Fees screen opens with the "Overdue" filter selected and the overdue student(s) listed.

## Founder decisions
None required for this slice — behaviour is defined by the prototype and the existing fee model.

## Assumptions
- Overdue = invoice.due_on < today (academy timezone) AND balance_paise > 0 AND student not archived AND enrolment active today.
- The Fees screen already has the filter tabs and data; we only need to navigate to it with the right tab selected.
- The existing "Needs you" loading/error/empty patterns apply identically to the fees item.