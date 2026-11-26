# Login (C1.1) session checkpoint — 2026-11-26
Status: saved locally, pushed to claude/amazing-einstein-a2tsdw; NOT verified by a fresh session.
1. Objective: finish Login C1.1 as six contracts, one at a time, order a, b, c, d, e, f.
2. Decisions: six-contract split, D1 (up to 72 bytes, new message M21), D2 (app verifies current password) — approved by founder in chat 2026-11-26. Reviewer extras parked: email link silently swapping the signed-in account; two tabs sharing one login; Android scheme limits.
3. Done: spec read; independent review (subagent, pending a true second review of the contracts); six ACCEPTANCE.md drafted; npm ci + npm run check pass (39 files, 492 tests).
4. State: no code or tests written for Login yet.
5. Evidence: check passed locally at branch tip before this commit.
6. Traps: never edit e2e/acceptance after lock; Supabase hosted settings unknown; Vercel project name is parent-plus-varcel; no paid services without founder.
7. Open: agent switch UNATTENDED_AGENTS unconfirmed (founder); Supabase Pro and email provider unpriced.
8. Resources: model Sonnet 5.5; token use not measured.
9. Next: C1.1f academy setup and isolation (DB tests on disposable DB only). DONE locally: C1.1a 12/12, C1.1b 18/18, C1.1c 20/21 (SU-12 NOT RUN), C1.1d 25/25 (delivery simulated), C1.1e 15/15 (D2 app-side current-password check; token lifetimes simulated). Unit 492/492. Reviews done for a-d; e pending. New: src/auth/AccountSettings.tsx, Settings button on Support screen (App.tsx). Hosted settings to confirm before real coaches: Confirm email ON, min password 15, leaked-password protection (Supabase Pro, paid), own SMTP, rate limits, redirect URLs. NOT RUN: real inbox, devices, real token lifetime, real service policy.
