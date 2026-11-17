# AUTH-01 / AUTH-02 — browser recovery evidence

17 November 2026. Requirements: [PRD](../PRD.md) AUTH-01/02. Runtime candidate0.13.2, Android20; original implementation commita01a373. New shared AI documentation was adopted from mainfc16814 through a history-preserving merge after the implementation was saved; it does not alter the runtime. This record adds stable scenario IDs to the active repair without restarting it. [Setup and operator limits](AUTH_SETUP.md); current release state remains in PROGRESS.md and the PR.

Acceptance: a real email returns to the public app; a fresh email tab in the requesting browser can redeem its addressed proof, retain Coach/Parent intent and set a new password through verified Supabase Auth. Pending proofs must not expose sessions or let one tab switch another tab's account or erase its requests. Existing sessions/reload, native storage and database permissions remain. The founder owns inbox confirmation/new password entry, not technical validation.

## Scenarios

All automated cases below use fictional credentials and intercepted Supabase transport. Browser precondition is a clean Chromium context with the real app/SDK and [backend fixture](../e2e/support/backend.ts); unit precondition is separate in-memory tab/shared drivers. Steps are represented by the named executable test, avoiding a second test implementation in this document. P0 applies to account/privacy paths; P1 to compatibility edges.

| ID | Category / priority | Action and expected result | Executable evidence / local result |
| --- | --- | --- | --- |
| AUTH-01-SC-001 | Integration / P0 | Follow a deliberately invalid non-user verification probe before/after Site URL correction; destinations change from localhost to the public root and `/auth/recovery` | Read-only live HTTP303 Location inspection; FAIL before owner setting change, PASS after; no real code/email/account operation |
| AUTH-01-SC-002 | Recovery / P0 | Request email, open its flow in a fresh browser tab; password form appears and URL code is removed | [auth.spec.ts](../e2e/auth.spec.ts), `a recovery email can open a new tab in the requesting browser`; observed RED then PASS |
| AUTH-01-SC-003 | Security / P0 | Remove legacy fallback, open the exact flow ID; the addressed proof still works after URL scrub | Same file, `recovery preserves its exact email flow after removing sensitive URL parameters`; PASS; parser missing-flow unit RED then PASS |
| AUTH-01-SC-004 | Navigation / P0 | Parent reset opens Parent; an earlier Coach email retains Coach after a later Parent request | Same file, `a Parent recovery email returns to Parent in a new tab` and `an earlier Coach recovery keeps Coach intent after a later Parent recovery request`; observed REDs then PASS |
| AUTH-01-SC-005 | Usability / P1 | Open the plain recovery address; request form appears without claiming authentication or a broken email | Same file, `the direct recovery address opens a usable email-request form without a broken-link error`; observed RED then PASS |
| AUTH-02-SC-001 | Isolation / P0 | Recover a different fictional account in another tab; original tab retains its workspace/reload identity | Same file, `another account recovering in a second tab cannot replace this tab’s signed-in workspace`; observed RED then PASS |
| AUTH-02-SC-002 | Reliability / P0 | Request recovery in B, sign out A, redeem B's flow in a fresh tab; proof remains usable | Same file, `signing out one tab cannot erase another tab’s pending recovery email proof`; observed RED then PASS |
| AUTH-02-SC-003 | Privacy / P0 | Separate SDK channel namespaces while persisting the same tab's keys; share only addressed proof and not sessions/passwords; expire/remove proofs | [auth.test.ts](../tests/auth.test.ts), `web email-link storage` cases; missing implementation/namespace/expiry coverage, all17auth unit cases PASS |
| AUTH-02-SC-004 | Ownership / P1 | Clone tab storage under a new document ID; cleanup index does not inherit ownership | Same file, `does not inherit cleanup ownership when a browser clones a tab’s storage`; observed RED then PASS |
| AUTH-01-SC-006 | Real-provider / P0 | Owner requests a fresh real email and privately completes the update with a new10-character-or-longer password | NOT RUN by AI; requires owner's inbox/browser. No password has been changed by this repair |
| AUTH-01-SC-007 | Device / P1 | Physical native email/deep-link and storage lifecycle acceptance | NOT RUN; native storage code remains unchanged; Android bundle export PASS is not device acceptance |

## Actual runs and independent review

Final local TypeScript/full420tests36files pass152.05seconds. Final fixed-source auth browser suite15/15passes1.7minutes; web and Android exports pass exit0. Earlier broader same-login Parent/Coach runs pass24then25cases while isolation/cleanup was tightened; exact final-source whole browser/CI and public hosted results are recorded in the PR. Skipped/flaky outcomes are not inferred from missing coverage; the final focused run has0failures/skips/flaky outcomes.

Local logs: `/tmp/parentplus-recovery-shipping-check.log`, `parentplus-recovery-shipping-browser.log`, `parentplus-recovery-shipping-web.log`, `parentplus-recovery-shipping-android.log`; earlier RED logs use the `parentplus-recovery-*red.log` names. Workspace artifacts may not survive environment replacement; aggregate results and defect disposition are retained here/PR.

Independent reviewer: `/root/vercel_testing`, read-only diff/security review separate from the implementer. Findings: shared SDK auth broadcasts, stale module intent and shared-index logout cleanup. Each has an observed failing regression and repaired disposition in the scenario table. Close-out reviewed addressed slots only, per-document channels/indexes, stable per-tab session mapping and explicit module precedence; no material remaining issue within those findings. Reviewer performed no real account action, email request, settings change or database write. Final PR review records the exact commit/runtime comparison.

No load/performance campaign is claimed: this is a bounded client-auth repair, with per-operation unit/browser coverage rather than a new backend workload. Broad mobile-browser/email-client combinations, actual expiry behavior for real emailed links and real inbox/provider delivery remain acceptance boundaries. No SQL, membership activation, provider setup, verification bypass or global password reset is included.
