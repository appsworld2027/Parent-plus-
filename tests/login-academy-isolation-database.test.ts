// Database tests for docs/product/login-academy-isolation/ACCEPTANCE.md (AI-03, AI-05..AI-11).
// Written by Quinn (QA) from the approved contract. DISPOSABLE in-process PGlite database only:
// tests/support/supabaseDatabase applies supabase/migrations (ledger through 014) on top of the
// test-only role/Auth/Storage shape in tests/fixtures/supabase-base.sql. Never a hosted project.
// The 015 candidate in supabase/candidates is deliberately NOT applied.
//
// Limits of this harness (reported, not hidden):
// - PostgREST/GoTrue are not running. A "signed-in caller" is the `authenticated` role plus
//   request.jwt.claim.sub; "signed-out" is the `anon` role. JWT signature checks are not exercised.
// - "Unverified" means auth.users.email_confirmed_at is null for the caller.
// - PGlite has one connection, so two devices saving at the same instant (AI-05) cannot be raced
//   truly in parallel; the test covers the sequential interleavings and the owner_id uniqueness that
//   decides the real race. The true parallel race is marked as skipped (not run).
// - Token metadata (AI-10) is emulated with request.jwt.claims and a test-only auth.jwt().
import type { PGlite } from '@electric-sql/pglite';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { supabaseDatabase } from './support/supabaseDatabase';

const id = (n: number) => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
const [coachA, coachB, parentOnly, dual, unverifiedOwner, fresh, unverifiedFresh] = [1, 2, 3, 4, 5, 6, 7].map(id);
const [academyA, academyB, academyD, academyU] = [11, 12, 14, 15].map(id);
const [studentA, studentA2, studentB, studentD, studentU] = [21, 22, 23, 24, 25].map(id);
const [batchA, batchB, batchD] = [31, 32, 34].map(id);
const [sessionA, sessionD] = [41, 44].map(id);
const [noteA, noteA2, noteD] = [51, 52, 54].map(id);
const [familyP, familyD] = [61, 64].map(id);
const [childP, childD] = [71, 74].map(id);
const photoA = `${academyA}/student/${studentA}/${id(91)}.jpg`;

let db: PGlite;
let publicRelations: string[] = [];
const coachTables = ['academies', 'students', 'student_contacts', 'batches', 'enrolments', 'class_sessions', 'attendance',
  'observations', 'observation_recipients', 'observation_versions', 'fee_invoices', 'fee_payments', 'fee_payment_reversals',
  'fee_invoice_balances', 'coach_photos', 'coach_media_consent_events', 'coach_media_consents', 'class_media', 'parent_feedback_handoffs'];

async function as(user: string, role = 'authenticated') {
  await db.exec(`reset role; set request.jwt.claim.sub = '${user}'; set role ${role};`);
}
async function signedOut() { await db.exec("reset role; set request.jwt.claim.sub = ''; set role anon;"); }
async function superuser() { await db.exec('reset role'); }
/** The statement must raise an error (any SQLSTATE given in `codes`, or any error when omitted). */
async function refused(sql: string, args: unknown[] = [], codes?: string[]) {
  await db.exec('savepoint attempt');
  let error: { code?: string } | undefined;
  try { await db.query(sql, args); } catch (caught) { error = caught as { code?: string }; }
  finally { await db.exec('rollback to savepoint attempt; release savepoint attempt'); }
  expect(error, `expected refusal: ${sql}`).toBeDefined();
  if (codes) expect(codes).toContain(error!.code);
}
/** A read is refused when it errors or returns no rows. Returns the number of rows seen. */
async function readsNothing(sql: string, args: unknown[] = []) {
  await db.exec('savepoint attempt');
  let rows = 0;
  try { rows = (await db.query(sql, args)).rows.length; } catch { rows = 0; }
  finally { await db.exec('rollback to savepoint attempt; release savepoint attempt'); }
  expect(rows, `expected no rows: ${sql}`).toBe(0);
}
/** A write is refused when it errors or affects no rows. */
async function changesNothing(sql: string, args: unknown[] = []) {
  await db.exec('savepoint attempt');
  let affected = 0;
  try { affected = (await db.query(sql, args)).affectedRows ?? 0; } catch { affected = 0; }
  finally { await db.exec('rollback to savepoint attempt; release savepoint attempt'); }
  expect(affected, `expected no change: ${sql}`).toBe(0);
}
async function count(sql: string, args: unknown[] = []) {
  return Number((await db.query<{ n: number }>(`select count(*)::int n from (${sql}) q`, args)).rows[0].n);
}
async function academyCount(owner: string) {
  await db.exec('savepoint peek; reset role');
  const n = await count('select 1 from public.academies where owner_id = $1', [owner]);
  await db.exec('rollback to savepoint peek; release savepoint peek');
  return n;
}
async function create(name: string, owner = 'Fictional Coach') {
  return (await db.query<{ id: string; name: string; timezone: string; currency: string; owner_id: string }>(
    'select * from public.create_academy($1, $2)', [name, owner])).rows[0];
}

