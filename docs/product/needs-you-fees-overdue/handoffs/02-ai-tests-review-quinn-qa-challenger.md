# Handover — ai:tests-review — quinn-qa

## Understanding
Goal: independently attack the locked acceptance tests (commit fd832e9) for the founder-approved needs-you-fees-overdue contract (aaea570) using the challenger checklist.
Constraints: do not edit the spec; only comment findings on PR #45; run the gate myself to confirm PASS.
Known traps: fixture student Ria needs feedback by default; browser-scope variables in page.evaluate; feesBackend is month-scoped and capped at 50 rows; read failures need network interception (not write-only fixture switches); exclusion tests need counted controls.
Must not touch: the locked spec, app code, fixtures, approved ACs, main branch, live Supabase, release settings.
Proof: gate PASS 18/18 confirmed by independent run; findings posted on PR #45 with evidence table; verdict CHANGES with 2 must-fix and 9 should-fix items.

## Done
- Read the approved contract (ACCEPTANCE.md at aaea570) and the locked spec (coach-needs-you-fees-overdue.spec.ts at fd832e9).
- Ran the full acceptance gate independently: `npx playwright test e2e/acceptance/coach-needs-you-fees-overdue.spec.ts --reporter=json --timeout=60000 > /tmp/acc.json` then `node .ai-org-handbook/scripts/grade-acceptance.mjs --spec e2e/acceptance/coach-needs-you-fees-overdue.spec.ts --report /tmp/acc.json --contract docs/product/needs-you-fees-overdue/ACCEPTANCE.md --src src --md /tmp/gate.md`.
- Gate result: **PASS — 18/18 tests red (or guarded) for the right reason, 18 ACs in the contract**.
- Attacked all 18 tests against the 6-item challenger checklist (AC fidelity, fixture traps, vacuous passes, read-exercise, NEW-HOOKS match, contract coverage).
- Posted detailed findings on contract PR #45: https://github.com/appsworld2027/Parent-plus-/pull/45#issuecomment-7130401002
- Verdict: **CHANGES** — 2 must-fix, 9 should-fix findings.

## Decisions
- **Verdict: CHANGES** (not APPROVE) — the tests pass the gate but have coverage gaps that would let a buggy implementation pass.
- **Must-fix #1 (AC-03):** The contract says "billing month(s)" (plural) and "one row each with student, batch, billing month(s) and amount still due". The test seeds only 1 invoice per student, so a build that shows only the first month per student would pass. Added a student with 2 overdue invoices from different months to the test and assert both months appear.
- **Must-fix #2 (AC-08):** The RED-BECAUSE test for sustained "Checking…" only checks visibility at two timepoints (start and after 1s). A buggy impl that flashes "Checking…" → "All caught up" → "Checking…" would pass. Strengthened to poll continuously or add a mid-hold check.
- **Should-fix items (9):** AC-03 row content order, AC-09 batch names, AC-10 direct tappability, AC-17/18 wait robustness, NEW-HOOKS remove discounted "Overdue" text hook, AC-01/02/11 icon/color verification, AC-07 error reference format.
- **Confirmed good:** Exclusion tests (AC-05/06/12/13) correctly use counted controls; AC-14 test receipt handling; AC-15 student-level counting with balance summing; AC-03/16 any-month and oldest-first ordering.

## Assumptions
- VERIFIED: Gate PASS is reproducible — ran twice (once in author handover, once independently here).
- VERIFIED: feesBackend fixture (e2e/support/feesBackend.ts:35-39) filters fee_invoice_balances by single billing_month and caps at 50 rows; contract requires all months and >500 rows (AC-03, AC-09, AC-16).
- VERIFIED: Spec seeds data directly into window.__feeFixture.invoices bypassing the fixture's month filter, so tests pass the gate but Dev MUST extend the fixture outside e2e/acceptance/.
- VERIFIED: Database client retries failed reads 3 times (~7s); AC-07/17/18 wait 15s which should suffice but AC-17/18 don't account for initial loading time before error appears.
- UNVERIFIED: Visual styling (rose/grape colors, icon shapes) — no testIDs or accessible names declared for feedback item icons.
- UNVERIFIED: Behavior after first missing hook (the gate only checks expected-red, not the built feature).

