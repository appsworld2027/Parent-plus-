# Isolated workspace authorization kernel

17 November 2026. This is an F2 implementation checkpoint, not a live multi-academy release. Production remains app0.13.0 / Parent0.3.0 with SQL001–014. No owner SQL action is required.

## What executes

After the F1 storage candidate, `supabase/candidates/202611170016_workspace_authorization.sql` adds private server decisions for current account eligibility, accepted membership, scoped roles/capabilities, class management versus teaching, own feedback, bounded history, finance and the account's own workspace list. Branch-to-batch mapping and feedback author-membership provenance use same-workspace foreign keys. Legacy feedback keeps its known account author with unknown historical membership; no teacher is invented.

Account eligibility reads the current server account, including verified email, anonymous/ban/deletion state. A caller-supplied role, workspace or previous identity claim does not grant access. The kernel supports READ COMMITTED transactions; higher-isolation snapshots fail closed until their revocation semantics are explicitly implemented. Membership, role, assignment and history expiry use wall-clock time, including after waiting for an authority lock.

Owners/admins can manage classes without being treated as teachers. Teaching requires a Coach identity, instructor grant and matching class/batch assignment, including teaching/access/write intervals. Finance remains separate. A substitute cannot inherit another teacher's notes/drafts. An author's current working note can be read during an active assignment access window in the same membership period; after that window, recorded history requires a separate student/date/purpose grant. Rehiring creates a different membership period. History never exposes drafts and requires grants for every recipient of a group note. Corrections apply only to recorded feedback; a permission decision is not an implemented correction/revision API.

Two private owner-only lifecycle functions revoke a membership or teaching assignment, retain attribution, append one audit event and make repeated successful revocations harmless. Membership removal protects the last accepted current eligible owner. Role delegation, invitations/acceptance and ownership transfer are not implemented by those two functions.

## Lock protocol and practical limits

Protected writes and these revocation functions acquire the same workspace row lock, then the actor account lock, and recheck current authority. Any converted endpoint needing legacy014 child/academy/request locks must take those first, then the workspace/account locks. No mutation row trigger acquires the workspace lock in reverse order. Future grant/role/invitation/ownership mutation APIs must follow this protocol before they are enabled.

The workspace lock is exclusive and deliberately conservative. These tests establish the implemented ordering, not throughput or all future races. Direct privileged maintenance writes are not supported runtime mutation paths. Real Auth administration, legacy014 cross-protocol concurrency, invite acceptance, grant changes and transfer APIs need their own tests during conversion. Already-authorized reads/downloaded files are not remotely erased by revocation.

New functions revoke execution from PUBLIC, anon, authenticated and service_role. New tables have RLS and no client/service table grants. No public endpoint calls this kernel yet. There is no production015/016 marker and no replacement owner script. Existing public RPCs, legacy ownership checks, private family policies, Storage and OCR still use their installed behavior. Therefore **current-account eligibility and membership revocation are not claimed to cover the live app yet**.

## Reproducible checks

`npx vitest run tests/workspace-authorization.test.ts tests/workspace-foundation.test.ts` exercises the actual001–014 SQL plus both candidates in disposable PGlite. Fictional fixtures are shared with the real PostgreSQL runner; Auth/Storage tables are test shapes, not provider simulations.

For real PostgreSQL, start a new disposable container with no host port, no volume and no external network:

```sh
docker run --detach --rm --network none \
  --name parentplus-workspace-test-local \
  --label parentplus.disposable-workspace-test=true \
  -e POSTGRES_HOST_AUTH_METHOD=trust \
  -e POSTGRES_DB=parentplus_workspace_test postgres:17-alpine
```

Once `docker exec parentplus-workspace-test-local pg_isready -U postgres -d parentplus_workspace_test` reports ready:

```sh
WORKSPACE_TEST_CONTAINER=parentplus-workspace-test-local npm run test:workspace:postgres
docker rm --force parentplus-workspace-test-local
```

The runner requires the test container name/label, refuses a populated database, and uses independent `psql` backend processes. It confirms contention with `pg_blocking_pids`, rather than assuming a sleep caused a race. SQLSTATE42501 is required for expected permission denials. Process cleanup is awaited and a test failure makes the command fail. A role-expiry test arms expiry after opening its connection, avoiding connection-start timing.

GitHub App checks also run it against a PostgreSQL17 service via `WORKSPACE_TEST_DATABASE_URL`. That route accepts only a loopback host and the exact disposable database name; it never targets the Supabase URL. The script uses Node built-ins and a PostgreSQL client, with no new package dependency.

Eight transaction cases cover: revoke-before-write; write-before-revoke; assignment-only revocation; two owners removing one another; simultaneous owner departures; expiry after transaction start; a banned account while its write waits; and higher-isolation denial. The protected-write fixture inserts only after invoking the actual candidate assertion. No actual feedback/Parent delivery endpoint or provider call is simulated as completed.

## Remaining release gates

Finish all36public RPC/direct-grant/view/storage conversions, non-null workspace resource constraints and independent records; implement staff invitation/delegation/transfer and audited feedback revisions; then workspace onboarding, context-aware drafts/cache and legacy-client compatibility. Real Supabase staging must validate Auth/API/Storage/email, followed by migration/backfill reconciliation, backup restore and controlled live accounts. There is no authorised Supabase admin connection here. Existing accounts/logins and approved Parent links remain; do not repeat SQL001–014 or Google/OCR setup.

Exact execution results are recorded in [the validation matrix](MULTI_WORKSPACE_VALIDATION.md) and [progress](../PROGRESS.md).
