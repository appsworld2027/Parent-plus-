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
9. Next: C1.1d sign-in and verification (locked tests then build). DONE locally: C1.1a 12/12, C1.1b 18/18, C1.1c 20/21 (SU-12 fixme = NOT RUN, needs disposable real project). Full e2e 165 passed 1 skipped; npm run check 492/492. Reviews: C1.1a done, C1.1b done, C1.1c pending. Changed existing tests (list for reviewer): tests/auth.test.ts (10 to 15 chars, boundary case), e2e/auth.spec.ts (sign-up now shows Check your email panel with M07). NOT RUN: real inbox, real service password policy (Supabase Pro leaked-password), real devices, token lifetime.
