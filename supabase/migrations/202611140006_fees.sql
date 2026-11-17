-- Module 6: immutable monthly invoices and an attributable manual-payment ledger.
begin;
do $$ begin
  if not exists(select 1 from coach_private.schema_migrations where version='202611120005') then
    raise exception 'Apply coach updates through 005 first.';
  end if;
end $$;

alter table public.fee_invoices add column if not exists student_name text;
alter table public.fee_invoices add column if not exists batch_name text;
alter table public.fee_invoices add column if not exists created_by uuid references auth.users(id);
alter table public.fee_invoices add column if not exists voided_at timestamptz;
alter table public.fee_invoices add column if not exists voided_by uuid references auth.users(id);
alter table public.fee_invoices add column if not exists void_reason text;
-- Preserve existing amounts. Names of any legacy records can only be snapshotted
-- at upgrade time; new invoices capture them at issue time.
update public.fee_invoices i set student_name=s.name, batch_name=b.name
  from public.enrolments e join public.students s on s.id=e.student_id join public.batches b on b.id=e.batch_id
  where i.enrolment_id=e.id and (i.student_name is null or i.batch_name is null);
alter table public.fee_invoices alter column student_name set not null;
alter table public.fee_invoices alter column batch_name set not null;
alter table public.fee_invoices drop constraint if exists fee_invoices_enrolment_id_billing_month_key;
create unique index if not exists fee_invoices_active_month_idx
  on public.fee_invoices(enrolment_id,billing_month) where voided_at is null;

alter table public.fee_payments add column if not exists paid_on date;
alter table public.fee_payments add column if not exists method text check(method in ('cash','bank','upi','other'));
alter table public.fee_payments add column if not exists reference text check(length(reference)<=120);
alter table public.fee_payments add column if not exists recorded_by uuid references auth.users(id);
create table if not exists public.fee_payment_reversals (
  payment_id uuid primary key references public.fee_payments(id),
  academy_id uuid not null references public.academies(id),
  request_id uuid not null unique,
  reason text not null check(length(trim(reason)) between 1 and 500),
  reversed_by uuid not null references auth.users(id),
  reversed_at timestamptz not null default now()
);
alter table public.fee_payment_reversals enable row level security;
revoke all on public.fee_payment_reversals from public,anon,authenticated;
grant select on public.fee_payment_reversals to authenticated;
grant all on public.fee_payment_reversals to service_role;
drop policy if exists academy_access on public.fee_payment_reversals;
create policy academy_access on public.fee_payment_reversals for select to authenticated
  using(coach_private.owns_academy(academy_id));
create index if not exists fee_payment_reversals_academy_idx on public.fee_payment_reversals(academy_id);
create index if not exists fee_payments_invoice_idx on public.fee_payments(invoice_id);
revoke insert,update,delete on public.fee_invoices,public.fee_payments from authenticated;

-- Invoker view retains the underlying tables' RLS. Test gateway receipts never
-- settle a real invoice; reversed entries remain in the ledger but leave totals.
create or replace view public.fee_invoice_balances with (security_invoker=true) as
  select i.*, coalesce(p.paid_paise,0)::bigint as paid_paise,
    coalesce(p.test_paise,0)::bigint as test_paise,
    greatest(i.amount_paise-coalesce(p.paid_paise,0),0)::bigint as balance_paise,
    greatest(coalesce(p.paid_paise,0)-i.amount_paise,0)::bigint as excess_paise
  from public.fee_invoices i left join lateral (
    select sum(p.amount_paise) filter(where p.mode='live') as paid_paise,
      sum(p.amount_paise) filter(where p.mode='test') as test_paise
    from public.fee_payments p where p.invoice_id=i.id
      and not exists(select 1 from public.fee_payment_reversals r where r.payment_id=p.id)
  ) p on true;
revoke all on public.fee_invoice_balances from public,anon;
grant select on public.fee_invoice_balances to authenticated,service_role;

create or replace function public.create_fee_invoice(target_academy uuid, target_invoice uuid,
  target_enrolment uuid, month_start date, due_date date, expected_fee_paise bigint)
