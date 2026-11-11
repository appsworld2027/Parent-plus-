import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

const id = (n: number) => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
const [owner, otherOwner, newOwner, academy, otherAcademy, student, otherStudent, batch, otherBatch, enrolment, session] =
  [1, 2, 3, 11, 12, 21, 22, 31, 32, 41, 51].map(id);
let db: PGlite;
const migration = readFileSync(new URL('../supabase/migrations/202611110001_coach_foundation.sql', import.meta.url), 'utf8');

async function asUser(user = owner, role = 'authenticated') {
  await db.exec(`reset role; set request.jwt.claim.sub = '${user}'; set role ${role};`);
}
async function rejected(sql: string, params: unknown[], code: string) {
  await db.exec('savepoint expected_failure');
  try { await expect(db.query(sql, params)).rejects.toMatchObject({ code }); }
  finally { await db.exec('rollback to savepoint expected_failure; release savepoint expected_failure'); }
}
async function mark(marks: object[]) {
  return db.query<{ save_attendance: number }>('select public.save_attendance($1, $2::jsonb)', [session, JSON.stringify(marks)]);
}

describe('PostgreSQL academy isolation and atomic writes', () => {
  beforeAll(async () => {
    db = new PGlite();
    // Test-only Supabase identity/role emulation. This fixture is never deployed.
    await db.exec(`
      create role anon nologin;
      create role authenticated nologin;
      create role service_role nologin bypassrls;
      create schema auth;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as
        $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      grant usage on schema auth, public to authenticated, anon, service_role;
      grant execute on function auth.uid() to authenticated, anon, service_role;
    `);
    await db.exec(migration);
    // The dashboard script can be rerun without duplicating data or policies.
    await db.exec(migration);
    await db.query('insert into auth.users(id) values ($1),($2),($3)', [owner, otherOwner, newOwner]);
  }, 30_000);

  beforeEach(async () => {
    await db.exec('begin');
    await db.query('insert into public.academies(id, owner_id, name) values ($1,$2,$3),($4,$5,$6)',
      [academy, owner, 'Academy A', otherAcademy, otherOwner, 'Academy B']);
    await db.query('insert into public.students(id,academy_id,name) values($1,$2,$3),($4,$5,$6)',
      [student, academy, 'Fictional A', otherStudent, otherAcademy, 'Fictional B']);
    await db.query('insert into public.batches(id,academy_id,name,monthly_fee_paise) values($1,$2,$3,250000),($4,$5,$6,200000)',
      [batch, academy, 'Batch A', otherBatch, otherAcademy, 'Batch B']);
    await db.query("insert into public.enrolments(id,academy_id,student_id,batch_id,starts_on) values($1,$2,$3,$4,'2026-01-01')",
      [enrolment, academy, student, batch]);
    await db.query("insert into public.class_sessions(id,academy_id,batch_id,starts_at,ends_at) values($1,$2,$3,'2026-11-11T11:30:00Z','2026-11-11T12:30:00Z')",
      [session, academy, batch]);
  });
  afterEach(async () => { await db.exec('rollback; reset role;'); });
  afterAll(async () => { await db?.close(); });

  it('applies cleanly and enables RLS on every application table', async () => {
    const result = await db.query<{ relname: string; relrowsecurity: boolean }>(
      "select relname,relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and relkind='r'");
    expect(result.rows).toHaveLength(12);
    expect(result.rows.every(row => row.relrowsecurity)).toBe(true);
  });

  it('stops before changing a project with an unrelated existing table', async () => {
    const separate = new PGlite();
    try {
      await separate.exec('create table public.students(existing_data text);');
      await expect(separate.exec(migration)).rejects.toThrow('Existing application tables found');
      await separate.exec('rollback;');
      expect((await separate.query("select column_name from information_schema.columns where table_schema='public' and table_name='students'")).rows)
        .toEqual([{ column_name: 'existing_data' }]);
    } finally { await separate.close(); }
  }, 20_000);

  it('returns only the signed-in academy and students', async () => {
    await asUser();
    expect((await db.query('select id from public.academies')).rows).toEqual([{ id: academy }]);
    expect((await db.query('select id from public.students')).rows).toEqual([{ id: student }]);
    await asUser(otherOwner);
    expect((await db.query('select id from public.students')).rows).toEqual([{ id: otherStudent }]);
  });

  it('blocks anonymous table reads and authenticated API operations', async () => {
    await asUser('', 'anon');
    await rejected('select * from public.students', [], '42501');
    await rejected("select public.create_academy('Unauthorized', 'Owner')", [], '42501');
    await rejected("select public.save_attendance($1, '[]'::jsonb)", [session], '42501');
  });

  it('rejects a forged academy ID and hides other-academy updates', async () => {
    await asUser();
    await rejected("insert into public.students(academy_id,name) values($1,'Intruder')", [otherAcademy], '42501');
    const result = await db.query("update public.students set name='Changed' where id=$1 returning id", [otherStudent]);
    expect(result.rows).toEqual([]);
  });

  it('rejects cross-academy enrolments even when a caller bypasses RLS', async () => {
    await rejected('insert into public.enrolments(academy_id,student_id,batch_id) values($1,$2,$3)',
      [academy, otherStudent, batch], '23503');
    await rejected('insert into public.enrolments(academy_id,student_id,batch_id) values($1,$2,$3)',
      [academy, student, otherBatch], '23503');
  });

  it('creates academy/profile atomically and makes onboarding retries idempotent', async () => {
    await asUser(newOwner);
    const first = await db.query<{ id: string }>("select id from public.create_academy('New academy','New owner')");
    const retry = await db.query<{ id: string }>("select id from public.create_academy('New academy','New owner')");
    expect(retry.rows[0].id).toBe(first.rows[0].id);
    expect((await db.query('select * from public.academies')).rows).toHaveLength(1);
    expect((await db.query('select * from public.profiles')).rows).toHaveLength(1);
  });

  it('rejects invalid timezones and duplicate enrolment', async () => {
    await asUser();
    await rejected("update public.academies set timezone='MadeUp/Timezone' where id=$1", [academy], '22023');
    await rejected('insert into public.enrolments(academy_id,student_id,batch_id) values($1,$2,$3)',
      [academy, student, batch], '23505');
  });

  it('saves and updates attendance without duplicates', async () => {
    await asUser();
    expect((await mark([{ student_id: student, status: 'present' }])).rows[0].save_attendance).toBe(1);
    await mark([{ student_id: student, status: 'late' }]);
    expect((await db.query('select student_id,status from public.attendance')).rows).toEqual([{ student_id: student, status: 'late' }]);
  });

  it('rolls back the whole attendance save if any student is invalid', async () => {
    await asUser();
    await rejected('select public.save_attendance($1,$2::jsonb)', [session, JSON.stringify([
      { student_id: student, status: 'present' }, { student_id: otherStudent, status: 'present' },
    ])], '22023');
    expect((await db.query('select * from public.attendance')).rows).toEqual([]);
  });

  it('rejects invalid statuses, repeated students, and cancelled-session writes', async () => {
    await asUser();
    for (const marks of [
      [{ student_id: student, status: 'unknown' }],
      [{ student_id: student, status: 'present' }, { student_id: student, status: 'absent' }],
      [],
    ]) await rejected('select public.save_attendance($1,$2::jsonb)', [session, JSON.stringify(marks)], '22023');
    await db.query("update public.class_sessions set status='cancelled' where id=$1", [session]);
    await rejected('select public.save_attendance($1,$2::jsonb)', [session, JSON.stringify([{ student_id: student, status: 'present' }])], '22023');
  });

  it('rejects another academy attendance RPC and direct table writes', async () => {
    await asUser(otherOwner);
    await rejected('select public.save_attendance($1,$2::jsonb)', [session, JSON.stringify([{ student_id: student, status: 'present' }])], '42501');
    await asUser();
    await rejected("insert into public.attendance(academy_id,session_id,student_id,batch_id,status) values($1,$2,$3,$4,'present')",
      [academy, session, student, batch], '42501');
  });

  it('keeps archived-student history while rejecting new attendance changes', async () => {
    await asUser();
    await mark([{ student_id: student, status: 'present' }]);
    await db.query('update public.students set archived_at=now() where id=$1', [student]);
    await rejected('select public.save_attendance($1,$2::jsonb)', [session, JSON.stringify([{ student_id: student, status: 'absent' }])], '22023');
    expect((await db.query('select status from public.attendance')).rows).toEqual([{ status: 'present' }]);
    await rejected('delete from public.students where id=$1', [student], '42501');
  });

  it('prevents cross-academy invoices and duplicate invoice months', async () => {
    await rejected("insert into public.fee_invoices(academy_id,enrolment_id,billing_month,due_on,amount_paise) values($1,$2,'2026-11-01','2026-11-10',250000)",
      [otherAcademy, enrolment], '23503');
    await db.query("insert into public.fee_invoices(academy_id,enrolment_id,billing_month,due_on,amount_paise) values($1,$2,'2026-11-01','2026-11-10',250000)", [academy, enrolment]);
    await rejected("insert into public.fee_invoices(academy_id,enrolment_id,billing_month,due_on,amount_paise) values($1,$2,'2026-11-01','2026-11-10',250000)",
      [academy, enrolment], '23505');
    await asUser(otherOwner);
    expect((await db.query('select * from public.fee_invoices')).rows).toEqual([]);
  });

  it('prevents clients from manufacturing verified payments or changing invoice totals', async () => {
    await asUser();
    await rejected('update public.fee_invoices set amount_paise=1', [], '42501');
    await rejected('delete from public.fee_payments', [], '42501');
    await rejected("insert into public.fee_payments(academy_id,invoice_id,amount_paise,source,mode,request_id,provider_payment_id) values($1,$2,100,'gateway','live',$3,'fake')",
      [academy, id(71), id(81)], '42501');
  });
});
