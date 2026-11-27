# Provider module (C1.2 + C1.3) checkpoint — 2026-11-27
Product: Parent Plus. Features: C1.2 profile and verification, C1.3 listing and publish. Branch: claude/wizardly-ritchie-43u2va. Status: Synced to GitHub; NOT verified by a fresh session.
1. Objective: C1.2 then C1.3 — contract, locked tests, build, independent review. Login (C1.1) is built; see docs/product/login-checkpoint/CHECKPOINT.md (credit-control rules apply).
2. Decisions (founder, chat 2026-11-27): D-02 admin approves by hand, one photo ID + one qualification. D-03 public listing out of scope, so "publish" is private (owner + admins only). Both contracts APPROVED. First admin = founder (assumed; changeable). Founder wants fewer questions: decide routine matters, ask only for hosted DB changes, paid services, release to main.
3. Done: contracts docs/product/provider-profile-verification/ACCEPTANCE.md (PV-01..12) and provider-listing-publish/ACCEPTANCE.md (LP-01..12). npm run check passed (41 files, 522 pass, 2 expected-fail, 1 skipped).
4. State (updated 27 Nov): C1.2 and C1.3 BUILT, locked tests pass (PV 12/12, LP 14/14, DB 22/22), candidates 0023/0024/0025 applied to dev project parentplus-dev (not production), admin row set (assumed founder account), independent review done with fixes. Preview deploys from this branch. Remaining follow-ups: delete superseded ID files, upload quota, admin revoke button, content sniffing. See login-checkpoint/CHECKPOINT.md for detail. (Old line follows) no tests or code yet. Source context file "C1 Onboarding and verification" was not in repo; criteria derived from checkpoint and decisions.
5. Next: write locked tests e2e/acceptance/provider-profile-verification.spec.ts (model: login-recovery.spec.ts) + disposable-DB test for PV-11/PV-12; then build C1.2; then C1.3 same way. Run only touched specs; full suite once before founder testing. No agents; cheapest model.
6. Traps: never edit e2e/acceptance after lock; no hosted DB/storage changes without founder; no secrets; document storage setup is founder-gated (report NOT RUN).
7. Open: none blocking.
8. Resources: Sonnet 5.5; token use not measured.
Update this file at each milestone.
