import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import {expect,it} from 'vitest';

it('the APVerse RLS event trigger still enables RLS after client EXECUTE is revoked',async()=>{
  const db=new PGlite();
  try{
    await db.exec(`
      create role anon;
      create role authenticated;
      create role service_role;
      create or replace function public.rls_auto_enable()
      returns event_trigger language plpgsql security definer
      set search_path to 'pg_catalog'
      as $function$
      declare cmd record; tbl name;
      begin
        for cmd in
          select * from pg_event_trigger_ddl_commands()
          where command_tag in ('CREATE TABLE','CREATE TABLE AS','SELECT INTO')
            and object_type in ('table','partitioned table')
        loop
          if cmd.schema_name='public' then
            select c.relname into tbl from pg_catalog.pg_class c where c.oid=cmd.objid;
            execute format('alter table if exists %I.%I enable row level security',cmd.schema_name,tbl);
          end if;
        end loop;
      end;
      $function$;
      create event trigger ensure_rls on ddl_command_end
        execute function public.rls_auto_enable();
      grant execute on function public.rls_auto_enable() to public,anon,authenticated,service_role;
    `);
    const migration=readFileSync('supabase/apverse-migrations/20261117180000_revoke_client_execute_from_rls_event_trigger.sql','utf8');
    await db.exec(migration);
    await db.exec('create table public.acl_probe(id integer)');
    const result=await db.query<{rls:boolean;anon_exec:boolean;authenticated_exec:boolean;service_exec:boolean;trigger_enabled:string}>(`
      select c.relrowsecurity as rls,
        has_function_privilege('anon','public.rls_auto_enable()','EXECUTE') as anon_exec,
        has_function_privilege('authenticated','public.rls_auto_enable()','EXECUTE') as authenticated_exec,
        has_function_privilege('service_role','public.rls_auto_enable()','EXECUTE') as service_exec,
        e.evtenabled as trigger_enabled
      from pg_class c cross join pg_event_trigger e
      where c.relname='acl_probe' and e.evtname='ensure_rls'
    `);
    expect(result.rows).toEqual([{rls:true,anon_exec:false,authenticated_exec:false,service_exec:true,trigger_enabled:'O'}]);
  }finally{
    await db.close();
  }
});
