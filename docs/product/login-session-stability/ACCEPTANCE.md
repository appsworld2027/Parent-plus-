# Feature Contract: Login — session stability and entry states (C1.1a)

Status: APPROVED by founder in chat on 2026-11-26 ("D1 and D2 do"), including D1 (72-byte limit) and D2 (app verifies current password). Approval recorded by Claude; not yet a GitHub /approve. No tests or code exist yet. Source: Login spec C1.1 (26 Nov 2026) + independent review (26 Nov 2026). Roadmap: C1.1

## Why
A coach who is typing attendance or feedback must never lose work because the app quietly renewed their login or the connection blipped.

## In / Out
- In: silent token renewal, entry states (checking, signed out, cannot connect, session ended), involuntary vs chosen sign-out, bad email link while signed in.
- Out: recovery (C1.1b), sign-up rules (C1.1c), sign-in and resend (C1.1d), all-device sign-out and change password (C1.1e), academy setup and isolation (C1.1f).

## Acceptance criteria
| ID | Given | When | Then |
|---|---|---|---|
| SS-01 | signed-in coach with a half-filled form open | the login token renews for the same user | the form keeps its typed text, the screen does not change, and "Opening your workspace…" never appears |
| SS-02 | signed-in coach with an open dialog | the token renews | the dialog stays open |
| SS-03 | the app opens with a stored valid session | it checks the user | "Opening your workspace…" shows, no workspace content appears before the check passes |
| SS-04 | the service ends the session (expired or revoked) | the app notices | the coach sees M18 "Your session ended. Please sign in again." on the sign-in screen and no private data |
| SS-05 | SS-04 happened with unsent attendance/feedback drafts | the same coach signs in within 7 days | the drafts are restored |
| SS-06 | SS-04 happened with drafts | a different coach signs in on that device | they see none of those drafts and the drafts are deleted |
| SS-07 | coach chooses Sign out with drafts | taps "Remove drafts and sign out" | drafts are deleted and the session is gone |
| SS-08 | coach chooses Sign out with drafts | taps "Keep editing" | nothing changes |
| SS-09 | the app opens offline | it checks the session | "Let's reconnect." with Retry and Sign out; never an empty workspace or academy setup |
| SS-10 | signed-in coach | opens a bad or expired email link | M13 shows and the working session stays signed in |
| SS-11 | a second tab signs in as another coach | the first tab is used | the first tab's account and data do not change |
| SS-12 | production build | the sign-in screen loads | no developer preview button or preview data |

## Agents may decide alone
Implementation approach, file names, how the token-renewal state is held.

## Must ask the founder if
A behaviour is needed that no criterion covers, or any criterion cannot be met as written.

## Tests
Locked tests: e2e/acceptance/login-session-stability.spec.ts — one per ID. Gaps proven first: token renewal spinner, drafts cleared on every SIGNED_OUT.
