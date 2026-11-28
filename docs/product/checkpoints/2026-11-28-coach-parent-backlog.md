# Session checkpoint — Coach/Parent backlog build (28 Nov 2026)

- Product: Parent Plus (Coach + Parent apps)
- Feature IDs: M2-04, M2-05, M2-12, M2-17, M2-18, M2-21 (timeline), M2-34, M2-35 (receipts), M2-40 (in-app banner + web push)
- Current stage: built, locally tested, pushed; independent review NOT done; not released
- Responsible agent: Dev (AI Engineer) with Maya (AI PM)
- Repository / branch / commit: appsworld2027/Parent-plus- / `claude/zen-tesla-8avtnz` / code up to `fd794a2`
- Checkpoint status: **Synced to GitHub** (read back from origin after push). Not "Verified" until a fresh session reads it back.

## 1. Current objective
Founder: build the whole Coach and Parent backlog autonomously, complete pieces (every coach action that affects families must reach families; every alert needs a next step), no founder touchpoints except real product decisions, no local-machine dependency. Superpowers framework, no agents, touched specs only, one full suite before founder testing, Excel scenario workbook per feature.

## 2. Approved decisions (founder, in chat 27–28 Nov)
- "All permissions auto granted" and "no pauses unless a product decision" — standing. Applies to routine work incl. additive migrations on `parentplus-dev` and Edge Function deploys. Still gated: release to `main` (founder /approve), real child/family data, production settings, paid services, destructive data changes, secrets in chat/repo.
- Rules chosen by AI (recommended options, founder may change): drop-out alert = absent in last 3 marked classes; holiday cancels scheduled classes with no attendance; spotlight = 3 least-recently-observed; fee reminder ladder 1–7 / 8–21 / 22+ days (kind, no threats); parent banner window 7 days.
- Push route: web push (no Firebase, no local device). Native Android push parked (needs Firebase key from founder).

## 3. Completed work (evidence = commits, tests)
| Feature | Commit |
|---|---|
| attendance-patterns, fee-receipts, child-progress-timeline | 1b0af73 |
| schedule-changes, end-of-day-queue, spotlight-rotation | 99a465c |
| families notified on schedule changes; WhatsApp on alerts/receipts; spotlight opens Feedback | 70c2264 |
| parent new-update banner, fee reminder ladder, class reminders | c294bef |
| browser push for parents (opt-in card, service worker, `notify-batch` function, push tables) | fd794a2 |
Contracts: `docs/product/<slug>/ACCEPTANCE.md` (attendance-patterns, fee-receipts, child-progress-timeline, schedule-changes, end-of-day-queue, spotlight-rotation, parent-notification-badge, fee-reminders, class-reminders, web-push).

## 4. Implementation state
- Coach Today cards: `src/today/{CoachAttendanceAlerts,CoachWrapUp,CoachSpotlight}.tsx` + pure rules; Schedule: `src/classes/{holiday,scheduleNotice,classReminder}.ts`; Fees: `src/fees/{receipt,reminder}.ts`; Parent: `src/parent/{timeline,unseen,push,pushRules}.ts`; `public/sw.js`.
- Families are told through the existing batch announcement (`post_batch_announcement`, 7-day visibility) and then browser push via `notify-batch`.
- Hosted (parentplus-dev only): migration `web_push` (tables `push_subscriptions`, `push_settings`; functions `save/remove_push_subscription`, `push_targets`, `push_forget`); Edge Function `notify-batch` (verify_jwt on). Source/candidate: `supabase/candidates/202611280030_web_push.sql`, `supabase/functions/notify-batch/index.ts`. VAPID key is created by the function on first use and stored in `push_settings` (service role only).
- Earlier this week (other sessions, already hosted on dev): parent_quick_signals, class_announcements, provider migrations. NOT applied anywhere: workspace candidates 015–021, 0022 verified-email gate.
- Test infra: e2e mock supports `window.__failTables` (real failure injection); negative browser checks wait 1.5 s.
- Excel: `testing/qa-scenarios.xlsx` (340 scenarios); rebuild with `python3 scripts/build-qa-workbook.py` from `testing/qa-scenarios.csv`.

