import type {PGlite} from '@electric-sql/pglite';
import {existsSync,readFileSync} from 'node:fs';
import {afterAll,afterEach,beforeAll,beforeEach,expect,it} from 'vitest';
import {supabaseDatabase} from './support/supabaseDatabase';
const id=(n:number)=>`00000000-0000-0000-0000-${String(n).padStart(12,'0')}`;
const path='supabase/candidates/202611170019_workspace_attendance.sql';
let db:PGlite;
type Page={revision:number;context:string;students:{student_id:string;name:string;age_years:number|null;proficiency_level:string;status:string|null}[]};
const marks=[{student_id:id(21),status:'present'},{student_id:id(22),status:'absent'}];
async function actor(n:number){await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id(n)]);}
async function page(session=41){return(await db.query<{value:Page}>('select coach_private.workspace_class_attendance($1,$2) as value',[id(11),id(session)])).rows[0].value;}
async function save(context:string,revision=0,request=1401,rows:unknown=marks,session=41){
 return(await db.query<{value:{revision:number;marked:number}}>('select coach_private.workspace_save_attendance($1,$2,$3,$4,$5,$6::jsonb) as value',[id(11),id(session),revision,context,id(request),JSON.stringify(rows)])).rows[0].value;
}
async function fail(run:()=>Promise<unknown>,code='42501'){
 await db.exec('savepoint denied');try{await expect(run()).rejects.toMatchObject({code});}finally{await db.exec('rollback to savepoint denied;release savepoint denied');}
}
beforeAll(async()=>{
 db=await supabaseDatabase();await db.exec(readFileSync('tests/fixtures/workspace-authorization.sql','utf8'));
 for(const file of ['202611170015_workspace_foundation.sql','202611170016_workspace_authorization.sql'])await db.exec(readFileSync(`supabase/candidates/${file}`,'utf8'));
 await db.exec(readFileSync('tests/fixtures/workspace-authority.sql','utf8'));
 for(const file of ['202611170017_workspace_roster.sql','202611170018_workspace_staff.sql'])await db.exec(readFileSync(`supabase/candidates/${file}`,'utf8'));
 if(existsSync(path)){await db.exec(readFileSync(path,'utf8'));await db.exec(readFileSync(path,'utf8'));}
},30000);
beforeEach(async()=>{await db.exec('begin;reset role');await actor(3);});afterEach(async()=>{await db.exec('rollback;reset role');});afterAll(async()=>{await db?.close();});

