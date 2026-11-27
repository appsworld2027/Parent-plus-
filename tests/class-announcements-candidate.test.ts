// Validates supabase/candidates/202611270026_class_announcements.sql on a DISPOSABLE in-memory database only (CA-03/04/07/09-12).
import { readFileSync } from 'node:fs';
import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';
import { supabaseDatabase } from './support/supabaseDatabase';

const id = (n: number) => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
const [coach, parent, stranger, otherCoach] = [1, 2, 3, 4].map(id);
const [academy, otherAcademy, student, otherStudent, batch, otherBatch, family, child] = [11, 12, 21, 22, 31, 32, 51, 52].map(id);
let db: PGlite;
const as = (user: string) => db.exec(`reset role; set request.jwt.claim.sub = '${user}'; set role authenticated;`);
async function ok(sql: string) { try { await db.query(sql); return true; } catch { return false; } }
const rows = async (sql: string) => (await db.query(sql)).rows as Record<string, unknown>[];
const post = (who: string, target: string, text: string) => ok(`select public.post_batch_announcement('${target}', '${text}')`);

beforeAll(async () => {
  db = await supabaseDatabase();
  await db.exec(readFileSync('supabase/candidates/202611270026_class_announcements.sql', 'utf8'));
  await db.exec('reset role');
  for (const [u, e] of [[coach, 'c'], [parent, 'p'], [stranger, 's'], [otherCoach, 'o']]) await db.query(`insert into auth.users(id,email,email_confirmed_at) values ($1,$2,now())`, [u, `${e}@example.test`]);
  await db.query(`insert into public.academies(id,owner_id,name) values ($1,$2,'Fictional A'),($3,$4,'Fictional B')`, [academy, coach, otherAcademy, otherCoach]);
  await db.query(`insert into public.students(id,academy_id,name) values ($1,$2,'Fictional Child'),($3,$2,'Fictional Other')`, [student, academy, otherStudent]);
  await db.query(`insert into public.batches(id,academy_id,name) values ($1,$2,'Fictional Batch'),($3,$2,'Fictional Other Batch')`, [batch, academy, otherBatch]);
  await db.query(`insert into public.enrolments(academy_id,student_id,batch_id) values ($1,$2,$3),($1,$4,$5)`, [academy, student, batch, otherStudent, otherBatch]);
  await db.query(`insert into public.parent_families(id,owner_id,parent_name,name) values ($1,$2,'Fictional Parent','Fictional Family')`, [family, parent]);
  await db.query(`insert into public.family_children(id,family_id,name) values ($1,$2,'Fictional Kid')`, [child, family]);
  await db.exec('set session_replication_role = replica');
  await db.query(`insert into public.parent_coach_links(academy_id,student_id,family_id,child_id,parent_user_id,guardian_email,coach_approved_at,coach_approved_by,approval_request_id) values ($1,$2,$3,$4,$5,'p@example.test',now(),$6,$7)`, [academy, student, family, child, parent, coach, id(61)]);
  await db.exec('set session_replication_role = origin');
});

describe('class announcements candidate', () => {
  it('CA-02 the owning coach posts and reads it back', async () => {
    await as(coach);
    expect(await post(coach, batch, 'Fictional: class moves to Room 2')).toBe(true);
    expect(await rows('select body from public.batch_announcements')).toEqual([{ body: 'Fictional: class moves to Room 2' }]);
  });
  it('CA-03/04 blank and over-long messages are refused', async () => {
    await as(coach);
    expect(await post(coach, batch, '   ')).toBe(false);
    expect(await post(coach, batch, 'x'.repeat(501))).toBe(false);
    expect(await post(coach, batch, 'x'.repeat(500))).toBe(true);
  });
  it('CA-06 the linked parent of an enrolled child sees it, newest first', async () => {
    await as(parent);
    const list = await rows('select batch_name, body from public.get_parent_announcements()');
    expect(list.length).toBe(2);
    expect(list[0].batch_name).toBe('Fictional Batch');
  });
  it('CA-07 a batch the child is not in stays hidden; strangers see nothing', async () => {
    await as(coach); expect(await post(coach, otherBatch, 'Fictional: other batch only')).toBe(true);
    await as(parent); expect((await rows('select body from public.get_parent_announcements()')).some(r => String(r.body).includes('other batch only'))).toBe(false);
    await as(stranger); expect((await rows('select * from public.get_parent_announcements()')).length).toBe(0);
    expect((await rows('select * from public.batch_announcements')).length).toBe(0);
  });
  it('CA-09 announcements older than 7 days are not shown to parents', async () => {
    await db.exec(`reset role; update public.batch_announcements set created_at = now() - interval '8 days'`);
    await as(parent); expect((await rows('select * from public.get_parent_announcements()')).length).toBe(0);
  });
  it('CA-10 a coach of another academy cannot post to this batch', async () => {
    await as(otherCoach); expect(await post(otherCoach, batch, 'Fictional intrusion')).toBe(false);
  });
  it('CA-11 direct writes are refused', async () => {
    await as(coach);
    expect(await ok(`insert into public.batch_announcements(academy_id,batch_id,body,created_by) values ('${academy}','${batch}','direct','${coach}')`)).toBe(false);
  });
  it('CA-12 a parent cannot post', async () => {
    await as(parent); expect(await post(parent, batch, 'Fictional parent post')).toBe(false);
  });
});
