// Validates supabase/candidates/202611280030_web_push.sql on a DISPOSABLE in-memory database only (WP-01..08).
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
  await db.exec("do $$ begin if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role; end if; end $$; grant usage on schema public to service_role;");
  await db.exec(readFileSync('supabase/candidates/202611280030_web_push.sql', 'utf8'));
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

describe('web push candidate', () => {
  const ep = (n: number) => `https://push.example.test/send/fictional-endpoint-${n}`;
  const save = (who: string, endpoint: string) => { return ok(`select public.save_push_subscription('${endpoint}', 'fictional-p256dh-key-1', 'fictional-auth-1')`); };
  it('WP-01 a parent saves and replaces their own subscription (one row per endpoint)', async () => {
    await as(parent); expect(await save(parent, ep(1))).toBe(true); expect(await save(parent, ep(1))).toBe(true);
    await db.exec('reset role'); expect((await rows(`select * from public.push_subscriptions where user_id='${parent}'`)).length).toBe(1);
  });
  it('WP-02 signed-out callers cannot save', async () => {
    await db.exec(`reset role; set role authenticated; reset request.jwt.claim.sub`);
    expect(await save('', ep(9))).toBe(false);
  });
  it('WP-03 nobody can read or write subscriptions or settings directly', async () => {
    await as(parent);
    expect(await ok('select * from public.push_subscriptions')).toBe(false);
    expect(await ok(`insert into public.push_subscriptions(user_id,endpoint,p256dh,auth) values ('${parent}','${ep(2)}','aaaaaaaaaaaa','bbbbbbbbbbbb')`)).toBe(false);
    expect(await ok('select * from public.push_settings')).toBe(false);
    await as(stranger); expect(await ok('select * from public.push_settings')).toBe(false);
  });
  it('WP-04 the target list is server-only', async () => {
    await as(parent); expect(await ok(`select * from public.push_targets('${batch}')`)).toBe(false);
    await as(coach); expect(await ok(`select * from public.push_targets('${batch}')`)).toBe(false);
  });
  it('WP-05 targets are only linked parents of children enrolled in that batch', async () => {
    await as(stranger); expect(await save(stranger, ep(3))).toBe(true);
    await db.exec('reset role; set role service_role');
    const mine = await rows(`select endpoint from public.push_targets('${batch}')`);
    expect(mine.map(r => r.endpoint)).toEqual([ep(1)]);
    expect((await rows(`select endpoint from public.push_targets('${otherBatch}')`)).length).toBe(0);
  });
  it('WP-06 an inactive link is not a target', async () => {
    await db.exec(`reset role; update public.parent_coach_links set active = false`);
    await db.exec('set role service_role'); expect((await rows(`select * from public.push_targets('${batch}')`)).length).toBe(0);
    await db.exec(`reset role; update public.parent_coach_links set active = true`);
  });
  it('WP-07 a parent can remove their own subscription but not another parent\'s', async () => {
    await as(stranger); await ok(`select public.remove_push_subscription('${ep(1)}')`);
    await db.exec('reset role'); expect((await rows(`select * from public.push_subscriptions where endpoint='${ep(1)}'`)).length).toBe(1);
    await as(parent); await ok(`select public.remove_push_subscription('${ep(1)}')`);
    await db.exec('reset role'); expect((await rows(`select * from public.push_subscriptions where endpoint='${ep(1)}'`)).length).toBe(0);
  });
  it('WP-08 the server can drop a dead endpoint', async () => {
    await db.exec('reset role'); await db.query(`insert into public.push_subscriptions(user_id,endpoint,p256dh,auth) values ('${parent}','${ep(4)}','aaaaaaaaaaaa','bbbbbbbbbbbb')`);
    await db.exec('set role service_role'); await db.query(`select public.push_forget('${ep(4)}')`);
    await db.exec('reset role'); expect((await rows(`select * from public.push_subscriptions where endpoint='${ep(4)}'`)).length).toBe(0);
  });
});
