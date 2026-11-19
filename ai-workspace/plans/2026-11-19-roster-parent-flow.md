# Roster and Parent connection repairs

Owner reports missing batches, unclear load-all/duplicate handling, contacts mistaken for guardian authentication, repeat approval and missing/mismatched Parent children. Latest answer explicitly retains separate Coach approval. Work stays on MM/development; no main promotion, new MM branches, live records, email/provider sends or SQL activation.

## Confirmed causes and acceptance

- UX-BAT-01: roster API already paginates all batches, but UI hides archived ones and exposes only generic refresh. Add explicit load-all/status and archived distinction without reviving archived records; account-specific intermittent missing data remains unconfirmed.
- UX-BAT-02: new batch UUIDs permit normalized duplicate names. Add a same-academy loaded-roster UX guard for case/whitespace/Unicode equivalents, excluding the edited ID. Existing duplicates remain; concurrent/direct API uniqueness needs a future audited database policy.
- PAR-10: connect defaults to the first family child, making a new student invite easy to link to the wrong existing child. Require explicit child selection and user-confirmed creation of a different private child without losing the invitation. No automatic child-name matching, record reassignment or merge.
- PAR-11: pendingForChild currently replaces all approved feedback. Render pending and already-approved updates independently; another academy's pending request grants no feedback access and hides none already permitted.
- Guardian names are free-form roster data, not identity proof. Saving contact information sends no invitation today. Verified intended-email invitation plus Parent child choice plus separate Coach approval remain required. Phone verification/automatic delivery is not built by this repair.

## Execution

1. Add meaningful failing normalized-name and load-all browser cases; implement the smallest roster UX change.
2. Parent implementer adds failing explicit-target/new-child and pending-versus-approved regressions, then fixes the modal/feed without database/security changes.
3. Run focused cases, TypeScript/full automated tests, complete browser regression and web/Android exports in existing CI on MM/development. Review current-source preservation and no live authority changes.
4. Save evidence and exact source/review identity; commit/push only canonical MM. Do not claim private-account reproduction, automatic parent verification, database-enforced uniqueness or live deployment.

Fixture/model checks prove those code paths, not real inbox delivery, physical-device acceptance or correct existing live family mappings. Correcting a prior wrong link must be explicitly reviewed with actual guardian/student IDs, not inferred from display names.