returns uuid language plpgsql security definer set search_path='' as $$
declare existing public.fee_invoices; fee bigint; child text; batch text;
begin
  if not coach_private.owns_academy(target_academy) or target_invoice is null then
    raise exception 'Invoice unavailable' using errcode='42501';
  end if;
  -- All billing mutations lock the same academy first, serializing balance
  -- decisions and exact-request retries on concurrent devices.
  perform 1 from public.academies where id=target_academy for update;
  select * into existing from public.fee_invoices where id=target_invoice;
  if existing.id is not null then
    if existing.academy_id<>target_academy then raise exception 'Invoice unavailable' using errcode='42501'; end if;
    if existing.enrolment_id is distinct from target_enrolment or existing.billing_month is distinct from month_start
      or existing.due_on is distinct from due_date or existing.amount_paise is distinct from expected_fee_paise then
      raise exception 'Request details changed' using errcode='22023';
    end if;
    return existing.id;
  end if;
  if month_start is null or month_start not between date '2000-01-01' and date '2100-12-01'
    or extract(day from month_start)<>1 or due_date is null or due_date not between date '2000-01-01' and date '2100-12-31'
    or expected_fee_paise is null or expected_fee_paise not between 1 and 100000000000 then
    raise exception 'Check billing month, fee and due date' using errcode='22023';
  end if;
  select b.monthly_fee_paise,s.name,b.name into fee,child,batch from public.enrolments e
    join public.students s on s.id=e.student_id join public.batches b on b.id=e.batch_id
    where e.id=target_enrolment and e.academy_id=target_academy and s.archived_at is null and b.archived_at is null
      and e.starts_on<(month_start+interval '1 month')::date and (e.ends_on is null or e.ends_on>=month_start)
    for share of e,s,b;
  if fee is null then raise exception 'Enrolment unavailable for this month' using errcode='22023'; end if;
  if fee<>expected_fee_paise then raise exception 'Fee changed; review current fee' using errcode='40001'; end if;
  insert into public.fee_invoices(id,academy_id,enrolment_id,billing_month,due_on,amount_paise,student_name,batch_name,created_by)
    values(target_invoice,target_academy,target_enrolment,month_start,due_date,fee,child,batch,auth.uid());
  return target_invoice;
end $$;

create or replace function public.record_manual_fee_payment(target_academy uuid, target_invoice uuid,
  payment_request uuid, payment_amount bigint, payment_date date, payment_method text, payment_reference text)
returns uuid language plpgsql security definer set search_path='' as $$
declare existing public.fee_payments; invoice public.fee_invoices; paid bigint; local_day date; result uuid;
begin
  if not coach_private.owns_academy(target_academy) then raise exception 'Invoice unavailable' using errcode='42501'; end if;
  perform 1 from public.academies where id=target_academy for update;
  select * into invoice from public.fee_invoices where id=target_invoice and academy_id=target_academy;
  if invoice.id is null then raise exception 'Invoice unavailable' using errcode='42501'; end if;
  select * into existing from public.fee_payments where request_id=payment_request;
  if existing.id is not null then
    if existing.academy_id<>target_academy or existing.invoice_id<>target_invoice or existing.source<>'manual'
      or existing.amount_paise is distinct from payment_amount or existing.paid_on is distinct from payment_date
      or existing.method is distinct from payment_method or existing.reference is distinct from trim(payment_reference) then
      raise exception 'Request details changed' using errcode='22023';
    end if;
    return existing.id;
  end if;
  select (now() at time zone timezone)::date into local_day from public.academies where id=target_academy;
  if payment_request is null or payment_amount is null or payment_amount not between 1 and 100000000000
    or payment_date is null or payment_date<date '2000-01-01' or payment_date>local_day
    or payment_method is null or payment_method not in ('cash','bank','upi','other')
    or payment_reference is null or length(payment_reference)>120 or invoice.voided_at is not null then
    raise exception 'Check payment details' using errcode='22023';
  end if;
  select paid_paise into paid from public.fee_invoice_balances where id=target_invoice;
  if payment_amount>invoice.amount_paise-paid then raise exception 'Balance changed; review invoice' using errcode='40001'; end if;
  -- A manual entry records money received outside this app. It cannot supply
  -- provider verification fields or choose gateway/test mode.
  insert into public.fee_payments(academy_id,invoice_id,amount_paise,source,mode,request_id,paid_on,method,reference,recorded_by)
    values(target_academy,target_invoice,payment_amount,'manual','live',payment_request,payment_date,payment_method,trim(payment_reference),auth.uid()) returning id into result;
  return result;
end $$;

create or replace function public.reverse_manual_fee_payment(target_academy uuid, target_payment uuid,
  reversal_request uuid, correction_reason text)
