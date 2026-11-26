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
9. Next: founder test on preview; independent review of the C1.1f tests; decision on verified-email database rule. ALL SIX Login contracts have locked tests and builds locally: a 12/12, b 18/18, c 20/21 (SU-12 NOT RUN), d 25/25, e 15/15, f browser 8/8 + database 27 pass, 2 KNOWN GAPS (AI-06 unverified create, AI-09 unverified read: installed DB has no verified-email rule; needs new SQL + founder authorization), 1 skipped (true concurrent race). Unit 519 pass 2 expected-fail 1 skipped. Full e2e 214 passed 1 skipped. Reviews done a-e; f tests unreviewed. NOT RUN: real inbox, devices, real token lifetime, hosted settings, real service policy.
