import type {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import {afterAll,afterEach,beforeAll,beforeEach,expect,it} from 'vitest';
import {supabaseDatabase} from './support/supabaseDatabase';
const id=(n:number)=>`00000000-0000-0000-0000-${String(n).padStart(12,'0')}`;
const file='supabase/candidates/workspace_class_roster.sql';
let db:PGlite;
const actor=(n:number)=>db.query("select set_config('request.jwt.claim.sub',$1,true)",[id(n)]);
const roster=(workspace=11,session=41)=>db.query('select * from coach_private.workspace_class_roster($1,$2)',[id(workspace),id(session)]);
beforeAll(async()=>{
 db=await supabaseDatabase();
 for(const path of ['tests/fixtures/workspace-authorization.sql','supabase/candidates/202611170015_workspace_foundation.sql','supabase/candidates/202611170016_workspace_authorization.sql','tests/fixtures/workspace-authority.sql'])await db.exec(readFileSync(path,'utf8'));
 await db.exec(readFileSync(file,'utf8'));await db.exec(readFileSync(file,'utf8'));
},30000);
beforeEach(async()=>{await db.exec('begin');await actor(3);});
afterEach(async()=>{await db.exec('rollback');});afterAll(async()=>{await db?.close();});
it('returns only the assigned class student IDs and names',async()=>{
 expect((await roster()).rows).toEqual([{student_id:id(21),student_name:'Learner A'},{student_id:id(22),student_name:'Learner A2'}]);
});
it('permits owner management access without inventing instructor status',async()=>{await actor(1);expect((await roster()).rows).toHaveLength(2);});
it.each([[12,44],[11,43],[11,999]])('denies foreign, unassigned or missing class %s/%s',async(w,s)=>{
 await expect(roster(w,s)).rejects.toMatchObject({code:'42501'});
});
it('denies revoked membership even with the same identity claim',async()=>{
 await db.query("update coach_private.workspace_memberships set status='revoked',ended_at=now() where id=$1",[id(73)]);
 await expect(roster()).rejects.toMatchObject({code:'42501'});
});
it('denies a banned caller',async()=>{await db.query("update auth.users set banned_until=now()+interval '1 day' where id=$1",[id(3)]);await expect(roster()).rejects.toMatchObject({code:'42501'});});
it('excludes archived students and enrolments outside the academy-local session day',async()=>{
 await db.query('update public.students set archived_at=now() where id=$1',[id(21)]);
 await db.query("update public.enrolments set ends_on='2020-01-02' where student_id=$1",[id(22)]);
 expect((await roster()).rows).toEqual([]);
});
it('uses the academy timezone and inclusive enrolment dates at a UTC day boundary',async()=>{
 await actor(1);
 await db.query("update public.academies set timezone='America/Los_Angeles' where id=$1",[id(11)]);
 await db.query("update public.class_sessions set starts_at='2026-11-17T00:30:00Z',ends_at='2026-11-17T01:30:00Z' where id=$1",[id(41)]);
 await db.query("update public.enrolments set starts_on='2026-11-16',ends_on='2026-11-16' where student_id=$1",[id(21)]);
 await db.query("update public.enrolments set starts_on='2026-11-17',ends_on=null where student_id=$1",[id(22)]);
 expect((await roster()).rows).toEqual([{student_id:id(21),student_name:'Learner A'}]);
});
it.each(['anon','authenticated','service_role'])('keeps the candidate inaccessible to %s',async role=>{
 await db.exec(`set local role ${role}`);await expect(roster()).rejects.toMatchObject({code:'42501'});
});
