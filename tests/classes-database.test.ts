import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

const id = (n: number) => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
const [owner, other, academy, foreignAcademy, batch, foreignBatch, student, secondStudent, session] = [1, 2, 11, 12, 31, 32, 21, 22, 51].map(id);
let db: PGlite;
async function asUser(user = owner) { await db.exec(`reset role; set request.jwt.claim.sub='${user}'; set role authenticated;`); }
async function rejected(sql: string, parameters: unknown[], code: string) {
  await db.exec('savepoint expected_error');
  try { await expect(db.query(sql, parameters)).rejects.toMatchObject({ code }); }
  finally { await db.exec('rollback to savepoint expected_error; release savepoint expected_error'); }
}
const initialContext = `${batch}|2026-11-12T10:00:00.000Z|2026-11-12T11:00:00.000Z|scheduled`;
const save = (revision: number, marks: object[], context = initialContext) => db.query<{ save_class_attendance_checked: number }>('select public.save_class_attendance_checked($1,$2,$3,$4::jsonb)', [session, revision, context, JSON.stringify(marks)]);
const marks = [{ student_id: student, status: 'present' }, { student_id: secondStudent, status: 'late' }];
const saveClassSQL = 'select public.save_class_session($1,$2,$3,$4::timestamptz,$5::timestamptz,$6,$7)';
const details = [academy, session, batch, '2026-11-12T10:00:00Z', '2026-11-12T11:00:00Z', 'Room 1', 'scheduled'];

