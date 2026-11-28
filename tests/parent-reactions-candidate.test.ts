// Validates supabase/migrations/202611280032_feedback_reactions.sql on a DISPOSABLE in-memory database only (PR-02..PR-10 data rules).
import { readFileSync } from 'node:fs';
import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';
import { supabaseDatabase } from './support/supabaseDatabase';

const id = (n: number) => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
const [coach, parent, stranger, otherCoach] = [1, 2, 3, 4].map(id);
const [academy, otherAcademy, student, family, child, handoff, pending, obs, req] = [11, 12, 21, 51, 52, 71, 72, 81, 82].map(id);
let db: PGlite;
const as = (user: string) => db.exec(`reset role; set request.jwt.claim.sub = '${user}'; set role authenticated;`);
const ok = async (sql: string) => { try { await db.query(sql); return true; } catch { return false; } };
const rows = async (sql: string) => (await db.query(sql)).rows as { reaction: string }[];
const react = (h: string, kind: string) => ok(`select public.react_to_feedback('${h}','${kind}')`);

beforeAll(async () => {
  db = await supabaseDatabase();
  await db.exec(readFileSync('supabase/migrations/202611280032_feedback_reactions.sql', 'utf8'));
  await db.exec(readFileSync('supabase/migrations/202611280033_reactions_coach_counts.sql', 'utf8'));
  await db.exec('reset role');
  for (const [u, e] of [[coach, 'c'], [parent, 'p'], [stranger, 's'], [otherCoach, 'o']]) await db.query(`insert into auth.users(id,email,email_confirmed_at) values ($1,$2,now())`, [u, `${e}@example.test`]);
  await db.query(`insert into public.academies(id,owner_id,name) values ($1,$2,'Fictional A'),($3,$4,'Fictional B')`, [academy, coach, otherAcademy, otherCoach]);
  await db.query(`insert into public.students(id,academy_id,name) values ($1,$2,'Fictional Child')`, [student, academy]);
  await db.query(`insert into public.parent_families(id,owner_id,parent_name,name) values ($1,$2,'Fictional Parent','Fictional Family')`, [family, parent]);
  await db.query(`insert into public.family_children(id,family_id,name) values ($1,$2,'Fictional Kid')`, [child, family]);
  await db.exec('set session_replication_role = replica');
  await db.query(`insert into public.parent_coach_links(academy_id,student_id,family_id,child_id,parent_user_id,guardian_email,coach_approved_at,coach_approved_by,approval_request_id) values ($1,$2,$3,$4,$5,'p@example.test',now(),$6,$7)`, [academy, student, family, child, parent, coach, id(61)]);
  // Fixture handoffs (foreign keys skipped): one shared with the parent, one still held back.
  for (const [h, state, r, o] of [[handoff, 'available_to_parent', req, obs], [pending, 'awaiting_parent_link', id(83), id(84)]])
    await db.query(`insert into public.parent_feedback_handoffs(id,request_id,academy_id,observation_id,observation_revision,student_id,media_ids,snapshot,state,reviewed_by) values ($1,$2,$3,$4,1,$5,'{}','{"note":"Great work"}',$6,$7)`, [h, r, academy, o, student, state, coach]);
  await db.exec('set session_replication_role = origin');
});

describe('parent reactions candidate', () => {
  it('PR-02 a linked parent reacts to shared feedback for their child', async () => {
    await as(parent);
    expect(await react(handoff, 'thanks')).toBe(true);
    expect(await rows('select reaction from public.feedback_reactions')).toEqual([{ reaction: 'thanks' }]);
  });
  it('PR-03 reacting again replaces: still one row', async () => {
    await as(parent);
    expect(await react(handoff, 'helpful')).toBe(true);
    expect(await rows('select reaction from public.feedback_reactions')).toEqual([{ reaction: 'helpful' }]);
  });
  it('PR-05 the owning coach sees it; another academy coach does not', async () => {
    const coachRows = "select reaction from public.get_coach_feedback_reactions('2000-01-01')";
    await as(coach); expect((await rows(coachRows)).length).toBe(1);
    await as(otherCoach); expect((await rows(coachRows)).length).toBe(0);
    await as(coach); expect(await ok('select parent_user_id from public.feedback_reactions')).toBe(true);
    expect((await rows('select reaction from public.feedback_reactions')).length).toBe(0); // coach cannot read the table: no parent identity
    expect(Object.keys((await db.query("select * from public.get_coach_feedback_reactions('2000-01-01')")).fields.map(f => f.name))).toHaveLength(3);
  });
  it('PR-07 an unlinked user cannot react or read', async () => {
    await as(stranger);
    expect(await react(handoff, 'thanks')).toBe(false);
    expect(await rows('select reaction from public.feedback_reactions')).toEqual([]);
  });
  it('PR-08 feedback not yet shared with the parent cannot be reacted to', async () => {
    await as(parent);
    expect(await react(pending, 'thanks')).toBe(false);
  });
  it('PR-09 unknown reaction kinds and direct table writes are refused', async () => {
    await as(parent);
    expect(await react(handoff, 'angry')).toBe(false);
    expect(await ok(`insert into public.feedback_reactions(handoff_id,parent_user_id,academy_id,reaction) values ('${handoff}','${parent}','${academy}','thanks')`)).toBe(false);
    expect(await ok(`delete from public.feedback_reactions`)).toBe(false);
  });
  it('PR-04 the parent can remove their reaction; the coach then sees none', async () => {
    await as(parent);
    expect(await ok(`select public.remove_feedback_reaction('${handoff}')`)).toBe(true);
    await as(coach); expect(await rows("select reaction from public.get_coach_feedback_reactions('2000-01-01')")).toEqual([]);
  });
  it('PR-10 a disconnected parent loses the ability to react', async () => {
    await db.exec('reset role'); await db.exec(`update public.parent_coach_links set active=false`);
    await as(parent); expect(await react(handoff, 'thanks')).toBe(false);
  });
});
