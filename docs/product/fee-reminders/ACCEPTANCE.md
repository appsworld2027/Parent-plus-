# Feature Contract: Gentle fee reminder ladder (M2-34)
Status: DRAFT — founder approved all work. Free channel: WhatsApp deep link prefilled for the coach to send. No automatic sending, no payments.
| ID | Given | When | Then |
|---|---|---|---|
| FRM-01 | an invoice 1–7 days overdue | coach opens it | "Remind parent on WhatsApp" with a friendly nudge ("If you have already paid, please ignore this.") |
| FRM-02 | 8–21 days overdue | opens | polite reminder with due date |
| FRM-03 | 22+ days overdue | opens | kind but clear message inviting a conversation; no threats or penalties |
| FRM-04 | paid, voided, not yet due or due today | opens | no reminder button |
| FRM-05 | valid parent number on file | taps | WhatsApp opens to that number with the message prefilled (amount, month, student) |
| FRM-06 | no valid number | taps | a clear note says no number is on file; nothing opens |
Out: automatic sending/scheduling (needs M2-40 push/worker), late fees, payment links (M2-33).
Tests: tests/fee-reminders.test.ts (FRM-01..04); e2e/fee-reminders.spec.ts (FRM-05,06 and visibility).
