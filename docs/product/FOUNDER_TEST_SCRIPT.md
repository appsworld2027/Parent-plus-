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

<!-- feature:attendance-patterns -->
| 14 | Save attendance for Fictional Aarav as absent in 3 Clay classes in a row (create past classes on Schedule), then open Today | Alert 'Fictional Aarav · Clay · absent 3 classes in a row' with a WhatsApp button. Mark him present once: the alert disappears | attendance-patterns |
<!-- feature:fee-receipts -->
| 15 | Record a ₹1,000 payment on Bela's invoice, open the payment | A receipt with number, student, month, amount; Share opens WhatsApp. A test-mode or reversed payment shows no receipt | fee-receipts |
<!-- feature:child-progress-timeline -->
| 16 | As parent, open the child with 2 reviewed feedback notes in different months | Updates grouped by month, newest first. A child with none shows a friendly empty message | child-progress-timeline |
<!-- feature:schedule-changes -->
| 17 | Cancel today's Clay class, add note 'Diwali', then Restore it | Families see 'Class update … is cancelled. Diwali' then '…is on again'. Mark the day as a holiday: one notice per batch | schedule-changes |
<!-- feature:end-of-day-queue -->
| 18 | With today's class started and no attendance saved, open Today | Wrap-up shows '1 class needs attendance'; after saving attendance it disappears | end-of-day-queue |
<!-- feature:coach-spotlight -->
| 19 | See Spotlight on Today | Up to 3 least-recently-noted children; one noted today is skipped | coach-spotlight |
<!-- feature:parent-notification-badge -->
| 20 | As parent after the coach posts an announcement | '1 new update from your coach' banner; Mark as read hides it; an update older than 7 days does not show | parent-notification-badge |
<!-- feature:fee-reminders -->
| 21 | On Aarav's invoice (₹2,000, overdue) tap Remind on WhatsApp | Friendly message with amount and month. Chirag (due today) has no reminder button | fee-reminders |
<!-- feature:class-reminders -->
| 22 | Tap Remind families on today's Clay class | Clay families see 'Reminder: Fictional Clay Class class today at HH:MM'. A cancelled class has no button | class-reminders |
<!-- feature:web-push -->
| 23 | As parent in a desktop browser turn alerts on, then the coach posts to Clay | A browser notification appears (NOT yet verified live by AI). Block notifications: guidance shown, nothing saved | web-push |
<!-- feature:smart-attendance-defaults -->
| 24 | Give Fictional Aarav 'present' in 3 of the last 5 Clay classes, open today's unmarked class | 'Fill usual attendance (1)' appears; tapping marks him present as an unsent draft; nothing is saved until you Save. A child who was absent last time is not filled | smart-attendance-defaults |
<!-- feature:holiday-calendar -->
| 25 | On Schedule choose 2026-08-15 | Prompt 'Independence Day is a national holiday…'; nothing is cancelled until you tap Mark this day as a holiday. Diwali dates show no prompt (not covered) | holiday-calendar |
<!-- feature:monthly-progress-report -->
| 26 | Open Fictional Aarav's profile and tap this month under Monthly progress report | Text 'attended X of Y' for this month and up to 3 notes written for him alone. A month with nothing recorded says so and offers no share | monthly-progress-report |

<!-- feature:parent-attendance -->
| 27 | As a connected parent (preview with attendance flag ON), pick a class date where the coach saved Aarav as present | Aarav's class with 'present'; a date with no class says 'No shared classes for this date.'; a class without saved attendance shows unrecorded | parent-attendance |

Not tested by AI and needing you: real phone behaviour, real email delivery (parked), anything on the live database.
