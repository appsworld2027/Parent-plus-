# Verify installed observation update 005

Read-only metadata query for the owner SQL editor. It does not fetch student/note contents or write records. Run in a new query after installing005. Expect eight PASS rows. A CHECK NEEDED row requires investigation before accepting deployment; do not rerun setup blindly.

This verifier was executed against the tested migrations in disposable PostgreSQL: eight PASS rows. A deliberately unsafe disposable fixture (RLS disabled, anonymous table/function grants, an extra permissive owner policy and invoker function) produced all five expected security failures. The normalized function-body fingerprint ignores whitespace and SQL line comments to allow the comment-free owner copy.

```sql
with save_function as (
  select oid, prosrc, prosecdef, proconfig
  from pg_proc
  where oid = to_regprocedure('public.save_observation(uuid,uuid,integer,uuid,uuid,text,uuid[],text,text)')
), checks as (
  select 1 as step, '005 registered' as check_name,
    exists(select 1 from coach_private.schema_migrations where version='202611120005') as passed
  union all
  select 2, 'Observation columns ready',
    (select count(*)=5 from information_schema.columns
      where table_schema='public' and table_name='observations'
      and column_name in ('revision','audience','updated_at','updated_by','recorded_at'))
  union all
  select 3, 'Row security enabled',
    (select count(*)=3 and bool_and(relrowsecurity) from pg_class
      where oid in (to_regclass('public.observations'),to_regclass('public.observation_recipients'),to_regclass('public.observation_versions')))
  union all
  select 4, 'Owner policies protected',
    (select count(*)=3 and bool_and(
      polname='academy_access'
      and polroles=array[(select oid from pg_roles where rolname='authenticated')]
      and pg_get_expr(polqual,polrelid)='coach_private.owns_academy(academy_id)'
      and ((polrelid=to_regclass('public.observation_versions') and polcmd='r')
        or (polrelid<>to_regclass('public.observation_versions') and polcmd='*'
          and pg_get_expr(polwithcheck,polrelid)='coach_private.owns_academy(academy_id)')))
    from pg_policy where polrelid in (to_regclass('public.observations'),to_regclass('public.observation_recipients'),to_regclass('public.observation_versions')))
  union all
  select 5, 'Table permissions protected',
    (select count(*)=3 and bool_and(
      has_table_privilege('authenticated',oid,'SELECT')
      and not has_any_column_privilege('anon',oid,'SELECT,INSERT,UPDATE,REFERENCES')
      and not has_table_privilege('anon',oid,'DELETE,TRUNCATE,TRIGGER')
      and not has_any_column_privilege('authenticated',oid,'INSERT,UPDATE,REFERENCES')
      and not has_table_privilege('authenticated',oid,'DELETE,TRUNCATE,TRIGGER'))
    from pg_class where oid in (to_regclass('public.observations'),to_regclass('public.observation_recipients'),to_regclass('public.observation_versions')))
  union all
  select 6, 'Save function permissions ready',
    exists(select 1 from save_function where
      has_function_privilege('authenticated',oid,'EXECUTE')
      and not has_function_privilege('anon',oid,'EXECUTE'))
  union all
  select 7, 'Save function security ready',
    exists(select 1 from save_function where prosecdef and proconfig @> array['search_path=""'])
  union all
  select 8, 'Save logic matches tested version',
    exists(select 1 from save_function where
      md5(regexp_replace(regexp_replace(prosrc,E'--[^\n\r]*','','g'),'[[:space:]]','','g'))='5f730010d9b8f0f44e13a77ec44746fb')
)
select check_name, case when passed then 'PASS' else 'CHECK NEEDED' end as result
from checks order by step;
```


## Owner mobile-editor follow-up

The owner editor rejected the combined query above; its cause was not proven. Use smaller checks instead. Live screenshots now confirm all three tables have RLS enabled and each has exactly one authenticated owner-only policy. The remaining read-only checks below avoid the CTE and escaped newline expression. They return five true rows on the correct disposable schema and flag deliberately unsafe table grants/function mode. Two known function-body fingerprints accept either the original comments or the comment-free owner copy, ignoring whitespace only.

```sql
select '005 recorded' as check_name,
  exists(select 1 from coach_private.schema_migrations
    where version='202611120005') as passed
union all
select 'Observation columns ready', count(*)=5
from information_schema.columns
where table_schema='public' and table_name='observations'
  and column_name in ('revision','audience','updated_at','updated_by','recorded_at')
union all
select 'Direct writes blocked', count(*)=3 and bool_and(
  has_table_privilege('authenticated',oid,'SELECT')
  and not has_any_column_privilege('anon',oid,'SELECT,INSERT,UPDATE,REFERENCES')
  and not has_table_privilege('anon',oid,'DELETE,TRUNCATE,TRIGGER')
  and not has_any_column_privilege('authenticated',oid,'INSERT,UPDATE,REFERENCES')
  and not has_table_privilege('authenticated',oid,'DELETE,TRUNCATE,TRIGGER'))
from pg_class
where oid in ('public.observations'::regclass,
  'public.observation_recipients'::regclass,
  'public.observation_versions'::regclass)
union all
select 'Save function protected', count(*)=1 and bool_and(
  prosecdef and proconfig @> array['search_path=""']
  and has_function_privilege('authenticated',oid,'EXECUTE')
  and not has_function_privilege('anon',oid,'EXECUTE'))
from pg_proc
where oid=to_regprocedure('public.save_observation(uuid,uuid,integer,uuid,uuid,text,uuid[],text,text)')
union all
select 'Saved logic matches', count(*)=1 and bool_and(
  md5(regexp_replace(prosrc,'[[:space:]]','','g'))
  in ('8e13e286dd58aada0ecb6bafb94b7986','5f730010d9b8f0f44e13a77ec44746fb'))
from pg_proc
where oid=to_regprocedure('public.save_observation(uuid,uuid,integer,uuid,uuid,text,uuid[],text,text)');
```
