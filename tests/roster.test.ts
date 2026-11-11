import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { parseFee, validateStudent, type StudentDraft } from '../src/roster/model';

const uuid = (n: number) => `10000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
const [user, otherUser, academy, otherAcademy, batch, otherBatch, student] = [1, 2, 11, 12, 21, 22, 31].map(uuid);
let db: PGlite;
const migration = (name: string) => readFileSync(new URL(`../supabase/migrations/${name}`, import.meta.url), 'utf8');

describe('atomic roster functions and permissions', () => {
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`
      create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
      create schema auth; create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as
        $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema auth,public to authenticated,anon,service_role;
      grant execute on function auth.uid() to authenticated,anon,service_role;
    `);
    await db.exec(migration('202611110001_coach_foundation.sql'));
    await db.exec(migration('202611120002_roster_operations.sql'));
    await db.exec(migration('202611120002_roster_operations.sql'));
    await db.query('insert into auth.users(id) values($1),($2)', [user, otherUser]);
  }, 30_000);
  beforeEach(async () => {
    await db.exec('begin');
    await db.query("insert into public.academies(id,owner_id,name) values($1,$2,'Fictional A'),($3,$4,'Fictional B')", [academy, user, otherAcademy, otherUser]);
    await db.query("insert into public.batches(id,academy_id,name) values($1,$2,'Batch A'),($3,$4,'Batch B')", [batch, academy, otherBatch, otherAcademy]);
    await db.exec(`set request.jwt.claim.sub='${user}'; set role authenticated`);
  });
  afterEach(async () => { await db.exec('rollback; reset role;'); });
  afterAll(async () => { await db?.close(); });

  const save = (overrides: { id?: string; academy?: string; batches?: string[]; guardian?: string; phone?: string; age?: number } = {}) =>
    db.query('select public.save_student($1,$2,$3,$4,$5,$6,$7,$8::uuid[])', [overrides.academy ?? academy, overrides.id ?? student,
      'Fictional Child', overrides.age ?? 6, overrides.guardian ?? 'Fictional Guardian', 'guardian@example.test', overrides.phone ?? '0000000000', overrides.batches ?? [batch]]);
  async function fails(operation: () => Promise<unknown>, code: string) {
    await db.exec('savepoint attempt');
    try { await expect(operation()).rejects.toMatchObject({ code }); }
    finally { await db.exec('rollback to savepoint attempt; release savepoint attempt'); }
  }

  it('creates student, primary contact, and enrolment in one retry-safe operation', async () => {
    await save(); await save();
    expect((await db.query('select id from public.students')).rows).toEqual([{ id: student }]);
    expect((await db.query('select * from public.student_contacts')).rows).toHaveLength(1);
    expect((await db.query('select * from public.enrolments')).rows).toHaveLength(1);
    await save({ phone: '1111111111' });
    expect((await db.query('select phone from public.student_contacts')).rows).toEqual([{ phone: '1111111111' }]);
  });
  it('rejects foreign batches without leaving partial student/contact records', async () => {
    await fails(() => save({ batches: [batch, otherBatch] }), '42501');
    expect((await db.query('select * from public.students')).rows).toHaveLength(0);
    expect((await db.query('select * from public.student_contacts')).rows).toHaveLength(0);
    expect((await db.query('select * from public.enrolments')).rows).toHaveLength(0);
  });
  it('rejects cross-academy writes and anonymous execution', async () => {
    await fails(() => save({ academy: otherAcademy, batches: [] }), '42501');
    await db.exec('reset role; set role anon');
    await fails(() => save(), '42501');
  });
  it('allows same names for distinct student IDs and duplicate batch selections safely', async () => {
    await save({ batches: [batch, batch] });
    await save({ id: uuid(32), batches: [] });
    expect((await db.query('select * from public.students')).rows).toHaveLength(2);
    expect((await db.query('select * from public.enrolments')).rows).toHaveLength(1);
  });
  it('allows multiple batches while preserving existing enrolment dates', async () => {
    await db.exec('reset role');
    await db.query("insert into public.batches(id,academy_id,name) values($1,$2,'Second batch')", [uuid(23), academy]);
    await db.exec('set role authenticated');
    await save();
    const first = (await db.query('select starts_on from public.enrolments')).rows[0];
    await save({ batches: [batch, uuid(23)] });
    expect((await db.query('select * from public.enrolments')).rows).toHaveLength(2);
    expect((await db.query('select starts_on from public.enrolments where batch_id=$1', [batch])).rows[0]).toEqual(first);
  });
  it('archives without deleting contacts/enrolments and rejects edits of archived students', async () => {
    await save();
    await db.query('select public.archive_student($1)', [student]);
    await db.query('select public.archive_student($1)', [student]);
    expect((await db.query<{ archived_at: string | null }>('select archived_at from public.students')).rows[0].archived_at).not.toBe(null);
    expect((await db.query('select * from public.enrolments')).rows).toHaveLength(1);
    expect((await db.query('select * from public.student_contacts')).rows).toHaveLength(1);
    await fails(() => save(), '22023');
    await db.exec(`reset role; set request.jwt.claim.sub='${otherUser}'; set role authenticated`);
    await fails(() => db.query('select public.archive_student($1)', [student]), '42501');
  });
  it('denies direct client writes that would bypass the transaction', async () => {
    await fails(() => db.query("insert into public.students(academy_id,name) values($1,'Bypass')", [academy]), '42501');
    await fails(() => db.query('update public.student_contacts set name=$1', ['Bypass']), '42501');
    await fails(() => db.query('delete from public.enrolments'), '42501');
  });
  it('rejects invalid age or guardian data before creating the student', async () => {
    await fails(() => save({ age: 121 }), '22023');
    await fails(() => save({ guardian: '' }), '22023');
    expect((await db.query('select * from public.students')).rows).toHaveLength(0);
  });
  it('clears only the primary guardian on an explicit blank-contact edit', async () => {
    await save();
    await db.exec('reset role');
    await db.query("insert into public.student_contacts(academy_id,student_id,name,is_primary) values($1,$2,'Other guardian',false)", [academy, student]);
    await db.exec('set role authenticated');
    await db.query("select public.save_student($1,$2,'Child',6,'','','','{}'::uuid[])", [academy, student]);
    expect((await db.query('select name,is_primary from public.student_contacts')).rows).toEqual([{ name: 'Other guardian', is_primary: false }]);
    expect((await db.query('select * from public.enrolments')).rows).toHaveLength(1);
  });
  it('keeps batch amounts validated and inaccessible to another academy', async () => {
    await fails(() => db.query('update public.batches set monthly_fee_paise=-1 where id=$1', [batch]), '23514');
    expect((await db.query('select id from public.batches')).rows).toEqual([{ id: batch }]);
    await db.query('update public.batches set monthly_fee_paise=250050 where id=$1', [batch]);
    expect(Number((await db.query<{ monthly_fee_paise: string | number }>('select monthly_fee_paise from public.batches')).rows[0].monthly_fee_paise)).toBe(250050);
  });
});

describe('roster input rules', () => {
  it('converts rupees to paise without floating-point rounding', () => {
    expect(parseFee('2500.50')).toBe(250050);
    expect(parseFee('0.29')).toBe(29);
    expect(parseFee('0')).toBe(0);
    for (const invalid of ['-1', 'NaN', '1e3', '12.345', '', '100000000000']) expect(parseFee(invalid)).toBe(null);
  });
  it('requires a guardian name only when contact details are supplied', () => {
    const draft: StudentDraft = { id: student, name: 'Child', age: '', guardian: '', email: '', phone: '', batches: [] };
    expect(validateStudent(draft)).toBe(null);
    expect(validateStudent({ ...draft, phone: '0000' })).toContain('guardian name');
    expect(validateStudent({ ...draft, guardian: 'Guardian', email: 'invalid' })).toContain('email');
    expect(validateStudent({ ...draft, age: '6.5' })).toContain('whole-number');
    expect(validateStudent({ ...draft, age: '121' })).toContain('whole-number');
  });
});
