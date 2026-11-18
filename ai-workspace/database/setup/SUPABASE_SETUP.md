# Supabase: apply the initial development database

Purpose: create the coach database structure and access rules. This is Module 1, not payment activation or a completed app connection.

Project supplied by owner: `zcgcnycnanqkbdlwojln.supabase.co`.

## What you do

1. Open https://supabase.com/dashboard and select this project.
2. Choose **SQL Editor** in the project sidebar.
3. Select **New query** (or the equivalent new-query button).
4. Open [the complete setup script](../../../supabase/migrations/202611110001_coach_foundation.sql). Copy its entire contents, from the introductory comments and `begin;` through the final `commit;`.
5. Paste the complete script into the SQL Editor. No editing or secret values are needed.
6. Click **Run** once. Supabase may warn that the query includes policy/trigger changes; those are deliberate. This file creates coach tables and replaces only its named policies/triggers. If it reports existing application tables, stop and share that message rather than removing anything.
7. Copy the verification query below into a new query and run it:

```sql
select version, applied_at
from coach_private.schema_migrations
where version = '202611110001';
```

8. Expected result: one row with version `202611110001` and an application timestamp. Tell Codex “Database script applied” and share that result or a screenshot with any credentials hidden.

If any query reports an error, send the error message. Do not delete tables, disable Row Level Security, or repeatedly change the script to make it pass. Codex will diagnose the issue.

## What the script does

- Creates 12 application tables for identity/academy, roster, classes, attendance, observations, and fee records.
- Enables Row Level Security and restricts records to the academy owner.
- Checks relationships so a student/session/invoice cannot be linked to the wrong academy.
- Supplies atomic, retry-safe academy setup and attendance-save functions.
- Keeps observation publication and financial writes unavailable to ordinary app clients until their server functions are implemented and tested.
- Tracks the migration in a private table and refuses initial setup if it finds conflicting application tables without its migration marker.
- Does not include real children, payment credentials, passwords, public media buckets, or data deletion commands.

The script runs within one transaction. On an error, its changes roll back. Rerunning the complete successful script was tested locally; future changes will use separate migrations, not edits to a deployed migration.

## What has and has not been verified

The migration and security rules are tested in a local PostgreSQL engine (PGlite) with test-only emulation of Supabase roles and `auth.uid()`. This is real PostgreSQL constraint/RLS testing, but it is not a Supabase deployment or SDK test.

The coding environment's HTTPS proxy still blocks direct project access. A successful dashboard query verifies deployment from your session. Real authentication/API checks from the app remain required later.

Do not disable email verification to work around delivery problems. Email provider and Android recovery-link setup follow with authentication implementation.
