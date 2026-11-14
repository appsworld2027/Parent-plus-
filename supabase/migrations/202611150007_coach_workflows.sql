begin;
do $$ begin
  if not exists(select 1 from coach_private.schema_migrations where version='202611140006') then
    raise exception 'Apply update006 first';
  end if;
end $$;

alter table public.students add column if not exists proficiency_level text not null default 'unassessed'
  check(proficiency_level in ('unassessed','new','beginner','intermediate','advanced'));

create or replace function public.save_student_profile(target_academy uuid,target_student uuid,student_name text,
  age_years integer,guardian_name text,guardian_email text,guardian_phone text,batch_ids uuid[],student_level text)
returns uuid language plpgsql security definer set search_path='' as $$
begin
  if not coach_private.owns_academy(target_academy) then raise exception 'Student unavailable' using errcode='42501'; end if;
  if student_level is null or student_level not in ('unassessed','new','beginner','intermediate','advanced') then
    raise exception 'Choose a learning level' using errcode='22023';
  end if;
  perform public.save_student(target_academy,target_student,student_name,age_years,guardian_name,guardian_email,guardian_phone,batch_ids);
  update public.students set proficiency_level=student_level where id=target_student and academy_id=target_academy;
  return target_student;
end $$;
revoke all on function public.save_student_profile(uuid,uuid,text,integer,text,text,text,uuid[],text) from public,anon;
grant execute on function public.save_student_profile(uuid,uuid,text,integer,text,text,text,uuid[],text) to authenticated;

create or replace function public.add_batch_students(target_academy uuid,target_batch uuid,student_ids uuid[])
returns integer language plpgsql security definer set search_path='' as $$
declare child uuid; local_day date; added integer:=0; changed integer;
begin
  if not coach_private.owns_academy(target_academy) then raise exception 'Batch unavailable' using errcode='42501'; end if;
  perform 1 from public.batches where id=target_batch and academy_id=target_academy and archived_at is null for update;
  if not found then raise exception 'Batch unavailable' using errcode='42501'; end if;
  if student_ids is null or cardinality(student_ids) not between 1 and 500 or array_position(student_ids,null) is not null then
    raise exception 'Choose students' using errcode='22023';
  end if;
  select (now() at time zone timezone)::date into local_day from public.academies where id=target_academy;
  foreach child in array student_ids loop
    if not exists(select 1 from public.students where id=child and academy_id=target_academy and archived_at is null)
      or exists(select 1 from public.enrolments where academy_id=target_academy and student_id=child and batch_id=target_batch and ends_on is not null) then
      raise exception 'Review selected students and enrolment dates' using errcode='22023';
    end if;
    insert into public.enrolments(academy_id,student_id,batch_id,starts_on)
      values(target_academy,child,target_batch,local_day) on conflict(academy_id,student_id,batch_id) do nothing;
    get diagnostics changed=row_count; added:=added+changed;
  end loop;
  return added;
end $$;

-- The coach records a receipt from a student's row. Create the trusted monthly
-- charge only when required, in the same transaction as the receipt. An invalid
-- receipt rolls both back; exact retries are checked before current roster state.
create or replace function public.collect_student_fee(target_academy uuid,target_enrolment uuid,month_start date,
  expected_invoice uuid,expected_fee bigint,payment_request uuid,payment_amount bigint,payment_date date,payment_method text,payment_reference text)
returns uuid language plpgsql security definer set search_path='' as $$
declare invoice public.fee_invoices; prior public.fee_payments; invoice_id uuid;
begin
  if not coach_private.owns_academy(target_academy) then raise exception 'Fee unavailable' using errcode='42501'; end if;
  perform 1 from public.academies where id=target_academy for update;
  select * into prior from public.fee_payments where request_id=payment_request;
  if prior.id is not null then
    select * into invoice from public.fee_invoices where id=prior.invoice_id;
    if prior.academy_id<>target_academy or invoice.enrolment_id is distinct from target_enrolment
      or invoice.billing_month is distinct from month_start or invoice.amount_paise is distinct from expected_fee
      or (expected_invoice is not null and expected_invoice<>invoice.id) then
      raise exception 'Request details changed' using errcode='22023';
    end if;
    perform public.record_manual_fee_payment(target_academy,invoice.id,payment_request,payment_amount,payment_date,payment_method,payment_reference);
    return invoice.id;
  end if;
  select * into invoice from public.fee_invoices where academy_id=target_academy and enrolment_id=target_enrolment
    and billing_month=month_start and voided_at is null;
  if invoice.id is distinct from expected_invoice then raise exception 'Fee changed; refresh' using errcode='40001'; end if;
  if invoice.id is null then
    invoice_id:=public.create_fee_invoice(target_academy,payment_request,target_enrolment,month_start,
      (month_start+interval '1 month'-interval '1 day')::date,expected_fee);
  else
    if invoice.amount_paise is distinct from expected_fee then raise exception 'Fee changed; refresh' using errcode='40001'; end if;
    invoice_id:=invoice.id;
  end if;
  perform public.record_manual_fee_payment(target_academy,invoice_id,payment_request,payment_amount,payment_date,payment_method,payment_reference);
  return invoice_id;
end $$;
revoke all on function public.add_batch_students(uuid,uuid,uuid[]),
  public.collect_student_fee(uuid,uuid,date,uuid,bigint,uuid,bigint,date,text,text) from public,anon;
grant execute on function public.add_batch_students(uuid,uuid,uuid[]),
  public.collect_student_fee(uuid,uuid,date,uuid,bigint,uuid,bigint,date,text,text) to authenticated;
insert into coach_private.schema_migrations(version) values('202611150007') on conflict do nothing;
notify pgrst,'reload schema';
commit;
