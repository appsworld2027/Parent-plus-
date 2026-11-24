# Product brief

- **What:** Parent Plus is an app for coaches/tutors who run batches of children's classes, and for the parents of those children. Two workspaces: Coach and Parent (Expo / React Native web + Android, Supabase backend).
- **Coach "Today" screen:** "Needs you" card lists what needs the coach's attention (children needing feedback; overdue fees is in progress). Prototype: `founders/prototypes/ParentPlus_Coach_Tutor_App.html`.
- **Money:** amounts are stored in paise (integer); shown as ₹ with Indian grouping (₹4,23,00,000). Test payments (`mode = 'test'`) never count as paid; the `fee_invoice_balances` view already excludes them from `balance_paise`. Voided invoices never count. (Evidence: `supabase/migrations/202611140006_fees.sql`.)
- **Dates:** "today" means the academy's timezone (Asia/Kolkata for every academy today). A fee due today is not overdue.
- **Children's data:** fictional data only in tests and QA; never real names. Production Supabase is never touched by agents.
- **Founder interface:** founders decide in their AI chat and test on the Vercel link; they never act on GitHub.
- **Quality rules:** every feature has an approved contract (`docs/product/<slug>/ACCEPTANCE.md`), locked tests in `e2e/acceptance/` that only an `ai:contract` PR may change, and a Demo Pack before anything reaches `main`.
