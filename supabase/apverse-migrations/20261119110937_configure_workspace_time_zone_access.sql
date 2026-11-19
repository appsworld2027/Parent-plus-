-- The existing function validates auth.uid(), current owner/admin membership,
-- active workspace state, IANA time zones, and one-time configuration. Let it
-- perform only this narrow protected update without granting table UPDATE.
begin;

alter function public.configure_private_workspace_zone(uuid,text) security definer;
revoke all on function public.configure_private_workspace_zone(uuid,text) from public,anon,service_role;
grant execute on function public.configure_private_workspace_zone(uuid,text) to authenticated;

commit;
