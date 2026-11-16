import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { afterAll, afterEach, beforeAll, beforeEach, expect, it } from 'vitest';
const id=(n:number)=>`00000000-0000-0000-0000-${String(n).padStart(12,'0')}`;
const [coach,parent,other,academy,student,outsider,batch,session,note,family,foreignFamily,child,foreignChild,media]=[1,2,3,11,21,22,31,41,51,61,62,71,72,81].map(id);
let db:PGlite;
async function as(who:string){await db.exec(`reset role;set request.jwt.claim.sub='${who}';set role authenticated`);}
async function reject(sql:string,args:unknown[],code:string){await db.exec('savepoint attempt');try{await expect(db.query(sql,args)).rejects.toMatchObject({code});}finally{await db.exec('rollback to savepoint attempt;release savepoint attempt');}}
async function issue(){await as(coach);return(await db.query<{code:string}>('select public.issue_parent_link_invite($1,$2) as code',[academy,student])).rows[0].code;}
async function claim(code:string,target=child){return(await db.query<{id:string}>('select public.claim_parent_link($1,$2) as id',[code,target])).rows[0].id;}
async function queue(request=91,withMedia=false){await as(coach);return(await db.query<{id:string}>('select public.queue_parent_feedback($1,$2,1,$3,$4::uuid[],$5::uuid[]) as id',[academy,note,id(request),[student],withMedia?[media]:[]])).rows[0].id;}
async function capture(){
  await as(coach);await db.query("select public.record_coach_media_consent($1,$2,'Guardian','Written permission',true,true,true)",[academy,student]);
  const path=(await db.query<{path:string}>('select public.prepare_class_media($1,$2,$3,$4::uuid[],\'photo\',\'image/jpeg\',1024) as path',[academy,session,media,[student]])).rows[0].path;
  await db.query("insert into storage.objects(bucket_id,name,metadata) values('parentplus-class-media',$1,'{\"size\":1024,\"mimetype\":\"image/jpeg\"}')",[path]);
  await db.query('select public.finish_class_media($1,$2)',[academy,media]);return path;
}
beforeAll(async()=>{
  db=new PGlite();await db.exec(`create role anon nologin;create role authenticated nologin;create role service_role nologin bypassrls;
    create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth,public to authenticated,anon,service_role;grant execute on function auth.uid() to authenticated,anon,service_role;
    create schema storage;create table storage.buckets(id text primary key,name text not null,public boolean not null default false,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text not null references storage.buckets(id),name text not null,metadata jsonb,unique(bucket_id,name));
    alter table storage.objects enable row level security;grant usage on schema storage to anon,authenticated,service_role;grant select on storage.objects to anon;grant select,insert,update,delete on storage.objects to authenticated;grant all on storage.objects,storage.buckets to service_role;`);
  for(const file of readdirSync('supabase/migrations').filter(file=>file.endsWith('.sql')&&file<='202611150010_vision_monthly_limit.sql').sort())await db.exec(readFileSync(`supabase/migrations/${file}`,'utf8'));
  await db.exec(readFileSync('supabase/update_011_013.sql','utf8'));
  await db.exec(readFileSync('supabase/update_011_013.sql','utf8'));
  await db.query('insert into auth.users values($1),($2),($3)',[coach,parent,other]);
},30000);
beforeEach(async()=>{
  await db.exec('begin');
  await db.query("insert into public.academies(id,owner_id,name) values($1,$2,'Fictional academy')",[academy,coach]);
  await db.query("insert into public.students(id,academy_id,name) values($1,$2,'Coach student'),($3,$2,'Other student')",[student,academy,outsider]);
  await db.query("insert into public.batches(id,academy_id,name) values($1,$2,'Art')",[batch,academy]);
  await db.query("insert into public.enrolments(academy_id,student_id,batch_id,starts_on) values($1,$2,$3,'2020-01-01')",[academy,student,batch]);
  await db.query("insert into public.class_sessions(id,academy_id,batch_id,starts_at,ends_at) values($1,$2,$3,'2026-11-16T10:00Z','2026-11-16T11:00Z')",[session,academy,batch]);
  await db.query("insert into public.observations(id,academy_id,batch_id,session_id,author_id,note,status,revision,recorded_at) values($1,$2,$3,$4,$5,'Approved learning update','recorded',1,now())",[note,academy,batch,session,coach]);
  await db.query('insert into public.observation_recipients(academy_id,observation_id,batch_id,student_id) values($1,$2,$3,$4)',[academy,note,batch,student]);
  await db.query("insert into public.parent_families(id,owner_id,parent_name,name) values($1,$2,'Fictional Parent','Our family'),($3,$4,'Other Parent','Other family')",[family,parent,foreignFamily,other]);
  await db.query("insert into public.family_children(id,family_id,name) values($1,$2,'Our child'),($3,$4,'Private other child')",[child,family,foreignChild,foreignFamily]);
  await as(parent);
});
afterEach(async()=>{await db.exec('rollback;reset role');});afterAll(async()=>{await db?.close();});

