begin;
insert into auth.users(id,email,email_confirmed_at) values
 ('00000000-0000-0000-0000-000000000001','coach@example.test',now()),
 ('00000000-0000-0000-0000-000000000002','parent@example.test',now()),
 ('00000000-0000-0000-0000-000000000003','other@example.test',now());
insert into public.academies(id,owner_id,name) values('00000000-0000-0000-0000-000000000011','00000000-0000-0000-0000-000000000001','Test academy');
insert into public.students(id,academy_id,name) values('00000000-0000-0000-0000-000000000021','00000000-0000-0000-0000-000000000011','Test student');
insert into public.batches(id,academy_id,name) values('00000000-0000-0000-0000-000000000031','00000000-0000-0000-0000-000000000011','Art');
insert into public.enrolments(academy_id,student_id,batch_id,starts_on) values('00000000-0000-0000-0000-000000000011','00000000-0000-0000-0000-000000000021','00000000-0000-0000-0000-000000000031','2020-01-01');
insert into public.class_sessions(academy_id,batch_id,starts_at,ends_at) values('00000000-0000-0000-0000-000000000011','00000000-0000-0000-0000-000000000031','2026-11-16T10:00Z','2026-11-16T11:00Z');
insert into public.parent_families(id,owner_id,parent_name,name) values('00000000-0000-0000-0000-000000000061','00000000-0000-0000-0000-000000000002','Parent','Family');
insert into public.family_children(id,family_id,name) values('00000000-0000-0000-0000-000000000071','00000000-0000-0000-0000-000000000061','Child');
do $$ declare code text; request uuid; begin
 perform set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
 code:=public.issue_parent_link_invite('00000000-0000-0000-0000-000000000011','00000000-0000-0000-0000-000000000021','parent@example.test');
 perform set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
 request:=public.claim_parent_link(code,'00000000-0000-0000-0000-000000000071');
 perform set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
 perform public.review_parent_connection_request(request,true);
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
do $$ begin
 if (select count(*) from public.get_parent_attendance_sessions('00000000-0000-0000-0000-000000000071','2026-11-16'))<>1 then raise exception 'Missing approved own-child session'; end if;
 if exists(select 1 from public.get_parent_attendance_sessions('00000000-0000-0000-0000-000000000071','2026-11-16') where attendance_status is not null) then raise exception 'Unrecorded attendance invented'; end if;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',true);
do $$ begin
 if exists(select 1 from public.get_parent_attendance_sessions('00000000-0000-0000-0000-000000000071','2026-11-16')) then raise exception 'Foreign family disclosed'; end if;
end $$;
reset role;
update auth.users set banned_until=now()+interval '1 day' where id='00000000-0000-0000-0000-000000000002';
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
do $$ begin
 begin
  perform * from public.get_parent_attendance_sessions('00000000-0000-0000-0000-000000000071','2026-11-16');
  raise exception 'Banned actor accepted';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
do $$ begin
 if has_function_privilege('anon','public.get_parent_attendance_sessions(uuid,date,timestamptz,uuid)','execute') then raise exception 'Anonymous API execute'; end if;
 if has_function_privilege('service_role','public.get_parent_attendance_sessions(uuid,date,timestamptz,uuid)','execute') then raise exception 'Service API execute'; end if;
 if has_function_privilege('authenticated','coach_private.parent_attendance_sessions(uuid,date,timestamptz,uuid)','execute') then raise exception 'Private helper execute'; end if;
end $$;
rollback;
