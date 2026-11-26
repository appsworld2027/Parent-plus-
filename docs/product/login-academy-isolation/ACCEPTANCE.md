# Feature Contract: Login — academy setup and account isolation (C1.1f)

Status: DRAFT — awaiting founder approval. No tests or code exist yet. Source: Login spec C1.1 (26 Nov 2026) + independent review (26 Nov 2026). Roadmap: C1.1

## Why
A new coach must set up exactly one academy, and no account may ever see another account's data. This is a child-safety boundary.

## In / Out
- In: first academy setup, repeat and concurrent saves, field limits, access rules between accounts and between Coach and Parent.
- Out: staff roles (C2), account deletion (C11).

## Acceptance criteria
| ID | Given | When | Then |
|---|---|---|---|
| AI-01 | a verified coach with no academy | first signs in | "Your academy, your way." shows |
| AI-02 | valid name and academy name (1 to 100 characters) | coach taps Create my workspace | Today opens, empty, with that academy name; timezone Asia/Kolkata and INR |
| AI-03 | spaces only, or 101 characters | coach submits | refused by the app and by the database; 1 and 100 characters are accepted |
| AI-04 | a failed save | coach submits | M15 shows, entries stay, Sign out stays available |
| AI-05 | a lost response then a retry, or two devices saving at once | both complete | exactly one academy exists and the screen shows the stored name |
| AI-06 | signed-out or unverified callers | they call the create function | nothing is created |
| AI-07 | coach A | reads or changes coach B's academy by any screen or direct request | refused |
| AI-08 | a parent-only account | uses any coach address or request | no coach records are returned |
| AI-09 | signed-out or unverified callers | they request protected tables, files or functions | refused |
| AI-10 | a user edits their own profile or token metadata | they make a request | no extra access is granted |
| AI-11 | one account with both coach and parent records | uses each space | each shows only its own allowed records |

## Agents may decide alone
Test-fixture design on a disposable database.

## Must ask the founder if
A fix needs a change to the hosted database or real data. Database checks run only on disposable or local databases.

## Tests
Locked tests: e2e/acceptance/login-academy-isolation.spec.ts plus database tests per docs/MULTI_WORKSPACE_VALIDATION.md.