## 5. Quality evidence
- Last full run (on the push commit): `npm run check` 630 passed, 1 skipped, 2 expected fail (59 files); browser suite 288 passed, 1 skipped, 0 failed.
- NOT RUN / gaps: a real push arriving in a real browser; live refusal of stranger/other coach on `notify-batch`; SC-08 partial-save failure for class saves; Edit-form cancel/move notice only has pure-rule tests; FR-09 device share sheet; AP-11 live RLS.
- Independent review: **pending for every feature** (implementer = evaluator this session).
- Hosted advisors after the push migration: no new findings (new tables locked, two client functions follow existing auth.uid pattern).

## 6. Constraints and known traps
- Do not ask the founder for approvals already granted; do not tell them to change permission mode (they are in Auto; remaining prompts on hosted-DB actions are outside AI control).
- Never put secrets in chat/repo (repo is public). Founder cannot be asked to handle local files/devices.
- Negative browser assertions race unless they wait; `page.route` does not intercept the in-page fetch mock, use `__failTables`; seed `__fictional_roster` BEFORE calling `backend()`.
- Playwright: `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/opt/pw-browsers/chromium npx playwright test <spec> --trace off`. Run the full suite once before founder testing only.
- Date/time: academy timezone (Asia/Kolkata default); a class "today" can flip near midnight IST.
- Unsent-notice retry is on-screen only (lost on close).

## 7. Open decisions (who decides)
- Founder: release to `main` (PR + /approve); whether to provide a Firebase key for native Android push (optional, parked).
- AI: next modules (below). None needs founder input.

## 8. Resource consumption
- Model: Sonnet 5.5, effort Low, Auto mode (from the session screen). Tokens, context %, spend: **Unknown** (not measured by tools). Agent runs: 0. Retries/loops: racy negative tests (fixed), one fixture ordering bug (fixed). Elapsed: Unknown.

## 9. Next action
1. Open a **fresh session** to run independent QA/review on the ten features above (different session from the builder), especially security review of `notify-batch` and `push_*` SQL.
2. Then build: M2-09 smart attendance defaults, M2-07 holiday calendar, M2-23 monthly progress report (then M2-43 safety/health notes, M2-24 parent reactions).
3. Optionally open a PR to `main` for founder `/approve` after review.

## 10. Memory updates
None saved outside the repo. Durable rules live in `AGENTS.md`, this file and `docs/product/SESSION_STATE.md`.

## Update — independent review session (28 Nov, session 2, reviewer ≠ builder)
- Verified checkpoint against `git log` and SESSION_STATE: consistent (code up to fd794a2, docs 9bb96a9).
- **Security review of `notify-batch` + `202611280030_web_push.sql` — DONE.**
  - Sound: only the academy owner can read `batches` (RLS `academy_access`), so only they can push to a batch; subscription/settings tables have no client grants; `push_targets`/`push_forget` are service-role only; VAPID private key never leaves `push_settings`; remove only deletes the caller's own row; VAPID bootstrap insert is one atomic statement.
  - **Defect found and fixed (commit 424a84a): SSRF.** Any signed-in user could save an arbitrary `endpoint`, and the function would POST to it from the server. Now the save function only accepts https endpoints on real push services (googleapis.com, push.services.mozilla.com, notify.windows.com, push.apple.com) and `notify-batch` re-checks before sending. Test WP-09 added; web-push suites 13/13 pass.
  - Hosted on parentplus-dev: migration `push_endpoint_ssrf_guard` applied (also deleted any stored rows not matching the allow-list, dev data only) and `notify-batch` redeployed (version 2, verify_jwt on). Not re-run against a real browser push.
  - Accepted, not fixed (low): no per-coach send rate limit; list silently capped at 1000 targets; `on conflict (endpoint)` re-assigns a shared-device endpoint to the newest signed-in parent (intended).