beforeAll(async () => {
  db = await supabaseDatabase();
  // Test-only token emulation for AI-10. Not part of any migration.
  await db.exec(`
    alter table auth.users add column if not exists raw_user_meta_data jsonb not null default '{}',
      add column if not exists raw_app_meta_data jsonb not null default '{}';
    create or replace function auth.jwt() returns jsonb language sql stable as
      $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
    grant execute on function auth.jwt() to anon, authenticated, service_role;
  `);
  await db.query(`insert into auth.users(id,email,email_confirmed_at) values
    ($1,'coach-a@example.test',now()),($2,'coach-b@example.test',now()),($3,'parent@example.test',now()),
    ($4,'dual@example.test',now()),($5,'unverified-owner@example.test',null),($6,'fresh@example.test',now()),
    ($7,'unverified@example.test',null)`, [coachA, coachB, parentOnly, dual, unverifiedOwner, fresh, unverifiedFresh]);
  await db.query(`insert into public.academies(id,owner_id,name) values
    ($1,$2,'Fictional Academy A'),($3,$4,'Fictional Academy B'),($5,$6,'Fictional Academy D'),($7,$8,'Fictional Academy U')`,
  [academyA, coachA, academyB, coachB, academyD, dual, academyU, unverifiedOwner]);
  await db.query(`insert into public.students(id,academy_id,name) values
    ($1,$2,'Fictional A one'),($3,$2,'Fictional A two'),($4,$5,'Fictional B'),($6,$7,'Fictional D'),($8,$9,'Fictional U')`,
  [studentA, academyA, studentA2, studentB, academyB, studentD, academyD, studentU, academyU]);
  await db.query("insert into public.batches(id,academy_id,name) values($1,$2,'Batch A'),($3,$4,'Batch B'),($5,$6,'Batch D')",
    [batchA, academyA, batchB, academyB, batchD, academyD]);
  await db.query(`insert into public.enrolments(academy_id,student_id,batch_id,starts_on) values
    ($1,$2,$3,'2020-01-01'),($1,$4,$3,'2020-01-01'),($5,$6,$7,'2020-01-01')`, [academyA, studentA, batchA, studentA2, academyD, studentD, batchD]);
  await db.query(`insert into public.class_sessions(id,academy_id,batch_id,starts_at,ends_at) values
    ($1,$2,$3,'2026-11-20T10:00Z','2026-11-20T11:00Z'),($4,$5,$6,'2026-11-20T10:00Z','2026-11-20T11:00Z')`,
  [sessionA, academyA, batchA, sessionD, academyD, batchD]);
  await db.query(`insert into public.observations(id,academy_id,batch_id,session_id,author_id,note,status,revision,recorded_at) values
    ($1,$2,$3,$4,$5,'Fictional note for A one','recorded',1,now()),($6,$2,$3,$4,$5,'Fictional note for A two','recorded',1,now()),
    ($7,$8,$9,$10,$11,'Fictional private note in D','recorded',1,now())`,
  [noteA, academyA, batchA, sessionA, coachA, noteA2, noteD, academyD, batchD, sessionD, dual]);
  await db.query(`insert into public.observation_recipients(academy_id,observation_id,batch_id,student_id) values
    ($1,$2,$3,$4),($1,$5,$3,$6),($7,$8,$9,$10)`, [academyA, noteA, batchA, studentA, noteA2, studentA2, academyD, noteD, batchD, studentD]);
  await db.query(`insert into public.parent_families(id,owner_id,parent_name,name) values
    ($1,$2,'Fictional Parent','Parent family'),($3,$4,'Fictional Dual','Dual family')`, [familyP, parentOnly, familyD, dual]);
  await db.query("insert into public.family_children(id,family_id,name) values($1,$2,'Parent child'),($3,$4,'Dual child')",
    [childP, familyP, childD, familyD]);
  await db.query("insert into storage.objects(bucket_id,name,metadata) values('parentplus-coach-photos',$1,'{\"size\":1024,\"mimetype\":\"image/jpeg\"}')", [photoA]);
  // Coach A sends one reviewed update to each linked guardian through the existing approval flow.
  async function link(note: string, student: string, email: string, guardian: string, child: string, request: number) {
    await as(coachA);
    await db.query("select public.queue_parent_feedback($1,$2,1,$3,$4::uuid[],'{}')", [academyA, note, id(request), [student]]);
    const code = (await db.query<{ code: string }>('select public.issue_parent_link_invite($1,$2,$3) as code', [academyA, student, email])).rows[0].code;
    await as(guardian);
    const pending = (await db.query<{ id: string }>('select public.claim_parent_link($1,$2) as id', [code, child])).rows[0].id;
    await as(coachA);
    await db.query('select public.review_parent_connection_request($1,true)', [pending]);
  }
  await link(noteA, studentA, 'parent@example.test', parentOnly, childP, 81);
  await link(noteA2, studentA2, 'dual@example.test', dual, childD, 82);
  await superuser();
  publicRelations = (await db.query<{ relname: string }>(
    "select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','v') order by 1")).rows.map(r => r.relname);
}, 60_000);
beforeEach(async () => { await db.exec('begin'); });
afterEach(async () => { await db.exec('rollback; reset role;'); });
afterAll(async () => { await db?.close(); });

