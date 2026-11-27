// Validates supabase/candidates/202611270023_provider_verification.sql on a DISPOSABLE in-memory database only (PV-03, PV-06, PV-07, PV-11, PV-12).
// Not applied to any hosted project. Real storage short-lived signed links need a hosted storage service: NOT RUN here.
import { readFileSync } from 'node:fs';
import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';
import { supabaseDatabase } from './support/supabaseDatabase';

const id = (n: number) => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
const [coach, stranger, admin, unverified, other] = [1, 2, 3, 4, 5].map(id);
let db: PGlite;
const as = async (user: string | null) => { await db.exec(`reset role; ${user ? `set request.jwt.claim.sub = '${user}'; set role authenticated;` : `reset request.jwt.claim.sub; set role anon;`}`); };
async function run(sql: string, args: unknown[] = []) { await db.exec('begin'); try { return { rows: (await db.query<any>(sql, args)).rows, error: '' }; } catch (e: any) { return { rows: [], error: String(e.code ?? e.message) }; } finally { await db.exec('rollback'); } }
async function commit(sql: string, args: unknown[] = []) { try { await db.query(sql, args); return ''; } catch (e: any) { return String(e.code ?? e.message); } }
const profile = ['Fictional Coach', '9876543210', 'Fictional bio of a coach with real experience.', ['Cricket'], 6] as const;
async function build(user: string) { // a complete pending profile: save, two stored files, register, submit
  await as(user);
  expect(await commit('select public.save_provider_profile($1,$2,$3,$4,$5)', [...profile])).toBe('');
  await db.exec('reset role'); for (const k of ['photo_id', 'qualification']) await db.query(`insert into storage.objects(bucket_id,name) values ('provider-documents',$1)`, [`${user}/${k}/f`]);
  await as(user);
  for (const [k, m] of [['photo_id', 'image/png'], ['qualification', 'application/pdf']]) expect(await commit('select public.register_provider_document($1,$2,$3,$4,$5)', [k, `${user}/${k}/f`, `${k}.x`, m, 1000])).toBe('');
  expect(await commit('select public.submit_provider_profile()')).toBe('');
}

beforeAll(async () => {
  db = await supabaseDatabase();
  await db.exec(readFileSync('supabase/candidates/202611270022_verified_email_gate.sql', 'utf8'));
  await db.exec(readFileSync('supabase/candidates/202611270023_provider_verification.sql', 'utf8'));
  await db.exec('reset role');
  for (const [u, e, v] of [[coach, 'c', 1], [stranger, 's', 1], [admin, 'a', 1], [unverified, 'u', 0], [other, 'o', 1]] as const)
    await db.query(`insert into auth.users(id,email,email_confirmed_at) values ($1,$2,${v ? 'now()' : 'null'})`, [u, `${e}@example.test`]);
  await db.query('insert into coach_private.provider_admins(user_id) values ($1)', [admin]);
});

