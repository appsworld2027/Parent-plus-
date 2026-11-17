import type {PGlite} from '@electric-sql/pglite';
import {existsSync,readFileSync} from 'node:fs';
import {afterAll,afterEach,beforeAll,beforeEach,expect,it} from 'vitest';
import {supabaseDatabase} from './support/supabaseDatabase';
const id=(n:number)=>`00000000-0000-0000-0000-${String(n).padStart(12,'0')}`;
const path='supabase/candidates/202611170017_workspace_roster.sql';
let db:PGlite;
async function actor(n:number){await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id(n)]);}
async function batch(target=601,revision=0,request=701,name='Evening batch',branch:number|null=61,workspace=11){
 return (await db.query<{value:{id:string;revision:number}}>('select coach_private.workspace_save_batch($1,$2,$3,$4,$5,\'Studio\',$6) as value',[id(workspace),id(target),revision,id(request),name,branch===null?null:id(branch)])).rows[0].value;
}
async function student(target=602,revision=0,request=702,batches=[31],email='guardian@example.test'){
 return(await db.query<{value:{id:string;revision:number}}>(`select coach_private.workspace_save_student($1,$2,$3,$4,'New learner',8,'beginner','Guardian',$5,'1234567890',$6::uuid[]) as value`,[id(11),id(target),revision,id(request),email,batches.map(id)])).rows[0].value;
}
async function session(target=603,revision=0,request=703,batchId=31,room='Studio',status='scheduled'){
 return(await db.query<{value:{id:string;revision:number}}>(`select coach_private.workspace_save_class($1,$2,$3,$4,$5,'2027-01-01T10:00Z','2027-01-01T11:00Z',$6,$7) as value`,[id(11),id(target),revision,id(request),id(batchId),room,status])).rows[0].value;
}
async function failure(run:()=>Promise<unknown>,code='42501'){
 await db.exec('savepoint attempt');try{await expect(run()).rejects.toMatchObject({code});}finally{await db.exec('rollback to savepoint attempt;release savepoint attempt');}
}
async function connectParent(){
 const code=(await db.query<{code:string}>('select public.issue_parent_link_invite($1,$2,$3) as code',[id(11),id(21),'fixture7@example.test'])).rows[0].code;
 await actor(7);await db.exec('set local role authenticated');
 await db.query("insert into public.family_children(id,family_id,name) values($1,$2,'Private child')",[id(92),id(91)]);
 const request=(await db.query<{id:string}>('select public.claim_parent_link($1,$2) as id',[code,id(92)])).rows[0].id;
 await db.exec('reset role');await actor(1);await db.query('select public.review_parent_connection_request($1,true)',[request]);
}
beforeAll(async()=>{
 db=await supabaseDatabase();await db.exec(readFileSync('tests/fixtures/workspace-authorization.sql','utf8'));
 for(const file of ['202611170015_workspace_foundation.sql','202611170016_workspace_authorization.sql'])await db.exec(readFileSync(`supabase/candidates/${file}`,'utf8'));
 await db.exec(readFileSync('tests/fixtures/workspace-authority.sql','utf8'));
 if(existsSync(path)){await db.exec(readFileSync(path,'utf8'));await db.exec(readFileSync(path,'utf8'));}
},30000);
beforeEach(async()=>{await db.exec('begin;reset role');await actor(1);});
afterEach(async()=>{await db.exec('rollback;reset role');});afterAll(async()=>{await db?.close();});

