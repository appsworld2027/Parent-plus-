# Feature Contract: Parent sees class attendance (ported from AM/consolidated, own database only)
Status: DRAFT — founder standing permission. Reads only through the installed `get_parent_attendance_sessions` function on parentplus-dev (migration 20261117090944, already applied there). No other Supabase project is used.
Visibility: OFF unless `EXPO_PUBLIC_ENABLE_PARENT_ATTENDANCE=true` and never in production builds. Founder cannot see it on a preview unless that flag is set for the preview.
| ID | Given | When | Then |
|---|---|---|---|
| PA-01 | parent with an approved, active link to a child | opens Home and picks a class date | sees that child's classes for the date with Present / Late / Absent, or "unrecorded" when the coach has not saved attendance |
| PA-02 | a date with no classes | — | "No shared classes for this date." |
| PA-03 | a refresh fails | — | an error with a reference code; never shown as an empty schedule |
| PA-04 | more than 50 classes | tap Load more | next page, no repeats; malformed or repeated pages rejected |
| PA-05 | parent switches child quickly | late reply of the previous child | ignored |
| PA-06 | link disconnected, approval withdrawn, parent email changed, account banned | any read | nothing returned |
| PA-07 | another parent's or a guessed child | read | nothing returned |
| PA-08 | invalid date text | — | asks for YYYY-MM-DD, no request sent |
Limits (honest): class times are shown in UTC; flag-gated and non-production; live run against parentplus-dev with a real parent NOT done.
Tests: tests/parent-attendance-contract.test.ts, tests/parent-attendance-projection.test.ts (disposable Postgres), e2e/parent-attendance.spec.ts.
