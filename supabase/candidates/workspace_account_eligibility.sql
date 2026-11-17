-- Isolated F2 building block only. NOT a production migration/owner update.
-- No current RLS policy or public RPC calls this helper yet.
begin;
create or replace function coach_private.workspace_actor_eligible()
returns boolean language sql stable security definer set search_path='' as $$
 select exists(
   select 1 from auth.users u
   where u.id=(select auth.uid())
     and u.email_confirmed_at is not null
     and u.deleted_at is null
     and (u.banned_until is null or u.banned_until<=pg_catalog.statement_timestamp())
 );
$$;
revoke all on function coach_private.workspace_actor_eligible() from public,anon,authenticated,service_role;
commit;
