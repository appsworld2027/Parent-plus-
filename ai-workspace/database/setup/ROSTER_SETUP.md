# Students and batches: database update

The app's student/contact/enrolment saves now use an atomic server function. This needs migration `202611120002` in addition to the initial migration already installed. Do not rerun or edit migration 001.

1. Open [the project's SQL Editor](https://supabase.com/dashboard/project/zcgcnycnanqkbdlwojln/sql).
2. Create a new query.
3. Open [the Module 3 script on GitHub](https://github.com/appsworld2027/Parent-plus-/blob/codex/coach-foundation/supabase/migrations/202611120002_roster_operations.sql) and copy the whole file using Copy raw file (or Raw → select all → copy).
4. Paste into Supabase and Run. If prompted about security operations, the script intentionally replaces its own functions and restricts direct client writes. It does not delete student/history tables.
5. Run this verification in a new query:

```sql
select version, applied_at
from coach_private.schema_migrations
where version = '202611120002';
```

Expected: one row with this version. If there is an error, send the message; do not disable RLS or remove tables.

## Changes

- Adds a primary-contact flag with a unique index while preserving existing contacts.
- Adds transactional `save_student`: the student, primary contact, and selected new enrolments save together or all roll back.
- Retrying a save reuses the same student UUID, preventing a lost response from creating duplicate students.
- Adds archive operation that retains contact, enrolment, attendance, observation, and fee history.
- Restricts direct roster writes so clients cannot bypass the transaction. Batch creation/editing remains protected by existing RLS.
- Refreshes the API schema cache after deployment.

Existing enrolments remain in place when editing a student. The current screen adds memberships; moving/ending/reactivating enrolment periods and restoring archived students are deferred. These are not disguised as working controls.

## Phone test after installation

Use fictional student details until device/API tests pass. Create a batch, add a student and guardian, select the batch, save, restart, and edit the student. Check search and batch filters, then archive and inspect the archived list. Try a failed-network save and retry; report the error reference rather than troubleshooting code yourself.

A missing migration is shown as an actionable setup error. The app must not treat it as a genuine empty student list.
