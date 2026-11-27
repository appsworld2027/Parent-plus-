# Founder test script — Coach core journey (Vercel preview only)
Open the Vercel preview link on a phone. Sign in as a coach with a verified email. Tick each line; write what you saw if it differs. About 10 minutes.

| # | Do this | You should see | Feature |
|---|---|---|---|
| 1 | Open Today | Heading "Needs you" above the classes | M2-41 |
| 2 | With a student who has no feedback this week | "1 child needs feedback" / "No update for over a week"; tap it, "Feedback for parents" opens | coach-needs-you |
| 3 | Record feedback for that student, return to Today | "All caught up" if nothing else is open | coach-needs-you |
| 4 | Add an invoice due last month, unpaid; open Today | "1 fee overdue" with the amount, rose wallet icon | needs-you-fees-overdue |
| 5 | Tap that item | Fees opens with an "Overdue" section on top: student, batch, month, amount due | needs-you-fees-overdue |
| 6 | Record the full payment; reopen Today | The fees item is gone | needs-you-fees-overdue |
| 7 | Turn on airplane mode, open Today | One error line with a "Reference:" code, no crash | M2-41 |
| 8 | In Parent view, tap "running late" for a child | Coach Today shows it under "From parents today" | parent-quick-signals |
| 9 | Post an announcement to one batch | Parents in that batch see it; other batches do not | class-announcements |

Not tested by AI and needing you: real phone behaviour, real email delivery (parked), anything on the live database.
Report back in chat in one line per failed row: "row 5: Overdue section missing".
