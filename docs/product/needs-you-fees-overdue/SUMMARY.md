# Coach "Needs you" shows overdue fees — Summary

## Problem
Coaches open Today to see what they must do next. "Needs you" already shows children needing feedback; it should also show overdue fees so coaches can act on both in one place.

## Who
Coaches and tutors using the Coach Today screen.

## What we will build
A second item in "Needs you": "N fees overdue" with total pending amount (₹ formatted, wallet icon in rose). Tapping opens the Fees screen with a new **Overdue section at the top** — every student with an overdue fee from ANY month (not just this month), one row each with student, batch, billing month(s) and amount still due, oldest first. The monthly overview below stays as it is. Both feedback and fees items can appear together. Standard states: loading, error, empty, large data. If only one of fees/feedback fails to load, show what loaded plus one error line.

## What we will NOT build
Fee follow-up actions (reminder/check-in/plan), parent-facing reminders, partial/overpaid states in the summary, attendance metrics tiles, new filter tabs on the Fees screen.

## Founder decisions (from issue #42)
- Fees screen gets an Overdue section (not a filter): any month, oldest first, monthly overview below unchanged
- Singular "1 fee overdue", plural "N fees overdue"
- Overdue = due_on < today (academy timezone — Asia/Kolkata), balance > 0, not voided, not archived, enrolment active
- Test receipts (mode = 'test') never count as paid (already excluded from balance_paise)
- Count is students, not invoices; partly paid counts remaining balance only
- Partial load: show what loaded + one error line; whole-card error only when both fail

## How the founder will test (3 steps on the Vercel preview)
1. Sign in as coach with an academy that has a student with an overdue invoice (due before today, balance > 0, active enrolment, not archived, not voided).
2. Open Today — verify "X fees overdue" with correct total (₹ formatted, singular/plural grammar).
3. Tap it — verify Fees screen opens with **Overdue section at the top** showing that student with billing month and amount due.

## Assumptions (reply "change X" to override)
A. Overdue definition uses academy timezone (Asia/Kolkata for every academy today).
B. Fees screen can add an Overdue section at the top; monthly overview below unchanged.
C. Loading/error/empty/partial-load patterns identical to existing feedback item in "Needs you".