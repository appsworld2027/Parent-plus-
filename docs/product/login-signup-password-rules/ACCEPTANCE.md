# Feature Contract: Login — sign-up and password rules (C1.1c)

Status: DRAFT — awaiting founder approval. No tests or code exist yet. Source: Login spec C1.1 (26 Nov 2026) + independent review (26 Nov 2026). Roadmap: C1.1

## Why
New coaches must be able to create an account with a strong password without silent surprises, and without revealing who already has an account.

## In / Out
- In: sign-up form, 15-character minimum, long and Unicode passwords, Show password, neutral sign-up message, service-side enforcement.
- Out: sign-in (C1.1d), change password (C1.1e).

## Decision needed (D1)
Supabase stores only the first 72 bytes of a password. Recommended: accept up to 72 bytes; beyond that refuse with a clear new message M21 and never cut silently. Hindi takes 3 bytes per character, so about 24 Hindi characters fit. The spec's "at least 64 characters" is replaced by "up to 72 bytes".

## Acceptance criteria
| ID | Given | When | Then |
|---|---|---|---|
| SU-01 | a new valid email and a 15-character password | coach taps Create account | M07 shows on a "Check your email" panel; both password fields are cleared; an unverified account exists |
| SU-02 | a 14-character password | coach submits | M03 shows; entries stay |
| SU-03 | exactly 15 lowercase letters, no digit or symbol | coach submits | it is accepted |
| SU-04 | mismatched confirmation | coach submits | M04 shows |
| SU-05 | a malformed email | coach submits | M01 shows |
| SU-06 | a password over the byte limit (D1) | coach submits | M21 shows; nothing is cut; no account is created |
| SU-07 | a pasted over-long value | it is pasted | the field keeps all of it (no silent cut at 200) so SU-06 can refuse it |
| SU-08 | an email that already has an account | coach submits | the same screen and M07 as a new email; no second account; the existing password is unchanged |
| SU-09 | the same email in different letter case | coach submits | no second account is created |
| SU-10 | a breached or common password | the service refuses it | M05 shows (not "check your connection") |
| SU-11 | any password field | coach taps Show password | it reveals and hides; paste, autofill and password managers work |
| SU-12 | the app is bypassed | a 14-character password is sent straight to the service | the service refuses it |

## Agents may decide alone
Strength-check wording within the approved messages; how bytes are counted.

## Must ask the founder if
The byte limit (D1) is not accepted, or leaked-password protection (needs Supabase Pro, paid) must be turned on for SU-10 to pass.

## Tests
Locked tests: e2e/acceptance/login-signup-password-rules.spec.ts. SU-10 and SU-12 are real-service cases; they stay "not run" until a disposable test project with the right settings exists.
