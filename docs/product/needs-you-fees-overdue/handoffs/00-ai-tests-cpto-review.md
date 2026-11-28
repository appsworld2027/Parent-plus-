# Handover — ai:tests — cpto-review

## Understanding
Goal: locked acceptance tests for needs-you-fees-overdue that fail today only because the feature is missing (18 ACs)
Constraints: change nothing outside e2e/acceptance/ and docs/product/needs-you-fees-overdue/; the contract (aaea570) is founder-approved
Traps: fixture student Ria needs feedback by default; browser-scope variables; write-only fixture switches; fee reads are month-scoped and capped at 50
Must not touch: app code, the contract's ACs, main
Proof: gate PASS 18/18 on the current spec (AI Org trial 3, issue #66, control "reviewed")

## Done
- The first agent-written spec (8a6f38e) failed for the wrong reason in 11 of 18 tests; it was corrected in a CPTO review and pushed as 9ed9167.
- Gate result for the corrected spec: PASS 18/18 (AI Org model trial 3, run 45338892851, issue #66).
- Two free models independently wrote gate-passing specs in that trial (Kimi K3.1 Pro @medium, Nemotron 3 Ultra).

## Decisions
- The spec runs its own read-failure layer (`window.__needsYouNet`: offline, failFees, failFeedback, holdFees) because fixture switches only affect writes.
- New hooks declared for Dev: fees button name "N fee(s) overdue", testIDs needs-you-fees-wallet / needs-you-fees-chevron / fees-overdue-section / fees-overdue-row, lines "Fees could not load. Reference: …" and "Feedback could not load. Reference: …".
- AC-04 and AC-07 are GUARD tests (already true today, must stay true); AC-08 is RED-BECAUSE (today the card never waits for fees).

## Assumptions
- VERIFIED: fee_invoice_balances excludes test payments from balance_paise (supabase/migrations/202611140006_fees.sql).
- VERIFIED: the database client retries a failed read 3 times (~7 s), so AC-07 waits 15 s.
- UNVERIFIED: the Fees "Overdue" section design beyond the contract wording (row content order, empty state) — not asked by any AC.

## Traps
- feesBackend answers fee_invoice_balances for one billing_month and at most 50 rows; the feature needs all months and >50 rows, so Dev must extend the fixture (outside e2e/acceptance/).
- Re-open Today (Schedule → Today) after changing fixture data.

## Next must
Author (this stage): read this spec against the contract, run the gate, and improve only what is wrong or missing; record what you checked. Challenger: attack it with the checklist, especially AC-03 row order/month/amount, AC-08 timing, AC-09 totals and the exclusion tests.

## Next must not
Do not rewrite the spec from scratch, weaken any assertion, change the ACs, or touch app code.

## Open questions
none

## Memory proposals
none (already captured in docs/ai-memory/TEST_KNOWLEDGE.md)
