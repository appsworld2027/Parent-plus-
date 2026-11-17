-- Fictional data shared by PGlite decisions and independent PostgreSQL sessions.
insert into auth.users(id,email,email_confirmed_at)
select ('00000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid,'fixture'||n||'@example.test',clock_timestamp()-interval '1 day' from generate_series(1,8) n;
update auth.users set email_confirmed_at=null where id='00000000-0000-0000-0000-000000000006';
insert into public.academies(id,owner_id,name) values
('00000000-0000-0000-0000-000000000011','00000000-0000-0000-0000-000000000001','Academy A'),
('00000000-0000-0000-0000-000000000012','00000000-0000-0000-0000-000000000002','Academy B');
insert into public.students(id,academy_id,name) values
('00000000-0000-0000-0000-000000000021','00000000-0000-0000-0000-000000000011','Learner A'),
('00000000-0000-0000-0000-000000000022','00000000-0000-0000-0000-000000000011','Learner A2'),
('00000000-0000-0000-0000-000000000023','00000000-0000-0000-0000-000000000012','Learner B');
insert into public.batches(id,academy_id,name) values
('00000000-0000-0000-0000-000000000031','00000000-0000-0000-0000-000000000011','Batch A1'),
('00000000-0000-0000-0000-000000000032','00000000-0000-0000-0000-000000000011','Batch A2'),
('00000000-0000-0000-0000-000000000033','00000000-0000-0000-0000-000000000012','Batch B');
insert into public.enrolments(academy_id,student_id,batch_id,starts_on) values
('00000000-0000-0000-0000-000000000011','00000000-0000-0000-0000-000000000021','00000000-0000-0000-0000-000000000031','2020-01-01'),
('00000000-0000-0000-0000-000000000011','00000000-0000-0000-0000-000000000022','00000000-0000-0000-0000-000000000031','2020-01-01');
insert into public.class_sessions(id,academy_id,batch_id,starts_at,ends_at)
select ('00000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid,
  case when n=44 then '00000000-0000-0000-0000-000000000012' else '00000000-0000-0000-0000-000000000011' end::uuid,
  case when n=44 then '00000000-0000-0000-0000-000000000033' when n=43 then '00000000-0000-0000-0000-000000000032' else '00000000-0000-0000-0000-000000000031' end::uuid,
  now()-case when n=42 then interval '30 days' else interval '1 hour' end,
  now()-case when n=42 then interval '30 days'-interval '1 hour' else interval '0 hours' end from generate_series(41,44) n;
insert into public.observations(id,academy_id,batch_id,session_id,author_id,note,status,revision,recorded_at)
select ('00000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid,'00000000-0000-0000-0000-000000000011','00000000-0000-0000-0000-000000000031',
  case when n in (52,54,55) then '00000000-0000-0000-0000-000000000042' else '00000000-0000-0000-0000-000000000041' end::uuid,
  case when n in (51,55) then '00000000-0000-0000-0000-000000000003' else '00000000-0000-0000-0000-000000000001' end::uuid,
  'Fictional feedback '||n,case when n=53 then 'draft' else 'recorded' end,1,now()-case when n in (52,54,55) then interval '30 days' else interval '1 hour' end
  from generate_series(51,55) n;
insert into public.observation_recipients(academy_id,observation_id,batch_id,student_id)
select '00000000-0000-0000-0000-000000000011',id,'00000000-0000-0000-0000-000000000031','00000000-0000-0000-0000-000000000021' from public.observations;
insert into public.observation_recipients(academy_id,observation_id,batch_id,student_id) values
('00000000-0000-0000-0000-000000000011','00000000-0000-0000-0000-000000000054','00000000-0000-0000-0000-000000000031','00000000-0000-0000-0000-000000000022');
insert into public.parent_families(id,owner_id,parent_name,name) values('00000000-0000-0000-0000-000000000091','00000000-0000-0000-0000-000000000007','Private parent','Private family');
