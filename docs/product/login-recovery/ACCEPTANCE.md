# Feature Contract: Login — password recovery (C1.1b)

Status: APPROVED by founder in chat on 2026-11-26 ("D1 and D2 do"), including D1 (72-byte limit) and D2 (app verifies current password). Approval recorded by Claude; not yet a GitHub /approve. No tests or code exist yet. Source: Login spec C1.1 (26 Nov 2026) + independent review (26 Nov 2026). Roadmap: C1.1

## Why
A coach who forgot their password must get back in safely, and a half-finished reset must never open the workspace.

## In / Out
- In: request recovery, open link, choose new password, cancel, reload during reset, link misuse, other sessions ended.
- Out: sign-up/sign-in rules, change password while signed in (C1.1e).

## Acceptance criteria
| ID | Given | When | Then |
|---|---|---|---|
| RC-01 | any well-formed email, known or unknown | coach taps Send recovery email | the same screen and M12 appear in both cases |
| RC-02 | a valid, newest recovery link opened on the same browser or phone | the app opens | the code is removed from the address bar and "Choose a new password." shows |
| RC-03 | the new-password screen is showing | coach reloads, presses Back, or restarts the app | the new-password screen still shows; the workspace never opens |
| RC-04 | the new-password screen is showing | coach taps Cancel | they return to sign-in with no session left |
| RC-05 | a new password of at least 15 characters | coach taps Save | M14 shows, the workspace opens, and the new password works while the old one fails |
| RC-06 | a password change succeeded | another device holds an old session | that device cannot renew its session (how long its current token lasts is recorded as evidence) |
| RC-07 | an expired, used, altered or superseded link | coach opens it | nothing changes and M13 shows with a request-again button |
| RC-08 | a recovery link opened on a different browser or device | coach opens it | nothing changes and M13 shows |
| RC-09 | a link with a foreign host or a raw access token | the app receives it | it is ignored |
| RC-10 | a new password under 15 characters or with mismatched confirmation | coach taps Save | M03 or M04 shows, nothing saves, entries stay |

## Agents may decide alone
How recovery state is stored so it survives reload.

## Must ask the founder if
Surviving a reload requires changing what is stored on the device in a way that affects privacy.

## Tests
Locked tests: e2e/acceptance/login-recovery.spec.ts. Real delivered-email cases run only on a disposable test project (S/M level, reported separately).