it('saves a batch, student/contact/enrolment and class under explicit workspace authority',async()=>{
 expect(await batch()).toEqual({id:id(601),revision:1});
 expect(await student(602,0,702,[601])).toEqual({id:id(602),revision:1});
 expect(await session(603,0,703,601)).toEqual({id:id(603),revision:1});
 expect((await db.query('select name,age_years,proficiency_level from public.students where id=$1',[id(602)])).rows).toEqual([{name:'New learner',age_years:8,proficiency_level:'beginner'}]);
 expect((await db.query('select email from public.student_contacts where student_id=$1 and is_primary',[id(602)])).rows).toEqual([{email:'guardian@example.test'}]);
 expect((await db.query('select student_id,batch_id from public.enrolments where student_id=$1',[id(602)])).rows).toEqual([{student_id:id(602),batch_id:id(601)}]);
});
it('permits delegated global admin management without fabricating a Coach or ownership',async()=>{
 await db.exec(`insert into coach_private.workspace_role_grants(workspace_id,membership_id,role_code,scope,source) values('${id(11)}','${id(77)}','admin','workspace','explicit_grant')`);
 await actor(7);expect(await batch()).toMatchObject({revision:1});expect(await student()).toMatchObject({revision:1});expect(await session()).toMatchObject({revision:1});
 expect((await db.query('select * from coach_private.coach_identities where user_id=$1',[id(7)])).rows).toHaveLength(0);
});
it.each([3,4,5,6])('denies roster management to instructor/substitute/finance/unverified actor %s',async n=>{
 await actor(n);await failure(()=>batch());await failure(()=>student());await failure(()=>session());
});
it('restricts branch managers to their branch and denies global student-profile changes',async()=>{
 await db.exec(`update coach_private.workspace_role_grants set role_code='branch_manager',scope='branch',branch_id='${id(61)}' where membership_id='${id(73)}'`);await actor(3);
 expect(await batch()).toMatchObject({revision:1});expect(await session()).toMatchObject({revision:1});
 await failure(()=>batch(604,0,704,'Wrong branch',62));await failure(()=>batch(605,0,705,'Unscoped',null));await failure(()=>student());
 await failure(()=>batch(601,1,706,'Move out',62));await failure(()=>session(603,1,707,32));
});
it('rejects foreign workspace IDs, foreign resource IDs and foreign branches',async()=>{
 await failure(()=>batch(601,0,701,'Foreign',61,12));await failure(()=>batch(33,1,701));await failure(()=>batch(601,0,701,'Foreign branch',63));
 await failure(()=>student(23));await failure(()=>student(602,0,702,[33]));await failure(()=>session(44));await failure(()=>session(603,0,703,33));
});
it('keeps mutations in the selected workspace even when the same account has authority in both',async()=>{
 await db.query("insert into coach_private.workspace_memberships(id,workspace_id,user_id,status,source,accepted_at) values($1,$2,$3,'active','accepted_invitation',now())",[id(179),id(12),id(1)]);
 await db.query("insert into coach_private.workspace_role_grants(workspace_id,membership_id,role_code,scope,source) values($1,$2,'admin','workspace','explicit_grant')",[id(12),id(179)]);
 await batch(601,0,701,'Academy A',61,11);await batch(604,0,701,'Academy B',null,12);
 expect((await db.query('select id,academy_id from public.batches where id=any($1::uuid[]) order by id',[[id(601),id(604)]])).rows).toEqual([{id:id(601),academy_id:id(11)},{id:id(604),academy_id:id(12)}]);
 await failure(()=>batch(601,1,703,'Wrong context',null,12));
});
it('denies new edits to archived students/batches and classes in archived batches',async()=>{
 await student();await batch();
 await db.query('update public.students set archived_at=now() where id=$1',[id(602)]);await db.query('update public.batches set archived_at=now() where id=$1',[id(601)]);
 await failure(()=>student(602,1,704),'22023');await failure(()=>batch(601,1,705),'22023');await failure(()=>session(603,0,703,601));
});
it('retries exactly once and returns the original receipt after later edits without overwriting them',async()=>{
 expect(await batch()).toMatchObject({revision:1});expect(await batch()).toMatchObject({revision:1});
 expect(await batch(601,1,702,'Changed')).toMatchObject({revision:2});expect(await batch()).toMatchObject({revision:1});
 expect((await db.query('select name from public.batches where id=$1',[id(601)])).rows).toEqual([{name:'Changed'}]);
 expect((await db.query('select * from coach_private.workspace_resource_receipts')).rows).toHaveLength(2);
});
it('rejects changed requests, stale revisions and resource-type substitution',async()=>{
 await batch();await failure(()=>batch(601,0,701,'Changed payload'),'22023');
 await failure(()=>batch(601,0,702),'40001');await failure(()=>student(602,0,701),'22023');
 await failure(()=>batch(601,2,703),'40001');
});
it('binds request receipts to membership periods, not a global account request ID',async()=>{
 await batch();await actor(8);expect(await batch(604,0,701)).toMatchObject({id:id(604),revision:1});
 expect((await db.query('select * from coach_private.workspace_resource_receipts')).rows).toHaveLength(2);
});
it('rechecks revocation and expiry before allowing a receipt replay',async()=>{
 await actor(8);await batch();await actor(1);await db.query('select coach_private.workspace_revoke_membership($1,$2)',[id(11),id(78)]);
 await actor(8);await failure(()=>batch());
});
it('rolls the whole student operation back for an invalid batch or ended enrolment',async()=>{
 await failure(()=>student(602,0,702,[31,33]));
 expect((await db.query('select * from public.students where id=$1',[id(602)])).rows).toHaveLength(0);
 expect((await db.query('select * from public.student_contacts where student_id=$1',[id(602)])).rows).toHaveLength(0);
 await student();await db.query('update public.enrolments set ends_on=starts_on where student_id=$1',[id(602)]);
 await failure(()=>student(602,1,703),'22023');
});
it('adds batch memberships without dropping earlier relationships or duplicating the primary contact',async()=>{
 await student();await student(602,1,703,[32]);await student(602,2,704,[31,31]);
 expect((await db.query('select * from public.enrolments where student_id=$1',[id(602)])).rows).toHaveLength(2);
 expect((await db.query('select * from public.student_contacts where student_id=$1 and is_primary',[id(602)])).rows).toHaveLength(1);
});
it('does not silently replace the verified email on an existing approved Parent connection',async()=>{
 // Reuse the already tested014 real request/approval process, no forged link rows.
 await db.query('insert into public.student_contacts(academy_id,student_id,name,email,is_primary) values($1,$2,\'Guardian\',\'fixture7@example.test\',true)',[id(11),id(21)]);
 const code=(await db.query<{code:string}>('select public.issue_parent_link_invite($1,$2,$3) as code',[id(11),id(21),'fixture7@example.test'])).rows[0].code;
 await actor(7);await db.exec('set local role authenticated');
 await db.query("insert into public.family_children(id,family_id,name) values($1,$2,'Private child')",[id(92),id(91)]);
 const request=(await db.query<{id:string}>('select public.claim_parent_link($1,$2) as id',[code,id(92)])).rows[0].id;
 await db.exec('reset role');await actor(1);await db.query('select public.review_parent_connection_request($1,true)',[request]);
 await failure(()=>student(21,1,702,[31],'replacement@example.test'),'22023');
 expect((await db.query('select active,guardian_email from public.parent_coach_links')).rows).toEqual([{active:true,guardian_email:'fixture7@example.test'}]);
});
it.each(['','different@example.test'])('allows ordinary profile edits when approved Parent email differs from unchanged contact %s',async email=>{
 if(email)await db.query('insert into public.student_contacts(academy_id,student_id,name,email,is_primary) values($1,$2,\'Guardian\',$3,true)',[id(11),id(21),email]);
 await connectParent();
 expect(await student(21,1,702,[31],email)).toMatchObject({revision:2});
 expect((await db.query('select guardian_email from public.parent_coach_links where active')).rows).toEqual([{guardian_email:'fixture7@example.test'}]);
});
it('canonicalizes class retry payloads across server session timezones',async()=>{
 await session();await db.exec("set local time zone 'Asia/Kolkata'");
 expect(await session()).toEqual({id:id(603),revision:1});
});
it('rolls student, resource map and receipt back when a contact write fails after validation',async()=>{
 await db.exec(`create function coach_private.test_contact_failure() returns trigger language plpgsql as $$begin raise exception 'Simulated contact failure' using errcode='23514';end$$;
 create trigger test_contact_failure before insert on public.student_contacts for each row execute function coach_private.test_contact_failure()`);
 await failure(()=>student(),'23514');
 expect((await db.query('select * from public.students where id=$1',[id(602)])).rows).toHaveLength(0);
 expect((await db.query('select * from coach_private.workspace_student_links where student_id=$1',[id(602)])).rows).toHaveLength(0);
 expect((await db.query('select * from coach_private.workspace_resource_receipts')).rows).toHaveLength(0);
});
it('preserves existing fees and prohibits an unauthorized branch move even with a new request',async()=>{
 await db.query('update public.batches set monthly_fee_paise=90000 where id=$1',[id(31)]);await batch(31,1,701,'Renamed');
 expect((await db.query('select monthly_fee_paise from public.batches where id=$1',[id(31)])).rows[0]).toEqual({monthly_fee_paise:90000});
});
it('protects class history and session-specific teaching assignments when editing context',async()=>{
 await failure(()=>session(41,1,703),'22023');await failure(()=>session(42,1,704),'22023');
 await session();await db.query(`insert into coach_private.workspace_teaching_assignments(workspace_id,membership_id,session_id,teaching_role,teaches_from,access_from) values($1,$2,$3,'lead',now(),now())`,[id(11),id(73),id(603)]);
 await failure(()=>session(603,1,704,32),'22023');
});
it('allows status/room edits without changing recorded context or inventing teacher attribution',async()=>{
 const times=(await db.query<{starts_at:string;ends_at:string}>('select starts_at,ends_at from public.class_sessions where id=$1',[id(41)])).rows[0];
 const value=await db.query<{value:{revision:number}}>('select coach_private.workspace_save_class($1,$2,1,$3,$4,$5,$6,\'New room\',\'completed\') as value',[id(11),id(41),id(703),id(31),times.starts_at,times.ends_at]);
 expect(value.rows[0].value.revision).toBe(2);
 expect((await db.query('select * from coach_private.coach_identities where user_id=$1',[id(1)])).rows).toHaveLength(0);
});
it('returns a minimum teaching roster with no contacts, billing, private family or unassigned students',async()=>{
 await actor(3);
 const rows=(await db.query<Record<string,unknown>>('select * from coach_private.workspace_class_roster($1,$2)',[id(11),id(41)])).rows;
 expect(rows).toHaveLength(2);expect(Object.keys(rows[0]).sort()).toEqual(['age_years','name','proficiency_level','student_id']);
 await failure(()=>db.query('select * from coach_private.workspace_class_roster($1,$2)',[id(11),id(43)]));
 await actor(4);await failure(()=>db.query('select * from coach_private.workspace_class_roster($1,$2)',[id(11),id(42)]));
});
it('opens a complete student profile only for workspace owner/admin with contact and enrolment fields whitelisted',async()=>{
 await student();
 const profile=(await db.query<{value:Record<string,unknown>}>('select coach_private.workspace_student_profile($1,$2) as value',[id(11),id(602)])).rows[0].value;
 expect(Object.keys(profile).sort()).toEqual(['enrolments','primary_contact','student']);
 expect(profile.student).toMatchObject({id:id(602),name:'New learner',age_years:8,proficiency_level:'beginner',revision:1});
 expect(profile.primary_contact).toEqual({name:'Guardian',email:'guardian@example.test',phone:'1234567890'});
 expect(profile.enrolments).toEqual([expect.objectContaining({batch_id:id(31)})]);
 await failure(()=>db.query('select coach_private.workspace_student_profile($1,$2)',[id(11),id(23)]));
 await actor(3);await failure(()=>db.query('select coach_private.workspace_student_profile($1,$2)',[id(11),id(602)]));
});
it('reruns the candidate without resetting resource versions or erasing prior receipts',async()=>{
 await batch();await batch(601,1,702,'Later edit');
 await db.exec(readFileSync(path,'utf8').replace(/^begin;$/m,'').replace(/^commit;$/m,''));
 expect(await batch()).toMatchObject({revision:1});
 expect((await db.query('select revision from coach_private.workspace_resource_versions where batch_id=$1',[id(601)])).rows).toEqual([{revision:2}]);
});
it('keeps every new function private, fixed-search-path, and every new table protected by RLS',async()=>{
 const functions=[...readFileSync(path,'utf8').matchAll(/create or replace function coach_private\.([a-z_]+)/g)].map(m=>m[1]);
 const meta=(await db.query<{ok:boolean}>(`select p.prosecdef and p.proconfig @> array['search_path=""'] and
  not has_function_privilege('anon',p.oid,'execute') and not has_function_privilege('authenticated',p.oid,'execute') and not has_function_privilege('service_role',p.oid,'execute') as ok
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='coach_private' and p.proname=any($1::text[])`,[functions])).rows;
 expect(meta).toHaveLength(functions.length);expect(meta.every(r=>r.ok)).toBe(true);
 expect((await db.query<{relrowsecurity:boolean}>("select relrowsecurity from pg_class where oid in ('coach_private.workspace_resource_versions'::regclass,'coach_private.workspace_resource_receipts'::regclass)")).rows.every(r=>r.relrowsecurity)).toBe(true);
});
it('uses the class date and academy timezone for enrolments, excluding archived students',async()=>{
 await db.query('update public.enrolments set starts_on=current_date+2 where student_id=$1',[id(21)]);
 await db.query('update public.students set archived_at=now() where id=$1',[id(22)]);await actor(3);
 expect((await db.query('select * from coach_private.workspace_class_roster($1,$2)',[id(11),id(41)])).rows).toHaveLength(0);
});
it('keeps operations and receipt/version tables inaccessible to app roles and leaves live migration history unchanged',async()=>{
 for(const role of ['anon','authenticated','service_role']){
  await db.exec(`set local role ${role}`);await failure(()=>batch());await failure(()=>db.query('select * from coach_private.workspace_resource_receipts'));await db.exec('reset role');
 }
 expect((await db.query("select * from coach_private.schema_migrations where version>'202611160014'")).rows).toHaveLength(0);
});
it('rejects invalid revisions, identifiers, names and class intervals without partial state',async()=>{
 await failure(()=>batch(601,-1),'22023');await failure(()=>batch(601,0,701,''),'22023');
 await failure(()=>db.query('select coach_private.workspace_save_class($1,$2,0,$3,$4,now(),now(),\'\',\'scheduled\')',[id(11),id(603),id(703),id(31)]),'22023');
});
