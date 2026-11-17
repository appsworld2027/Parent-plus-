import type {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import {afterAll,afterEach,beforeAll,beforeEach,expect,it} from 'vitest';
import {supabaseDatabase} from './support/supabaseDatabase';
const id=(n:number)=>`00000000-0000-0000-0000-${String(n).padStart(12,'0')}`;
const [owner,other,guardian,unused,a,b,studentA,studentB,batchA,batchB,session,note,family,child]=[1,2,3,4,11,12,21,22,31,32,41,51,61,71].map(id);
const candidate=readFileSync('supabase/candidates/202611170015_workspace_foundation.sql','utf8');
const body=candidate.replace(/^begin;$/m,'').replace(/^commit;$/m,'');
const tables=[...candidate.matchAll(/create table if not exists coach_private\.([a-z_]+)/g)].map(match=>match[1]);
let db:PGlite;let baseline:unknown[];
async function as(user:string){await db.exec(`reset role;set request.jwt.claim.sub='${user}';set role authenticated`);}
async function denied(sql:string,args:unknown[],code:string){await db.exec('savepoint attempt');try{await expect(db.query(sql,args)).rejects.toMatchObject({code});}finally{await db.exec('rollback to savepoint attempt;release savepoint attempt');}}
async function member(workspace:string,user=owner){return(await db.query<{id:string}>("insert into coach_private.workspace_memberships(workspace_id,user_id,status,source,accepted_at) values($1,$2,'active','accepted_invitation',now()) returning id",[workspace,user])).rows[0].id;}
async function ownerMember(workspace=a){return(await db.query<{id:string}>('select id from coach_private.workspace_memberships where workspace_id=$1 and source=\'legacy_ownership\'',[workspace])).rows[0].id;}
beforeAll(async()=>{
 db=await supabaseDatabase();
 await db.query("insert into auth.users(id,email,email_confirmed_at) values($1,'owner@example.test',now()),($2,'other@example.test',now()),($3,'guardian@example.test',now()),($4,'unused@example.test',now())",[owner,other,guardian,unused]);
 await db.query("insert into public.academies(id,owner_id,name) values($1,$2,'Academy A'),($3,$4,'Academy B')",[a,owner,b,other]);
 await db.query("insert into public.students(id,academy_id,name) values($1,$2,'Student A'),($3,$4,'Student B')",[studentA,a,studentB,b]);
 await db.query("insert into public.batches(id,academy_id,name) values($1,$2,'Batch A'),($3,$4,'Batch B')",[batchA,a,batchB,b]);
 await db.query("insert into public.enrolments(academy_id,student_id,batch_id,starts_on) values($1,$2,$3,'2020-01-01')",[a,studentA,batchA]);
 await db.query("insert into public.class_sessions(id,academy_id,batch_id,starts_at,ends_at) values($1,$2,$3,'2026-11-17T10:00Z','2026-11-17T11:00Z')",[session,a,batchA]);
 await db.query("insert into public.observations(id,academy_id,batch_id,session_id,author_id,note,status,revision,recorded_at) values($1,$2,$3,$4,$5,'Known recorded author, unknown historical teacher','recorded',1,now())",[note,a,batchA,session,owner]);
 await db.query('insert into public.observation_recipients(academy_id,observation_id,batch_id,student_id) values($1,$2,$3,$4)',[a,note,batchA,studentA]);
 await db.query("insert into public.parent_families(id,owner_id,parent_name,name) values($1,$2,'Guardian','Private family')",[family,guardian]);
 await db.query("insert into public.family_children(id,family_id,name) values($1,$2,'Private child')",[child,family]);
 await as(owner);await db.query('select public.queue_parent_feedback($1,$2,1,$3,$4::uuid[],\'{}\')',[a,note,id(81),[studentA]]);
 const code=(await db.query<{code:string}>('select public.issue_parent_link_invite($1,$2,$3) as code',[a,studentA,'guardian@example.test'])).rows[0].code;
 await as(guardian);const request=(await db.query<{id:string}>('select public.claim_parent_link($1,$2) as id',[code,child])).rows[0].id;
 await as(owner);await db.query('select public.review_parent_connection_request($1,true)',[request]);await db.exec('reset role');
 baseline=(await db.query('select row_to_json(c) as value from public.class_sessions c')).rows;
 await db.exec(candidate);await db.exec(candidate);
},30000);
beforeEach(async()=>{await db.exec('begin;reset role');});afterEach(async()=>{await db.exec('rollback;reset role');});afterAll(async()=>{await db?.close();});
it('backfills stable academy/resource IDs once without fabricating coaches, assignments or historical teachers',async()=>{
 expect((await db.query('select academy_id,workspace_id from coach_private.academy_workspace_links order by academy_id')).rows).toEqual([{academy_id:a,workspace_id:a},{academy_id:b,workspace_id:b}]);
 expect((await db.query('select row_to_json(c) as value from public.class_sessions c')).rows).toEqual(baseline);
 expect((await db.query('select * from coach_private.coach_identities')).rows).toHaveLength(0);
 expect((await db.query('select * from coach_private.workspace_teaching_assignments')).rows).toHaveLength(0);
 expect((await db.query<{role_code:string}>('select role_code from coach_private.workspace_role_grants')).rows.map(row=>row.role_code)).toEqual(['owner','owner']);
 expect((await db.query('select * from coach_private.workspace_audit_events')).rows).toHaveLength(2);
 expect((await db.query<{author_id:string}>('select author_id from public.observations where id=$1',[note])).rows[0].author_id).toBe(owner);
});
it('keeps the current014 guardian link, reviewed feed and original academy isolation intact',async()=>{
 await as(guardian);expect((await db.query('select child_id from public.parent_feedback_feed')).rows).toEqual([{child_id:child}]);
 await as(owner);expect((await db.query('select id from public.students order by id')).rows).toEqual([{id:studentA}]);expect((await db.query('select * from public.parent_families')).rows).toHaveLength(0);
});
it('creates no production015 marker or public API and keeps all candidate tables RLS-enabled and inaccessible to clients',async()=>{
 expect((await db.query("select version from coach_private.schema_migrations where version>'202611160014'")).rows).toHaveLength(0);
 const rows=(await db.query<{relrowsecurity:boolean}>('select c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname=\'coach_private\' and c.relname=any($1::text[])',[tables])).rows;
 expect(rows).toHaveLength(tables.length);expect(rows.every(row=>row.relrowsecurity)).toBe(true);
 for(const role of ['authenticated','anon','service_role']){
  await db.exec(`reset role;set role ${role}`);
  for(const table of tables)await denied(`select * from coach_private.${table}`,[],'42501');
 }
});
it('does not silently widen existing runtime access when a second academy membership is staged',async()=>{
 await member(b,owner);await as(owner);
 expect((await db.query('select id from public.academies')).rows).toEqual([{id:a}]);expect((await db.query('select id from public.students')).rows).toEqual([{id:studentA}]);
 await denied('insert into coach_private.workspace_memberships(workspace_id,user_id,status,source,accepted_at) values($1,$2,\'active\',\'accepted_invitation\',now())',[b,owner],'42501');
});
it('can represent a separate independent practice and several accepted affiliations without a fake academy',async()=>{
 const privateWorkspace=id(110);await db.query("insert into coach_private.teaching_workspaces(id,kind,name) values($1,'independent','Private practice')",[privateWorkspace]);
 await db.query('insert into coach_private.personal_workspace_accounts(user_id,workspace_id) values($1,$2)',[owner,privateWorkspace]);
 await member(privateWorkspace);await member(b);expect((await db.query('select * from coach_private.workspace_memberships where user_id=$1',[owner])).rows).toHaveLength(3);
 expect((await db.query('select * from public.academies')).rows).toHaveLength(2);
 await denied('insert into coach_private.personal_workspace_accounts(user_id,workspace_id) values($1,$2)',[guardian,a],'23503');
});
it('rejects duplicate current memberships while allowing a new period after revocation',async()=>{
 await denied("insert into coach_private.workspace_memberships(workspace_id,user_id,status,source,accepted_at) values($1,$2,'active','accepted_invitation',now())",[a,owner],'23505');
 await db.query("update coach_private.workspace_memberships set status='revoked',ended_at=now() where workspace_id=$1 and user_id=$2",[a,owner]);
 await member(a);expect((await db.query('select * from coach_private.workspace_memberships where workspace_id=$1 and user_id=$2',[a,owner])).rows).toHaveLength(2);
});
it('enforces acceptance state and time intervals',async()=>{
 await denied("insert into coach_private.workspace_memberships(workspace_id,user_id,status,source) values($1,$2,'active','accepted_invitation')",[a,unused],'23514');
 await denied("insert into coach_private.workspace_memberships(workspace_id,user_id,status,source,accepted_at) values($1,$2,'pending','accepted_invitation',now())",[a,unused],'23514');
 await denied("insert into coach_private.workspace_memberships(workspace_id,user_id,status,source,effective_from,valid_until) values($1,$2,'pending','accepted_invitation',now(),now()-interval '1 second')",[a,unused],'23514');
});
it('prevents cross-workspace role, branch and resource association even for trusted inserts',async()=>{
 const m=await ownerMember();const branch=(await db.query<{id:string}>("insert into coach_private.workspace_branches(workspace_id,name) values($1,'Branch B') returning id",[b])).rows[0].id;
 await denied("insert into coach_private.workspace_role_grants(workspace_id,membership_id,role_code,scope,source) values($1,$2,'instructor','workspace','explicit_grant')",[b,m],'23503');
 await denied("insert into coach_private.workspace_role_grants(workspace_id,membership_id,branch_id,role_code,scope,source) values($1,$2,$3,'instructor','branch','explicit_grant')",[a,m,branch],'23503');
 await denied('insert into coach_private.workspace_batch_links(batch_id,academy_id,workspace_id) values($1,$2,$3)',[id(999),a,b],'23503');
 await denied("insert into coach_private.workspace_capability_grants(workspace_id,membership_id,capability) values($1,$2,'staff.manage')",[b,m],'23503');
});
it('keeps ownership global to its workspace, branch managers scoped and roles typed',async()=>{
 const m=await ownerMember();const branch=(await db.query<{id:string}>("insert into coach_private.workspace_branches(workspace_id,name) values($1,'A branch') returning id",[a])).rows[0].id;
 for(const role of ['owner','admin'])await denied("insert into coach_private.workspace_role_grants(workspace_id,membership_id,branch_id,role_code,scope,source) values($1,$2,$3,$4,'branch','explicit_grant')",[a,m,branch,role],'23514');
 await denied("insert into coach_private.workspace_role_grants(workspace_id,membership_id,role_code,scope,source) values($1,$2,'branch_manager','workspace','explicit_grant')",[a,m],'23514');
 await denied("insert into coach_private.workspace_role_grants(workspace_id,membership_id,role_code,scope,source) values($1,$2,'global_super_admin','workspace','explicit_grant')",[a,m],'23514');
});
it('represents co-teaching/substitution with distinct access and teaching windows; rejects mixed or foreign targets',async()=>{
 const m=await ownerMember();
 for(const role of ['lead','co_instructor','substitute'])await db.query("insert into coach_private.workspace_teaching_assignments(workspace_id,membership_id,session_id,teaching_role,teaches_from,teaches_until,access_from,feedback_write_until) values($1,$2,$3,$4,'2026-11-17T10:00Z','2026-11-17T11:00Z','2026-11-17T09:00Z','2026-11-18T11:00Z')",[a,m,session,role]);
 expect((await db.query('select * from coach_private.workspace_teaching_assignments')).rows).toHaveLength(3);
 await denied("insert into coach_private.workspace_teaching_assignments(workspace_id,membership_id,batch_id,session_id,teaching_role,teaches_from,access_from) values($1,$2,$3,$4,'lead',now(),now())",[a,m,batchA,session],'23514');
 await denied("insert into coach_private.workspace_teaching_assignments(workspace_id,membership_id,batch_id,teaching_role,teaches_from,access_from) values($1,$2,$3,'lead',now(),now())",[a,m,batchB],'23503');
});
it('requires explicit bounded history grants for a same-workspace student',async()=>{
 const m=await ownerMember();
 await denied("insert into coach_private.workspace_history_grants(workspace_id,membership_id,student_id,recorded_from,recorded_until,expires_at,allow_feedback) values($1,$2,$3,'2026-01-01','2026-11-17',now()+interval '1 day',true)",[a,m,studentB],'23503');
 await denied("insert into coach_private.workspace_history_grants(workspace_id,membership_id,student_id,recorded_from,recorded_until,expires_at) values($1,$2,$3,'2026-01-01','2026-11-17',now()+interval '1 day')",[a,m,studentA],'23514');
 await db.query("insert into coach_private.workspace_history_grants(workspace_id,membership_id,student_id,recorded_from,recorded_until,expires_at,allow_feedback) values($1,$2,$3,'2026-01-01','2026-11-17',now()+interval '1 day',true)",[a,m,studentA]);
});
it('binds accepted invitation membership/account and proposed branch to the invitation workspace',async()=>{
 const m=await ownerMember();const otherM=await ownerMember(b);
 await denied("insert into coach_private.workspace_invites(workspace_id,issuer_membership_id,token_hash,intended_email,expires_at) values($1,$2,$3,'guardian@example.test',now()+interval '1 day')",[a,otherM,'a'.repeat(64)],'23503');
 await denied("insert into coach_private.workspace_invites(workspace_id,issuer_membership_id,token_hash,intended_email,state,expires_at,accepted_at,accepted_by,accepted_membership_id) values($1,$2,$3,'guardian@example.test','accepted',now()+interval '1 day',now(),$4,$5)",[a,m,'b'.repeat(64),other,m],'23503');
 const invite=(await db.query<{id:string}>("insert into coach_private.workspace_invites(workspace_id,issuer_membership_id,token_hash,intended_email,expires_at) values($1,$2,$3,'guardian@example.test',now()+interval '1 day') returning id",[a,m,'c'.repeat(64)])).rows[0].id;
 await denied("insert into coach_private.workspace_invite_roles(invite_id,workspace_id,role_code) values($1,$2,'instructor')",[invite,b],'23503');
});
it('preserves append-only audit with actor-to-membership consistency and no fabricated migration actor',async()=>{
 await denied("update coach_private.workspace_audit_events set event_kind='membership_revoked'",[],'42501');await denied('delete from coach_private.workspace_audit_events',[],'42501');
 const m=await ownerMember();await denied("insert into coach_private.workspace_audit_events(workspace_id,actor_user_id,actor_membership_id,subject_membership_id,event_kind,source) values($1,$2,$3,$4,'membership_revoked','actor_action')",[a,other,m,m],'23503');
 const events=(await db.query<{actor_user_id:string|null;actor_membership_id:string|null}>('select actor_user_id,actor_membership_id from coach_private.workspace_audit_events')).rows;
 expect(events.every(event=>event.actor_user_id===null&&event.actor_membership_id===null)).toBe(true);
});
it('reruns without reactivating revoked staged legacy authority or duplicating audit',async()=>{
 await db.query("update coach_private.workspace_memberships set status='revoked',ended_at=now() where workspace_id=$1",[a]);
 await db.query('update coach_private.workspace_role_grants set revoked_at=now() where workspace_id=$1',[a]);await db.exec(body);
 expect((await db.query<{status:string}>('select status from coach_private.workspace_memberships where workspace_id=$1',[a])).rows).toEqual([{status:'revoked'}]);
 expect((await db.query('select * from coach_private.workspace_role_grants where workspace_id=$1 and revoked_at is null',[a])).rows).toHaveLength(0);
 expect((await db.query('select * from coach_private.workspace_audit_events')).rows).toHaveLength(2);
});
it('stops on ownership drift rather than silently granting a different legacy user',async()=>{
 await db.query('update public.academies set owner_id=$1 where id=$2',[unused,a]);await db.exec('savepoint unsafe_rerun');
 try{await expect(db.exec(body)).rejects.toThrow('Legacy ownership changed');}finally{await db.exec('rollback to savepoint unsafe_rerun;release savepoint unsafe_rerun');}
 expect((await db.query('select * from coach_private.workspace_memberships where user_id=$1',[unused])).rows).toHaveLength(0);
});
it('rejects audit subjects from another workspace and mismatched event/subject types',async()=>{
 const m=await ownerMember();const foreign=await ownerMember(b);
 await denied("insert into coach_private.workspace_audit_events(workspace_id,actor_user_id,actor_membership_id,subject_membership_id,event_kind,source) values($1,$2,$3,$4,'membership_revoked','actor_action')",[a,owner,m,foreign],'23503');
 await denied("insert into coach_private.workspace_audit_events(workspace_id,actor_user_id,actor_membership_id,subject_membership_id,event_kind,source) values($1,$2,$3,$4,'role_changed','actor_action')",[a,owner,m,m],'23514');
 await denied("insert into coach_private.workspace_audit_events(workspace_id,subject_membership_id,event_kind,source) values($1,$2,'membership_revoked','legacy_migration')",[a,m],'23514');
});
it.each(['table','empty_marker','function','index'])('stops before adopting untracked candidate %s objects',async(kind)=>{
 const separate=await supabaseDatabase();
 try{
  if(kind==='table')await separate.exec('create table coach_private.workspace_invites(unrelated text)');
  if(kind==='empty_marker')await separate.exec('create table coach_private.workspace_foundation_revisions(version text primary key)');
  if(kind==='function')await separate.exec("create function coach_private.workspace_audit_immutable() returns trigger language plpgsql as $$begin return new;end$$");
  if(kind==='index')await separate.exec('create table coach_private.unrelated(id uuid);create index workspace_assignment_member on coach_private.unrelated(id)');
  await expect(separate.exec(candidate)).rejects.toThrow('Untracked workspace foundation objects');await separate.exec('rollback');
  expect((await separate.query("select to_regclass('coach_private.teaching_workspaces') as value")).rows).toEqual([{value:null}]);
 }finally{await separate.close();}
},30000);
