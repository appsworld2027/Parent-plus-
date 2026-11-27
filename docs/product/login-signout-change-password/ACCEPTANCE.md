# Feature Contract: Login — sign out everywhere and change password (C1.1e)

Status: APPROVED by founder in chat on 2026-11-26 ("D1 and D2 do"), including D1 (72-byte limit) and D2 (app verifies current password). Approval recorded by Claude; not yet a GitHub /approve. No tests or code exist yet. Source: Login spec C1.1 (26 Nov 2026) + independent review (26 Nov 2026). Roadmap: C1.1

## Why
A coach who loses a phone or suspects someone else has their password must be able to lock everything down.

## In / Out
- In: sign out on this device, sign out of all devices, change password while signed in.
- Out: forgot-password recovery (C1.1b).

## Decision D2 — approved
Supabase does not check the current password by itself. Recommended: the app verifies the current password by signing in with it before saving the new one (M20 if wrong). The server-side refusal case is then marked "not applicable by design" instead of "not run".

## Acceptance criteria
| ID | Given | When | Then |
|---|---|---|---|
| SO-01 | signed-in coach | signs out on this device | no private data or session remains, including after Back, reload and reopen |
| SO-02 | coach with unsent drafts | taps Sign out | a warning shows first (see SS-07 and SS-08) |
| SO-03 | signed-in coach | opens Settings | "Sign out of all devices" is there |
| SO-04 | coach taps it | the confirmation shows | M19 shows; cancel changes nothing |
| SO-05 | coach confirms | all devices sign out | other devices cannot renew their sessions (how long their current token lasts is recorded) |
| SO-06 | the coach is offline | they sign out | it either clears this device or says it did not complete; it never claims success while data remains |
| SO-07 | coach A signs out and coach B signs in on one device | B uses the app | B sees none of A's data, cache, drafts or child selection |
| SO-08 | signed-in coach | opens Settings | "Change password" is there with current, new and confirm fields |
| SO-09 | a wrong current password | coach saves | M20 shows and nothing changes |
| SO-10 | a valid change | coach saves | M14 shows, the old password fails, the new works, this device stays signed in |
| SO-11 | a valid change | another device tries to renew | it cannot |
| SO-12 | a new password under 15 characters or too long | coach saves | M03, M04 or M21 shows and nothing changes |

## Agents may decide alone
Where the settings controls sit within the approved Coach theme.

## Must ask the founder if
D2 is not accepted, or a stricter policy needs a paid plan.

## Tests
Locked tests: e2e/acceptance/login-signout-change-password.spec.ts.
