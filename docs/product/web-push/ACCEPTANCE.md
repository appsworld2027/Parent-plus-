# Feature Contract: Browser push alerts for parents (M2-40, web channel)
Status: DRAFT — founder approved all work and chose a cloud-only route (no Firebase file, no device). Applied to dev project parentplus-dev: tables public.push_subscriptions / public.push_settings, functions save/remove_push_subscription, push_targets, push_forget (service role), Edge Function `notify-batch` (verify_jwt on). The signing key is created by the function on first use and never leaves the database.
Covers parents using the Parent **website** (Chrome/Edge/Firefox on Android and desktop; iPhone only after Add to Home Screen). The native Android app would need Firebase later.
| ID | Given | When | Then |
|---|---|---|---|
| WPN-01 | a parent on a supporting browser | opens Home | card "Get alerts from your coach" with "Turn on notifications" |
| WPN-02 | taps it and allows | — | the browser is subscribed, saved to their account only; card says "Alerts are on for this device"; "Turn off notifications" offered |
| WPN-03 | permission denied | — | card says alerts are blocked and how to allow them; nothing saved |
| WPN-04 | iPhone Safari outside the Home Screen app | opens Home | card explains Add to Home Screen first |
| WPN-05 | unsupported browser or native app | opens Home | no card |
| WPN-06 | taps Turn off | — | the subscription is removed on the device and server |
| WPN-07 | the coach posts an announcement, a reminder, or a schedule change/holiday notice | — | after the in-app notice is saved, the batch's linked parents' subscribed browsers are pushed with the batch name and message |
| WPN-08 | the push fails or no one subscribed | — | the coach sees no error (in-app notice is the source of truth) |
| WPN-09 | a stranger, another coach, or a signed-out caller calls the function | — | refused (401/403); nothing sent |
| WPN-10 | a dead browser endpoint (404/410) | send | the subscription is deleted |
| WPN-11 | database rules | — | subscriptions and settings unreadable by any client; targets only linked parents of children enrolled in that batch; inactive links excluded |
Tests: tests/web-push-candidate.test.ts (WP-01..08 = WPN-09/11 database rules); tests/web-push.test.ts (copy/key); e2e/web-push.spec.ts (WPN-01..07 with a faked browser push API). NOT RUN: a real push arriving on a real browser (needs a live signed-in coach/parent pair in a real browser); function smoke-tested live for 401 and CORS pre-flight only.