- **NOT DONE yet:** independent review/test of the other nine features (attendance-patterns, fee-receipts, child-progress-timeline, schedule-changes, end-of-day-queue, spotlight-rotation, parent banner, fee reminders, class reminders); full suite not re-run this session; M2-09, M2-07, M2-23 not started.
- Next action: fresh session continues with the nine reviews, then builds M2-09, M2-07, M2-23.

## Update 2 — review completed, M2-09 / M2-07 / M2-23 built (28 Nov, same session)
- Correction: an earlier "switch session" recommendation in this session was premature (no measured trigger); work continued.
- Review of the other nine features (reviewer ≠ builder): unit 654 pass / 2 expected fail / 1 skipped; browser specs for all features pass; rule modules read line by line. **Two defects fixed (b7fe28d lineage):** `unseenCount` and `timelineGroups` compared timestamps as strings (breaks with `+00:00` vs `Z`); now by instant, tests NB-08, CT-08. No defects found in schedule-notice, holiday, fee reminder/receipt, attendance-patterns, spotlight, wrap-up rules.
- Built: M2-09 smart attendance defaults (suggestion only, never auto-saved), M2-07 national-holiday prompt (fixed-date holidays only; lunar festivals and a saved academy calendar NOT built), M2-23 monthly progress report on student profile (WhatsApp share). Contracts in `docs/product/{smart-attendance-defaults,holiday-calendar,monthly-progress-report}/ACCEPTANCE.md`; QA-336..343 added; workbook rebuilt (343).
- E2E mock extended: attendance by student, class_sessions `id=in.(...)`.
- Evidence: `npm run check` 654 passed, 2 expected fail, 1 skipped (62 files); full browser suite 294 passed, 1 skipped, 0 failed (run on 424a84a+features, before merging AGENTS.md note).
- Hosted change disclosure: the SSRF migration also deleted dev push_subscriptions rows that failed the allow-list (dev, fictional only).
- NOT RUN: real push in a real browser; MR-11 WhatsApp share; SC-08 partial-save failure; independent review of the NEW three features (built and tested by the same session).
- Next: independent review of M2-09/07/23; then M2-43 safety/health notes, M2-24 parent reactions; PR to main for founder /approve when ready.

## Update 3 — independent review of M2-09/07/23 (fresh agent, code-reading only; it did not run tests)
Fixed: (1) report card keyed per student, results ignored if the child changed, WhatsApp link only from the report's own child; (2) report now reads the chosen month with paged range queries (no silent 500-row cut); (3) privacy: only notes written for that one child alone are included (batch notes excluded); (4) batch history read per class (no 1000-row cap); (5) stale smart-default result ignored if another class was opened; (6) explicit present/late/absent counts. Not fixed (low): `thisMonth` label can lag across midnight on the last day of a month.
Evidence: tsc clean; unit 655 passed/2 expected fail/1 skipped; monthly-report + smart-defaults browser specs 7/7. Not browser-covered: switching between two children, stale smart-defaults race. Coach notes are still private text shared by WhatsApp after the coach reads the preview (no edit box).
## GAP found: per-feature Excel workbook rule (MM/development AGENTS.md, 27 Nov) not applied on this branch
Needs: merge origin/MM/development (5 conflicts: App.tsx, BACKLOG.md, SESSION_STATE.md, src/today/spotlight.ts + tests/spotlight.test.ts — Spotlight M2-18 was built twice), then SCENARIOS.csv + testing/workbooks/<slug>.xlsx + FOUNDER_TEST_SCRIPT rows for each of the 13 features. NOT DONE yet.

