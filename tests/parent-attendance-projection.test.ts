import type {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import {afterAll,afterEach,beforeAll,beforeEach,expect,it} from 'vitest';
import {supabaseDatabase} from './support/supabaseDatabase';
const id=(n:number)=>`00000000-0000-0000-0000-${String(n).padStart(12,'0')}`;
let db:PGlite;
const file='supabase/migrations/20261117090944_parent_attendance_read.sql';
const actor=(n:number)=>db.query("select set_config('request.jwt.claim.sub',$1,true)",[id(n)]);
const page=(child=71,day='2026-11-16',start:string|null=null,cursor:string|null=null)=>db.query<{session_id:string;starts_at:Date;attendance_status:string|null}>('select * from coach_private.parent_attendance_sessions($1,$2,$3,$4)',[id(child),day,start,cursor]);
beforeAll(async()=>{
 db=await supabaseDatabase();
 await db.exec("create function public.rls_auto_enable() returns event_trigger language plpgsql security definer as $$ begin return; end $$;");
 await db.exec(readFileSync(file,'utf8'));await db.exec(readFileSync(file,'utf8'));
},30000);
beforeEach(async()=>{
 await db.exec('begin');
 await db.query("insert into auth.users(id,email,email_confirmed_at) values($1,'coach@example.test',now()),($2,'parent@example.test',now()),($3,'other@example.test',now())",[id(1),id(2),id(3)]);
 await db.query("insert into public.academies(id,owner_id,name) values($1,$2,'Academy')",[id(11),id(1)]);
 await db.query("insert into public.students(id,academy_id,name) values($1,$2,'Student'),($3,$2,'Other student')",[id(21),id(11),id(22)]);
 await db.query("insert into public.batches(id,academy_id,name) values($1,$2,'Art')",[id(31),id(11)]);
 await db.query("insert into public.enrolments(academy_id,student_id,batch_id,starts_on) values($1,$2,$3,'2020-01-01')",[id(11),id(21),id(31)]);
 await db.query("insert into public.class_sessions(id,academy_id,batch_id,starts_at,ends_at) values($1,$2,$3,'2026-11-16T10:00Z','2026-11-16T11:00Z')",[id(41),id(11),id(31)]);
 await db.query("insert into public.parent_families(id,owner_id,parent_name,name) values($1,$2,'Parent','Family')",[id(61),id(2)]);
 await db.query("insert into public.family_children(id,family_id,name) values($1,$2,'Child')",[id(71),id(61)]);
 await actor(1);const code=(await db.query<{code:string}>('select public.issue_parent_link_invite($1,$2,$3) as code',[id(11),id(21),'parent@example.test'])).rows[0].code;
 await actor(2);const request=(await db.query<{id:string}>('select public.claim_parent_link($1,$2) as id',[code,id(71)])).rows[0].id;
 await actor(1);await db.query('select public.review_parent_connection_request($1,true)',[request]);await actor(2);
});
afterEach(async()=>{await db.exec('rollback');});afterAll(async()=>{await db?.close();});
it('returns only approved child sessions and treats missing attendance as unrecorded',async()=>{
 expect((await page()).rows).toEqual([{session_id:id(41),academy_id:id(11),academy_name:'Academy',batch_name:'Art',starts_at:new Date('2026-11-16T10:00Z'),ends_at:new Date('2026-11-16T11:00Z'),session_status:'scheduled',attendance_status:null}]);
});
it('returns saved attendance without changing it',async()=>{
 await db.query("insert into public.attendance(academy_id,session_id,student_id,batch_id,status) values($1,$2,$3,$4,'late')",[id(11),id(41),id(21),id(31)]);
 expect((await page()).rows[0].attendance_status).toBe('late');expect((await page()).rows[0].attendance_status).toBe('late');
});
it('does not disclose another parent child or a guessed child',async()=>{await actor(3);expect((await page()).rows).toEqual([]);expect((await page(999)).rows).toEqual([]);});
it('removes visibility after explicit disconnect',async()=>{await db.exec('update public.parent_coach_links set active=false');expect((await page()).rows).toEqual([]);});
it('does not trust a stale link after the parent email changes',async()=>{await db.query("update auth.users set email='changed@example.test' where id=$1",[id(2)]);expect((await page()).rows).toEqual([]);});
it('denies a banned parent account',async()=>{await db.query("update auth.users set banned_until=now()+interval '1 day' where id=$1",[id(2)]);await expect(page()).rejects.toMatchObject({code:'42501'});});
it('filters academy-local class day and inclusive enrolment end',async()=>{await db.query("update public.academies set timezone='America/Los_Angeles'");await db.exec("update public.class_sessions set starts_at='2026-11-17T00:30Z',ends_at='2026-11-17T01:30Z';update public.enrolments set ends_on='2026-11-16'");expect((await page()).rows).toHaveLength(1);expect((await page(71,'2026-11-17')).rows).toHaveLength(0);});
it('pages deterministically without repeating the last session',async()=>{
 await db.query("insert into public.class_sessions(academy_id,batch_id,starts_at,ends_at) select $1,$2,'2026-11-16T10:00Z'::timestamptz+n*interval '1 minute','2026-11-16T11:00Z'::timestamptz+n*interval '1 minute' from generate_series(1,54) n",[id(11),id(31)]);
 const first=await page();expect(first.rows).toHaveLength(50);const last=first.rows[49];const second=await page(71,'2026-11-16',String((last.starts_at as Date).toISOString()),String(last.session_id));expect(second.rows).toHaveLength(5);
 expect(new Set([...first.rows,...second.rows].map(x=>x.session_id)).size).toBe(55);
});
it('rejects a half-specified cursor',async()=>{await expect(page(71,'2026-11-16','2026-11-16T10:00Z')).rejects.toMatchObject({code:'22023'});});
it('allows only approved own-child reads through the staging API wrapper',async()=>{
 await db.exec('set local role authenticated');
 expect((await db.query('select * from public.get_parent_attendance_sessions($1,$2)',[id(71),'2026-11-16'])).rows).toHaveLength(1);
 await actor(3);expect((await db.query('select * from public.get_parent_attendance_sessions($1,$2)',[id(71),'2026-11-16'])).rows).toEqual([]);
});
it.each(['anon','service_role'])('keeps the staging API unavailable to %s',async role=>{await db.exec(`set local role ${role}`);await expect(db.query('select * from public.get_parent_attendance_sessions($1,$2)',[id(71),'2026-11-16'])).rejects.toMatchObject({code:'42501'});});
it.each(['anon','authenticated','service_role'])('does not expose the candidate to %s',async role=>{await db.exec(`set local role ${role}`);await expect(page()).rejects.toMatchObject({code:'42501'});});

it.each(['is_anonymous=true','email_confirmed_at=null', 'deleted_at=now()', "email_confirmed_at=now()+interval '1 day'"])('denies ineligible account state %s',async change=>{await db.exec(`update auth.users set ${change} where id='${id(2)}'`);await expect(page()).rejects.toMatchObject({code:'42501'});});
it('removes access when the approval is withdrawn',async()=>{await db.exec("update public.parent_connection_requests set status='rejected'");expect((await page()).rows).toEqual([]);});
it('does not require any private staff workspace candidate',async()=>{expect((await db.query<{value:string|null}>("select to_regclass('coach_private.workspaces') as value")).rows[0].value).toBeNull();});

it('rejects an approval attached to a different sibling',async()=>{
 await db.query("insert into public.family_children(id,family_id,name) values($1,$2,'Sibling')",[id(72),id(61)]);
 await db.query('update public.parent_connection_requests set child_id=$1',[id(72)]);
 expect((await page()).rows).toEqual([]);
});

it('removes client execution from the platform event helper without changing its owner authority',async()=>{
 const rows=await db.query("select has_function_privilege('anon','public.rls_auto_enable()','execute') as anon,has_function_privilege('authenticated','public.rls_auto_enable()','execute') as authenticated");
 expect(rows.rows).toEqual([{anon:false,authenticated:false}]);
});

it('retired preview files cannot overwrite the stronger deployed reader',async()=>{
 const fingerprint=async()=>(await db.query<{body:string}>("select pg_get_functiondef('coach_private.parent_attendance_sessions(uuid,date,timestamptz,uuid)'::regprocedure) as body")).rows[0].body;
 const before=await fingerprint();
 await db.exec(readFileSync('supabase/candidates/parent_attendance_projection.sql','utf8'));
 await db.exec(readFileSync('supabase/candidates/parent_attendance_api.sql','utf8'));
 expect(await fingerprint()).toBe(before);
});