it('isolates family records from other parents and from an academy coach',async()=>{
  expect((await db.query('select id from public.family_children')).rows).toEqual([{id:child}]);
  expect((await db.query('select id from public.students')).rows).toHaveLength(0);
  await reject("insert into public.family_todos(id,family_id,child_id,title) values($1,$2,$3,'Forged')",[id(95),foreignFamily,foreignChild],'42501');
  await reject("insert into public.family_todos(id,family_id,child_id,title) values($1,$2,$3,'Cross-family')",[id(95),family,foreignChild],'23503');
  await as(coach);expect((await db.query('select id from public.parent_families')).rows).toHaveLength(0);
});
it('requires an explicit expiring one-time invitation and never stores its raw code',async()=>{
  const code=await issue();expect(code).toMatch(/^[0-9a-f]{64}$/);
  await db.exec('reset role');const stored=(await db.query<{code_hash:string}>('select code_hash from coach_private.parent_link_invites')).rows[0].code_hash;expect(stored).not.toBe(code);
  await as(parent);const linked=await claim(code);expect(await claim(code)).toBe(linked);
  await as(other);await reject('select public.claim_parent_link($1,$2)',[code,foreignChild],'22023');
  await reject('select * from coach_private.parent_link_invites',[],'42501');
  await reject('select public.issue_parent_link_invite($1,$2)',[academy,student],'42501');
});
it('exposes only coach-approved per-child snapshots after linking, with fresh reviews appearing in the feed',async()=>{
  const held=await queue();await as(parent);expect((await db.query('select * from public.parent_feedback_feed')).rows).toHaveLength(0);
  const code=await issue();await as(parent);await claim(code);
  const feed=(await db.query<{id:string;snapshot:{note:string}}> ('select * from public.parent_feedback_feed')).rows;
  expect(feed).toHaveLength(1);expect(feed[0].id).toBe(held);expect(feed[0].snapshot.note).toBe('Approved learning update');
  expect((await db.query('select id from public.observations')).rows).toHaveLength(0);
  await as(other);expect((await db.query('select * from public.parent_feedback_feed')).rows).toHaveLength(0);
  await as(coach);expect((await db.query('select * from public.parent_feedback_feed')).rows).toHaveLength(0);
  expect(await queue(92)).toBe(held);
});
it('disconnecting revokes feed access and does not transfer old approvals to a replacement family',async()=>{
  await queue();const code=await issue();await as(parent);const link=await claim(code);
  await db.query('select public.disconnect_parent_link($1)',[link]);
  expect((await db.query('select * from public.parent_feedback_feed')).rows).toHaveLength(0);
  const next=await issue();await as(other);await claim(next,foreignChild);
  expect((await db.query('select * from public.parent_feedback_feed')).rows).toHaveLength(0);
  await queue(92);await as(other);expect((await db.query('select * from public.parent_feedback_feed')).rows).toHaveLength(1);
  await as(parent);await db.query('select public.disconnect_parent_link($1)',[link]);
  await reject('select public.parent_media_permission($1,true,true,true)',[link],'42501');
  await as(other);expect((await db.query('select * from public.parent_feedback_feed')).rows).toHaveLength(1);
});
it('parent media access needs approved media and current permission; a coach cannot overrule a parent refusal',async()=>{
  const path=await capture();await queue(91,true);const code=await issue();await as(parent);const link=await claim(code);
  expect((await db.query('select id from storage.objects where name=$1',[path])).rows).toHaveLength(0);
  await db.query('select public.parent_media_permission($1,true,true,true)',[link]);
  expect((await db.query('select id from storage.objects where name=$1',[path])).rows).toHaveLength(1);
  await db.query('select public.parent_media_permission($1,false,false,false)',[link]);
  expect((await db.query('select id from storage.objects where name=$1',[path])).rows).toHaveLength(0);
  expect((await db.query('select * from public.parent_feedback_feed')).rows).toHaveLength(0);
  await as(coach);await reject("select public.record_coach_media_consent($1,$2,'G','New attestation',true,true,true)",[academy,student],'42501');
});
it('invalid or revoked invites and foreign-child claims cannot change a family connection',async()=>{
  const old=await issue(),fresh=await issue();await as(parent);
  await reject('select public.claim_parent_link($1,$2)',[old,child],'22023');
  await reject('select public.claim_parent_link($1,$2)',[fresh,foreignChild],'42501');
  await db.exec('reset role');await db.query("update coach_private.parent_link_invites set expires_at=now()-interval '1 second'");await as(parent);
  await reject('select public.claim_parent_link($1,$2)',[fresh,child],'22023');
});