describe('AI-03 field limits are enforced by the database', () => {
  it('AI-03 refuses spaces-only and 101-character academy or owner names through create_academy', async () => {
    await as(fresh);
    for (const [name, owner] of [['   ', 'Fictional Coach'], ['Fictional Academy', '   '], ['', 'Fictional Coach'],
      ['x'.repeat(101), 'Fictional Coach'], ['Fictional Academy', 'y'.repeat(101)]]) {
      await refused('select public.create_academy($1,$2)', [name, owner], ['22023', '23514']);
    }
    expect(await academyCount(fresh)).toBe(0);
  });

  it('AI-03 accepts 1 and 100 characters (counted as characters, not bytes)', async () => {
    await as(fresh);
    expect((await create('A', 'B')).name).toBe('A');
    await db.exec('rollback; begin');
    await as(fresh);
    const hundred = 'अ'.repeat(100);
    const made = await create(hundred, 'ब'.repeat(100));
    expect(made.name).toBe(hundred);
    expect(await academyCount(fresh)).toBe(1);
  });

  it('AI-03 table constraints refuse spaces-only and 101 characters even on direct writes', async () => {
    await as(fresh);
    await refused("insert into public.academies(owner_id,name) values($1,'   ')", [fresh], ['23514']);
    await refused('insert into public.academies(owner_id,name) values($1,$2)', [fresh, 'x'.repeat(101)], ['23514']);
    await as(coachA);
    await refused('update public.academies set name=$1 where id=$2', ['x'.repeat(101), academyA], ['23514']);
    await refused("update public.academies set name='  ' where id=$1", [academyA], ['23514']);
    await refused("insert into public.profiles(id,display_name) values($1,'  ') on conflict(id) do update set display_name=excluded.display_name", [coachA], ['23514']);
  });

  it('AI-02 support: a new academy is stored with Asia/Kolkata and INR', async () => {
    await as(fresh);
    const made = await create('Fictional New Academy');
    expect(made).toMatchObject({ name: 'Fictional New Academy', timezone: 'Asia/Kolkata', currency: 'INR', owner_id: fresh });
  });
});

