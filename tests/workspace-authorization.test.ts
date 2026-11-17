import type {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import {afterAll,afterEach,beforeAll,beforeEach,expect,it} from 'vitest';
import {supabaseDatabase} from './support/supabaseDatabase';
const id=(n:number)=>`00000000-0000-0000-0000-${String(n).padStart(12,'0')}`;
const candidate=readFileSync('supabase/candidates/202611170016_workspace_authorization.sql','utf8');
const functions=[...candidate.matchAll(/create or replace function coach_private\.([a-z_]+)/g)].map(m=>m[1]);
let db:PGlite;
async function actor(n:number){await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id(n)]);}
async function result(fn:string,args:unknown[]=[]){return(await db.query<{value:boolean|null}>(`select coach_private.${fn}(${args.map((_,i)=>`$${i+1}`).join(',')}) as value`,args)).rows[0].value;}
const classAccess=(session=41,operation='feedback.write',workspace=11)=>result('workspace_class_access',[id(workspace),id(session),operation]);
const feedbackAccess=(note=51,operation='read')=>result('workspace_feedback_access',[id(11),id(note),operation]);
async function denied(sql:string,args:unknown[]=[]){
 await db.exec('savepoint attempt');
 try{await expect(db.query(sql,args)).rejects.toMatchObject({code:'42501'});}finally{await db.exec('rollback to savepoint attempt;release savepoint attempt');}
}
async function history(student=21,mediaOnly=false){
 await db.query(`insert into coach_private.workspace_capability_grants(workspace_id,membership_id,capability)
  select $1,$2,'history.read' where not exists(select 1 from coach_private.workspace_capability_grants where membership_id=$2 and capability='history.read')`,[id(11),id(73)]);
 await db.query(`insert into coach_private.workspace_history_grants(workspace_id,membership_id,student_id,recorded_from,recorded_until,expires_at,allow_feedback,allow_media)
  values($1,$2,$3,now()-interval '31 days',now()-interval '29 days',now()+interval '1 hour',$4,$5)`,[id(11),id(73),id(student),!mediaOnly,mediaOnly]);
}
beforeAll(async()=>{
 db=await supabaseDatabase();
 await db.exec(readFileSync('tests/fixtures/workspace-authorization.sql','utf8'));
 await db.exec(readFileSync('supabase/candidates/202611170015_workspace_foundation.sql','utf8'));
 await db.exec(candidate);await db.exec(readFileSync('tests/fixtures/workspace-authority.sql','utf8'));await db.exec(candidate);
},30000);
beforeEach(async()=>{await db.exec('begin;reset role');await actor(3);});
afterEach(async()=>{await db.exec('rollback;reset role');});afterAll(async()=>{await db?.close();});