it('archive revokes outstanding invites, rejects first claims and preserves existing approved text history',async()=>{
  const unused=await issue();
  await db.query('select public.archive_student($1)',[student]);
  await as(parent);await reject('select public.claim_parent_link($1,$2)',[unused,child],'22023');
  await reject('select public.preview_parent_link($1)',[unused],'22023');
  await as(coach);await reject('select public.issue_parent_link_invite($1,$2)',[academy,student],'42501');
  // Simulate a pre013 pending invitation on an already archived student.
  await db.exec('reset role');await db.exec('update coach_private.parent_link_invites set revoked=false');
  await as(parent);await reject('select public.claim_parent_link($1,$2)',[unused,child],'22023');
});
it('archive does not erase connected family history or break exact claim retry',async()=>{
  await queue();const code=await issue();await as(parent);const link=await claim(code);
  await as(other);await reject('select public.archive_student($1)',[student],'42501');
  await as(coach);await db.query('select public.archive_student($1)',[student]);
  await as(parent);expect(await claim(code)).toBe(link);
  expect((await db.query('select * from public.parent_feedback_feed')).rows).toHaveLength(1);
  await db.query('select public.disconnect_parent_link($1)',[link]);
  expect((await db.query('select * from public.parent_feedback_feed')).rows).toHaveLength(0);
});

it('keeps siblings separate while a child attends multiple batches',async()=>{
  const sibling=id(73),secondBatch=id(32);
  await db.query("insert into public.family_children(id,family_id,name) values($1,$2,'Sibling')",[sibling,family]);
  const first=await issue();await as(parent);const firstLink=await claim(first);
  await reject('select public.claim_parent_link($1,$2)',[first,sibling],'22023');
  await as(coach);const second=(await db.query<{code:string}>('select public.issue_parent_link_invite($1,$2) as code',[academy,outsider])).rows[0].code;
  await as(parent);await reject('select public.claim_parent_link($1,$2)',[second,child],'22023');await claim(second,sibling);
  await as(coach);await db.query("insert into public.batches(id,academy_id,name) values($1,$2,'Music')",[secondBatch,academy]);
  await db.query('select public.add_batch_students($1,$2,$3::uuid[])',[academy,secondBatch,[student]]);
  expect((await db.query('select batch_id from public.enrolments where student_id=$1',[student])).rows).toHaveLength(2);
  await queue();await as(parent);
  const rows=(await db.query<{child_id:string}>('select child_id from public.parent_feedback_feed')).rows;
  expect(rows).toEqual([{child_id:child}]);
  await db.query('select public.disconnect_parent_link($1)',[firstLink]);
  expect((await db.query<{child_id:string}>('select child_id from public.get_parent_coach_connections()')).rows).toEqual([{child_id:sibling}]);
});
it('links one family child to independent coaches without exposing private family records',async()=>{
  const secondAcademy=id(12),secondStudent=id(23);
  const first=await issue();await as(parent);await claim(first);
  await db.exec('reset role');
  await db.query("insert into public.academies(id,owner_id,name) values($1,$2,'Other coach')",[secondAcademy,other]);
  await db.query("insert into public.students(id,academy_id,name) values($1,$2,'Same child at another coach')",[secondStudent,secondAcademy]);
  await as(other);const code=(await db.query<{code:string}>('select public.issue_parent_link_invite($1,$2) as code',[secondAcademy,secondStudent])).rows[0].code;
  await as(parent);await claim(code);
  expect((await db.query('select * from public.get_parent_coach_connections()')).rows).toHaveLength(2);
  await as(other);expect((await db.query('select id from public.family_children')).rows).toEqual([{id:foreignChild}]);
  expect((await db.query('select id from public.parent_coach_links')).rows).toHaveLength(1);
});
it('rejects anonymous family access, untrusted link creation and a second active household',async()=>{
  await db.exec('reset role;set role anon');await reject('select * from public.family_children',[],'42501');
  await as(parent);await reject('insert into public.parent_coach_links(academy_id,student_id,family_id,child_id,parent_user_id) values($1,$2,$3,$4,$5)',[academy,student,family,child,parent],'42501');
  const code=await issue();await as(parent);await claim(code);
  await as(coach);await reject('select public.issue_parent_link_invite($1,$2)',[academy,student],'22023');
});

it('requires disconnect before family-child archive, preserving a clear consent lifecycle',async()=>{
  const code=await issue();await as(parent);const link=await claim(code);
  await reject('update public.family_children set archived_at=now() where id=$1',[child],'22023');
  expect((await db.query('select * from public.get_parent_coach_connections()')).rows).toHaveLength(1);
  await db.query('select public.disconnect_parent_link($1)',[link]);
  await db.query('update public.family_children set archived_at=now() where id=$1',[child]);
  const next=await issue();await as(parent);await reject('select public.claim_parent_link($1,$2)',[next,child],'42501');
});
