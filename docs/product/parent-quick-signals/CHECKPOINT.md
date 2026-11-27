# Parent quick signals (M2-06) checkpoint — 2026-11-27
Status: BUILT and APPLIED to parentplus-dev; not verified by a fresh session or a live-app run.
- Database: supabase/migrations/202611270023_parent_quick_signals.sql applied to parentplus-dev (RLS on, anon blocked, no direct insert).
- App: src/parent/signals.ts + Parent Home buttons (src/parent/ParentApp.tsx); coach "From parents today" (src/today/CoachSignals.tsx).
- Tests (touched only): tests/parent-quick-signals-candidate.test.ts 7 pass; e2e/parent-quick-signals.spec.ts 5 pass.
- NOT run: real-app run on the live database, real parent and coach devices, full browser suite.
