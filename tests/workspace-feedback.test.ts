import type {PGlite} from '@electric-sql/pglite';
import {existsSync,readFileSync} from 'node:fs';
import {afterAll,afterEach,beforeAll,beforeEach,expect,it} from 'vitest';
import {supabaseDatabase} from './support/supabaseDatabase';
const id=(n:number)=>`00000000-0000-0000-0000-${String(n).padStart(12,'0')}`;
const path='supabase/candidates/202611170020_workspace_feedback.sql';
let db:PGlite;
async function actor(n:number){await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id(n)]);}
async function save(target=1601,revision=0,request=1701,note='Practised careful listening.',status='draft',recipients=[21],session=41,audience='student'){
 return(await db.query<{value:{id:string;revision:number;status:string}}>('select coach_private.workspace_save_class_feedback($1,$2,$3,$4,$5,$6,$7::uuid[],$8,$9) as value',[id(11),id(target),revision,id(request),id(session),audience,recipients.map(id),note,status])).rows[0].value;
}
async function detail(target=1601){return(await db.query<{value:{id:string;note:string;revision:number;status:string;recipients:string[];versions:{revision:number;note:string}[]}}>('select coach_private.workspace_feedback_detail($1,$2) as value',[id(11),id(target)])).rows[0].value;}
async function correct(target=1601,revision=1,request=1801,note='Corrected class feedback.',reason='Corrected a factual mistake.'){
 return(await db.query<{value:{id:string;revision:number;status:string}}>('select coach_private.workspace_correct_feedback($1,$2,$3,$4,$5,$6) as value',[id(11),id(target),revision,id(request),note,reason])).rows[0].value;
}
async function fail(run:()=>Promise<unknown>,code='42501'){
 await db.exec('savepoint denied');try{await expect(run()).rejects.toMatchObject({code});}finally{await db.exec('rollback to savepoint denied;release savepoint denied');}
}
beforeAll(async()=>{
 db=await supabaseDatabase();await db.exec(readFileSync('tests/fixtures/workspace-authorization.sql','utf8'));
 for(const file of ['202611170015_workspace_foundation.sql','202611170016_workspace_authorization.sql'])await db.exec(readFileSync(`supabase/candidates/${file}`,'utf8'));
 await db.exec(readFileSync('tests/fixtures/workspace-authority.sql','utf8'));
 for(const file of ['202611170017_workspace_roster.sql','202611170018_workspace_staff.sql','202611170019_workspace_attendance.sql'])await db.exec(readFileSync(`supabase/candidates/${file}`,'utf8'));
 if(existsSync(path)){await db.exec(readFileSync(path,'utf8'));await db.exec(readFileSync(path,'utf8'));}
},30000);
beforeEach(async()=>{await db.exec('begin;reset role');await actor(3);});afterEach(async()=>{await db.exec('rollback;reset role');});afterAll(async()=>{await db?.close();});

