-- Retired standalone prototype: compatibility check only, NOT an owner update.
-- The F1 + F2 kernel candidates now provide the canonical helper. Never replace
-- it with the older STABLE/statement-time definition when combining branches.
begin;
do $$ begin
  if to_regclass('coach_private.workspace_foundation_revisions') is null then
    raise exception 'Standalone eligibility prototype retired; use the isolated F1 and F2 kernel candidates first';
  end if;
  if not exists(select 1 from coach_private.workspace_foundation_revisions where version='202611170016-f2-kernel-candidate')
    or not exists(select 1 from pg_catalog.pg_proc p where p.oid=to_regprocedure('coach_private.workspace_actor_eligible()') and p.provolatile='v' and p.prosecdef) then
    raise exception 'The canonical isolated F2 eligibility helper is required';
  end if;
end $$;
commit;
