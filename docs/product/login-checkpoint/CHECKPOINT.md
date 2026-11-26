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
9. Next: C1.1c sign-up and password rules. DONE locally: C1.1a 12/12 (reviewed once, fixes applied), C1.1b 18/18 locked tests, npm run check 492/492, full e2e 146/146. C1.1b independent review pending. Existing unit test tests/auth.test.ts changed (10 to 15 characters, fixtures lengthened) — list for reviewer. Real-service cases (email delivery, real devices, token lifetime) NOT run.
