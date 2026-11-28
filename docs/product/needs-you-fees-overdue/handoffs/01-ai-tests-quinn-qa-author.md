# Handover — ai:tests — quinn-qa

## Understanding
Goal: validate and repair the 18 locked acceptance tests for the founder-approved needs-you-fees-overdue contract (aaea570).
Constraints: author seat only; change the locked spec and this handover, push only to ai/contract-needs-you-fees-overdue, and never merge.
Known traps: Ria needs feedback by default; browser callbacks need arguments; read failures need network interception; exclusions need counted controls; fee reads are month-scoped and capped at 50.
Must not touch: app code, fixtures, approved ACs, main, live Supabase, release settings, docs/ai-memory, and unrelated files.
Proof: npx tsc --noEmit and npm run check succeed; grade-acceptance.mjs prints Acceptance-test gate: PASS for all 18 ACs; the PR and issue carry the evidence.

## Done
- Reviewed the existing CPTO-corrected spec against all 18 approved ACs; did not rewrite it. The onboarding pack had no unresolved challenger/CPTO verdict of CHANGES.
- Baseline gate executed all 18 tests but printed `Acceptance-test gate: FAIL — 0/18` because the required NEW-HOOKS/GUARD/RED-BECAUSE declarations were absent.
- Commit fd832e9f2005d8f1a7f740e56ccd91cc5f1bb7f4 adds the declarations; establishes the AC-01/02/11 feedback starting states; checks AC-03's second row batch; and allows 15 seconds for the partial-read failures in AC-17/18.
- Executed `npx tsc --noEmit`: exit 0, no diagnostics.
- Executed `npm run check`: `Test Files 39 passed (39)` and `Tests 492 passed (492)`.
- Executed `npx playwright test e2e/acceptance/coach-needs-you-fees-overdue.spec.ts --reporter=json --timeout=20000 > /tmp/acc.json`, then `node .ai-org-handbook/scripts/grade-acceptance.mjs --spec e2e/acceptance/coach-needs-you-fees-overdue.spec.ts --report /tmp/acc.json --contract docs/product/needs-you-fees-overdue/ACCEPTANCE.md --src src --md /tmp/gate.md`.
- Final gate result: `Acceptance-test gate: PASS — 18/18 tests red (or guarded) for the right reason, 18 ACs in the contract`. The full report is in contract PR #45: https://github.com/appsworld2027/Parent-plus-/pull/45
- The gate warns that the plain text `Overdue` occurs in existing app source and therefore does not count that hook alone. This is not a gate failure; the new section/row testIDs and fees-item accessible name remain declared and counted.

## Decisions
- Kept AC-04 and AC-07 as GUARD tests because they pass on existing behavior intentionally; kept AC-08 as RED-BECAUSE because Today currently stops Checking after feedback and never waits for the held fee read.
- Declared the fees-item accessible-name pattern, wallet/chevron testIDs, Overdue section/row hooks, and both partial-failure lines so Dev knows the exact contract-facing UI.
- Retained the spec's network read wrapper rather than misusing write-only fixture switches.
- Recommended next step: independent challenger review before Dev builds. Alternative: send the spec back to the author if the challenger identifies a must-fix coverage or setup defect.

## Assumptions
- VERIFIED: the branch contains exactly one test for each of the 18 AC IDs; the gate checked missing, duplicate, skipped, focused, crash, wrong-red, and undeclared-pass conditions.
- VERIFIED: feesBackend(page) installs academy:true and readyClass:true, whose default Fictional Ria has no recorded feedback; AC-01/02/11 now explicitly neutralise the unwanted default feedback.
- VERIFIED: e2e/support/feesBackend.ts filters fee_invoice_balances to one billing_month and returns at most 50 rows; AC-03/09/16 require all-month and more-than-50-row support.
- VERIFIED: AC-09 seeds 600 students, 150 in each of four batches, at 7,050,000 paise each; 600 × ₹70,500 = ₹4,23,00,000.
- UNVERIFIED: behavior after the first missing hook, visual rose/grape styling, and the real built journey cannot be proven by a pre-feature gate; these require the build and later QA/preview review.

## Traps
- The gate's current PASS is an expected-red authorisation to build, not evidence that the feature works.
- Do not remove the default-feedback corrections: an unrecorded Ria invalidates the AC-01/04/05/06/11/12/13 starting states.
- Re-open Today after fixture changes. Browser-side callbacks cannot close over Node variables unless passed explicitly.
- AC-07/17/18 involve failed reads and client retries; do not shorten their waits below the documented retry window.
- The exclusion helpers intentionally check the excluded invoice alone and then beside a genuine ₹1,500 overdue invoice; retain both phases.
- `Overdue` already exists somewhere in app source, so the gate discounts that plain-text hook; the new `fees-overdue-section` and `fees-overdue-row` testIDs are the reliable hooks.

## Next must
- Challenger (quinn-qa@challenger): independently attack commit fd832e9 and the full gate report in PR #45; do not edit the author's spec in the challenger seat.
- Check contract fidelity, especially AC-03 row content/order/month/amount, AC-08 sustained loading, AC-09 count/total/batches, partial-failure timing, and both phases of AC-05/06/12/13.
- Record a verdict with executed evidence and answer any should-fix findings explicitly. If CHANGES, identify every must-fix for the author; if accepted, continue the AI Org review/build lifecycle.
- Dev (only after review authorises build): extend the fee fixture outside e2e/acceptance to support all-month reads and more than 50 rows, implement every declared hook, and make all 18 tests pass without editing the locked spec.

## Next must not
- Do not treat this gate PASS as a green feature, do not weaken assertions or metadata, and do not edit/skip/focus locked tests in a build PR.
- Do not change app code or fixtures on this contract-author stage, commit to main, merge PR #45, enable auto-merge, or touch live Supabase/release infrastructure.
- Do not rely on raw truncated Playwright logs or earlier claims; rerun and quote the gate itself.

## Open questions
none

## Memory proposals
- A previously reviewed spec can still lack the gate's machine-readable metadata even when all tests execute. Re-run the gate instead of trusting a handover: this run's baseline was FAIL 0/18 solely with declarations absent; commit fd832e9 restored declarations and the executed gate became PASS 18/18 (full report in PR #45).
