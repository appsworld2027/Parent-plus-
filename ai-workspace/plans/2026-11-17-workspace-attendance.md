# Workspace attendance permission conversion

Continue the approved multi-workspace foundation with candidate019, following015–018. No public RPC/grant or live change until the full conversion and staging gates pass. Preserve the existing class attendance revision and canonical client context; do not call an owner-only legacy operation as another teacher or impersonate an owner.

Acceptance: a currently assigned instructor can read minimal roster/marks, then atomically submit every eligible student once. Authorization, class context, full dated roster and optimistic revision are checked under academy→workspace→actor locks. Invalid/incomplete/foreign data must leave rows and revision unchanged. Fixed membership/request/payload retries return the original receipt after later edits without restoring stale state, while removed authority denies even a receipt replay. Append-only submissions preserve the actual actor, membership and full marks snapshot; migration creates no invented legacy teaching author.

Test-first tasks:

- [x] Observe missing-operation failure; implement private projection and guarded attendance transaction with bounded inputs, stable canonical request hashing, immutable submissions and private ACLs.
- [x] Test date/timezone, stale context/roster/revision, duplicate/invalid/foreign rows, cancellation/archive, revoked/expired/incorrect-scope actors, receipt replay and attribution.
- [x] Extend real PostgreSQL tests with actual attendance writes versus assignment revocation, concurrent stale editors and duplicate requests.
- [x] Review, verify full checks, merge tested PR9 and continue feedback020. Keep staging activation separate.
