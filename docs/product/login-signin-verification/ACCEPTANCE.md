# Feature Contract: Login — sign in and email verification (C1.1d)

Status: DRAFT — awaiting founder approval. No tests or code exist yet. Source: Login spec C1.1 (26 Nov 2026) + independent review (26 Nov 2026). Roadmap: C1.1

## Why
Coaches must get in quickly, get a clear next step when something is wrong, and never learn who has an account.

## In / Out
- In: email and password sign-in, safe errors, unverified email, resend, rate limits, no secrets in logs.
- Out: sign-up (C1.1c), recovery (C1.1b).

## Acceptance criteria
| ID | Given | When | Then |
|---|---|---|---|
| SI-01 | a verified coach with correct credentials | coach signs in | the workspace opens, or academy setup if none exists |
| SI-02 | a wrong password, or an unknown email | coach signs in | the identical M08 shows in both cases; no session is created |
| SI-03 | an unverified account | coach signs in | M09 shows with a working Resend action; no workspace opens |
| SI-04 | an older account with a 10 to 14 character password | coach signs in | it works and the coach is not forced to change it |
| SI-05 | an empty password | coach signs in | M02 shows |
| SI-06 | the connection is lost or takes over 15 seconds | coach signs in | M11 shows and entries stay; retry works once online |
| SI-07 | too many attempts | coach signs in | M10 shows and no session is created |
| SI-08 | any failed request | the error shows | a reference code is shown and no raw service error |
| SI-09 | Resend is tapped | it sends | a new email arrives, the button is off for 60 seconds with a countdown, and the wait survives a reload |
| SI-10 | Resend for an unknown or already verified email | it is tapped | the same neutral M17 shows |
| SI-11 | a confirmation link opened on the same device | the coach opens it | they are signed in and reach academy setup |
| SI-12 | a confirmation link that cannot sign in (another device, expired, used) | the coach opens it | M16 with a Sign in button; the screen never claims the email is unverified when it is verified |

Outside these 12 (covered by every Login contract): no password, token or email code appears in logs, error text or stored page URLs.

## Agents may decide alone
Countdown storage, reference-code format.

## Must ask the founder if
A behaviour needs a paid email service or changes hosted settings.

## Tests
Locked tests: e2e/acceptance/login-signin-verification.spec.ts. Real-inbox cases (SI-09, SI-11, SI-12) need a test email service and stay "not run" until one exists.
