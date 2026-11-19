# Parent, coach and roster regression repairs

**Scope:** focused code integration on `AM/consolidated`. This is not a review of existing live Parent records, an identity remediation, a production rollout, or a database migration.

| Area | Change | Verified result | Boundary |
| --- | --- | --- | --- |
| Coach roster | Load archived batches on request; identify normalized duplicate names before save | Roster model tests 13/13; affected browser suite includes archived, duplicate, create/edit, retry and discard flows | Name check is a UI guard; no concurrent database uniqueness constraint was added |
| Parent invitation | Require explicit child selection; retain invitation and child identity through uncertain retries; allow correction after definite rejection | Parent connection tests cover siblings, retries, rejection, invalid dates, pending/approved academy separation and reload | Browser fixtures use mocked identities/data, not real email delivery or live accounts |
| Parent workspace | Keep a pending request visible without replacing approved academy feedback; keep sibling data scoped to selected child | Parent and coach journey browser cases passed | Existing live links were not inspected or changed |
| Password recovery | Reuse callback and isolate concurrent tab authentication flows | Focused auth unit tests 17/17 and auth browser cases 15/15 | Real inbox delivery and authenticated production session remain unverified |

## Verification evidence

- TypeScript check passed.
- Lint passed after correcting one new test callback warning.
- Focused roster model tests: 13/13 passed.
- Focused roster/Parent/coach browser suite: 25/25 passed using the system Chromium executable.
- Focused authentication browser suite: 15/15 passed; focused auth unit suite: 17/17 passed.
- Full repository quality gate and hosted GitHub Actions for the new AM commit are pending.

Tests use fictional fixture data. They do not establish that a previously reported real feedback mapping is correct or repaired. No Supabase records, authentication settings, invitations, or migrations were changed in this code integration.
