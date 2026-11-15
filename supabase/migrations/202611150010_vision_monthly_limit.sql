begin;
do $$ begin
  if not exists(select 1 from coach_private.schema_migrations where version='202611150009') then raise exception 'Apply update009 first'; end if;
end $$;
create table if not exists coach_private.vision_scan_months (
  month date primary key check(extract(day from month)=1),
  attempts integer not null check(attempts between 1 and 900)
);
revoke all on coach_private.vision_scan_months from public,anon,authenticated;
create or replace function public.reserve_vision_roster_scan(target_academy uuid)
returns void language plpgsql security definer set search_path='' as $$
declare used integer; utc_month date:=date_trunc('month',now() at time zone 'UTC')::date;
begin
  -- One shared budget across academies. Reserve before the external OCR call;
  -- failed/unknown provider outcomes remain counted, so retries cannot overspend.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('parentplus-vision-'||utc_month::text,0));
  select attempts into used from coach_private.vision_scan_months where month=utc_month;
  if coalesce(used,0)>=900 then raise exception 'Monthly scan allowance reached' using errcode='P0002'; end if;
  perform public.reserve_roster_scan(target_academy);
  insert into coach_private.vision_scan_months(month,attempts) values(utc_month,1)
    on conflict(month) do update set attempts=coach_private.vision_scan_months.attempts+1;
end $$;
revoke all on function public.reserve_vision_roster_scan(uuid) from public,anon,authenticated;
grant execute on function public.reserve_vision_roster_scan(uuid) to service_role;
insert into coach_private.schema_migrations(version) values('202611150010') on conflict do nothing;
notify pgrst,'reload schema';
commit;
