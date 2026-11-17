# Workspace staff lifecycle implementation plan

**Goal:** build the accepted staff relationship and explicit teaching-assignment workflow needed by the protected roster/class operations; continue until verification and the next actual dependency, not merely an implementation checkpoint.

**Spec:** MULTI_WORKSPACE_FOUNDATION.md / MULTI_WORKSPACE_VALIDATION.md. Existing001–014 and live accounts remain; new018 is private and cannot activate memberships publicly. Session instructions override upstream approval/delegation examples. Use test-first implementation and existing PostgreSQL tests.

## Contracts

- Owner-issued offers use a caller-generated cryptographic token, store only its SHA-256 digest, bind one verified intended recipient, explicit roles/branches, fixed expiry and request identity. Expiry is caller-provided, limited to seven days. No email is sent by SQL.
- Joining requires current eligible recipient, current eligible issuer ownership and an immutable proposal. Rejoin creates a new membership after the old period ends; old invitations/accept receipts cannot revive it. Existing suspended/pending memberships cannot be bypassed. Adding roles to an existing member is reserved for an explicit role-management flow; ownership transfer is an explicit separate offer.
- Staff offers cannot grant ownership. Ownership offers transfer an indefinite owner's grant only after a different verified account accepts; an existing target membership must also be indefinite. New owner is established before issuer owner grant is revoked. Original memberships/attribution stay; no role or class assignment is fabricated.
- Offers cannot outlive the issuer's current membership/owner grant; accepted membership/grants are capped by both issuance and acceptance ceilings. Recipient Coach identity is created only with explicit instructor acceptance/name. Workspace-local staff profile avoids a global affiliation directory.
- Owner-issued class/batch assignments are explicit, bounded, current-instructor-only and checked against branch, membership and grant dates. No old teaching/history is inferred, no rehire copies assignments. Class assignment may cover a current class; past completed classes require the separate history/correction workflow.
- Every write uses academy→workspace→sorted account locks. Acceptance locks and rechecks the invite after the workspace anchor; revocation and transfer serialize on the same anchor. Existing017 guarded reads/writes participate.

## Tasks

- [x] Add real SQL tests for role/privacy/scope/state/expiry/retry/rejoin/transfer and assignment invariants; observe missing-operation failures.
- [x] Implement018 private helper/offer/profile structures, owner issue/revoke, recipient preview/accept, ownership handoff, scoped staff projection and teaching assignment creation.
- [x] Add independent PostgreSQL acceptance/revoke/transfer races and test actual post-join roster access.
- [ ] Review findings, full regression/exports, document current boundaries, commit through a tested PR to main under the owner's ongoing main instruction.
- [ ] Continue remaining permission conversion/onboarding work. Ask for staging/account execution only when needed; do not apply candidates to production.
