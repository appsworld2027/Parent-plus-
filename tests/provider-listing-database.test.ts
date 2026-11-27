// Validates supabase/candidates/202611270024_provider_listing.sql on a DISPOSABLE in-memory database only (LP-03..LP-12).
// Not applied to any hosted project. Separate academies are not modelled: a listing belongs to one user and is readable only by that user and admins.
import { readFileSync } from 'node:fs';
import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';
import { supabaseDatabase } from './support/supabaseDatabase';

const id = (n: number) => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
const [coach, rival, admin, unverified, unapproved] = [1, 2, 3, 4, 5].map(id);
let db: PGlite;
const as = async (user: string | null) => { await db.exec(`reset role; ${user ? `set request.jwt.claim.sub = '${user}'; set role authenticated;` : `reset request.jwt.claim.sub; set role anon;`}`); };
async function run(sql: string, args: unknown[] = []) { await db.exec('begin'); try { return { rows: (await db.query<any>(sql, args)).rows, error: '' }; } catch (e: any) { return { rows: [], error: String(e.code ?? e.message) }; } finally { await db.exec('rollback'); } }
async function commit(sql: string, args: unknown[] = []) { try { await db.query(sql, args); return ''; } catch (e: any) { return String(e.code ?? e.message); } }
const good = ['Fictional Cricket Coaching', 'Weekend batting and bowling sessions for school children.', 'Cricket', '8 to 12', 'Fictional Ground', 'Fictional 2000 per month'];
const save = (args: unknown[] = good) => commit('select public.save_provider_listing($1,$2,$3,$4,$5,$6)', args);
const mine = async () => (await run('select public.get_my_provider_listing() as l')).rows[0].l;

beforeAll(async () => {
  db = await supabaseDatabase();
  for (const f of ['202611270022_verified_email_gate', '202611270023_provider_verification', '202611270024_provider_listing']) await db.exec(readFileSync(`supabase/candidates/${f}.sql`, 'utf8'));
  await db.exec('reset role');
  for (const [u, e, v] of [[coach, 'c', 1], [rival, 'r', 1], [admin, 'a', 1], [unverified, 'u', 0], [unapproved, 'n', 1]] as const) await db.query(`insert into auth.users(id,email,email_confirmed_at) values ($1,$2,${v ? 'now()' : 'null'})`, [u, `${e}@example.test`]);
  await db.query('insert into coach_private.provider_admins(user_id) values ($1)', [admin]);
  for (const u of [coach, rival, unverified]) await db.query(`insert into public.provider_profiles(user_id,name,phone,bio,sports,experience_years,status) values ($1,'Fictional','9876543210','Fictional bio of a coach with real experience.','{Cricket}',3,'verified')`, [u]);
  await db.query(`insert into public.provider_profiles(user_id,status) values ($1,'pending')`, [unapproved]);
});

