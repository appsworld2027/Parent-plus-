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

## Founder standing instruction — credit control (26 Nov 2026)
- Credits are tight. When a session is running long (many tool calls, large history) or the next task is credit-sensitive, STOP and give the founder one ready-to-paste prompt to start a fresh session, pointing at this checkpoint. Do not keep working in a bloated session.
- No separate agents unless the founder asks; state the cost first. Use the cheapest suitable model for routine work. Run only the tests a change touches; run the full suite once before founder testing.
- Do not claim token or credit figures that were not measured.
- Never re-run the full test suite on unchanged code. Run only the specs a change touches; run the full suite once, right before founder testing, and only if code changed since the last full run (last full run: commit cf4b285 content, 214 browser passed 1 skipped).

## Parked by founder (26 Nov 2026): email service
- Founder said "Forget this email thing" (no managed domain; custom SMTP not set up). Parked, not cancelled. Real-inbox cases (sign-up confirmation, resend, recovery email delivery) stay NOT RUN. Do not raise it again until the founder does or a real coach pilot is planned.

## Login build status — 27 Nov 2026
- All six contracts built (C1.1a-f). Remaining database gap closed as a CANDIDATE only: supabase/candidates/202611270022_verified_email_gate.sql, validated on a disposable in-memory database (tests/login-verified-email-candidate.test.ts, 3 pass). NOT applied to the hosted project; applying needs founder authorization.
- Founder-gated, not done: hosted Auth settings (Confirm email, min password 15, redirect list, rate limits), email service (parked), applying the candidate SQL, real-inbox/device tests, a founder test login (dashboard Add user, auto-confirm).
- Founder declined: Supabase access token via secure form; hosted database write for a test user.

## Next module (decided 27 Nov 2026): C1.2 Provider profile and verification, then C1.3 Listing and publish
- Source: founder's context file, "C1 Onboarding and verification" (features 1.2-F1, 1.2-F2, 1.3-F1, 1.3-F2). Not yet turned into contracts.
- Founder decisions still open and blocking: D-02 who verifies providers and what evidence; D-03 whether public listing is in scope.
- Process: contracts of about 12 criteria each, founder approval, locked tests by a separate step, then build. Follow the credit-control rules above.

## C1.2 and C1.3 build status — 27 Nov 2026 (saved locally; pushed to claude/wizardly-ritchie-43u2va when the push line below says so)
- Decisions (Claude, routine): admin = a row in coach_private.provider_admins (founder is the first admin, assumed); coach and admin tools live in two new tabs, Profile and Listing (7 tabs now, founder may want a layout pass); documents use a private bucket `provider-documents` with 5-minute signed links; revoking a Verified profile (admin reject) unpublishes the listing in the same transaction.
- C1.2: locked tests e2e/acceptance/provider-profile-verification.spec.ts PV-01..12 pass 12/12 (browser, fictional service in e2e/support/providerBackend.ts). Disposable database tests/provider-verification-database.test.ts pass 10/10 against supabase/candidates/202611270023_provider_verification.sql.
- C1.3: locked tests e2e/acceptance/provider-listing-publish.spec.ts LP-01..12 pass 14/14 (LP-01 runs for 3 states). Disposable database tests/provider-listing-database.test.ts pass 10/10 against supabase/candidates/202611270024_provider_listing.sql.
- Code: src/provider/{model,service,ProviderProfileScreen,listing,ListingScreen}.ts(x), tabs in App.tsx, dependency expo-document-picker added.
- npm run check: typecheck clean, 542 passed, 2 expected-fail, 1 skipped. Full browser suite: see result line below.
- NOT RUN / founder-gated: applying candidates 023 and 024 to the hosted project, creating the hosted storage bucket, real signed-link expiry, a real admin row (needs the founder's user id), real-device file picker (native), independent review of both builds (self-built; pending, not independent), separate-academy case (listings belong to a user, not an academy).
- Assumption to confirm: "Published" is private (D-03). Admin cannot yet revoke from the UI (the SQL supports reject on a Verified profile; no screen button).
- Next: founder preview test of Profile and Listing tabs; independent review; decision on applying 023/024 and naming the first admin.