describe('AI-05 repeat and concurrent saves leave exactly one academy', () => {
  it('AI-05 a lost response then a retry returns the same stored academy', async () => {
    await as(fresh);
    const first = await create('Fictional Retry Academy');
    const retry = await create('Fictional Retry Academy');
    expect(retry.id).toBe(first.id);
    expect(await academyCount(fresh)).toBe(1);
  });

  it('AI-05 a second save with a different name returns the stored name, not the new one', async () => {
    await as(fresh);
    const first = await create('Fictional First Name');
    const second = await create('Fictional Other Device Name', 'Other Device Owner');
    expect(second).toMatchObject({ id: first.id, name: 'Fictional First Name' });
    expect(await academyCount(fresh)).toBe(1);
  });

  it('AI-05 when another device committed first, create_academy returns that stored academy', async () => {
    await superuser();
    await db.query("insert into public.academies(id,owner_id,name) values($1,$2,'Fictional Device One')", [id(16), fresh]);
    await as(fresh);
    expect(await create('Fictional Device Two')).toMatchObject({ id: id(16), name: 'Fictional Device One' });
    expect(await academyCount(fresh)).toBe(1);
  });

  it('AI-05 two calls issued together (serialised by PGlite) still leave one academy', async () => {
    await as(fresh);
    const [one, two] = await Promise.all([create('Fictional Phone'), create('Fictional Tablet')]);
    expect(one.id).toBe(two.id);
    expect(two.name).toBe(one.name);
    expect(await academyCount(fresh)).toBe(1);
  });

  it('AI-05 the database itself forbids a second academy per owner (decides the real race)', async () => {
    await superuser();
    const unique = await db.query(`select 1 from pg_index i join pg_class c on c.oid=i.indrelid
      join pg_attribute a on a.attrelid=c.oid and a.attnum=any(i.indkey)
      where c.relname='academies' and c.relnamespace='public'::regnamespace and i.indisunique and i.indnatts=1 and a.attname='owner_id'`);
    expect(unique.rows).toHaveLength(1);
    await as(coachA);
    await refused("insert into public.academies(owner_id,name) values($1,'Fictional Second Academy')", [coachA], ['23505']);
    await superuser();
    await refused("insert into public.academies(owner_id,name) values($1,'Fictional Second Academy')", [coachA], ['23505']);
  });

  // AI-05 true simultaneous race on separate connections: NOT RUN here (PGlite has one connection). The unique-index refusal above is the covered part.
});

describe('AI-06 signed-out or unverified callers cannot create an academy', () => {
  it('AI-06 a signed-out caller cannot call create_academy', async () => {
    await signedOut();
    await refused("select public.create_academy('Fictional Anon Academy','Anon')", [], ['42501']);
    await superuser();
    expect(await count("select 1 from public.academies where name='Fictional Anon Academy'")).toBe(0);
  });

  it('AI-06 an authenticated role without a user id cannot create', async () => {
    await as('', 'authenticated');
    await refused("select public.create_academy('Fictional No User','Nobody')");
    await superuser();
    expect(await count("select 1 from public.academies where name='Fictional No User'")).toBe(0);
  });

  // KNOWN GAP (contract C1.1f, AI-06/AI-09): the installed database (migrations 001-014) does not check email
  // verification, so this assertion FAILS today. `it.fails` records that honestly and turns red the moment a
  // verified-email database rule exists, prompting removal. It is NOT a pass. Fixing it needs new SQL, validated
  // on a disposable database and applied only with founder authorization. The app already blocks unverified
  // users, and hosted "Confirm email" prevents them getting a session at all (hosted setting unverified).
  it.fails('AI-06 an unverified account cannot create an academy by function or direct insert', async () => {
    await as(unverifiedFresh);
    await refused("select public.create_academy('Fictional Unverified Academy','Unverified')");
    await refused("insert into public.academies(owner_id,name) values($1,'Fictional Unverified Direct')", [unverifiedFresh]);
    expect(await academyCount(unverifiedFresh)).toBe(0);
  });
});