describe('trusted classes and attendance revisions', () => {
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
      create schema auth; create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema auth,public to authenticated,anon,service_role;
      grant execute on function auth.uid() to authenticated,anon,service_role;`);
    for (const file of ['202611110001_coach_foundation.sql', '202611120002_roster_operations.sql', '202611120003_classes_attendance.sql', '202611120003_classes_attendance.sql', '202611120004_attendance_context.sql', '202611120004_attendance_context.sql']) {
      await db.exec(readFileSync(new URL(`../supabase/migrations/${file}`, import.meta.url), 'utf8'));
    }
    await db.query('insert into auth.users values($1),($2)', [owner, other]);
  }, 30_000);
  beforeEach(async () => {
    await db.exec('begin');
    await db.query('insert into public.academies(id,owner_id,name) values($1,$2,$3),($4,$5,$6)', [academy, owner, 'Fictional A', foreignAcademy, other, 'Fictional B']);
    await db.query('insert into public.batches(id,academy_id,name) values($1,$2,$3),($4,$5,$6)', [batch, academy, 'Class A', foreignBatch, foreignAcademy, 'Class B']);
    await db.query('insert into public.students(id,academy_id,name) values($1,$2,$3),($4,$2,$5)', [student, academy, 'Student A', secondStudent, 'Student B']);
    await db.query("insert into public.enrolments(academy_id,student_id,batch_id,starts_on) values($1,$2,$3,'2026-11-01'),($1,$4,$3,'2026-11-01')", [academy, student, batch, secondStudent]);
    await asUser(); await db.query(saveClassSQL, details);
  });
  afterEach(async () => { await db.exec('rollback; reset role;'); });
  afterAll(async () => { await db?.close(); });

  it('retries the same class UUID without duplicate sessions and edits room/status', async () => {
    await db.query(saveClassSQL, details); await db.query(saveClassSQL, [...details.slice(0, 5), 'Room 2', 'completed']);
    const rows = await db.query<{ room: string; status: string }>('select room,status from public.class_sessions');
    expect(rows.rows).toEqual([{ room: 'Room 2', status: 'completed' }]);
  });
  it('rejects foreign-academy/session/batch IDs and direct client table writes', async () => {
    await asUser(other); await rejected(saveClassSQL, details, '42501'); await rejected('select public.save_class_attendance_checked($1,0,$2,$3::jsonb)', [session, initialContext, JSON.stringify(marks)], '42501');
    await asUser(); await rejected(saveClassSQL, [academy, id(52), foreignBatch, ...details.slice(3)], '42501');
    await rejected('update public.class_sessions set attendance_revision=99 where id=$1', [session], '42501');
    await rejected('select public.save_attendance($1,$2::jsonb)', [session, JSON.stringify(marks)], '42501');
  });
  it('advances revision atomically and rejects stale competing saves', async () => {
    expect((await save(0, marks)).rows[0].save_class_attendance_checked).toBe(1);
    await rejected('select public.save_class_attendance_checked($1,0,$2,$3::jsonb)', [session, initialContext, JSON.stringify([{ student_id: student, status: 'absent' }, marks[1]])], '40001');
    expect((await db.query<{ status: string }>('select status from public.attendance where student_id=$1', [student])).rows[0].status).toBe('present');
    expect((await save(1, marks)).rows[0].save_class_attendance_checked).toBe(2);
    expect((await db.query('select * from public.attendance')).rows).toHaveLength(2);
  });
  it('rolls back every mark and revision on invalid entries or incomplete roster', async () => {
    for (const invalid of [[marks[0]], [marks[0], { student_id: secondStudent, status: 'wrong' }], [marks[0], marks[0]]]) {
      await rejected('select public.save_class_attendance_checked($1,0,$2,$3::jsonb)', [session, initialContext, JSON.stringify(invalid)], invalid.length === 1 ? '40001' : '22023');
      expect((await db.query('select * from public.attendance')).rows).toEqual([]);
      expect((await db.query<{ attendance_revision: number }>('select attendance_revision from public.class_sessions')).rows[0].attendance_revision).toBe(0);
    }
  });
  it('protects timing after attendance; cancellation retains marks and blocks further saves', async () => {
    await save(0, marks);
    await rejected(saveClassSQL, [...details.slice(0, 3), '2026-11-13T10:00:00Z', '2026-11-13T11:00:00Z', 'Room 1', 'scheduled'], '22023');
    await db.query(saveClassSQL, [...details.slice(0, 6), 'cancelled']);
    await rejected('select public.save_class_attendance_checked($1,1,$2,$3::jsonb)', [session, initialContext.replace('scheduled', 'cancelled'), JSON.stringify(marks)], '22023');
    expect((await db.query('select * from public.attendance')).rows).toHaveLength(2);
  });
  it('uses the academy date when a class crosses the UTC date boundary', async () => {
    await db.exec('reset role');
    await db.query("update public.enrolments set starts_on='2026-11-12'");
    await asUser();
    await db.query(saveClassSQL, [...details.slice(0, 3), '2026-11-11T20:00:00Z', '2026-11-11T21:00:00Z', '', 'scheduled']);
    expect((await save(0, marks, `${batch}|2026-11-11T20:00:00.000Z|2026-11-11T21:00:00.000Z|scheduled`)).rows[0].save_class_attendance_checked).toBe(1);
  });
  it('denies anonymous execution of trusted class and attendance operations', async () => {
    await db.exec('reset role; set role anon');
    await rejected(saveClassSQL, details, '42501');
    await rejected('select public.save_class_attendance_checked($1,0,$2,$3::jsonb)', [session, initialContext, JSON.stringify(marks)], '42501');
  });
  it('rejects a moved class even when its attendance revision has not changed', async () => {
    await db.query(saveClassSQL, [...details.slice(0, 3), '2026-11-13T10:00:00Z', '2026-11-13T11:00:00Z', '', 'scheduled']);
    await rejected('select public.save_class_attendance_checked($1,0,$2,$3::jsonb)', [session, initialContext, JSON.stringify(marks)], '40001');
    expect((await db.query('select * from public.attendance')).rows).toEqual([]);
    const current = `${batch}|2026-11-13T10:00:00.000Z|2026-11-13T11:00:00.000Z|scheduled`;
    expect((await save(0, marks, current)).rows[0].save_class_attendance_checked).toBe(1);
    await rejected('select public.save_class_attendance($1,1,$2::jsonb)', [session, JSON.stringify(marks)], '42501');
  });
  it('rejects reversed times and duplicate batch/start occurrences', async () => {
    await rejected(saveClassSQL, [...details.slice(0, 3), details[4], details[3], '', 'scheduled'], '22023');
    await rejected(saveClassSQL, [academy, id(53), ...details.slice(2)], '23505');
  });
});
