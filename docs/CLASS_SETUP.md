# Classes and attendance: setup and phone acceptance

Version 0.3.0 adds dated classes, attendance, one private device draft and actual-record Today figures. The final source needs migrations **002, 003 and 004** after your confirmed migration 001. A combined file below applies those upgrades in order; do not recreate the project or repeat 001.

## 1. Apply the combined update

1. Open [the complete database-update file](https://github.com/appsworld2027/Parent-plus-/blob/codex/coach-foundation/supabase/setup_after_001.sql). Use **Copy raw file**, or **Raw → select all → copy**.
2. Open [your Supabase SQL Editor](https://supabase.com/dashboard/project/zcgcnycnanqkbdlwojln/sql), create a **new query**, paste the whole file and Run.
3. The file preserves existing records. Supabase may flag function replacement/permissions; keep RLS enabled and do not remove tables. If a warning is unclear, share the screenshot.
4. If there is any error, send its text. Do not edit the SQL to bypass it. Earlier upgrades may have committed before a later error, so verify versions rather than guessing.

## 2. Verify all four versions

In a new query run:

```sql
select version, applied_at
from coach_private.schema_migrations
where version in ('202611110001', '202611120002', '202611120003', '202611120004')
order by version;
```

Expected: four rows ending in 001, 002, 003 and 004. Share these results. The bundle is generated from immutable migration files by `npm run prepare:owner-sql`; its consistency is tested. It excludes migration 001 and uses idempotent upgrades. The developer can inspect the individual migration files; the owner needs only this one copy/paste.

## 3. Why this update is needed

- Session create/edit/cancel uses `save_class_session`, which verifies the owner and batch. Repeated requests reuse the same class UUID.
- Attendance uses `save_class_attendance_checked`, which checks the original class fingerprint as well as the expected attendance revision before its atomic save. Clients cannot directly change revisions or bypass this wrapper through the old attendance function.
- Every eligible active student must have one mark. Roster changes or stale revisions require a refresh rather than silently accepting partial/older work.
- Recorded attendance protects class timing/batch from later reinterpretation. Room/status edits remain possible. To change timing after attendance, cancel and create a replacement; existing history remains.
- Cancelling a class preserves its history and blocks new attendance saves until it is rescheduled.

## 4. Phone acceptance after a verified 0.3.0 APK exists

Use fictional records until access/device checks pass. Install the new APK as an update, preserving existing app data.

1. Confirm the email success message stays open. Test login, academy setup, restart and sign-out with guidance; earlier email receipt/login is owner-reported, not complete authentication acceptance.
2. Under Students, create a batch and a fictional student enrolled in it. Pick today's date for the first class so the enrolment is active.
3. Open Schedule. Dates are `YYYY-MM-DD`, times use 24-hour `HH:MM` in the academy timezone shown on screen, independent of phone timezone.
4. Create/edit a class. Reopen it and check the selected date, times, room and batch.
5. Open attendance, mark present/late/absent, and wait for **Draft saved on this device**. This is not yet saved to the class.
6. Close and reopen the app. Reconnect if necessary, open Schedule and **Resume attendance draft**. Verify the marks, then **Save attendance to class**.
7. Return to Today. Its class figures should match the actual records. Reopen attendance and verify marks persist.
8. Guided connection-loss check: open an existing class while online, turn off the connection, change marks and wait for the device-draft confirmation. A failed server save must retain the draft. Reconnect, reopen/compare and save.
9. Guided competing-save check: a changed server revision must show an explicit comparison before a device draft replaces it. No automatic server overwrite occurs.
10. Save any work to the server before signing out: sign-out removes device-only attendance drafts. Cancel a class; verify it remains visible and its attendance button is disabled. Sign out and verify the private device draft is cleared.

A network connection is needed after restart to validate the class/server context before resuming a draft. This is not a full offline schedule cache. Only one active attendance draft is retained per device; opening another class offers explicit resume/discard choices. Class-edit and student forms remain in-memory drafts.

## 5. Diagnostic coverage

Sanitized reports now persist on the device when storage works: up to 30 allowed events. Restoring drops events older than 14 days and strips unknown fields. Storage failures leave reports in memory with an explicit storage status. Sign-out clears diagnostics and the attendance draft; failed cleanup is reported.

This does not capture every native crash/OS termination, and remote crash reporting is still not connected. Android SecureStore lifecycle and native sharing need phone acceptance. Browser reload tests prove the simulated/web path, not these Android behaviors.
