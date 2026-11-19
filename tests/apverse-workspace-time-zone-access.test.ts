import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import {afterEach,beforeAll,beforeEach,expect,it} from 'vitest';

const id=(n:number)=>`00000000-0000-0000-0000-${String(n).padStart(12,'0')}`;
const owner=id(1),coach=id(2),workspace=id(11),foreignWorkspace=id(12);
let db:PGlite;
async function as(user:string){await db.exec(`reset role;set request.jwt.claim.sub='${user}';set role authenticated`);}
async function reject(sql:string,args:unknown[],code:string){await db.exec('savepoint attempt');try{await expect(db.query(sql,args)).rejects.toMatchObject({code});}finally{await db.exec('rollback to savepoint attempt;release savepoint attempt');}}

beforeAll(async()=>{
 db=new PGlite();
 await db.exec(`create role anon nologin;create role authenticated nologin;create role service_role nologin;
   create schema auth;create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
   create table public.workspaces(id uuid primary key,status text not null,scheduling_time_zone text);
   create table public.workspace_memberships(workspace_id uuid not null,user_id uuid not null,role text not null,status text not null);
   insert into public.workspaces values('${workspace}','active',null),('${foreignWorkspace}','active',null);
   insert into public.workspace_memberships values('${workspace}','${owner}','owner','active'),('${workspace}','${coach}','coach','active');
   grant usage on schema public,auth to anon,authenticated,service_role;
   grant execute on function auth.uid() to anon,authenticated,service_role;
   grant select on public.workspaces,public.workspace_memberships to authenticated;
   create function public.configure_private_workspace_zone(p_workspace_id uuid,p_zone text)
   returns void language plpgsql set search_path to '' as $function$
   declare v_actor uuid:=auth.uid();v_existing text;
   begin
     if v_actor is null or p_workspace_id is null then raise exception using errcode='42501',message='Workspace zone access denied'; end if;
     select scheduling_time_zone into v_existing from public.workspaces where id=p_workspace_id and status='active' for update;
     if not found then raise exception using errcode='42501',message='Workspace zone access denied'; end if;
     perform 1 from public.workspace_memberships where workspace_id=p_workspace_id and user_id=v_actor and status='active' and role in ('owner','admin') for share;
     if not found then raise exception using errcode='42501',message='Workspace zone access denied'; end if;
     if p_zone is null or not exists(select 1 from pg_catalog.pg_timezone_names where name=p_zone) then raise exception using errcode='22023',message='Invalid workspace time zone'; end if;
     if v_existing is not null and v_existing<>p_zone then raise exception using errcode='23514',message='Workspace time zone already configured'; end if;
     if v_existing is null then update public.workspaces set scheduling_time_zone=p_zone where id=p_workspace_id; end if;
   end $function$;`);
 await db.exec(readFileSync('supabase/apverse-migrations/20261119110937_configure_workspace_time_zone_access.sql','utf8'));
});
beforeEach(async()=>{await db.exec('begin');});
afterEach(async()=>{await db.exec('rollback;reset role;reset request.jwt.claim.sub;');});

it('exposes the zone operation only to authenticated clients',async()=>{
 const acl=await db.query(`select has_function_privilege('anon','public.configure_private_workspace_zone(uuid,text)','execute') anon_exec,
   has_function_privilege('authenticated','public.configure_private_workspace_zone(uuid,text)','execute') authenticated_exec,
   has_function_privilege('service_role','public.configure_private_workspace_zone(uuid,text)','execute') service_exec`);
 expect(acl.rows).toEqual([{anon_exec:false,authenticated_exec:true,service_exec:false}]);
});

it('lets an active workspace owner set the missing zone without granting direct table updates',async()=>{
 await as(owner);
 await db.query('select public.configure_private_workspace_zone($1,$2)',[workspace,'Asia/Kolkata']);
 expect((await db.query('select scheduling_time_zone from public.workspaces where id=$1',[workspace])).rows).toEqual([{scheduling_time_zone:'Asia/Kolkata'}]);
 expect((await db.query("select has_table_privilege('authenticated','public.workspaces','UPDATE') allowed")).rows).toEqual([{allowed:false}]);
});

it('denies coaches, foreign workspaces, invalid zones and changes after initial setup',async()=>{
 await as(coach);await reject('select public.configure_private_workspace_zone($1,$2)',[workspace,'Asia/Kolkata'],'42501');
 await as(owner);await reject('select public.configure_private_workspace_zone($1,$2)',[foreignWorkspace,'Asia/Kolkata'],'42501');
 await reject('select public.configure_private_workspace_zone($1,$2)',[workspace,'Mars/Olympus'],'22023');
 await db.query('select public.configure_private_workspace_zone($1,$2)',[workspace,'Asia/Kolkata']);
 await reject('select public.configure_private_workspace_zone($1,$2)',[workspace,'Etc/UTC'],'23514');
 await db.exec('reset role;set role anon');await reject('select public.configure_private_workspace_zone($1,$2)',[workspace,'Asia/Kolkata'],'42501');
});