describe('AI-07 coach A cannot read or change coach B academy', () => {
  it('AI-07 reads of every coach table and view return only the caller academy', async () => {
    await as(coachB);
    for (const table of coachTables) {
      const cols = (await db.query<{ c: string }>(`select column_name c from information_schema.columns where table_schema='public' and table_name=$1 and column_name in ('academy_id')`, [table])).rows;
      if (table === 'academies') await readsNothing('select * from public.academies where id=$1', [academyA]);
      else if (cols.length) await readsNothing(`select * from public.${table} where academy_id=$1`, [academyA]);
    }
    expect((await db.query('select id from public.academies')).rows).toEqual([{ id: academyB }]);
    await readsNothing('select * from storage.objects where name=$1', [photoA]);
    await readsNothing('select * from public.get_coach_parent_requests($1)', [academyA]);
  });

  it('AI-07 direct changes to another academy change nothing', async () => {
    await as(coachB);
    await changesNothing("update public.academies set name='Taken over' where id=$1", [academyA]);
    await changesNothing('delete from public.academies where id=$1', [academyA]);
    await changesNothing("update public.students set name='Taken over' where id=$1", [studentA]);
    await changesNothing('delete from public.students where id=$1', [studentA]);
    await changesNothing("update public.observations set note='Taken over' where id=$1", [noteA]);
    await changesNothing('delete from storage.objects where name=$1', [photoA]);
    await refused("update public.academies set owner_id=$1 where id=$2", [coachA, academyB]);
    await refused("insert into public.academies(owner_id,name) values($1,'Fictional Planted')", [coachA]);
    await refused("insert into public.students(academy_id,name) values($1,'Fictional Planted')", [academyA]);
    await refused("insert into public.batches(academy_id,name) values($1,'Fictional Planted')", [academyA]);
    await refused('insert into storage.objects(bucket_id,name) values($1,$2)', ['parentplus-coach-photos', `${academyA}/student/${studentA}/${id(92)}.jpg`]);
    await superuser();
    expect((await db.query('select name, owner_id from public.academies where id=$1', [academyA])).rows).toEqual([{ name: 'Fictional Academy A', owner_id: coachA }]);
    expect((await db.query('select name from public.students where id=$1', [studentA])).rows).toEqual([{ name: 'Fictional A one' }]);
  });

  it('AI-07 coach functions refuse another academy', async () => {
    await as(coachB);
    await refused("select public.save_student($1,null,'Fictional Planted',null,'','','',$2::uuid[])", [academyA, []]);
    await refused('select public.archive_student($1)', [studentA]);
    await refused("select public.save_class_session($1,null,$2,'2026-11-21T10:00Z','2026-11-21T11:00Z','','scheduled')", [academyA, batchA]);
    await refused("select public.issue_parent_link_invite($1,$2,'x@example.test')", [academyA, studentA]);
    await refused("select public.record_coach_media_consent($1,$2,'G','E',true,true,true)", [academyA, studentA]);
    await superuser();
    expect(await count('select 1 from public.students where academy_id=$1', [academyA])).toBe(2);
  });
});

describe('AI-08 a parent-only account gets no coach records', () => {
  it('AI-08 every coach table and view returns no rows to a linked parent-only account', async () => {
    await as(parentOnly);
    // Reviewed, approved updates (parent_feedback_handoffs) are shared with the linked guardian by design;
    // every other coach table must return nothing.
    for (const table of coachTables.filter(t => t !== 'parent_feedback_handoffs')) await readsNothing(`select * from public.${table}`);
    const handoffs = (await db.query<{ student_id: string; state: string }>('select student_id, state from public.parent_feedback_handoffs')).rows;
    expect(handoffs).toEqual([{ student_id: studentA, state: 'available_to_parent' }]);
    await readsNothing('select * from storage.objects where bucket_id=$1', ['parentplus-coach-photos']);
    await readsNothing('select * from public.profiles where id<>$1', [parentOnly]);
  });

  it('AI-08 coach functions refuse a parent-only account', async () => {
    await as(parentOnly);
    await readsNothing('select * from public.get_coach_parent_requests($1)', [academyA]);
    await refused("select public.save_student($1,null,'Fictional Planted',null,'','','',$2::uuid[])", [academyA, []]);
    await refused("select public.save_observation($1,null,0,$2,$3,'batch',$4::uuid[],'x','draft')", [academyA, batchA, sessionA, []]);
    await refused("insert into public.students(academy_id,name) values($1,'Fictional Planted')", [academyA]);
  });

  it('AI-08 the parent sees only the approved update for their own child', async () => {
    await as(parentOnly);
    const feed = (await db.query<Record<string, unknown>>('select * from public.parent_feedback_feed')).rows;
    expect(feed).toHaveLength(1);
    expect(JSON.stringify(feed)).toContain('Fictional note for A one');
    expect(JSON.stringify(feed)).not.toContain('Fictional note for A two');
    expect(JSON.stringify(feed)).not.toContain('Fictional private note in D');
  });
});

