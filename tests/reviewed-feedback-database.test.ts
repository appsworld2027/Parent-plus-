import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { afterAll, afterEach, beforeAll, beforeEach, expect, it } from 'vitest';

const id = (n: number) => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
const [owner, other, academy, foreignAcademy, a, b, foreignChild, batch, session, note, mediaId, requestId] = [1,2,11,12,21,22,23,31,41,51,61,71].map(id);
const bucket = 'parentplus-class-media';
let db: PGlite;
async function user(who = owner) { await db.exec(`reset role;set request.jwt.claim.sub='${who}';set role authenticated`); }
async function reject(sql: string, args: unknown[], code: string) {
  await db.exec('savepoint attempt');
  try { await expect(db.query(sql, args)).rejects.toMatchObject({ code }); }
  finally { await db.exec('rollback to savepoint attempt;release savepoint attempt'); }
}
const consentSql = 'select public.record_coach_media_consent($1,$2,$3,$4,$5,$6,$7)';
async function consent(child = a, sharing = true, photos = true, videos = true) { await db.query(consentSql, [academy, child, 'Fictional guardian', 'Written permission obtained for class media', photos, videos, sharing]); }
const prepareSql = 'select public.prepare_class_media($1,$2,$3,$4::uuid[],$5,$6,$7) as path';
const prepareArgs = (subjects = [a], target = mediaId) => [academy, session, target, subjects, 'photo', 'image/jpeg', 1024];
const queueSql = 'select public.queue_parent_feedback($1,$2,$3,$4,$5::uuid[],$6::uuid[]) as id';
const queueArgs = (media: string[] = [], recipients = [a], request = requestId, revision = 1) => [academy, note, revision, request, recipients, media];
async function ready(subjects = [a]) {
  const path = (await db.query<{path:string}>(prepareSql, prepareArgs(subjects))).rows[0].path;
  await db.query('insert into storage.objects(bucket_id,name,metadata) values($1,$2,$3)', [bucket,path,{size:1024,mimetype:'image/jpeg'}]);
  await db.query('select public.finish_class_media($1,$2)', [academy,mediaId]);
  return path;
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create role anon nologin;create role authenticated nologin;create role service_role nologin bypassrls;
    create schema auth;create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth,public to authenticated,anon,service_role;grant execute on function auth.uid() to authenticated,anon,service_role;
    create schema storage;create table storage.buckets(id text primary key,name text not null,public boolean not null default false,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text not null references storage.buckets(id),name text not null,metadata jsonb,unique(bucket_id,name));
    alter table storage.objects enable row level security;grant usage on schema storage to anon,authenticated,service_role;
    grant select on storage.objects to anon;grant select,insert,update,delete on storage.objects to authenticated;grant all on storage.objects,storage.buckets to service_role;`);
  for (const file of readdirSync('supabase/migrations').filter(f=>f.endsWith('.sql')&&f<='202611160011_reviewed_feedback_media.sql').sort()) await db.exec(readFileSync(`supabase/migrations/${file}`,'utf8'));
  await db.exec(readFileSync('supabase/migrations/202611160011_reviewed_feedback_media.sql','utf8'));
  await db.query('insert into auth.users values($1),($2)',[owner,other]);
},30000);
beforeEach(async () => {
  await db.exec('begin');
  await db.query('insert into public.academies(id,owner_id,name) values($1,$2,$3),($4,$5,$6)',[academy,owner,'Fictional Academy',foreignAcademy,other,'Other Academy']);
  await db.query('insert into public.students(id,academy_id,name) values($1,$2,$3),($4,$2,$5),($6,$7,$8)',[a,academy,'Fictional A',b,'Fictional B',foreignChild,foreignAcademy,'Other child']);
  await db.query("insert into public.batches(id,academy_id,name) values($1,$2,'Fictional Batch')",[batch,academy]);
  await db.query("insert into public.enrolments(academy_id,student_id,batch_id,starts_on) values($1,$2,$3,'2020-01-01'),($1,$4,$3,'2020-01-01')",[academy,a,batch,b]);
  await db.query("insert into public.class_sessions(id,academy_id,batch_id,starts_at,ends_at) values($1,$2,$3,'2026-11-16T10:30:00Z','2026-11-16T11:30:00Z')",[session,academy,batch]);
  await db.query("insert into public.observations(id,academy_id,author_id,batch_id,session_id,note,status,revision,recorded_at) values($1,$2,$3,$4,$5,'Fictional reviewed feedback','recorded',1,now())",[note,academy,owner,batch,session]);
  await db.query('insert into public.observation_recipients(academy_id,observation_id,student_id,batch_id) values($1,$2,$3,$5),($1,$2,$4,$5)',[academy,note,a,b,batch]);
  await user();
});
afterEach(async () => { await db.exec('rollback;reset role'); });
afterAll(async () => { await db?.close(); });

it('denies capture without permission, foreign students and direct consent/media writes', async () => {
  await reject(prepareSql,prepareArgs(),'42501');
  await reject(consentSql,[academy,foreignChild,'Guardian','Written permission',true,true,true],'42501');
  await reject("insert into public.coach_media_consent_events(academy_id,student_id,guardian_name,evidence_note,allow_photos,allow_videos,allow_parent_sharing,recorded_by) values($1,$2,'G','Consent',true,true,true,$3)",[academy,a,owner],'42501');
  await consent();
  await reject(prepareSql,prepareArgs([a,foreignChild]),'42501');
});
it('allows consented uploads once and refuses changed retry identity or forged metadata', async () => {
  await consent();
  const path=(await db.query<{path:string}>(prepareSql,prepareArgs())).rows[0].path;
  await db.query(prepareSql,prepareArgs());
  await reject(prepareSql,[academy,session,mediaId,[a],'photo','image/png',1024],'40001');
  await db.query('insert into storage.objects(bucket_id,name,metadata) values($1,$2,$3)',[bucket,path,{size:999,mimetype:'image/jpeg'}]);
  await reject('select public.finish_class_media($1,$2)',[academy,mediaId],'22023');
  await db.exec('reset role');await db.query('update storage.objects set metadata=$1 where name=$2',[{size:1024,mimetype:'image/jpeg'},path]);await user();
  await db.query('select public.finish_class_media($1,$2)',[academy,mediaId]);
  await db.query('select public.finish_class_media($1,$2)',[academy,mediaId]);
  expect((await db.query('select id from public.class_media')).rows).toHaveLength(1);
  expect((await db.query('delete from storage.objects where name=$1 returning id',[path])).rows).toHaveLength(0);
});
it('keeps capture consent separate from permission to share media with parents', async () => {
  await consent(a,false); await ready();
  await reject(queueSql,queueArgs([mediaId]),'42501');
  expect((await db.query(queueSql,queueArgs())).rows).toHaveLength(1);
});
it('creates immutable per-child snapshots and replays the exact request without duplicates', async () => {
  const first=(await db.query(queueSql,queueArgs([],[a,b]))).rows;
  expect(first).toHaveLength(2);
  expect((await db.query(queueSql,queueArgs([],[b,a],id(72)))).rows).toEqual(first);
  expect((await db.query('select id from public.parent_feedback_handoffs')).rows).toHaveLength(2);
  expect((await db.query(queueSql,queueArgs([],[a,b]))).rows).toEqual(first);
  const rows=(await db.query<{snapshot:{student_id:string;student_name:string;note:string};state:string}>('select snapshot,state from public.parent_feedback_handoffs order by student_id')).rows;
  expect(rows[0].snapshot.student_id).toBe(a); expect(rows[1].snapshot.student_id).toBe(b);
  expect(JSON.stringify(rows[0].snapshot)).not.toContain('Fictional B');
  expect(rows.every(row=>row.state==='awaiting_parent_link')).toBe(true);
  await reject(queueSql,queueArgs([],[a]),'40001');
  await db.exec('reset role');await db.query("update public.observations set note='Later text',revision=2 where id=$1",[note]);await user();
  expect((await db.query<{snapshot:{note:string}}>('select snapshot from public.parent_feedback_handoffs limit 1')).rows[0].snapshot.note).toBe('Fictional reviewed feedback');
  await reject(queueSql,queueArgs([],[a],id(73),1),'40001');
});
it('blocks sharing group media unless every pictured child permits it and every recipient appears', async () => {
  await consent(a);await consent(b,false);await ready([a,b]);
  await reject(queueSql,queueArgs([mediaId]),'42501');
  await consent(b,true);await db.query(queueSql,queueArgs([mediaId]));
  expect((await db.query('select id from public.parent_feedback_handoffs')).rows).toHaveLength(1);
});
it('withdrawal retains consent audit, blocks reads and cancels all pending group-media handoffs', async () => {
  await consent(a);await consent(b);const path=await ready([a,b]);await db.query(queueSql,queueArgs([mediaId]));
  expect((await db.query('select id from storage.objects where name=$1',[path])).rows).toHaveLength(1);
  await consent(b,false,false,false);
  expect((await db.query('select id from storage.objects where name=$1',[path])).rows).toHaveLength(0);
  expect((await db.query<{state:string}>('select state from public.parent_feedback_handoffs')).rows[0].state).toBe('cancelled');
  expect((await db.query('select event_id from public.coach_media_consent_events where student_id=$1',[b])).rows).toHaveLength(2);
});
it('isolates private consent, media and handoffs from other accounts and anonymous calls', async () => {
  await consent();await ready();await db.query(queueSql,queueArgs([mediaId]));
  await user(other);
  for(const table of ['coach_media_consents','class_media','parent_feedback_handoffs']) expect((await db.query(`select * from public.${table}`)).rows).toHaveLength(0);
  await reject(queueSql,queueArgs(),'42501');
  await db.exec('reset role;set role anon');await reject(queueSql,queueArgs(),'42501');
});
