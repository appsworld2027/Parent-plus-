# Hosted QA — Coach 0.11.0 / Parent 0.1.0

Source: `b014c0a2f815bf38f4a493091879347ba6ed145b`.
Vercel deployment: `Hn8KZD6cmj98RG4Xe8T9j7MYLUWx` (GitHub commit deployment status: success).
Canonical preview: https://parent-plus-varcel-git-codex-coach-foundation-appsworld2027.vercel.app
Checked:16November2026,13:48IST (Asia/Kolkata).

## Results

14/14 focused hosted Playwright cases passed in 64.697s, one Chromium worker, 412×915 viewport. Zero skipped, unexpected failures or flaky retries.

- Parent workspace: 5/5 — private family/child records, saves/retry, reviewed Coach invitation/feed, consent, missing-schema handling and Parent recovery route.
- Coach priority: 5/5 — no-fee batch/class setup, attendance-to-feedback, explicit WhatsApp review and unsaved/number safeguards.
- Parent feedback: 4/4 — consent-gated private media, immutable upload retry, reviewed per-child handoffs/cancellation, exact review retry and missing-update handling.

## Deployment smoke and client checks

`/parent` and `/auth/recovery` returned HTTP200. Served bundle contains Coach0.11.0 and Parent0.1.0 markers; Parent login is a separate family entry point. No JavaScript page errors in the static smoke. Static smoke made zero backend/provider requests.

Asset: `/_expo/static/js/web/index-7f12129847cfb2609461e8cda5c7aec4.js` (HTTP200).
SHA256: `6a0070c4aecd900c65ee04ae4484787747998105825f24f0f21030d5ff40dca6`.
Bounded bundle checks: zero Google API-key, Supabase-secret-key and private-key pattern matches. Direct Google Vision provider endpoint absent. These bounded checks are not a general security certification; the public Supabase client configuration is expected.

## Visual evidence

Existing test screenshots are under `results/`: reviewed Parent feed, compact Coach class, WhatsApp review, consented fictional video and held reviewed handoff. Reviewed Parent feed and Coach class/WhatsApp layouts fit at412px; content and recipient identities are fictional. The transitional hosted Parent Home artifact was omitted. A clean separately tested local Home screenshot exists at `docs/images/011-parent-home.png`; it is local evidence.

## Limits

New workflows used fictional in-browser Supabase/Storage transport fixtures against the actual deployed JavaScript. No real database writes, provider calls, parent contacts, WhatsApp sends, emails or live011/012 migration acceptance were tested. Live011/012 are not installed. Static login/recovery smoke is read-only and blocked backend/provider hosts. The other existing hosted suites were intentionally not repeated. Runtime source identity is tied to GitHub's successful Vercel commit status and captured asset digest; the UI build-revision label itself remains local.

No tracked source files were modified by this QA run. Private preview capability scripts, cookies/storage state, temporary config and downloaded client bundle are removed after recording this sanitized evidence; no access capability or browser state is retained in this report.


Preserved hosted screenshots: [Parent received feedback](images/011-hosted-parent-feedback.png), [Coach WhatsApp review](images/011-hosted-whatsapp.png), [Coach classes](images/011-hosted-class.png). The clean [Parent Home](images/011-parent-home.png) is local evidence from the full76-case suite.