describe('AI-09 signed-out and unverified callers are refused', () => {
  it('AI-09 signed-out callers are refused on every public table and view', async () => {
    expect(publicRelations.length).toBeGreaterThan(20);
    await signedOut();
    for (const relation of publicRelations) {
      await refused(`select * from public.${relation} limit 1`, [], ['42501']);
    }
    await refused("insert into public.academies(owner_id,name) values($1,'Fictional Anon')", [coachA], ['42501']);
  });

  it('AI-09 signed-out callers cannot execute any public or private application function', async () => {
    await superuser();
    const executable = (await db.query<{ fn: string }>(`select n.nspname||'.'||p.proname||'('||pg_get_function_identity_arguments(p.oid)||')' fn
      from pg_proc p join pg_namespace n on n.oid=p.pronamespace
      where n.nspname in ('public','coach_private') and has_function_privilege('anon', p.oid, 'execute')`)).rows.map(r => r.fn);
    expect(executable).toEqual([]);
    await signedOut();
    await refused('select coach_private.owns_academy($1)', [academyA], ['42501']);
    await refused("select public.preview_parent_link('fictional-code')", [], ['42501']);
  });

  it('AI-09 signed-out callers see no stored files and cannot upload', async () => {
    await signedOut();
    await readsNothing('select * from storage.objects');
    await refused('insert into storage.objects(bucket_id,name) values($1,$2)', ['parentplus-coach-photos', `${academyA}/student/${studentA}/${id(93)}.jpg`]);
    await superuser();
    expect((await db.query<{ public: boolean }>("select public from storage.buckets where id in ('parentplus-coach-photos','parentplus-class-media')")).rows)
      .toEqual([{ public: false }, { public: false }]);
  });

  // KNOWN GAP (contract C1.1f, AI-06/AI-09): the installed database (migrations 001-014) does not check email
  // verification, so this assertion FAILS today. `it.fails` records that honestly and turns red the moment a
  // verified-email database rule exists, prompting removal. It is NOT a pass. Fixing it needs new SQL, validated
  // on a disposable database and applied only with founder authorization. The app already blocks unverified
  // users, and hosted "Confirm email" prevents them getting a session at all (hosted setting unverified).
  it.fails('AI-09 an unverified account cannot read protected academy records, even ones it owns', async () => {
    await as(unverifiedOwner);
    await readsNothing('select * from public.academies');
    await readsNothing('select * from public.students');
    await refused("select public.save_student($1,null,'Fictional Unverified',null,'','','',$2::uuid[])", [academyU, []]);
  });

  it('AI-09 an unverified account cannot read other accounts records or files', async () => {
    await as(unverifiedFresh);
    for (const relation of publicRelations) await readsNothing(`select * from public.${relation}`);
    await readsNothing('select * from storage.objects');
  });
});