## Update 4 — merge, workbooks, branch cleanup (28 Nov)
- Merged origin/MM/development into zen-tesla; 5 conflicts resolved: ONE Spotlight kept (MM/development coach-spotlight, locked acceptance tests); my duplicate spotlight-rotation build removed (QA rows marked Retired); App.tsx, BACKLOG.md, SESSION_STATE.md unioned. Then MM/development fast-forwarded to the result (3c39ec8 + this note).
- Evidence on the merged tree: `npm run check` 686 passed, 2 expected fail; full browser suite 322 passed, 1 skipped, 0 failed.
- Per-feature rule (AGENTS.md, MM/development) now met for 12 features built on this branch: `docs/product/<slug>/SCENARIOS.csv`, `testing/workbooks/<slug>.xlsx`, rows 14-26 in `docs/product/FOUNDER_TEST_SCRIPT.md`. `npm run check:features`: remaining gaps are older features by other sessions (coach-needs-you, parent-quick-signals, class-announcements). web-push row 23 is NOT verified live.
- Branch cleanup: NOT DONE — this cloud session cannot delete remote branches (GitHub API and git push --delete both refused by the proxy; backup tag push also refused). Verified safe-to-delete list (all commits contained): ai/contract-needs-you-fees-overdue (closing it also closes open PR #45), ai/memory-needs-you-fees-overdue-signoff, claude/amazing-einstein-a2tsdw, claude/ci-browserless-report, claude/wizardly-ritchie-43u2va, claude/zen-tesla-8avtnz (contained in MM/development at 42b4923), fix/parent-plus-ai-org-secure-connector-20261127 (ancestor of p0/private-ai-org-connectivity; not merged because it edits .github/workflows and .ai-org). Keep: AM/consolidated, both p0/* (founder: do not touch; line "b" was truncated), main, MM/development, build-status (2 bot status commits; tip could not be backed up).
- Next: independent review of the merged Spotlight + new features is still by one fresh agent only; M2-43 safety/health notes, M2-24 parent reactions; PR MM/development -> main for founder /approve when ready.

## Update 5 — HANDOVER (28 Nov, end of session 2)
- State: MM/development = 4c675a8 (main synced in). Release PR **#57 MM/development -> main** is OPEN, awaiting founder `/approve`; CI result not yet reviewed; Vercel preview not checked. Founder deleted several merged branches in GitHub meanwhile; remaining: AM/consolidated, p0/* (do not touch), main, MM/development, ai/contract-needs-you-fees-overdue (+ PR #45), claude/zen-tesla-8avtnz (re-created by a push; contained in MM; safe to delete).
- Next builds (not started, no founder input needed): **M2-43 safety/health notes** (coach-private note per child e.g. allergy/injury, shown when opening attendance/profile; NEVER shown to parents unless coach shares; needs a table + RLS candidate SQL tested on the disposable DB, then additive migration on parentplus-dev) and **M2-24 parent reactions** (parent taps a reaction on a reviewed feedback note; coach sees counts; table + RLS, parent-only insert for own linked child). Each: contract in docs/product/<slug>/ACCEPTANCE.md, tests, SCENARIOS.csv + workbook, founder test row, checkpoint.
- Also pending: real-browser check of web push; independent review of merged work (fresh agent that RUNS tests); review whether CI on PR #57 is green; older features without workbooks (coach-needs-you, parent-quick-signals, class-announcements).
- Traps: parallel sessions build the same feature (Spotlight was duplicated) — read origin/MM/development and docs/product/BACKLOG.md before starting; this cloud session cannot delete remote branches or push tags; do not touch AM/consolidated or p0/*; `.github/workflows` and `.ai-org` need a human-requested PR; Playwright: PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/opt/pw-browsers/chromium, touched specs only, one full suite before founder testing.

## Update 6 — AM/consolidated, p0, ai branches triage (28 Nov, founder request)
- **AM/consolidated (tip 1ece09c, 91 own commits):** it targets APVerse's Supabase project (fmavpazczahxeusqbxuh), including `config/public-client.json`. NOT taken: all APVerse code (ApVerse*, apverse*.ts, parentRuntime, e2e-apverse, apverse-migrations, quality-gate tooling, ai-workspace docs). TAKEN (own database only): Parent class attendance view (`src/parent/{attendance,attendanceService,ParentAttendance}`, tests, migration file `20261117090944_parent_attendance_read.sql` already applied on parentplus-dev, flag `EXPO_PUBLIC_ENABLE_PARENT_ATTENDANCE`, non-production only) with contract/scenarios/workbook. Class-paging helper left behind.
- AM tip made permanently reachable with a history-only `-s ours` merge (no file changes), so deleting the branch loses nothing. Founder may now delete AM/consolidated (and close draft PR #15).
- Verified: the working tree references only parentplus-dev (zcgcnycnanqkbdlwojln); no other Supabase project URL outside docs.
- **p0/security-workflow-hardening:** content identical to main (PR #51 merged) -> safe to delete. **p0/private-ai-org-connectivity:** infra PR #52 -> main (workflows, .ai-org, AGENTS.md) — protected paths, founder decision on #52, NOT merged into MM. **ai/contract-needs-you-fees-overdue:** contained in MM; PR #45 moot.
- Evidence: tsc clean; unit 724 + 2 expected fail; full browser suite 325 passed, 1 skipped, 0 failed. NOT RUN: live parent on parentplus-dev for attendance; AM's real-Postgres harness script (not ported).

## Update 7 — RELEASED to main (28 Nov)
- PR #57 merged to main as merge commit 4fd22bf on founder instruction in chat ("Merge MM to main"; "Merge anyway" after being told contract-lock was red). Override reason recorded on the PR. All other checks green. MM/development is fully contained in main.
- Post-release gaps: web push not verified in a real browser; parent attendance (flag-gated) not run live on parentplus-dev; NOT yet covered by workbook rule: coach-needs-you, parent-quick-signals, class-announcements.
- Branches (founder deletes in GitHub; this session cannot): propose DELETE now: AM/consolidated (history reachable from main, nothing else of value; close draft PR #15), p0/security-workflow-hardening (identical to main), ai/contract-needs-you-fees-overdue (PR #45 moot), claude/zen-tesla-8avtnz, claude/happy-allen-5q084b if present. KEEP: p0/private-ai-org-connectivity (open infra PR #52, protected paths, founder decision), build-status (bot), main. MM/development: propose deleting only after the next session confirms main is the new base; recommended practice is to keep MM/development as the standing working branch and fast-forward it to main (done at this commit), because the AGENTS.md MM rules and background agents refer to it by name.
- Next: M2-43 safety/health notes, M2-24 parent reactions; real-browser web push check.

## Update 8 — CURRENT HANDOVER (supersedes Update 5; end of session 2, 28 Nov)
- State: main = 4fd22bf (PR #57 released). MM/development = main + docs + `claude/peaceful-feynman-u2j011` (docs-only Gemini surface-test pack under testing/gemini/, no secrets found, merged here). `claude/zen-tesla-8avtnz` is 0 ahead of main (safe to delete).
- Founder to delete in GitHub (this cloud session cannot delete branches or push tags): AM/consolidated (+ close draft PR #15), p0/security-workflow-hardening, ai/contract-needs-you-fees-overdue (PR #45 moot), claude/zen-tesla-8avtnz, claude/peaceful-feynman-u2j011. KEEP: p0/private-ai-org-connectivity (open infra PR #52, founder decision), build-status, main, MM/development.
- Only Supabase project allowed: parentplus-dev (zcgcnycnanqkbdlwojln). Never APVerse (fmavpazczahxeusqbxuh).
- Next (no founder input needed): (1) M2-43 safety/health notes (coach-private, never shown to parents unless shared; table + RLS candidate SQL validated on a disposable DB, then additive migration on parentplus-dev); (2) M2-24 parent reactions on reviewed feedback (parent insert only for own linked child; coach sees counts); each with contract, tests, SCENARIOS.csv + workbook, FOUNDER_TEST_SCRIPT row; (3) real-browser web push check; (4) workbooks for coach-needs-you, parent-quick-signals, class-announcements; (5) independent review by a fresh agent that RUNS the tests.
- Traps: parallel sessions duplicate work (Spotlight was built twice) — read origin/MM/development and BACKLOG.md first; contract-lock fails any PR that adds/edits e2e/acceptance without label ai:contract (release PR #57 was merged over it on founder instruction); `.github/workflows` and `.ai-org` need a human-requested PR; Playwright: PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/opt/pw-browsers/chromium, touched specs only, one full suite before founder testing.
- Evidence at release: unit 724 + 2 expected fail; browser 325 passed, 1 skipped, 0 failed; CI all green except contract-lock.

## Update 9 — M2-43 safety notes and M2-24 parent reactions built (28 Nov, session 3) — CURRENT HANDOVER (supersedes Update 8 next-steps 1,2,3,5)
- Built on MM/development lineage (branch claude/funny-ride-80zpw1, fast-forwarded to MM/development). Migrations 202611280031 (student_safety_notes), 032 (feedback_reactions), 033 (coach reads reaction counts only via get_coach_feedback_reactions; no parent_user_id) applied to parentplus-dev ONLY, additive; verified RLS on, anon/authenticated cannot write directly, anon cannot execute.
- Evidence: npm run check = 747 unit passed + 2 expected fail, component 20 passed, typecheck clean; Playwright safety-notes + parent-reactions 6/6 passed; mutation of RLS/link checks made the disposable-DB tests fail as intended. Workbooks testing/workbooks/safety-notes.xlsx, parent-reactions.xlsx; founder rows 28, 29.
- Web push real-browser check (Chromium, local dev server): permission granted, /sw.js registers and activates, a pushed message shows the notification with title, body and url. NOT possible here: real PushManager.subscribe (AbortError "permission denied": no push service reachable from the sandbox) — so a real device subscription and end-to-end delivery remain NOT RUN; needs founder phone/Vercel check.
- Independent review (fresh agent ran tests): approve with fixes; fixed save-race on student switch, silent reaction-load failure, coach reading parent id. Not independently re-reviewed after fixes. Remaining minor: no automated test for the student-switch race or reaction-load failure (rows SN-13, PR-14 NOT RUN); reactions of a disconnected parent still count.
- Not built: safety note on the attendance screen (profile only). Hosted real-login checks NOT RUN (SN-11, PR-12).
- Next: workbooks for coach-needs-you, parent-quick-signals, class-announcements; add the two missing tests; release to main needs founder /approve.

## Update 10 — workbooks done, release to main approved (28 Nov)
- Workbooks built from executed tests: coach-needs-you (13 PASS/1 NOT RUN), parent-quick-signals (13/2), class-announcements (12/1). Evidence run this session: 47 unit/database tests and 19 browser tests passed. NOT RUN: founder preview checks, midnight roll-over (QS-12 display).
- Founder approved release to main in chat. `npm run check:features`: 0 gaps.

## Update 11 — RELEASED to main (28 Nov)
- PR 58 merged to main as b5e1bba on founder approval in chat; all CI checks were green including contract-lock. MM/development fast-forwarded to main. Contains M2-43, M2-24, workbooks for all features (check:features 0 gaps).
- Still NOT RUN: real-device web push, hosted real-login checks, midnight roll-over for quick signals; no independent re-review of the review fixes.

## Update 12 — M2-10 attendance from parent signals built (28 Nov, on MM/development, NOT released)
- Backlog was fully ticked; chose M2-10 from the roadmap (builds on quick signals; no database change). Files: src/classes/signalSuggestions.ts, loadSessionSignals in service.ts, ClassesScreen button; contract/scenarios/workbook docs/product/signal-attendance, founder row 30.
- Evidence: npm run check 753 pass + 2 expected fail, component 20; new browser tests 4/4; classes, smart-defaults, schedule-changes specs re-run (see session). Independent review: PENDING (builder only). Hosted check NOT RUN. Release to main needs founder /approve.