returns uuid language plpgsql security definer set search_path='' as $$
declare payment public.fee_payments; existing public.fee_payment_reversals;
begin
  if not coach_private.owns_academy(target_academy) then raise exception 'Payment unavailable' using errcode='42501'; end if;
  perform 1 from public.academies where id=target_academy for update;
  select * into payment from public.fee_payments where id=target_payment and academy_id=target_academy;
  if payment.id is null then raise exception 'Payment unavailable' using errcode='42501'; end if;
  if reversal_request is null or correction_reason is null or length(trim(correction_reason)) not between 1 and 500
    or trim(correction_reason) !~ '[^[:space:]]' or payment.source<>'manual' then
    raise exception 'Check manual correction details' using errcode='22023';
  end if;
  select * into existing from public.fee_payment_reversals where payment_id=target_payment or request_id=reversal_request;
  if existing.payment_id is not null then
    if existing.payment_id<>target_payment or existing.request_id<>reversal_request or existing.reason<>trim(correction_reason) then
      raise exception 'Correction already recorded; refresh' using errcode='40001';
    end if;
    return target_payment;
  end if;
  insert into public.fee_payment_reversals(payment_id,academy_id,request_id,reason,reversed_by)
    values(target_payment,target_academy,reversal_request,trim(correction_reason),auth.uid());
  return target_payment;
end $$;

create or replace function public.void_fee_invoice(target_academy uuid, target_invoice uuid, correction_reason text)
returns uuid language plpgsql security definer set search_path='' as $$
declare invoice public.fee_invoices;
begin
  if not coach_private.owns_academy(target_academy) then raise exception 'Invoice unavailable' using errcode='42501'; end if;
  perform 1 from public.academies where id=target_academy for update;
  select * into invoice from public.fee_invoices where id=target_invoice and academy_id=target_academy;
  if invoice.id is null then raise exception 'Invoice unavailable' using errcode='42501'; end if;
  if correction_reason is null or length(trim(correction_reason)) not between 1 and 500 or trim(correction_reason) !~ '[^[:space:]]' then
    raise exception 'Enter a correction reason' using errcode='22023';
  end if;
  if invoice.voided_at is not null then
    if invoice.void_reason<>trim(correction_reason) then raise exception 'Invoice already voided; refresh' using errcode='40001'; end if;
    return target_invoice;
  end if;
  if exists(select 1 from public.fee_payments p where p.invoice_id=target_invoice
    and not exists(select 1 from public.fee_payment_reversals r where r.payment_id=p.id)) then
    raise exception 'Correct existing payment records first' using errcode='22023';
  end if;
  update public.fee_invoices set voided_at=now(),voided_by=auth.uid(),void_reason=trim(correction_reason) where id=target_invoice;
  return target_invoice;
end $$;

-- A single statement gives the detail screen a consistent ledger/balance snapshot.
create or replace function public.get_fee_invoice(target_academy uuid, target_invoice uuid)
returns jsonb language sql stable security invoker set search_path='' as $$
  select jsonb_build_object('invoice',to_jsonb(i),'payments',coalesce((
    select jsonb_agg(to_jsonb(p)||jsonb_build_object('reversal',to_jsonb(r)) order by p.recorded_at desc,p.id desc)
      from public.fee_payments p left join public.fee_payment_reversals r on r.payment_id=p.id where p.invoice_id=i.id
  ),'[]'::jsonb)) from public.fee_invoice_balances i where i.academy_id=target_academy and i.id=target_invoice;
$$;
revoke all on function public.create_fee_invoice(uuid,uuid,uuid,date,date,bigint),
  public.record_manual_fee_payment(uuid,uuid,uuid,bigint,date,text,text),
  public.reverse_manual_fee_payment(uuid,uuid,uuid,text), public.void_fee_invoice(uuid,uuid,text),
  public.get_fee_invoice(uuid,uuid) from public,anon;
grant execute on function public.create_fee_invoice(uuid,uuid,uuid,date,date,bigint),
  public.record_manual_fee_payment(uuid,uuid,uuid,bigint,date,text,text),
  public.reverse_manual_fee_payment(uuid,uuid,uuid,text), public.void_fee_invoice(uuid,uuid,text),
  public.get_fee_invoice(uuid,uuid) to authenticated;
insert into coach_private.schema_migrations(version) values('202611140006') on conflict do nothing;
notify pgrst,'reload schema';
commit;
