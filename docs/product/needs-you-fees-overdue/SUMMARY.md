# Coach "Needs you" shows overdue fees — Summary

## Problem
Coaches open Today to see what they must do next. "Needs you" already shows children needing feedback; it should also show overdue fees so coaches can act on both in one place.

## Who
Coaches and tutors using the Coach Today screen.

## What we will build
A second item in "Needs you": "N fees overdue" with total pending amount (₹ formatted, wallet icon in rose). Tapping opens the Fees screen with the current month's overview — overdue students listed first with an "Overdue" badge. Both feedback and fees items can appear together. Standard states: loading, error, empty, large data.

## What we will NOT build
Fee follow-up actions (reminder/check-in/plan), parent-facing reminders, partial/overpaid states in the summary, attendance metrics tiles, new filter tabs on the Fees screen.

## Founder decisions (from issue #42)
- Fees screen has no "Overdue" filter — use existing month overview with overdue students first + badge
- Singular "1 fee overdue", plural "N fees overdue"
- Overdue = due_on < today (Asia/Kolkata), balance > 0, not voided, not archived, enrolment active
- TEST receipts never count as paid
- Count is students, not invoices; partly paid counts remaining balance only

## How the founder will test (3 steps)
1. Sign in as coach with an academy that has a student with an overdue invoice (due before today, balance > 0, active enrolment, not archived, not voided).
2. Open Today — verify "X fees overdue" with correct total (₹ formatted, singular/plural grammar).
3. Tap it — verify Fees screen opens with current month's overview, overdue students listed first with "Overdue" badge.

## Assumptions (reply "change X" to override)
A. Overdue definition uses Asia/Kolkata timezone for "today".
B. Fees screen already supports current month overview and can show overdue badge on students.
C. Loading/error/empty patterns identical to existing feedback item in "Needs you".