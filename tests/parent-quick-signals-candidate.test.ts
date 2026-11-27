// Validates supabase/candidates/202611270023_parent_quick_signals.sql on a DISPOSABLE in-memory database only (QS-03..06, 09-12 data rules).
import { readFileSync } from 'node:fs';
import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';
import { supabaseDatabase } from './support/supabaseDatabase';

const id = (n: number) => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
const [coach, parent, stranger, otherCoach] = [1, 2, 3, 4].map(id);
const [academy, otherAcademy, student, batch, today, yesterday, family, child] = [11, 12, 21, 31, 41, 42, 51, 52].map(id);
let db: PGlite;
const as = (user: string) => db.exec(`reset role; set request.jwt.claim.sub = '${user}'; set role authenticated;`);
async function ok(sql: string) { try { await db.query(sql); return true; } catch { return false; } }
async function count(sql: string) { return (await db.query(sql)).rows.length; }

beforeAll(async () => {
  db = await supabaseDatabase();
  await db.exec(readFileSync('supabase/candidates/202611270023_parent_quick_signals.sql', 'utf8'));
  await db.exec('reset role');
  for (const [u, e] of [[coach, 'c'], [parent, 'p'], [stranger, 's'], [otherCoach, 'o']]) await db.query(`insert into auth.users(id,email,email_confirmed_at) values ($1,$2,now())`, [u, `${e}@example.test`]);
  await db.query(`insert into public.academies(id,owner_id,name) values ($1,$2,'Fictional A'),($3,$4,'Fictional B')`, [academy, coach, otherAcademy, otherCoach]);
  await db.query(`insert into public.students(id,academy_id,name) values ($1,$2,'Fictional Child')`, [student, academy]);
  await db.query(`insert into public.batches(id,academy_id,name) values ($1,$2,'Fictional Batch')`, [batch, academy]);
  await db.query(`insert into public.enrolments(academy_id,student_id,batch_id) values ($1,$2,$3)`, [academy, student, batch]);
  await db.query(`insert into public.class_sessions(id,academy_id,batch_id,starts_at,ends_at) values ($1,$2,$3,now(),now()+interval '1 hour'),($4,$2,$3,now()-interval '1 day',now()-interval '23 hours')`, [today, academy, batch, yesterday]);
  await db.query(`insert into public.parent_families(id,owner_id,parent_name,name) values ($1,$2,'Fictional Parent','Fictional Family')`, [family, parent]);
  await db.query(`insert into public.family_children(id,family_id,name) values ($1,$2,'Fictional Kid')`, [child, family]);
  // Fixture only: an approved link. Foreign-key checks are skipped for the fictional approval request id.
  await db.exec('set session_replication_role = replica');
  await db.query(`insert into public.parent_coach_links(academy_id,student_id,family_id,child_id,parent_user_id,guardian_email,coach_approved_at,coach_approved_by,approval_request_id) values ($1,$2,$3,$4,$5,'p@example.test',now(),$6,$7)`, [academy, student, family, child, parent, coach, id(61)]);
  await db.exec('set session_replication_role = origin');
});

const send = (session: string, kind: string, who = student) => ok(`select public.send_parent_signal('${session}','${who}','${kind}')`);
describe('parent quick signals candidate', () => {
  it('QS-03/04 linked parent sends one signal for today and can read it back', async () => {
    await as(parent);
    expect(await send(today, 'running_late')).toBe(true);
    expect(await count('select * from public.parent_signals')).toBe(1);
  });
  it('QS-05 sending again replaces it: still one row, new kind', async () => {
    await as(parent);
    expect(await send(today, 'missing_today')).toBe(true);
    const rows = (await db.query('select kind from public.parent_signals')).rows as { kind: string }[];
    expect(rows).toEqual([{ kind: 'missing_today' }]);
  });
  it('QS-07 the owning coach sees it; QS-11 another academy coach does not', async () => {
    await as(coach); expect(await count('select * from public.parent_signals')).toBe(1);
    await as(otherCoach); expect(await count('select * from public.parent_signals')).toBe(0);
  });
  it('QS-10 an unlinked user cannot send or read', async () => {
    await as(stranger);
    expect(await send(today, 'running_late')).toBe(false);
    expect(await count('select * from public.parent_signals')).toBe(0);
  });
  it('QS-02/12 a class not today is refused; unknown signal kinds are refused', async () => {
    await as(parent);
    expect(await send(yesterday, 'running_late')).toBe(false);
    expect(await send(today, 'chat_message')).toBe(false);
  });
  it('QS-06 the parent can withdraw it, and the coach no longer sees it', async () => {
    await as(parent);
    expect(await ok(`select public.withdraw_parent_signal('${today}','${student}')`)).toBe(true);
    await as(coach); expect(await count('select * from public.parent_signals')).toBe(0);
  });
  it('direct writes are refused for everyone', async () => {
    await as(parent);
    expect(await ok(`insert into public.parent_signals(academy_id,session_id,student_id,parent_user_id,kind) values ('${academy}','${today}','${student}','${parent}','running_late')`)).toBe(false);
  });
});
