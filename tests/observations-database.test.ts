import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

const id = (n: number) => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
const [owner, other, academy, foreignAcademy, batch, foreignBatch, a, b, foreignChild, note, session] = [1,2,11,12,31,32,21,22,23,61,51].map(id);
let db: PGlite;
async function asUser(user = owner) { await db.exec(`reset role; set request.jwt.claim.sub='${user}'; set role authenticated;`); }
const sql = 'select * from public.save_observation($1,$2,$3,$4,$5,$6,$7::uuid[],$8,$9)';
function parameters(overrides: Partial<{ academy: string; id: string; revision: number; batch: string; session: string | null; audience: string; recipients: string[]; text: string; status: string }> = {}) {
  const value = { academy, id: note, revision: 0, batch, session: null, audience: 'student', recipients: [a], text: 'Fictional observation', status: 'draft', ...overrides };
  return [value.academy,value.id,value.revision,value.batch,value.session,value.audience,value.recipients,value.text,value.status];
}
async function rejected(parameters: unknown[], code: string) {
  await db.exec('savepoint expected_error');
  try { await expect(db.query(sql, parameters)).rejects.toMatchObject({ code }); }
  finally { await db.exec('rollback to savepoint expected_error; release savepoint expected_error'); }
}
type Row = { id: string; revision: number; status: string; author_id: string; note: string; recorded_at: Date | null };
const save = async (values = parameters()) => (await db.query<Row>(sql, values)).rows[0];