## Traps
- **feesBackend month filter:** `const month = url.searchParams.get('billing_month')?.slice(3)` then `i.billing_month === month` — the slice(3) appears to mismatch the invoice format (e.g., "2026-10-01" vs "26-10-01"). Dev must fix/extend this fixture for all-month reads.
- **Default feedback trap:** Ria (studentId RIA) needs feedback by default. Every "All caught up" test (AC-04, AC-05, AC-06, AC-11, AC-12, AC-13) MUST call `recordFeedbackFor(page, [RIA, ...])` first. The spec does this correctly — do not remove.
- **Browser scope:** Variables from test file (e.g., `todayIST()`) cannot be used inside `page.evaluate` / `addInitScript` unless passed as argument. The spec uses `page.evaluate(value => ..., { ... })` correctly.
- **Read vs write switches:** `failStudent`, `failObservation`, `holdObservation`, `failWrite`, `hold` in coach fixture only affect writes. Read failures need `__needsYouNet` layer (already in spec) or `page.route`. The spec does this correctly.
- **Re-open Today:** After changing fixture data, must navigate Schedule → Today to reload. The spec's `reopenToday()` does this.
- **NEW-HOOKS "Overdue" discount:** The gate warns "Overdue" already exists in app source. The test uses it at line 177 but the reliable hooks are `fees-overdue-section` and `fees-overdue-row` testIDs which are also checked.

## Next must
- **Author (quinn-qa@author):** Address the 2 must-fix items in the locked spec on branch `ai/contract-needs-you-fees-overdue`:
  1. AC-03: Add a student with 2 overdue invoices from different months; assert both months appear in that student's Overdue row.
  2. AC-08: Strengthen the sustained "Checking…" check (poll or add mid-hold assertion).
- Re-run the gate after changes: must still print PASS 18/18.
- Push to `ai/contract-needs-you-fees-overdue`; PR #45 will update automatically.
- **Challenger (this seat):** Re-review after author pushes fixes. If all must-fix resolved, change verdict to APPROVE and move issue to `ai:build`.
- **Dev (later):** Extend feesBackend fixture outside e2e/acceptance/ to support all-month reads and >500 rows; implement every declared hook (NEW-HOOKS minus "Overdue"); make all 18 tests pass WITHOUT editing the locked spec.

## Next must not
- Do not edit the spec in this challenger seat — only the author may change it.
- Do not weaken any assertion or remove GUARD/RED-BECAUSE/NEW-HOOKS declarations.
- Do not touch app code, fixtures in e2e/support/, approved ACs, main branch, live Supabase, or release infrastructure.
- Do not merge PR #45 — it stays open until build PR merges into the contract branch and contract-lock passes.

## Open questions
- None for this stage. Author decides how to implement the must-fix test changes.

## Memory proposals
- **Gate PASS ≠ test quality:** A spec can pass the acceptance gate (all tests red for right reason) while still having coverage gaps that would let a buggy implementation pass. The challenger checklist catches these. Evidence: this spec passed gate PASS 18/18 but has 2 must-fix coverage gaps (AC-03 multi-month, AC-08 sustained loading) and 9 should-fix items.
- **Multi-month per student not exercised:** Contracts saying "month(s)" plural need a test case with a student having overdue invoices from multiple months. Evidence: AC-03 test only seeds 1 invoice/student.
- **RED-BECAUSE sustained-state tests need continuous verification:** Snapshot checks at two timepoints can miss intermediate wrong states. Evidence: AC-08 test only checks at start and after 1s hold.
- **Fixture month-filter bug:** feesBackend's `slice(3)` on billing_month likely mismatches invoice format. Dev must fix when extending for all-month reads. Evidence: feesBackend.ts:35 vs invoice billing_month format "2026-10-01".