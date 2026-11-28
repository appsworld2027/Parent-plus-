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
