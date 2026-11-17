import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { afterAll, afterEach, beforeAll, beforeEach, expect, it } from 'vitest';
const id=(n:number)=>`00000000-0000-0000-0000-${String(n).padStart(12,'0')}`;
const [coach,parent,other,academy,student,outsider,batch,session,note,family,foreignFamily,child,foreignChild,media]=[1,2,3,11,21,22,31,41,51,61,62,71,72,81].map(id);
let db:PGlite;
async function as(who:string){await db.exec(`reset role;set request.jwt.claim.sub='${who}';set role authenticated`);}
async function reject(sql:string,args:unknown[],code:string){await db.exec('savepoint attempt');try{await expect(db.query(sql,args)).rejects.toMatchObject({code});}finally{await db.exec('rollback to savepoint attempt;release savepoint attempt');}}
async function issue(email='parent@example.test'){await as(coach);return(await db.query<{code:string}>('select public.issue_parent_link_invite($1,$2,$3) as code',[academy,student,email])).rows[0].code;}
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
    create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth,public to authenticated,anon,service_role;grant execute on function auth.uid() to authenticated,anon,service_role;
    create schema storage;create table storage.buckets(id text primary key,name text not null,public boolean not null default false,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text not null references storage.buckets(id),name text not null,metadata jsonb,unique(bucket_id,name));
    alter table storage.objects enable row level security;grant usage on schema storage to anon,authenticated,service_role;grant select on storage.objects to anon;grant select,insert,update,delete on storage.objects to authenticated;grant all on storage.objects,storage.buckets to service_role;`);
  for(const file of readdirSync('supabase/migrations').filter(file=>file.endsWith('.sql')&&file<='202611150010_vision_monthly_limit.sql').sort())await db.exec(readFileSync(`supabase/migrations/${file}`,'utf8'));
  await db.exec(readFileSync('supabase/update_011_013.sql','utf8'));
  await db.exec(readFileSync('supabase/update_011_013.sql','utf8'));
  await db.query("insert into auth.users values($1,'coach@example.test',now()),($2,'parent@example.test',now()),($3,'other@example.test',now())",[coach,parent,other]);
  await db.exec(readFileSync('supabase/update_014.sql','utf8'));
  await db.exec(readFileSync('supabase/update_014.sql','utf8'));
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

async function approve(request:string,decision=true){await as(coach);return(await db.query<{id:string}>('select public.review_parent_connection_request($1,$2) as id',[request,decision])).rows[0].id;}
it('blocks forwarded invitations and previews for another verified email without consuming the invitation',async()=>{
  const code=await issue();await as(other);
  await reject('select public.preview_parent_link($1)',[code],'22023');await reject('select public.claim_parent_link($1,$2)',[code,foreignChild],'22023');
  await as(parent);expect((await db.query('select public.preview_parent_link($1)',[code])).rows).toHaveLength(1);expect(await claim(code)).toBeTruthy();
});
it('uses the server verified email, normalises only case/whitespace and rejects unverified accounts',async()=>{
  const code=await issue('  PARENT@example.test  ');await db.exec('reset role');await db.query('update auth.users set email_confirmed_at=null where id=$1',[parent]);await as(parent);
  await reject('select public.claim_parent_link($1,$2)',[code,child],'42501');
  await db.exec('reset role');await db.query('update auth.users set email_confirmed_at=now() where id=$1',[parent]);await as(parent);expect(await claim(code)).toBeTruthy();
});
it('claim only creates an immutable pending request; no feedback, link or consent access exists until coach approval',async()=>{
  await queue();const code=await issue();await as(parent);const request=await claim(code);expect(await claim(code)).toBe(request);
  expect((await db.query('select * from public.parent_feedback_feed')).rows).toHaveLength(0);expect((await db.query('select * from public.get_parent_coach_connections()')).rows).toHaveLength(0);
  expect((await db.query<{status:string}>('select status from public.get_parent_connection_requests()')).rows).toEqual([{status:'pending'}]);
  await reject("update public.parent_connection_requests set status='approved' where id=$1",[request],'42501');
  await reject('select public.review_parent_connection_request($1,true)',[request],'42501');
  const link=await approve(request);expect(await approve(request)).toBe(link);await as(parent);
  expect((await db.query('select * from public.parent_feedback_feed')).rows).toHaveLength(1);
  expect((await db.query<{allow_photos:boolean}>('select allow_photos from public.get_parent_media_permissions()')).rows[0].allow_photos).toBe(false);
});
it('wrong child can be rejected; rejection does not release feedback or let a stale approval revive it',async()=>{
  await queue();const code=await issue();await as(parent);const request=await claim(code);
  await approve(request,false);await as(parent);expect((await db.query('select * from public.parent_feedback_feed')).rows).toHaveLength(0);
  await as(coach);await reject('select public.review_parent_connection_request($1,true)',[request],'22023');expect(await issue()).toBeTruthy();
});
it('changed child details or guardian email require a fresh match review',async()=>{
  const code=await issue();await as(parent);const request=await claim(code);await db.query("update public.family_children set name='Changed child' where id=$1",[child]);
  await as(coach);await reject('select public.review_parent_connection_request($1,true)',[request],'40001');
  await db.exec('reset role');await db.query("update public.family_children set name='Our child' where id=$1",[child]);await db.query("update auth.users set email='changed@example.test' where id=$1",[parent]);
  await as(coach);await reject('select public.review_parent_connection_request($1,true)',[request],'40001');
});
it('another coach/family cannot see or approve a request or attach a foreign child',async()=>{
  const code=await issue();await as(parent);await reject('select public.claim_parent_link($1,$2)',[code,foreignChild],'42501');const request=await claim(code);
  await as(other);expect((await db.query('select * from public.parent_connection_requests')).rows).toHaveLength(0);expect((await db.query('select * from public.get_coach_parent_requests($1)',[academy])).rows).toHaveLength(0);
  await reject('select public.review_parent_connection_request($1,true)',[request],'42501');await reject('select public.cancel_parent_connection_request($1)',[request],'42501');
});
it('pending claims can be cancelled but cannot hide through child archive; student archive cancels requests',async()=>{
  const code=await issue();await as(parent);const request=await claim(code);await reject('update public.family_children set archived_at=now() where id=$1',[child],'22023');
  await db.query('select public.cancel_parent_connection_request($1)',[request]);await as(coach);await reject('select public.review_parent_connection_request($1,true)',[request],'22023');
  const next=await issue();await as(parent);const fresh=await claim(next);await as(coach);await db.query('select public.archive_student($1)',[student]);
  await reject('select public.review_parent_connection_request($1,true)',[fresh],'22023');
});
it('same-login testing still requires the separate coach approval; no self-approval bypass is inferred from login',async()=>{
  const ownFamily=id(63),ownChild=id(74);await as(coach);
  await db.query("insert into public.parent_families(id,owner_id,parent_name,name) values($1,$2,'Coach Parent','Test family')",[ownFamily,coach]);await db.query("insert into public.family_children(id,family_id,name) values($1,$2,'Test child')",[ownChild,ownFamily]);
  await queue();const code=await issue('coach@example.test');const request=await claim(code,ownChild);
  expect((await db.query('select * from public.parent_feedback_feed')).rows).toHaveLength(0);await approve(request);
  expect((await db.query('select * from public.parent_feedback_feed')).rows).toHaveLength(1);
});
it('old unbound RPC and anonymous clients cannot create invitations or requests',async()=>{
  await as(coach);await reject('select public.issue_parent_link_invite($1,$2)',[academy,student],'42501');
  await db.exec('reset role;set role anon');await reject('select * from public.parent_connection_requests',[],'42501');
  await reject('select public.get_parent_connection_requests()',[],'42501');
});
it('reapplying the exact owner update preserves newly approved links and their feedback',async()=>{
  await queue();const code=await issue();await as(parent);const request=await claim(code);await approve(request);
  await db.exec('reset role');let sql=readFileSync('supabase/update_014.sql','utf8').replace(/^begin;$/m,'').replace(/^commit;$/m,'');await db.exec(sql);await as(parent);
  expect((await db.query('select * from public.parent_feedback_feed')).rows).toHaveLength(1);
});
it('NULL is not an approval decision and releases no access',async()=>{
  await queue();const code=await issue();await as(parent);const request=await claim(code);await as(coach);
  await reject('select public.review_parent_connection_request($1,null)',[request],'22023');await as(parent);
  expect((await db.query('select * from public.parent_feedback_feed')).rows).toHaveLength(0);expect((await db.query('select * from public.get_parent_coach_connections()')).rows).toHaveLength(0);
});
it('both verified families can read approved group media; either withdrawal revokes it for both',async()=>{
  const code=await issue();await as(parent);const first=await claim(code);const linkA=await approve(first);
  const codeB=(await db.query<{code:string}>('select public.issue_parent_link_invite($1,$2,$3) as code',[academy,outsider,'other@example.test'])).rows[0].code;
  await as(other);const second=await claim(codeB,foreignChild);const linkB=await approve(second);
  await as(parent);await db.query('select public.parent_media_permission($1,true,true,true)',[linkA]);await as(other);await db.query('select public.parent_media_permission($1,true,true,true)',[linkB]);
  await db.exec('reset role');await db.query("insert into public.enrolments(academy_id,student_id,batch_id,starts_on) values($1,$2,$3,'2020-01-01')",[academy,outsider,batch]);
  await db.query('insert into public.observation_recipients(academy_id,observation_id,batch_id,student_id) values($1,$2,$3,$4)',[academy,note,batch,outsider]);await as(coach);
  const path=(await db.query<{path:string}>("select public.prepare_class_media($1,$2,$3,$4::uuid[],'photo','image/jpeg',1024) as path",[academy,session,media,[student,outsider]])).rows[0].path;
  await db.query("insert into storage.objects(bucket_id,name,metadata) values('parentplus-class-media',$1,'{\"size\":1024,\"mimetype\":\"image/jpeg\"}')",[path]);await db.query('select public.finish_class_media($1,$2)',[academy,media]);
  await db.query('select public.queue_parent_feedback($1,$2,1,$3,$4::uuid[],$5::uuid[])',[academy,note,id(99),[student,outsider],[media]]);
  for(const who of [parent,other]){await as(who);expect((await db.query('select id from storage.objects where name=$1',[path])).rows).toHaveLength(1);}
  await as(parent);await db.query('select public.parent_media_permission($1,false,false,false)',[linkA]);
  for(const who of [parent,other]){await as(who);expect((await db.query('select id from storage.objects where name=$1',[path])).rows).toHaveLength(0);}
});
it('upgrade revokes old unbound links/invitations and stale shared copies without deleting teaching notes',async()=>{
  await db.exec('reset role');await db.exec('alter table public.parent_coach_links drop constraint parent_link_approval_required');
  await db.query('insert into public.parent_coach_links(academy_id,student_id,family_id,child_id,parent_user_id) values($1,$2,$3,$4,$5)',[academy,student,family,child,parent]);
  const old='a'.repeat(64);await db.query("insert into coach_private.parent_link_invites(academy_id,student_id,code_hash,created_by) values($1,$2,encode(sha256(convert_to($3,'UTF8')),'hex'),$4)",[academy,student,old,coach]);
  await queue();await db.exec('reset role');await db.exec(readFileSync('supabase/update_014.sql','utf8').replace(/^begin;$/m,'').replace(/^commit;$/m,''));
  await as(parent);expect((await db.query('select * from public.parent_feedback_feed')).rows).toHaveLength(0);expect((await db.query('select * from public.get_parent_coach_connections()')).rows).toHaveLength(0);
  await reject('select public.preview_parent_link($1)',[old],'22023');await as(coach);expect((await db.query('select id from public.observations')).rows).toHaveLength(1);
  expect((await db.query<{state:string}>('select state from public.parent_feedback_handoffs')).rows[0].state).toBe('cancelled');
});
it('disconnect cannot be reversed by replaying an old approval or claimed invitation',async()=>{
  await queue();const code=await issue();await as(parent);const request=await claim(code);const linked=await approve(request);await as(parent);await db.query('select public.disconnect_parent_link($1)',[linked]);
  await reject('select public.claim_parent_link($1,$2)',[code,child],'22023');await as(coach);await reject('select public.review_parent_connection_request($1,true)',[request],'22023');
});