describe('private observation publication and immutable recipients', () => {
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
      create schema auth; create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema auth,public to authenticated,anon,service_role;
      grant execute on function auth.uid() to authenticated,anon,service_role;`);
    for (const file of ['202611110001_coach_foundation.sql','202611120002_roster_operations.sql','202611120003_classes_attendance.sql','202611120004_attendance_context.sql','202611120005_observations.sql','202611120005_observations.sql']) await db.exec(readFileSync(new URL(`../supabase/migrations/${file}`, import.meta.url), 'utf8'));
    await db.query('insert into auth.users values($1),($2)', [owner,other]);
  }, 30_000);
  beforeEach(async () => {
    await db.exec('begin');
    await db.query('insert into public.academies(id,owner_id,name) values($1,$2,$3),($4,$5,$6)', [academy,owner,'Fictional A',foreignAcademy,other,'Fictional B']);
    await db.query('insert into public.batches(id,academy_id,name) values($1,$2,$3),($4,$5,$6)', [batch,academy,'Batch A',foreignBatch,foreignAcademy,'Batch B']);
    await db.query('insert into public.students(id,academy_id,name) values($1,$2,$3),($4,$2,$5),($6,$7,$8)', [a,academy,'Child A',b,'Child B',foreignChild,foreignAcademy,'Child C']);
    await db.query("insert into public.enrolments(academy_id,student_id,batch_id,starts_on) values($1,$2,$3,'2000-01-01'),($1,$4,$3,'2000-01-01'),($5,$6,$7,'2000-01-01')", [academy,a,batch,b,foreignAcademy,foreignChild,foreignBatch]);
    await db.query("insert into public.class_sessions(id,academy_id,batch_id,starts_at,ends_at) values($1,$2,$3,'2026-11-11T20:00:00Z','2026-11-11T21:00:00Z')", [session,academy,batch]);
    await asUser();
  });
  afterEach(async () => { await db.exec('rollback; reset role;'); });
  afterAll(async () => { await db?.close(); });

  it('saves and records atomically; lost-response retries preserve revision/history/timestamp', async () => {
    const first = await save(); expect(first.revision).toBe(1);
    expect((await save()).revision).toBe(1);
    const recorded = await save(parameters({ revision: 1, status: 'recorded' }));
    const retry = await save(parameters({ revision: 1, status: 'recorded' }));
    expect(retry.revision).toBe(2); expect(retry.recorded_at).toEqual(recorded.recorded_at);
    expect((await db.query('select * from public.observation_versions')).rows).toHaveLength(2);
    expect((await db.query('select * from public.observation_recipients')).rows).toHaveLength(1);
  });
  it('rejects foreign accounts, foreign batches/recipients and anonymous execution', async () => {
    await save(); await asUser(other);
    await rejected(parameters({ revision: 1 }), '42501');
    expect((await db.query('select * from public.observation_versions')).rows).toEqual([]);
    await asUser(); await rejected(parameters({ id: id(62), batch: foreignBatch }), '42501');
    await rejected(parameters({ id: id(63), audience: 'batch', recipients: [a,foreignChild] }), '22023');
    await db.exec('reset role; set role anon'); await rejected(parameters(), '42501');
  });
  it('rejects invalid/repeated recipients and empty publication without partial rows', async () => {
    for (const args of [parameters({ recipients: [a,b] }),parameters({ audience: 'batch', recipients: [a,a] }),parameters({ status: 'recorded', text: '   ' }),parameters({ status: 'recorded', text: '\n\t' }),parameters({ status: 'recorded', recipients: [] })]) {
      await rejected(args, '22023');
      expect((await db.query('select * from public.observations')).rows).toHaveLength(0);
      expect((await db.query('select * from public.observation_recipients')).rows).toHaveLength(0);
    }
  });
  it('locks a recorded individual audience and rejects draft downgrade or scope changes', async () => {
    await save(parameters({ status: 'recorded' }));
    await rejected(parameters({ revision: 1, status: 'recorded', audience: 'batch', recipients: [a,b] }), '22023');
    await rejected(parameters({ revision: 1, status: 'draft' }), '22023');
    await rejected(parameters({ revision: 1, status: 'recorded', session }), '22023');
    expect((await db.query<{ student_id: string }>('select student_id from public.observation_recipients')).rows).toEqual([{ student_id: a }]);
  });
  it('preserves recorded audience through roster changes and allows attributable text correction', async () => {
    const recorded = await save(parameters({ status: 'recorded', audience: 'batch', recipients: [a] }));
    await db.exec('reset role');
    await db.query('update public.students set archived_at=now() where id=$1',[a]);
    await db.query("update public.enrolments set ends_on='2001-01-01' where student_id=$1",[a]);
    await asUser();
    const edited = await save(parameters({ revision: 1, status: 'recorded', audience: 'batch', recipients: [a], text: 'Fictional corrected note' }));
    expect(edited.revision).toBe(2); expect(edited.author_id).toBe(owner); expect(edited.recorded_at).toEqual(recorded.recorded_at);
    expect((await db.query<{ student_id: string }>('select student_id from public.observation_recipients')).rows).toEqual([{ student_id: a }]);
  });
  it('rejects stale changed text instead of overwriting the newer saved version', async () => {
    await save(); await save(parameters({ revision: 1, text: 'Newer fictional text' }));
    await rejected(parameters({ revision: 1, text: 'Stale fictional edit' }), '40001');
    expect((await db.query<{ note: string }>('select note from public.observations')).rows[0].note).toBe('Newer fictional text');
    expect((await db.query('select * from public.observation_versions')).rows).toHaveLength(2);
  });
  it('uses linked-class academy date and rejects cancelled or mismatched classes', async () => {
    await db.exec('reset role'); await db.query("update public.enrolments set starts_on='2026-11-12' where student_id=$1",[a]); await asUser();
    expect((await save(parameters({ session, status: 'recorded' }))).status).toBe('recorded');
    await db.exec('reset role'); await db.query("update public.class_sessions set status='cancelled' where id=$1",[session]); await asUser();
    await rejected(parameters({ id: id(64), session }), '22023');
  });
  it('blocks direct client mutation of observations, recipients and version history', async () => {
    await save();
    for (const table of ['observations','observation_recipients','observation_versions']) {
      await db.exec('savepoint denied');
      try { await expect(db.query(`delete from public.${table}`)).rejects.toMatchObject({ code: '42501' }); }
      finally { await db.exec('rollback to savepoint denied; release savepoint denied'); }
    }
    await expect(db.query("select relrowsecurity from pg_class where oid='public.observation_versions'::regclass")).resolves.toMatchObject({ rows: [{ relrowsecurity: true }] });
  });
});
