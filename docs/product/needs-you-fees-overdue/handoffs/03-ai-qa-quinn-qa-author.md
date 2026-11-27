# Handover — ai:qa — quinn-qa

## Understanding
Goal: validate and finalize the locked acceptance tests for the founder-approved needs-you-fees-overdue contract (aaea570) after challenger review.
Constraints: author seat only; change only the locked spec and this handover; push only to ai/contract-needs-you-fees-overdue; never merge to main.
Known traps: fixture student Ria needs feedback by default; browser callbacks need arguments; read failures need network interception (not write switches); exclusion tests need counted controls; fee reads are month-scoped and capped at 50.
Must not touch: app code, fixtures, approved ACs, main branch, live Supabase, release settings, docs/ai-memory/, PR merging.
Proof: npx tsc --noEmit exit 0; npm run check green with quoted result lines; grade-acceptance.mjs printing Acceptance-test gate: PASS — 18/18; validated handover pushed; comments on #42 and PR #45; stage labels moved off ai:tests/ai:qa.

## Done
- Reviewed the challenger handover (02-ai-tests-review-quinn-qa-challenger.md) with verdict CHANGES: 2 must-fix, 9 should-fix findings.
- Applied both must-fix items to the locked spec:
  1. AC-03: added a student (Zoya) with TWO overdue invoices from different months (Sep and Oct) and asserted both months appear in the single row with summed amount (₹5,500).
  2. AC-08: strengthened the RED-BECAUSE sustained "Checking…" check with a mid-hold verification at 500ms to catch flashing implementations.
- Applied one cheap should-fix: removed discounted "Overdue" plain-text hook from NEW-HOOKS (gate warned it already exists in app source).
- Ran the acceptance gate: PASS — 18/18 tests red (or guarded) for the right reason, 18 ACs in the contract. No warnings.
- Ran full repo checks: npx tsc --noEmit → exit 0; npm run check → Test Files 39 passed (39), Tests 492 passed (492).
- Spec commit: (pending, this handover will be committed with the spec changes).

## Decisions
- Kept AC-04 and AC-07 as GUARD tests (existing behavior that must stay).
- Kept AC-08 as RED-BECAUSE (current app stops Checking after feedback, never waits for held fee read).
- Declared hooks for Dev: fees item accessible-name pattern /^\d+ fees? overdue/, testIDs needs-you-fees-wallet / needs-you-fees-chevron / fees-overdue-section / fees-overdue-row, partial-failure lines "Fees could not load. Reference: …" and "Feedback could not load. Reference: …".
- Removed "Overdue" from NEW-HOOKS because the gate correctly discounts it (already exists in app source).
- The AC-03 test now seeds one student with two invoices from different months, proving the "billing month(s)" plural requirement — a build showing only the first month would fail.
- The AC-08 test now checks "Checking…" at three timepoints (start, 500ms, 1000ms) to catch a flashing implementation.
- Retained the spec's network read wrapper (window.__needsYouNet) for read failures; did not misuse write-only fixture switches.
- Did not add batch name assertions to AC-09 (should-fix) because AC-09 is a Today-screen test; batch names are verified in AC-03/AC-16 which test the Fees screen overdue section.

## Assumptions
- VERIFIED: the branch contains exactly one test for each of the 18 AC IDs; the gate checked missing, duplicate, skipped, focused, crash, wrong-red, and undeclared-pass conditions.
- VERIFIED: feesBackend(page) installs academy:true and readyClass:true, whose default Fictional Ria has no recorded feedback; AC-01/02/11/04/05/06/12/13 explicitly neutralise the unwanted default feedback via recordFeedbackFor.
- VERIFIED: e2e/support/feesBackend.ts filters fee_invoice_balances to one billing_month and caps at 50 rows; AC-03/09/16 require all-month and >50-row support — Dev MUST extend the fixture outside e2e/acceptance/.
- VERIFIED: AC-09 seeds 600 students, 150 in each of four batches, at 7,050,000 paise each; 600 × ₹70,500 = ₹4,23,00,000.
- UNVERIFIED: visual styling (rose/grape colors, icon shapes) — no testIDs or accessible names declared for feedback item icons or fee item icon color.
- UNVERIFIED: behavior after the first missing hook — the gate only checks expected-red, not the built feature.

## Traps
- The gate's PASS is an expected-red authorisation to build, not evidence that the feature works.
- Do not remove the default-feedback corrections: an unrecorded Ria invalidates the AC-01/04/05/06/11/12/13 starting states.
- Re-open Today after fixture changes (Schedule → Today tab). Browser-side callbacks cannot close over Node variables unless passed explicitly.
- AC-07/17/18 involve failed reads and client retries; do not shorten their waits below the documented retry window (~7s, tests wait 15s).
- The exclusion helpers (AC-05/06/12/13) intentionally check the excluded invoice alone and then beside a genuine ₹1,500 overdue invoice; retain both phases.
- feesBackend month filter: `const month = url.searchParams.get('billing_month')?.slice(3)` then `i.billing_month === month` — the slice(3) appears to mismatch the invoice format (e.g., "2026-10-01" vs "26-10-01"). Dev must fix/extend this fixture for all-month reads.

## Next must
- Dev: extend the fee fixture (e2e/support/feesBackend.ts or a test-support extension outside e2e/acceptance/) to support all-month reads and more than 50 rows for fee_invoice_balances.
- Dev: implement every declared hook so all 18 tests pass WITHOUT editing, skipping, or deleting the locked spec (contract-lock enforces this).
- Dev: open a stacked build PR targeting ai/contract-needs-you-fees-overdue; label it for ai:qa review when ready.

## Next must not
- Do not treat this gate PASS as a green feature; it only validates the expected-red tests before implementation.
- Do not weaken assertions, change GUARD/RED-BECAUSE metadata, or edit/skip/focus locked tests in a build PR.
- Do not change app code or fixtures on this contract-author stage; do not commit to main; do not merge PR #45; do not enable auto-merge; do not touch live Supabase/release infrastructure.

## Open questions
none

## Memory proposals
- A previously reviewed spec can still lack the gate's machine-readable metadata even when all tests execute. Re-run the gate instead of trusting a handover: this run's baseline was FAIL 0/18 solely with declarations absent; commit fd832e9 restored declarations and the executed gate became PASS 18/18 (full report in PR #45).
- Challenger findings on a gate-passing spec can reveal coverage gaps that would let a buggy implementation pass. The two must-fix items (AC-03 multi-month student, AC-08 mid-hold check) were not caught by the gate but would have allowed a defective build to pass the tests.