describe('AI-10 user-controlled metadata grants no extra access', () => {
  it('AI-10 no policy or application function reads token or profile metadata', async () => {
    await superuser();
    const policies = (await db.query<{ p: string }>(`select schemaname||'.'||tablename||'.'||policyname p from pg_policies
      where coalesce(qual,'')||coalesce(with_check,'') ~* '(auth\\.jwt|auth\\.role|user_metadata|app_metadata|raw_user_meta|raw_app_meta|request\\.jwt\\.claims)'`)).rows;
    expect(policies).toEqual([]);
    const functions = (await db.query<{ f: string }>(`select n.nspname||'.'||p.proname f from pg_proc p join pg_namespace n on n.oid=p.pronamespace
      where n.nspname in ('public','coach_private') and p.prosrc ~* '(auth\\.jwt|auth\\.role|user_metadata|app_metadata|raw_user_meta|raw_app_meta|request\\.jwt\\.claims)'`)).rows;
    expect(functions).toEqual([]);
  });

  it('AI-10 forged token claims (admin role, other academy, service role) change nothing', async () => {
    await as(coachB);
    await db.query("select set_config('request.jwt.claims', $1, true), set_config('request.jwt.claim.role', 'service_role', true)", [JSON.stringify({
      sub: coachB, role: 'service_role', app_metadata: { role: 'admin', academy_id: academyA, provider: 'email' },
      user_metadata: { role: 'owner', academy_id: academyA, is_admin: true } })]);
    expect((await db.query('select id from public.academies')).rows).toEqual([{ id: academyB }]);
    await readsNothing('select * from public.students where academy_id=$1', [academyA]);
    await readsNothing('select * from public.parent_families');
    await refused("insert into public.students(academy_id,name) values($1,'Fictional Planted')", [academyA]);
  });

  it('AI-10 a user cannot edit their auth record, and editing their own profile grants nothing', async () => {
    await as(coachB);
    await refused(`update auth.users set raw_app_meta_data='{"role":"admin"}', email_confirmed_at=now() where id=$1`, [coachB]);
    await db.query("insert into public.profiles(id,display_name) values($1,'Fictional Admin of Academy A') on conflict(id) do update set display_name=excluded.display_name", [coachB]);
    await refused('update public.profiles set id=$1 where id=$2', [coachA, coachB]);
    expect((await db.query('select id from public.academies')).rows).toEqual([{ id: academyB }]);
    await readsNothing('select * from public.students where academy_id=$1', [academyA]);
    await as(unverifiedFresh);
    await refused('update auth.users set email_confirmed_at=now() where id=$1', [unverifiedFresh]);
  });
});

describe('AI-11 an account with both coach and parent records sees only each space allowed records', () => {
  it('AI-11 the coach space shows only the dual account own academy records', async () => {
    await as(dual);
    expect((await db.query('select id from public.academies')).rows).toEqual([{ id: academyD }]);
    expect((await db.query('select id from public.students order by id')).rows).toEqual([{ id: studentD }]);
    expect((await db.query<{ academy_id: string }>('select distinct academy_id from public.observations')).rows).toEqual([{ academy_id: academyD }]);
    // Being a guardian of A's student must not open Academy A's coach records.
    await readsNothing('select * from public.students where academy_id=$1', [academyA]);
    await readsNothing('select * from public.observations where academy_id=$1', [academyA]);
    await readsNothing('select * from public.get_coach_parent_requests($1)', [academyA]);
  });

  it('AI-11 the parent space shows only the dual account own family and approved updates', async () => {
    await as(dual);
    expect((await db.query('select id from public.parent_families')).rows).toEqual([{ id: familyD }]);
    expect((await db.query('select id from public.family_children')).rows).toEqual([{ id: childD }]);
    const feed = JSON.stringify((await db.query('select * from public.parent_feedback_feed')).rows);
    expect(feed).toContain('Fictional note for A two');
    expect(feed).not.toContain('Fictional note for A one');
    // Owning Academy D must not turn D's private notes into parent feed items.
    expect(feed).not.toContain('Fictional private note in D');
    const links = (await db.query<{ academy_id?: string }>('select * from public.get_parent_coach_connections()')).rows;
    expect(links).toHaveLength(1);
  });

  it('AI-11 other accounts cannot see the dual account in either space', async () => {
    await as(parentOnly);
    await readsNothing('select * from public.parent_families where id=$1', [familyD]);
    await readsNothing('select * from public.family_children where id=$1', [childD]);
    await as(coachB);
    await readsNothing('select * from public.parent_families');
    await readsNothing('select * from public.academies where id=$1', [academyD]);
  });
});
