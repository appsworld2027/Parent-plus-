# Parent quick signals (M2-06) checkpoint — 2026-11-27
Status: Synced to GitHub; not verified by a fresh session. Contract DRAFT (founder approval pending, but founder told AI to assume permissions).
Done: candidate SQL supabase/candidates/202611270023_parent_quick_signals.sql (table parent_signals, send/withdraw functions, read policy); disposable-DB test tests/parent-quick-signals-candidate.test.ts, 7 pass. Covers QS-02..07, 10, 11, 12 data rules only.
NOT built: parent buttons UI (QS-01, 03 UI, 04 UI), coach Today list (QS-07 UI, 08), network-failure retry (QS-09), browser tests, src service. NOT applied to hosted database (founder-gated).
Next: src/parent/signals.ts service + Parent card buttons (src/parent/ParentApp.tsx), coach list in src/today, browser spec e2e/acceptance/parent-quick-signals.spec.ts, then run only touched specs.