describe('provider verification candidate (disposable database)', () => {
  it('PV-03 a valid profile persists; invalid input is refused and nothing saves', async () => {
    await as(coach);
    expect(await commit('select public.save_provider_profile($1,$2,$3,$4,$5)', ['', '12', 'short', [], -1])).toBe('22023');
    expect((await run('select * from public.provider_profiles')).rows).toHaveLength(0);
    expect(await commit('select public.save_provider_profile($1,$2,$3,$4,$5)', [...profile])).toBe('');
    expect((await run("select public.get_my_provider_profile() as p")).rows[0].p.profile.name).toBe('Fictional Coach');
  });
  it('PV-06 submit is refused until both documents are registered', async () => {
    await as(coach); expect(await commit('select public.submit_provider_profile()')).toBe('22023');
    expect((await run('select status from public.provider_profiles')).rows[0].status).toBe('draft');
  });
  it('PV-04/05 only an owner-folder file of the allowed type and size registers', async () => {
    await db.exec('reset role'); await db.query(`insert into storage.objects(bucket_id,name) values ('provider-documents',$1)`, [`${coach}/photo_id/a`]); await as(coach);
    expect(await commit('select public.register_provider_document($1,$2,$3,$4,$5)', ['photo_id', `${coach}/photo_id/a`, 'a.txt', 'text/plain', 10])).not.toBe('');
    expect(await commit('select public.register_provider_document($1,$2,$3,$4,$5)', ['photo_id', `${coach}/photo_id/a`, 'a.png', 'image/png', 5242881])).not.toBe('');
    expect(await commit('select public.register_provider_document($1,$2,$3,$4,$5)', ['photo_id', `${coach}/photo_id/a`, 'a.png', 'image/png', 0])).not.toBe('');
    expect(await commit('select public.register_provider_document($1,$2,$3,$4,$5)', ['photo_id', `${stranger}/photo_id/a`, 'a.png', 'image/png', 10])).toBe('22023');
    expect((await run('select * from public.provider_documents')).rows).toHaveLength(0);
  });
  it('PV-07 a submitted profile locks its fields, documents and files', async () => {
    await db.exec('reset role'); await db.query(`delete from storage.objects where bucket_id='provider-documents'`); await build(coach);
    expect((await run('select status from public.provider_profiles')).rows[0].status).toBe('pending');
    expect(await commit('select public.save_provider_profile($1,$2,$3,$4,$5)', [...profile])).toBe('42501');
    expect(await commit('select public.register_provider_document($1,$2,$3,$4,$5)', ['photo_id', `${coach}/photo_id/f`, 'x.png', 'image/png', 10])).toBe('42501');
    expect(await commit(`insert into storage.objects(bucket_id,name) values ('provider-documents',$1)`, [`${coach}/photo_id/new`])).not.toBe('');
    expect(await commit(`delete from storage.objects where bucket_id='provider-documents' and name=$1`, [`${coach}/photo_id/f`])).toBe(''); // RLS hides the row: zero deleted
    await db.exec('reset role'); expect((await db.query(`select 1 from storage.objects where name=$1`, [`${coach}/photo_id/f`])).rows).toHaveLength(1);
  });
  it('PV-11 only the owner and an admin can read the profile, documents and files; strangers, anon and unverified accounts see nothing', async () => {
    const reads = ['select * from public.provider_profiles', 'select * from public.provider_documents', `select * from storage.objects where bucket_id='provider-documents'`];
    for (const [who, expected] of [[coach, 1], [admin, 1], [stranger, 0], [null, 0], [unverified, 0]] as const) {
      await as(who); for (const sql of reads) expect((await run(sql)).rows.length, `${who} ${sql}`).toBe(expected === 1 ? (sql.includes('storage') || sql.includes('documents') ? 2 : 1) : 0);
    }
    await as(stranger); expect((await run('select public.list_provider_review_queue()')).error).toBe('42501');
    await as(null); expect((await run('select public.get_my_provider_profile()')).error).not.toBe('');
    await db.exec('reset role'); expect((await db.query(`select public from storage.buckets where id='provider-documents'`)).rows[0]).toEqual({ public: false });
  });
  it('PV-08 the admin queue lists the pending profile with both documents', async () => {
    await as(admin); const q = (await run('select public.list_provider_review_queue() as q')).rows[0].q;
    expect(q).toHaveLength(1); expect(q[0].user_id).toBe(coach); expect(q[0].documents).toHaveLength(2);
  });
  it('PV-12 a non-admin cannot decide, directly update, or insert a status; nothing changes', async () => {
    for (const who of [coach, stranger, unverified]) { await as(who); expect((await run('select public.decide_provider_profile($1,$2,$3)', [coach, 'approve', null])).error, String(who)).toMatch(/42501/); }
    await as(coach);
    expect((await run(`update public.provider_profiles set status='verified' where user_id=$1`, [coach])).error).toBe('42501');
    expect((await run(`insert into public.provider_profiles(user_id,status) values ($1,'verified')`, [other])).error).toBe('42501');
    expect((await run(`insert into public.provider_decisions(user_id,decision,decided_by) values ($1,'approve',$1)`, [coach])).error).toBe('42501');
    await db.exec('reset role'); expect((await db.query<any>(`select status from public.provider_profiles where user_id=$1`, [coach])).rows[0].status).toBe('pending');
    expect((await db.query('select * from public.provider_decisions')).rows).toHaveLength(0);
  });
  it('PV-08/12 reject needs a reason; the decision records who and when; PV-10 resubmit works', async () => {
    await as(admin);
    expect(await commit('select public.decide_provider_profile($1,$2,$3)', [coach, 'reject', '  '])).toBe('22023');
    expect(await commit('select public.decide_provider_profile($1,$2,$3)', [coach, 'reject', 'The photo ID is blurred.'])).toBe('');
    await db.exec('reset role'); const d = (await db.query<any>('select decision,reason,decided_by,decided_at from public.provider_decisions')).rows;
    expect(d).toHaveLength(1); expect(d[0]).toMatchObject({ decision: 'reject', reason: 'The photo ID is blurred.', decided_by: admin }); expect(d[0].decided_at).toBeTruthy();
    await as(coach); const p = (await run('select public.get_my_provider_profile() as p')).rows[0].p; expect(p.status).toBe('rejected'); expect(p.reason).toBe('The photo ID is blurred.');
    expect(await commit('select public.save_provider_profile($1,$2,$3,$4,$5)', [...profile])).toBe('');
    expect(await commit('select public.submit_provider_profile()')).toBe('');
    expect((await run('select status from public.provider_profiles')).rows[0].status).toBe('pending');
  });
  it('PV-09 approval sets Verified with a date and who; approving twice is refused; admin can revoke a verified profile', async () => {
    await as(admin); expect(await commit('select public.decide_provider_profile($1,$2,$3)', [coach, 'approve', null])).toBe('');
    expect(await commit('select public.decide_provider_profile($1,$2,$3)', [coach, 'approve', null])).toBe('22023');
    await as(coach); const p = (await run('select public.get_my_provider_profile() as p')).rows[0].p; expect(p.status).toBe('verified'); expect(p.decided_at).toBeTruthy();
    await as(admin); expect(await commit('select public.decide_provider_profile($1,$2,$3)', [coach, 'reject', 'Qualification expired.'])).toBe('');
    await db.exec('reset role'); expect((await db.query('select * from public.provider_decisions')).rows).toHaveLength(3);
  });
  it('an unverified-email account cannot save a profile', async () => {
    await as(unverified); expect(await commit('select public.save_provider_profile($1,$2,$3,$4,$5)', [...profile])).toBe('42501');
  });
});
