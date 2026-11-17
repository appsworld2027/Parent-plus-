# Hosted Coach→Parent journey QA — 0.12.0 / Parent0.2.0

Baseline source `dd7f8bd58fdeffef11f016cd28b425cecace0d2f`, successful Vercel deployment `55VjNvjxAproH5jC9a9pG6on3ARm`.
Canonical preview: https://parent-plus-varcel-git-codex-coach-foundation-appsworld2027.vercel.app
Checked 2026-11-16T09:44:37.989Z.

All5 requested Coach→Parent journey cases passed in 44.361s,0 skipped/flaky/unexpected failures. Tested actual deployed JavaScript with fictional Supabase transport:

1. Authenticated Coach class attendance → recorded feedback → explicit reviewed share → same-login private family/child setup → confirmed invitation claim → highlighted Parent update → reload persistence.
2. Existing own connection selects its linked child, without another invitation/sign-in, and sibling has no access to that child's update within the UI.
3. Another parent's connection cannot be opened or replaced by the shortcut.
4. Connection check in flight locks sibling/cancellation actions.
5. Sign-out clears pending journey and requires normal authentication.

Parent entry returned200. Static smoke:0 page errors and0 backend/provider requests. Served asset `/_expo/static/js/web/index-7224adc2c049c57e3222b756625e7df7.js` returned200; SHA256 `d9f61f146ee5667345ca9f3b26331efe4e30c3c2f712ebcb787d556c900d12b5`. Coach0.12.0/Parent0.2.0 and journey markers present; revision marker absent, so source identity comes from successful Vercel commit status and deployment identity. Bounded Google-key/Supabase-secret/private-key pattern checks:0matches.

`parent-shared-update-phone.png` is clean412×915 hosted evidence of the reviewed update and was visually inspected. `coach-reviewed-update-phone.png` captures the review area with a Recorded status overlay; use the Parent screenshot as the clearest final-state evidence.

Limits: fictional browser transport only; no real email, database writes, provider/OCR calls, parent contacts or messages. Live database acceptance is separate. Baseline evidence is retained with its original source/hash. The final correction was verified with the two focused cases below; all5 were not repeated.


## Final selection-persistence follow-up

Final source `450fabb9bcda9c49b4144062e91c325e06232366`, successful deployment `F7RcvMFrmB7umpuKp7ctjSwSj7NK`; checked 2026-11-16T09:49:53.610Z.

2/2 updated cases passed in 17.039s,0 skipped/flaky/unexpected failures:

- Existing own connection chooses the correct non-first sibling, remains selected after reload, and switching siblings hides that child's update; no extra invitation or login.
- Sign-out clears both the pending journey and the seeded account/family child-selection preference, then normal authentication is required.

Final asset `/_expo/static/js/web/index-dfae1825b2c6eab7dec169d1c72cf9a7.js` returned200; SHA256 `b695eb29d5f5c75e8a48c9c5cfc859df75da9e9b014bf8098989fcf4ea0140b6`. Coach0.12.0/Parent0.2.0/journey markers confirmed, revision marker absent (source bound by Vercel commit status/deployment). Parent login200,0 page errors and0 backend/provider requests in final static smoke,0 bounded secret-pattern matches. No new screenshots were needed for this selection-only correction; the published baseline Parent screenshot is explicitly tied to dd7f8bd.

Temporary private bootstrap scripts, cookie/browser state, configs and test copies were removed after reporting. Retained results/screenshots/reports were scanned for preview capability and cookie-state patterns, with0matches. No tracked source edits or private browser state committed. No live SQL, email, real family data, writes, OCR/provider calls or messages were used.