describe('provider listing candidate (disposable database)', () => {
  it('LP-01 a coach who is not Verified cannot save or publish and is told they are not eligible', async () => {
    await as(unapproved); expect(await save()).toBe('42501'); expect(await commit('select public.publish_provider_listing()')).toBe('42501'); expect((await mine()).eligible).toBe(false);
    await as(coach); expect((await mine()).eligible).toBe(true);
  });
  it('LP-03 invalid fields are refused and nothing saves', async () => {
    await as(coach);
    for (const bad of [['ab', ...good.slice(1)], [good[0], 'too short', ...good.slice(2)], [good[0], good[1], ' ', ...good.slice(3)], [...good.slice(0, 4), '', good[5]], [...good.slice(0, 5), '']]) expect(await save(bad)).toBe('22023');
    await db.exec('reset role'); expect((await db.query('select * from public.provider_listings')).rows).toHaveLength(0);
  });
  it('LP-04/05 a valid draft persists; publishing needs a saved draft', async () => {
    await as(coach); expect(await commit('select public.publish_provider_listing()')).toBe('22023');
    expect(await save()).toBe(''); const l = await mine(); expect(l.status).toBe('draft'); expect(l.listing.title).toBe('Fictional Cricket Coaching');
  });
  it('LP-06 publishing sets Published with a date', async () => {
    await as(coach); expect(await commit('select public.publish_provider_listing()')).toBe(''); const l = await mine(); expect(l.status).toBe('published'); expect(l.published_at).toBeTruthy();
  });
  it('LP-07 a Published listing is readable only by its owner and admins: not by another coach, an unverified account or a signed-out user', async () => {
    for (const [who, n] of [[coach, 1], [admin, 1], [rival, 0], [unverified, 0], [null, 0]] as const) { await as(who); expect((await run('select * from public.provider_listings')).rows.length, String(who)).toBe(n); }
    await as(rival); expect((await run('select public.list_provider_listings()')).error).toBe('42501'); expect((await mine()).listing.title).toBe('');
    await as(null); expect((await run('select public.get_my_provider_listing()')).error).not.toBe('');
  });
  it('LP-08 an admin sees Published listings with the owner name, read-only', async () => {
    await as(admin); const rows = (await run('select public.list_provider_listings() as l')).rows[0].l; expect(rows).toHaveLength(1); expect(rows[0].owner_name).toBe('Fictional');
    expect((await run(`update public.provider_listings set title='Changed'`)).error).toBe('42501'); expect((await run('delete from public.provider_listings')).error).toBe('42501');
    expect(await save()).toBe('42501');
  });
  it('LP-09 editing a Published listing keeps it Published', async () => {
    await as(coach); expect(await save([...good.slice(0, 5), 'Fictional 2500 per month'])).toBe(''); const l = await mine(); expect(l.status).toBe('published'); expect(l.listing.price_note).toBe('Fictional 2500 per month');
  });
  it('LP-12 nobody can write another coach\'s listing: no function takes a user id, direct writes and forged status are refused', async () => {
    await as(rival); expect(await commit('select public.publish_provider_listing($1)', [coach])).toMatch(/42883|function/i);
    expect(await commit(`select public.save_provider_listing($1,$2,$3,$4,$5,$6,$7)`, [coach, ...good])).toMatch(/42883|function/i);
    expect((await run(`update public.provider_listings set title='Hijacked' where user_id=$1`, [coach])).error).toBe('42501');
    expect((await run(`insert into public.provider_listings(user_id,title,description,sport,age_group,location,price_note,status) values ($1,'abc','x x x x x x x x x x x x x x x x x x x','a','a','a','a','published')`, [rival])).error).toBe('42501');
    await db.exec('reset role'); expect((await db.query<any>('select title,status from public.provider_listings where user_id=$1', [coach])).rows[0]).toEqual({ title: 'Fictional Cricket Coaching', status: 'published' });
  });
  it('LP-10 Unpublish returns to Draft and keeps the content', async () => {
    await as(coach); expect(await commit('select public.unpublish_provider_listing()')).toBe(''); const l = await mine(); expect(l.status).toBe('draft'); expect(l.listing.title).toBe('Fictional Cricket Coaching');
    expect(await commit('select public.publish_provider_listing()')).toBe('');
  });
  it('LP-11 revoking verification unpublishes at once, and the listing cannot be republished', async () => {
    await db.exec('reset role'); await db.query(`update public.provider_profiles set status='pending' where user_id=$1`, [coach]); // setup: put the profile in a state the admin function can revoke from
    await db.query(`update public.provider_profiles set status='verified' where user_id=$1`, [coach]); await db.query(`update public.provider_listings set status='published' where user_id=$1`, [coach]);
    await as(admin); expect(await commit('select public.decide_provider_profile($1,$2,$3)', [coach, 'reject', 'Qualification expired.'])).toBe('');
    await as(coach); const l = await mine(); expect(l.status).toBe('draft'); expect(l.eligible).toBe(false); expect(l.published_at).toBeNull();
    expect(await commit('select public.publish_provider_listing()')).toBe('42501'); expect(await save()).toBe('42501');
    await db.exec('reset role'); expect((await db.query('select * from public.provider_listings where user_id=$1 and status=$2', [coach, 'published'])).rows).toHaveLength(0);
  });
});
