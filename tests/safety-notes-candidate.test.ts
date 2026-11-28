// Validates supabase/migrations/202611280031_student_safety_notes.sql on a DISPOSABLE in-memory database only (SN-01..SN-09 data rules).
import { readFileSync } from 'node:fs';
import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';
import { supabaseDatabase } from './support/supabaseDatabase';

const id = (n: number) => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
const [coach, parent, otherCoach] = [1, 2, 4].map(id);
const [academy, otherAcademy, student, family, child] = [11, 12, 21, 51, 52].map(id);
let db: PGlite;
const as = (user: string) => db.exec(`reset role; set request.jwt.claim.sub = '${user}'; set role authenticated;`);
const ok = async (sql: string) => { try { await db.query(sql); return true; } catch { return false; } };
const rows = async (sql: string) => (await db.query(sql)).rows as { note: string }[];
const save = (who: string, note: string, target = student) => ok(`select public.save_student_safety_note('${target}', '${note.replace(/'/g, "''")}')`);

beforeAll(async () => {
  db = await supabaseDatabase();
  await db.exec(readFileSync('supabase/migrations/202611280031_student_safety_notes.sql', 'utf8'));
  await db.exec('reset role');
  for (const [u, e] of [[coach, 'c'], [parent, 'p'], [otherCoach, 'o']]) await db.query(`insert into auth.users(id,email,email_confirmed_at) values ($1,$2,now())`, [u, `${e}@example.test`]);
  await db.query(`insert into public.academies(id,owner_id,name) values ($1,$2,'Fictional A'),($3,$4,'Fictional B')`, [academy, coach, otherAcademy, otherCoach]);
  await db.query(`insert into public.students(id,academy_id,name) values ($1,$2,'Fictional Child')`, [student, academy]);
  await db.query(`insert into public.parent_families(id,owner_id,parent_name,name) values ($1,$2,'Fictional Parent','Fictional Family')`, [family, parent]);
  await db.query(`insert into public.family_children(id,family_id,name) values ($1,$2,'Fictional Kid')`, [child, family]);
  await db.exec('set session_replication_role = replica');
  await db.query(`insert into public.parent_coach_links(academy_id,student_id,family_id,child_id,parent_user_id,guardian_email,coach_approved_at,coach_approved_by,approval_request_id) values ($1,$2,$3,$4,$5,'p@example.test',now(),$6,$7)`, [academy, student, family, child, parent, coach, id(61)]);
  await db.exec('set session_replication_role = origin');
});

describe('safety notes candidate', () => {
  it('SN-01 the owning coach saves a note and reads it back', async () => {
    await as(coach);
    expect(await save(coach, 'Peanut allergy. Inhaler in blue bag.')).toBe(true);
    expect(await rows('select note from public.student_safety_notes')).toEqual([{ note: 'Peanut allergy. Inhaler in blue bag.' }]);
  });
  it('SN-02 saving again replaces: still one row', async () => {
    await as(coach);
    expect(await save(coach, 'Peanut allergy only.')).toBe(true);
    expect(await rows('select note from public.student_safety_notes')).toEqual([{ note: 'Peanut allergy only.' }]);
  });
  it('SN-03 a linked parent can never read the note (table, direct write, or function)', async () => {
    await as(parent);
    expect(await rows('select note from public.student_safety_notes')).toEqual([]);
    expect(await save(parent, 'Parent attempt')).toBe(false);
    expect(await ok(`insert into public.student_safety_notes(student_id,academy_id,note,updated_by) values ('${student}','${academy}','x','${parent}')`)).toBe(false);
    expect(await ok(`update public.student_safety_notes set note='x'`)).toBe(false);
  });
  it('SN-04 another academy coach cannot read or write it (fail closed)', async () => {
    await as(otherCoach);
    expect(await rows('select note from public.student_safety_notes')).toEqual([]);
    expect(await save(otherCoach, 'Cross academy')).toBe(false);
  });
  it('SN-05 anonymous cannot execute the function', async () => {
    await db.exec('reset role; set role anon;');
    expect(await ok(`select public.save_student_safety_note('${student}','x')`)).toBe(false);
  });
  it('SN-06 over 500 characters is refused and the old note stays', async () => {
    await as(coach);
    expect(await save(coach, 'x'.repeat(501))).toBe(false);
    expect(await rows('select note from public.student_safety_notes')).toEqual([{ note: 'Peanut allergy only.' }]);
    expect(await save(coach, 'x'.repeat(500))).toBe(true);
  });
  it('SN-07 a blank note clears it; an unknown student is refused', async () => {
    await as(coach);
    expect(await save(coach, '   ')).toBe(true);
    expect(await rows('select note from public.student_safety_notes')).toEqual([]);
    expect(await save(coach, 'ghost', id(999))).toBe(false);
  });
});