it('lets an assigned instructor mark the complete class roster without impersonating its owner',async()=>{
 const current=await page();expect(current.revision).toBe(0);expect(current.students.map(r=>r.student_id)).toEqual([id(21),id(22)]);
 expect(await save(current.context)).toEqual({revision:1,marked:2});
 expect((await page()).students.map(r=>r.status)).toEqual(['present','absent']);
 const stored=(await db.query<{actor_user_id:string;actor_membership_id:string;marks:unknown}>('select actor_user_id,actor_membership_id,marks from coach_private.workspace_attendance_submissions')).rows[0];
 expect(stored).toMatchObject({actor_user_id:id(3),actor_membership_id:id(73),marks});
 expect((await db.query('select owner_id from public.academies where id=$1',[id(11)])).rows).toEqual([{owner_id:id(1)}]);
});
it.each([1,2,5,6,7,8])('denies attendance writes without eligible current teaching authority %s',async n=>{
 const current=await page();await actor(n);await fail(()=>save(current.context));
});
it('allows admin-only roster inspection without creating a teaching identity or permitting marks',async()=>{
 await actor(1);const current=await page();expect(current.students).toHaveLength(2);await fail(()=>save(current.context));
 expect(Object.keys(current.students[0]).sort()).toEqual(['age_years','name','proficiency_level','status','student_id']);
});
it('rejects a foreign or unassigned branch class and does not leak its roster',async()=>{
 await fail(()=>page(43));await fail(()=>page(44));const current=await page();await fail(()=>save(current.context,0,1401,marks,44));
});
it('returns the original receipt for reordered exact retries without undoing later attendance edits',async()=>{
 const current=await page();expect(await save(current.context)).toMatchObject({revision:1});
 expect(await save(current.context,1,1402,marks.map(m=>({...m,status:'late'})))).toMatchObject({revision:2});
 expect(await save(current.context,0,1401,[marks[1],marks[0]])).toEqual({revision:1,marked:2});
 expect((await page()).students.every(r=>r.status==='late')).toBe(true);
 expect((await db.query('select * from coach_private.workspace_attendance_submissions')).rows).toHaveLength(2);
});
it('rejects changed request payloads, stale revisions and stale class context atomically',async()=>{
 const current=await page();await save(current.context);
 await fail(()=>save(current.context,0,1401,marks.map(m=>({...m,status:'late'}))),'22023');
 await fail(()=>save(current.context,0,1402),'40001');await fail(()=>save(`${current.context}changed`,1,1403),'40001');
 expect((await page()).revision).toBe(1);expect((await db.query('select * from coach_private.workspace_attendance_submissions')).rows).toHaveLength(1);
});
it.each([null,{},[],[marks[0]],[marks[0],marks[0]],[marks[0],{student_id:id(23),status:'late'}],[marks[0],{student_id:id(22),status:'unknown'}],[{...marks[0],name:'ignored? '},marks[1]]])('rejects invalid, duplicate, incomplete or foreign marks %j',async rows=>{
 const current=await page();await fail(()=>save(current.context,0,1401,rows),'22023');
 expect((await db.query('select * from public.attendance')).rows).toHaveLength(0);expect((await page()).revision).toBe(0);
});
it('uses the academy-local class date and ended enrolments when checking every student',async()=>{
 await db.exec("update public.academies set timezone='Asia/Kolkata';update public.class_sessions set starts_at='2027-01-01T20:00Z',ends_at='2027-01-01T21:00Z' where id='00000000-0000-0000-0000-000000000041';update public.enrolments set ends_on='2027-01-01' where student_id='00000000-0000-0000-0000-000000000022'");
 const current=await page();expect(current.students.map(r=>r.student_id)).toEqual([id(21)]);
 await fail(()=>save(current.context),'22023');expect(await save(current.context,0,1401,[marks[0]])).toEqual({revision:1,marked:1});
});
it('detects a roster addition/removal after review and preserves previous revisions on failure',async()=>{
 const current=await page();await db.query('update public.students set archived_at=now() where id=$1',[id(22)]);
 await fail(()=>save(current.context),'22023');expect((await page()).revision).toBe(0);
});
it('denies revoked assignments, expired write windows, cancelled classes and archived batches even for retries',async()=>{
 const current=await page();await save(current.context);
 await db.query('update coach_private.workspace_teaching_assignments set revoked_at=clock_timestamp() where id=$1',[id(81)]);await fail(()=>save(current.context));
 await db.query("update coach_private.workspace_teaching_assignments set revoked_at=null,feedback_write_until=now()-interval '1 second' where id=$1",[id(81)]);await fail(()=>save(current.context));
 await db.query('update coach_private.workspace_teaching_assignments set feedback_write_until=null where id=$1',[id(81)]);
 await db.query("update public.class_sessions set status='cancelled' where id=$1",[id(41)]);await fail(()=>save(current.context));
 await db.query("update public.class_sessions set status='scheduled' where id=$1",[id(41)]);await db.query('update public.batches set archived_at=now() where id=$1',[id(31)]);await fail(()=>page());
});
it('retains old snapshot attribution after another instructor updates attendance',async()=>{
 const current=await page();await save(current.context);await actor(4);await save(current.context,1,1401,marks.map(m=>({...m,status:'late'})));
 expect((await db.query('select actor_user_id,actor_membership_id,revision from coach_private.workspace_attendance_submissions order by revision')).rows).toEqual([{actor_user_id:id(3),actor_membership_id:id(73),revision:1},{actor_user_id:id(4),actor_membership_id:id(74),revision:2}]);
 await fail(()=>db.exec('update coach_private.workspace_attendance_submissions set revision=99'));
 await fail(()=>db.exec('delete from coach_private.workspace_attendance_submissions'));
});
it('keeps submissions and operations private without inventing legacy attribution or changing the live ledger',async()=>{
 expect((await db.query('select * from coach_private.workspace_attendance_submissions')).rows).toHaveLength(0);
 const functions=(await db.query<{ok:boolean}>(`select p.prosecdef and p.proconfig @> array['search_path=""'] and not has_function_privilege('anon',p.oid,'execute') and not has_function_privilege('authenticated',p.oid,'execute') and not has_function_privilege('service_role',p.oid,'execute') as ok from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='coach_private' and p.proname in ('workspace_save_attendance','workspace_class_attendance')`)).rows;
 expect(functions).toHaveLength(2);expect(functions.every(r=>r.ok)).toBe(true);
 const protection=(await db.query<{protected:boolean}>(`select c.relrowsecurity and not has_table_privilege('anon',c.oid,'select,insert,update,delete') and not has_table_privilege('authenticated',c.oid,'select,insert,update,delete') and not has_table_privilege('service_role',c.oid,'select,insert,update,delete') as protected from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='coach_private' and c.relname='workspace_attendance_submissions'`)).rows;
 expect(protection).toEqual([{protected:true}]);
 expect((await db.query("select * from coach_private.schema_migrations where version>'202611160014'")).rows).toHaveLength(0);
});