it('allows an explicitly assigned instructor, but ownership alone only permits class management',async()=>{
 expect(await classAccess()).toBe(true);expect(await classAccess(41,'attendance.write')).toBe(true);
 await actor(1);expect(await classAccess(41,'manage')).toBe(true);expect(await classAccess(41,'roster.read')).toBe(true);expect(await classAccess()).toBe(false);
 await actor(8);expect(await classAccess()).toBe(false);
});
it.each([
 ['unverified','email_confirmed_at=null'],['future verification',"email_confirmed_at=now()+interval '1 hour'"],
 ['banned',"banned_until=now()+interval '1 hour'"],['deleted','deleted_at=now()'],['anonymous','is_anonymous=true'],['missing email',"email='  '"],
])('rejects a currently %s account despite the unchanged identity claim',async(_label,change)=>{
 await db.exec(`update auth.users set ${change} where id='${id(3)}'`);
 expect(await result('workspace_actor_eligible')).toBe(false);expect(await classAccess()).toBe(false);
 expect((await db.query('select * from coach_private.workspace_own_contexts()')).rows).toHaveLength(0);
 await denied('select coach_private.workspace_assert_class_write($1,$2,\'feedback.write\')',[id(11),id(41)]);
});
it('allows an expired ban and denies an absent account',async()=>{
 await db.query("update auth.users set banned_until=now()-interval '1 second' where id=$1",[id(3)]);expect(await classAccess()).toBe(true);
 await actor(999);expect(await classAccess()).toBe(false);
});
it.each(['pending','suspended','left','revoked','expired'])('does not accept %s membership or a stale token',async status=>{
 await db.query(`update coach_private.workspace_memberships set status=$1,accepted_at=case when $1='pending' then null else accepted_at end,
  ended_at=case when $1 in ('left','revoked','expired') then now() else null end where id=$2`,[status,id(73)]);
 expect(await classAccess()).toBe(false);expect(await feedbackAccess()).toBe(false);
});
it.each([
 "effective_from=now()+interval '1 hour'","valid_until=now()-interval '1 second'","accepted_at=now()+interval '1 hour'",
])('checks current membership time: %s',async change=>{
 await db.exec(`update coach_private.workspace_memberships set ${change} where id='${id(73)}'`);expect(await classAccess()).toBe(false);
});
it('requires current role and Coach identity as well as an assignment',async()=>{
 await db.exec(`delete from coach_private.coach_identities where user_id='${id(3)}'`);expect(await classAccess()).toBe(false);
 await db.exec(`insert into coach_private.coach_identities values('${id(3)}','Teacher',now());update coach_private.workspace_role_grants set revoked_at=clock_timestamp() where membership_id='${id(73)}'`);
 expect(await classAccess()).toBe(false);expect(await feedbackAccess(51,'edit')).toBe(false);
});
it.each(["valid_from=now()+interval '1 hour'","valid_from=now()-interval '1 day',valid_until=now()-interval '1 second'"])('checks role dates: %s',async change=>{
 await db.exec(`update coach_private.workspace_role_grants set ${change} where membership_id='${id(73)}'`);expect(await classAccess()).toBe(false);
});
it('keeps branch roles in their exact branch and never turns a missing branch into a wildcard',async()=>{
 await db.exec(`update coach_private.workspace_role_grants set role_code='branch_manager',scope='branch',branch_id='${id(61)}' where membership_id='${id(73)}'`);
 expect(await classAccess(41,'manage')).toBe(true);expect(await classAccess(43,'manage')).toBe(false);expect(await classAccess()).toBe(false);
 await db.exec(`delete from coach_private.workspace_batch_branches where batch_id='${id(31)}'`);expect(await classAccess(41,'manage')).toBe(false);
});
it('does not combine foreign branches, workspace IDs, or client role claims',async()=>{
 expect(await classAccess(44,'manage',11)).toBe(false);expect(await classAccess(41,'manage',12)).toBe(false);
 expect(await result('workspace_has_role',[id(11),'instructor',id(63)])).toBe(false);
 await db.exec(`set request.jwt.claim.role='owner';set request.jwt.claim.workspace_id='${id(12)}'`);
 expect(await classAccess(44,'feedback.write',12)).toBe(false);expect(await classAccess(41,'manage')).toBe(false);
});
it('honours assignment teaching/access/write windows without inheriting prior classes',async()=>{
 expect(await classAccess(42)).toBe(false);expect(await classAccess(43)).toBe(false);
 await db.exec(`update coach_private.workspace_teaching_assignments set feedback_write_until=now()-interval '1 second' where id='${id(81)}'`);
 expect(await classAccess()).toBe(false);expect(await classAccess(41,'roster.read')).toBe(true);
 await db.exec(`update coach_private.workspace_teaching_assignments set access_until=now()-interval '1 second' where id='${id(81)}'`);
 expect(await classAccess(41,'roster.read')).toBe(false);
});
it('a substitute gets only the assigned class, no previous drafts/history or finance',async()=>{
 await actor(4);expect(await classAccess()).toBe(true);expect(await classAccess(42)).toBe(false);expect(await classAccess(43)).toBe(false);
 expect(await feedbackAccess(51)).toBe(false);expect(await feedbackAccess(52)).toBe(false);expect(await feedbackAccess(53)).toBe(false);
 expect(await result('workspace_finance_access',[id(11)])).toBe(false);
});
it.each(['cancelled','archived batch','archived branch'])('rejects teaching writes for a %s resource',async state=>{
 if(state==='cancelled')await db.exec(`update public.class_sessions set status='cancelled' where id='${id(41)}'`);
 else if(state==='archived batch')await db.exec(`update public.batches set archived_at=now() where id='${id(31)}'`);
 else await db.exec(`update coach_private.workspace_branches set archived_at=now() where id='${id(61)}'`);
 expect(await classAccess()).toBe(false);
});
it('permits own current membership feedback edits while preserving other/legacy author boundaries',async()=>{
 expect(await feedbackAccess(51,'edit')).toBe(true);expect(await feedbackAccess(52,'edit')).toBe(false);expect(await feedbackAccess(55,'edit')).toBe(false);
 await actor(1);expect(await feedbackAccess(51,'edit')).toBe(false);expect(await feedbackAccess(51,'correct')).toBe(true);
});
it('ends own working-note access when the assignment access window closes; history needs a separate grant',async()=>{
 expect(await feedbackAccess(51)).toBe(true);
 await db.exec(`update coach_private.workspace_teaching_assignments set access_until=now()-interval '1 second' where id='${id(81)}'`);
 expect(await feedbackAccess(51)).toBe(false);expect(await feedbackAccess(51,'edit')).toBe(false);
 await history();await db.exec("update coach_private.workspace_history_grants set recorded_from=now()-interval '2 hours',recorded_until=now()");
 expect(await feedbackAccess(51)).toBe(true);expect(await feedbackAccess(51,'edit')).toBe(false);
});
it('does not give a rehire authority over records from their previous membership period',async()=>{
 await db.exec(`update coach_private.workspace_memberships set status='left',ended_at=now() where id='${id(73)}';
 insert into coach_private.workspace_memberships(id,workspace_id,user_id,status,source,accepted_at) values('${id(173)}','${id(11)}','${id(3)}','active','accepted_invitation',now());
 insert into coach_private.workspace_role_grants(workspace_id,membership_id,role_code,scope,source) values('${id(11)}','${id(173)}','instructor','workspace','explicit_grant');
 insert into coach_private.workspace_teaching_assignments(workspace_id,membership_id,session_id,teaching_role,teaches_from,access_from) values('${id(11)}','${id(173)}','${id(41)}','lead',now()-interval '2 hours',now())`);
 expect(await classAccess()).toBe(true);expect(await feedbackAccess(51)).toBe(false);expect(await feedbackAccess(51,'edit')).toBe(false);
});
it('requires explicit capability plus dated feedback history grants, never drafts or media-only grants',async()=>{
 expect(await feedbackAccess(52)).toBe(false);await history(21,true);expect(await feedbackAccess(52)).toBe(false);
 await db.exec('delete from coach_private.workspace_history_grants');await history();expect(await feedbackAccess(52)).toBe(true);expect(await feedbackAccess(53)).toBe(false);
 await db.exec(`update coach_private.workspace_capability_grants set revoked_at=clock_timestamp() where membership_id='${id(73)}'`);expect(await feedbackAccess(52)).toBe(false);
});
it('requires history grants for every child mentioned by a group note',async()=>{
 await history(21);expect(await feedbackAccess(54)).toBe(false);await history(22);expect(await feedbackAccess(54)).toBe(true);
 await db.exec(`update coach_private.workspace_history_grants set expires_at=now()-interval '1 second' where student_id='${id(22)}'`);expect(await feedbackAccess(54)).toBe(false);
});
it('checks history date boundaries, grant revocation and archived branch',async()=>{
 await history();await db.exec("update coach_private.workspace_history_grants set recorded_until=now()-interval '30 days'-interval '1 second'");expect(await feedbackAccess(52)).toBe(false);
 await db.exec("update coach_private.workspace_history_grants set recorded_until=now()-interval '29 days',revoked_at=now()");expect(await feedbackAccess(52)).toBe(false);
 await db.exec(`update coach_private.workspace_history_grants set revoked_at=null;update coach_private.workspace_branches set archived_at=now() where id='${id(61)}'`);expect(await feedbackAccess(52)).toBe(false);
});
it('limits correction capabilities by branch and expiry; does not turn them into an editing API',async()=>{
 await db.exec(`insert into coach_private.workspace_capability_grants(workspace_id,membership_id,branch_id,capability) values('${id(11)}','${id(73)}','${id(62)}','feedback.correct')`);
 expect(await feedbackAccess(52,'correct')).toBe(false);
 await db.exec(`update coach_private.workspace_capability_grants set branch_id='${id(61)}'`);expect(await feedbackAccess(52,'correct')).toBe(true);
  expect(await feedbackAccess(53,'correct')).toBe(false);
 expect(await feedbackAccess(52,'edit')).toBe(false);
 await db.exec("update coach_private.workspace_capability_grants set valid_until=now()-interval '1 second',valid_from=now()-interval '1 day'");expect(await feedbackAccess(52,'correct')).toBe(false);
});
it('separates finance from teaching and respects finance branch scope',async()=>{
 await actor(5);expect(await result('workspace_finance_access',[id(11)])).toBe(true);expect(await classAccess()).toBe(false);expect(await feedbackAccess(52)).toBe(false);
 await db.exec(`update coach_private.workspace_role_grants set scope='branch',branch_id='${id(61)}' where membership_id='${id(75)}'`);
 expect(await result('workspace_finance_access',[id(11)])).toBe(false);expect(await result('workspace_finance_access',[id(11),id(61)])).toBe(true);
 expect(await result('workspace_finance_access',[id(11),id(62)])).toBe(false);
});
it('returns only the actor’s own accepted contexts without staff, family or other employment details',async()=>{
 const rows=(await db.query('select * from coach_private.workspace_own_contexts()')).rows;
 expect(rows).toEqual([{workspace_id:id(11),kind:'academy',name:'Academy A',membership_id:id(73)},{workspace_id:id(13),kind:'independent',name:'Private practice',membership_id:id(83)}]);
 await actor(1);expect((await db.query('select name from coach_private.workspace_own_contexts()')).rows).toEqual([{name:'Academy A'}]);
 await db.exec('set role authenticated');expect((await db.query('select * from public.parent_families')).rows).toHaveLength(0);
});
it('keeps new decisions private and does not widen the old runtime or expose raw authority tables',async()=>{
 const metadata=(await db.query<{proname:string;prosecdef:boolean;provolatile:string;proconfig:string[];blocked:boolean}>(`select p.proname,p.prosecdef,p.provolatile,p.proconfig,
  not has_function_privilege('authenticated',p.oid,'execute') and not has_function_privilege('anon',p.oid,'execute') and not has_function_privilege('service_role',p.oid,'execute') as blocked
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='coach_private' and p.proname=any($1::text[])`,[functions])).rows;
 expect(metadata).toHaveLength(functions.length);expect(metadata.every(r=>r.prosecdef&&r.provolatile==='v'&&r.blocked&&r.proconfig.includes('search_path=""'))).toBe(true);
 for(const role of ['anon','authenticated','service_role']){
  await db.exec(`reset role;set role ${role}`);
  await denied('select coach_private.workspace_own_contexts()');await denied('select * from coach_private.workspace_feedback_links');
 }
 await db.exec('reset role;set role authenticated');expect((await db.query('select * from public.students')).rows).toHaveLength(0);
 await db.exec('reset role');expect((await db.query("select * from coach_private.schema_migrations where version>'202611160014'")).rows).toHaveLength(0);
});
it('fails closed for unknown actions, absent resources and null operation values',async()=>{
 expect(await classAccess(41,'media.share')).toBe(false);expect(await classAccess(999)).toBe(false);expect(await feedbackAccess(51,'publish')).toBe(false);
 expect(await result('workspace_class_access',[id(11),id(41),null])).toBe(false);
 await denied('select coach_private.workspace_assert_class_write($1,$2,null)',[id(11),id(41)]);
});
it.each(['repeatable read','serializable'])('denies unsupported %s transaction snapshots',async isolation=>{
 await db.exec(`rollback;begin isolation level ${isolation}`);await actor(3);
 expect(await classAccess()).toBe(false);expect(await feedbackAccess()).toBe(false);
 await denied('select coach_private.workspace_assert_class_write($1,$2,\'feedback.write\')',[id(11),id(41)]);
});
it('revokes current membership once, audits the real actor, and cannot restore it by rerunning candidates',async()=>{
 await actor(1);await db.query('select coach_private.workspace_revoke_membership($1,$2)',[id(11),id(73)]);await db.query('select coach_private.workspace_revoke_membership($1,$2)',[id(11),id(73)]);
 expect((await db.query("select actor_user_id,subject_membership_id from coach_private.workspace_audit_events where event_kind='membership_revoked'")).rows).toEqual([{actor_user_id:id(1),subject_membership_id:id(73)}]);
 await actor(3);expect(await classAccess()).toBe(false);expect(await feedbackAccess()).toBe(false);
 await db.exec(candidate.replace(/^begin;$/m,'').replace(/^commit;$/m,''));expect(await classAccess()).toBe(false);
});
it('blocks self-elevation, foreign-target revocation and removal of the last owner',async()=>{
 await denied('select coach_private.workspace_revoke_membership($1,$2)',[id(11),id(78)]);
 await actor(1);await denied('select coach_private.workspace_revoke_membership($1,$2)',[id(11),id(83)]);
 await db.query('select coach_private.workspace_revoke_membership($1,$2)',[id(11),id(78)]);
 const owner=(await db.query<{id:string}>("select id from coach_private.workspace_memberships where user_id=$1 and workspace_id=$2",[id(1),id(11)])).rows[0].id;
 await denied('select coach_private.workspace_revoke_membership($1,$2)',[id(11),owner]);expect(await classAccess(41,'manage')).toBe(true);
});
it('revokes an assignment once while retaining membership and historical authorship',async()=>{
 await actor(1);await db.query('select coach_private.workspace_revoke_assignment($1,$2)',[id(11),id(81)]);await db.query('select coach_private.workspace_revoke_assignment($1,$2)',[id(11),id(81)]);
 expect((await db.query("select * from coach_private.workspace_audit_events where event_kind='assignment_changed'")).rows).toHaveLength(1);
 await actor(3);expect(await result('workspace_active_membership',[id(11)])).toBe(id(73));expect(await classAccess()).toBe(false);
 expect((await db.query('select author_id from public.observations where id=$1',[id(51)])).rows).toEqual([{author_id:id(3)}]);
});
it('does not adopt untracked kernel objects',async()=>{
 await db.exec("delete from coach_private.workspace_foundation_revisions where version='202611170016-f2-kernel-candidate'");
 await db.exec('savepoint attempt');
 try{await expect(db.exec(candidate.replace(/^begin;$/m,'').replace(/^commit;$/m,''))).rejects.toThrow('Untracked F2 kernel objects');}
 finally{await db.exec('rollback to savepoint attempt;release savepoint attempt');}
});