it('creates a teacher-authored class draft, records it and preserves membership attribution',async()=>{
 expect(await save()).toEqual({id:id(1601),revision:1,status:'draft'});
 expect(await save(1601,1,1702,'Practised careful listening.','recorded')).toMatchObject({revision:2,status:'recorded'});
 expect((await db.query('select author_id,updated_by from public.observations where id=$1',[id(1601)])).rows).toEqual([{author_id:id(3),updated_by:id(3)}]);
 expect((await db.query('select author_membership_id,provenance from coach_private.workspace_feedback_links where observation_id=$1',[id(1601)])).rows).toEqual([{author_membership_id:id(73),provenance:'membership_write'}]);
 expect((await detail()).recipients).toEqual([id(21)]);
 expect((await db.query('select * from public.parent_feedback_handoffs')).rows).toHaveLength(0);
});
it.each([1,2,5,6,7,8])('never creates teaching authorship using owner-only/finance/unverified/unrelated actor %s',async n=>{await actor(n);await fail(()=>save());});
it('does not let a co-instructor or manager edit another teacher draft or inherit its authorship',async()=>{
 await save();await actor(4);await fail(()=>save(1601,1,1702,'Changed'));
 await actor(1);await fail(()=>save(1601,1,1702,'Owner changed'));await fail(()=>correct(),'42501');
 expect((await detail()).note).toBe('Practised careful listening.');
});
it('preserves stable receipts and does not undo a newer note when an older response is retried',async()=>{
 await save(1601,0,1701,'First','recorded',[22,21],41,'batch');
 await save(1601,1,1702,'Second','recorded',[21,22],41,'batch');
 expect(await save(1601,0,1701,'First','recorded',[21,22],41,'batch')).toMatchObject({revision:1});
 expect((await detail()).note).toBe('Second');
 await fail(()=>save(1601,0,1701,'Altered','recorded',[21,22],41,'batch'),'22023');
 await fail(()=>save(1601,1,1703,'Stale','recorded',[21,22],41,'batch'),'40001');
});
it.each([{recipients:[23]},{recipients:[21,21]},{recipients:[]}])('rejects foreign, duplicate or empty recorded recipients %j',async({recipients})=>{
 await fail(()=>save(1601,0,1701,'Recorded','recorded',recipients),'22023');
 expect((await db.query('select * from public.observations where id=$1',[id(1601)])).rows).toHaveLength(0);
});
it('denies wrong branch/foreign class and locks recorded context, audience, recipients and status',async()=>{
 await fail(()=>save(1601,0,1701,'Note','draft',[21],43));await fail(()=>save(1601,0,1701,'Note','draft',[21],44));
 await save(1601,0,1701,'Note','recorded');
 await fail(()=>save(1601,1,1702,'Note','draft'),'22023');await fail(()=>save(1601,1,1702,'Note','recorded',[22]),'22023');
 await fail(()=>save(1601,1,1702,'Note','recorded',[21],41,'batch'),'22023');
});
it('moves an authorized draft across batches atomically and hides old branch versions from a current branch manager',async()=>{
 await db.query("insert into public.enrolments(academy_id,student_id,batch_id,starts_on) values($1,$2,$3,'2020-01-01')",[id(11),id(22),id(32)]);
 await db.query("insert into coach_private.workspace_teaching_assignments(workspace_id,membership_id,batch_id,teaching_role,teaches_from,access_from) values($1,$2,$3,'lead',now()-interval '2 days',now()-interval '1 day')",[id(11),id(73),id(32)]);
 await save(1601,0,1701,'Private old Branch 2 draft','draft',[22],43);
 expect(await save(1601,1,1702,'Current Branch 1 note','recorded',[21],41)).toMatchObject({revision:2});
 expect((await db.query('select batch_id,student_id from public.observation_recipients where observation_id=$1',[id(1601)])).rows).toEqual([{batch_id:id(31),student_id:id(21)}]);
 await db.query("update coach_private.workspace_role_grants set role_code='branch_manager',scope='branch',branch_id=$1 where membership_id=$2",[id(61),id(74)]);
 await actor(4);const value=await detail();expect(value.note).toBe('Current Branch 1 note');expect(value.versions).toEqual([{revision:2,note:'Current Branch 1 note',status:'recorded'}]);
});
it('denies old receipt/edit after assignment revocation and never treats rehire as the original membership',async()=>{
 await save();await db.query('update coach_private.workspace_teaching_assignments set revoked_at=clock_timestamp() where id=$1',[id(81)]);await fail(()=>save());
 await db.query('update coach_private.workspace_teaching_assignments set revoked_at=null where id=$1',[id(81)]);
 await db.query("update coach_private.workspace_memberships set status='revoked',ended_at=clock_timestamp() where id=$1",[id(73)]);
 await db.query("insert into coach_private.workspace_memberships(id,workspace_id,user_id,status,source,accepted_at) values($1,$2,$3,'active','accepted_invitation',clock_timestamp())",[id(173),id(11),id(3)]);
 await db.query("insert into coach_private.workspace_role_grants(workspace_id,membership_id,role_code,scope,source) values($1,$2,'instructor','workspace','explicit_grant')",[id(11),id(173)]);
 await db.query('update coach_private.workspace_teaching_assignments set membership_id=$1 where id=$2',[id(173),id(81)]); // fixture only: even falsely copied assignment must not inherit authorship
 await fail(()=>save(1601,1,1702,'Rehired edit'));
});
it('corrects recorded feedback with a reason and actual editor while keeping original teaching identity',async()=>{
 await save(1601,0,1701,'Original','recorded');const recorded=(await db.query<{recorded_at:string}>('select recorded_at from public.observations where id=$1',[id(1601)])).rows[0];
 await actor(1);expect(await correct()).toEqual({id:id(1601),revision:2,status:'recorded'});
 expect((await db.query('select author_id,updated_by,recorded_at from public.observations where id=$1',[id(1601)])).rows).toEqual([{author_id:id(3),updated_by:id(1),...recorded}]);
 expect((await db.query('select author_membership_id from coach_private.workspace_feedback_links where observation_id=$1',[id(1601)])).rows).toEqual([{author_membership_id:id(73)}]);
 const audit=(await db.query<{action:string;editor_user_id:string;reason:string}>('select action,editor_user_id,reason from coach_private.workspace_feedback_submissions order by revision')).rows;
 expect(audit[1]).toEqual({action:'correction',editor_user_id:id(1),reason:'Corrected a factual mistake.'});
 expect((await detail()).versions.map(v=>v.note)).toEqual(['Corrected class feedback.','Original']);
 expect(await correct()).toMatchObject({revision:2});
 await fail(()=>db.exec('delete from coach_private.workspace_feedback_submissions'));
});
it('preserves the original shared teacher name after a rename and later correction',async()=>{
 await save(1601,0,1701,'Original','recorded');
 await db.query("update coach_private.coach_identities set display_name='Renamed teacher' where user_id=$1",[id(3)]);
 await actor(1);await correct();
 expect((await db.query('select author_display_snapshot,editor_display_snapshot from coach_private.workspace_feedback_submissions order by revision')).rows).toEqual([
  {author_display_snapshot:'Teacher',editor_display_snapshot:'Teacher'},
  {author_display_snapshot:'Teacher',editor_display_snapshot:null}
 ]);
});
it('leaves an already-approved Parent snapshot unchanged when the source note is corrected',async()=>{
 await save(1601,0,1701,'Original reviewed note','recorded');await actor(1);
 await db.query('select public.queue_parent_feedback($1,$2,1,$3,$4::uuid[],array[]::uuid[])',[id(11),id(1601),id(1901),[id(21)]]);
 const before=(await db.query('select * from public.parent_feedback_handoffs')).rows;
 expect(before).toHaveLength(1);await correct();
 expect((await db.query('select * from public.parent_feedback_handoffs')).rows).toEqual(before);
});
it('requires explicit correction authority, recorded status and a nonblank reason',async()=>{
 await save();await actor(1);await fail(()=>correct());
 await actor(3);await save(1601,1,1702,'Original','recorded');await actor(4);await fail(()=>correct(1601,2));
 await actor(1);await fail(()=>correct(1601,2,1801,'Corrected','   '),'22023');
 await db.query("insert into coach_private.workspace_capability_grants(workspace_id,membership_id,branch_id,capability) values($1,$2,$3,'feedback.correct')",[id(11),id(74),id(61)]);
 await actor(4);expect(await correct(1601,2)).toMatchObject({revision:3});
});
it('enforces a nonnull correction reason in the audit table as well as the operation',async()=>{
 await save(1601,0,1701,'Original','recorded');await actor(1);await correct();
 await fail(()=>db.query(`insert into coach_private.workspace_feedback_submissions(workspace_id,academy_id,observation_id,editor_user_id,editor_membership_id,request_id,revision,expected_revision,payload_hash,action,reason,previous_snapshot,snapshot,result)
  select workspace_id,academy_id,observation_id,editor_user_id,editor_membership_id,$1,revision+1,expected_revision+1,payload_hash,action,null,previous_snapshot,snapshot,result from coach_private.workspace_feedback_submissions where action='correction'`,[id(1802)]),'23514');
});
it('keeps legacy authorship unknown at membership level when an owner corrects an older recorded note',async()=>{
 await actor(1);expect(await correct(52)).toMatchObject({revision:2});
 expect((await db.query('select author_membership_id,provenance from coach_private.workspace_feedback_links where observation_id=$1',[id(52)])).rows).toEqual([{author_membership_id:null,provenance:'legacy_account'}]);
 expect((await db.query<{previous_snapshot:{note:string}}>('select previous_snapshot from coach_private.workspace_feedback_submissions where observation_id=$1',[id(52)])).rows[0].previous_snapshot.note).toBe('Fictional feedback 52');
});
it('denies unrelated draft reads and returns only whitelisted feedback fields with five latest versions',async()=>{
 await save();await actor(4);await fail(()=>detail());await actor(1);const value=await detail();
 expect(Object.keys(value).sort()).toEqual(['audience','id','note','recipients','revision','session_id','status','versions']);
 await actor(3);for(let i=1;i<=6;i++)await save(1601,i,1701+i,`Revision ${i+1}`);
 expect((await detail()).versions).toHaveLength(1); // a present-day author grant cannot authorize every old draft scope
 await actor(1);
 expect((await detail()).versions).toHaveLength(5);
});
it('keeps private feedback operations and submissions inaccessible to app/service roles',async()=>{
 const functions=(await db.query<{ok:boolean}>(`select p.prosecdef and p.proconfig @> array['search_path=""'] and not has_function_privilege('anon',p.oid,'execute') and not has_function_privilege('authenticated',p.oid,'execute') and not has_function_privilege('service_role',p.oid,'execute') as ok from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='coach_private' and p.proname in ('workspace_write_feedback','workspace_save_class_feedback','workspace_correct_feedback','workspace_feedback_detail')`)).rows;
 expect(functions).toHaveLength(4);expect(functions.every(r=>r.ok)).toBe(true);
 expect((await db.query("select * from coach_private.schema_migrations where version>'202611160014'")).rows).toHaveLength(0);
});
