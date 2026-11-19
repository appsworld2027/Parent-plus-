import {PGlite} from '@electric-sql/pglite';
import {readFileSync,existsSync} from 'node:fs';
import {afterAll,afterEach,beforeAll,beforeEach,expect,it} from 'vitest';

const id=(n:number)=>`00000000-0000-0000-0000-${String(n).padStart(12,'0')}`;
const owner=id(1),other=id(2),coach=id(3),child=id(11),otherChild=id(12);
let db:PGlite;
async function as(user:string){await db.exec(`reset role;set request.jwt.claim.sub='${user}';set role authenticated`);}
async function reject(sql:string,args:unknown[],code:string){await db.exec('savepoint attempt');try{await expect(db.query(sql,args)).rejects.toMatchObject({code});}finally{await db.exec('rollback to savepoint attempt;release savepoint attempt');}}

beforeAll(async()=>{
 db=new PGlite();
 await db.exec(`create role anon nologin;create role authenticated nologin;create role service_role nologin bypassrls;
   create schema auth;create table auth.users(id uuid primary key);
   create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
   create table public.children(id uuid primary key,created_by uuid not null references auth.users(id));
   grant usage on schema auth,public to anon,authenticated,service_role;
   grant execute on function auth.uid() to anon,authenticated,service_role;
   grant select on public.children to authenticated;
   insert into auth.users values('${owner}'),('${other}'),('${coach}');
   insert into public.children values('${child}','${owner}'),('${otherChild}','${other}');`);
 if(existsSync('supabase/apverse-migrations/20261119014723_parent_private_family_records.sql')){
   await db.exec(readFileSync('supabase/apverse-migrations/20261119014723_parent_private_family_records.sql','utf8'));
 }
});
afterAll(async()=>{await db?.close();});
beforeEach(async()=>{await db.exec('begin');});
afterEach(async()=>{await db.exec('rollback;reset role');});

it('lets the verified child owner read and update their private family records',async()=>{
 await as(owner);
 await db.query("insert into public.parent_family_moments(owner_id,child_id,note,minutes,kind,occurred_on) values($1,$2,'Museum visit',45,'memory','2026-11-18')",[owner,child]);
 await db.query("insert into public.parent_family_todos(owner_id,child_id,title) values($1,$2,'Pack water')",[owner,child]);
 await db.query("insert into public.parent_family_events(owner_id,child_id,title,starts_at,ends_at,location) values($1,$2,'Music class','2026-11-20T10:00Z','2026-11-20T11:00Z','Studio')",[owner,child]);
 expect((await db.query('select note from public.parent_family_moments')).rows).toEqual([{note:'Museum visit'}]);
 await db.query("update public.parent_family_todos set done=true where title='Pack water'");
 expect((await db.query('select done from public.parent_family_todos')).rows).toEqual([{done:true}]);
});

it('denies another guardian or linked coach access to the owner private records',async()=>{
 await db.exec(`insert into public.parent_family_moments(owner_id,child_id,note,minutes,kind,occurred_on) values('${owner}','${child}','Private',0,'memory','2026-11-18')`);
 await as(other);expect((await db.query('select * from public.parent_family_moments')).rows).toEqual([]);
 await reject("insert into public.parent_family_todos(owner_id,child_id,title) values($1,$2,'Forged')",[other,child],'42501');
 await as(coach);expect((await db.query('select * from public.parent_family_moments')).rows).toEqual([]);
});

it('rejects a child owned by someone else even when the caller forges owner_id',async()=>{
 await as(owner);
 await reject("insert into public.parent_family_todos(owner_id,child_id,title) values($1,$2,'Foreign child')",[owner,otherChild],'42501');
});

it('enforces private record bounds and event chronology',async()=>{
 await as(owner);
 await reject("insert into public.parent_family_moments(owner_id,child_id,note,minutes,kind,occurred_on) values($1,$2,'Bad minutes',1441,'memory','2026-11-18')",[owner,child],'23514');
 await reject("insert into public.parent_family_events(owner_id,child_id,title,starts_at,ends_at) values($1,$2,'Reversed','2026-11-20T11:00Z','2026-11-20T10:00Z')",[owner,child],'23514');
 await reject("insert into public.parent_family_todos(owner_id,child_id,title) values($1,$2,'   ')",[owner,child],'23514');
});

it('grants no direct private-record access to anonymous or service roles',async()=>{
 await db.exec('reset role;set role anon');
 await reject('select * from public.parent_family_moments',[],'42501');
 await db.exec('reset role;set role service_role');
 await reject('select * from public.parent_family_moments',[],'42501');
});
