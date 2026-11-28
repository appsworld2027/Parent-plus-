# Founder test script — Vercel preview only
Rules: use the Vercel preview link, a coach account with a verified email, and ONLY the fictional sample data below. Never real families or children. Tick each row; if it differs, write one line: "row 5: Overdue section missing". Each feature has an Excel with all scenarios in `testing/workbooks/`.

## Sample data to create first (Students and Fees screens)
- Batches: **Fictional Clay Class** (₹2,500/month), **Fictional Art Class** (₹3,000/month).
- Students: **Fictional Aarav**, **Fictional Bela**, **Fictional Chirag**, **Fictional Dev** in Clay; **Fictional Esha** in Art. Add one more, **Fictional Old**, then archive it.
- A class today for each batch on Schedule.
- Invoices: Aarav ₹2,000 due last month, unpaid; Bela ₹3,500 due last month, half paid (₹1,750 recorded); Chirag ₹2,500 due today (not overdue).

| # | Do this | Expect | Feature |
|---|---|---|---|
| 1 | Open Today | Heading "Needs you" above the classes | M2-41 |
<!-- feature:coach-needs-you -->
| 2 | With no feedback written for Aarav | "N children need feedback" with "No update for over a week"; tap it, "Feedback for parents" opens | coach-needs-you |
| 3 | Record feedback for every child, reopen Today | "All caught up" (if no fees overdue) | coach-needs-you |
<!-- feature:needs-you-fees-overdue -->
| 4 | Open Today with the invoices above | "2 fees overdue" with "₹3,750 pending" (Aarav ₹2,000 + Bela ₹1,750); Chirag not counted | needs-you-fees-overdue |
| 5 | Tap it | Fees opens with an "Overdue" section on top: Aarav then Bela, batch and month, amount due | needs-you-fees-overdue |
| 6 | Record Aarav's full ₹2,000; reopen Today | "1 fee overdue", "₹1,750 pending" | needs-you-fees-overdue |
| 7 | Airplane mode, open Today | An error line with "Reference:", no crash (failure case) | needs-you-fees-overdue |
<!-- feature:coach-spotlight -->
| 8 | Record a note for Bela only; open Today | "Spotlight today" lists up to 3 others first (Aarav, Chirag, Dev, "No note yet"); Bela later with "Last note today"; Esha not listed if her class is cancelled; Old never listed | coach-spotlight |
| 9 | Record notes for every child in today's classes | "Everyone in today's classes has a note today" (empty case) | coach-spotlight |
| 10 | Tap a Spotlight row | "Feedback for parents" opens | coach-spotlight |
<!-- feature:parent-quick-signals -->
| 11 | In Parent view tap "running late" for Aarav | Coach Today shows "From parents today: Aarav · Running late" | parent-quick-signals |
<!-- feature:class-announcements -->
| 12 | Post an announcement to Clay only | Clay families see it; Art families do not | class-announcements |

Not tested by AI and needing you: real phone behaviour, real email delivery (parked), anything on the live database.
