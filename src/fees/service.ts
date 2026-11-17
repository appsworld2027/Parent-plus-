import { supabase } from '../auth/client';
import { diagnostics } from '../diagnostics';
import type { FeeContext, FeeDetail, FeeOperation, Invoice } from './model';

export function feeFailure(error: unknown, fallback: string) {
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
  const message = ['42P01', '42703', '42883', 'PGRST202', 'PGRST204', 'PGRST205'].includes(code)
    ? 'The fees database update is needed. Your coding partner has the setup script.'
    : code === '40001' ? 'The fee or balance changed. Refresh and review before trying again.'
    : code === '23505' ? 'An invoice or correction already exists. Refresh the saved records before trying again.'
    : code === '22023' ? 'Review the dates, amount and correction details. Existing payments must be corrected before voiding an invoice.'
    : code === '42501' ? 'This record is unavailable for your account. Refresh and sign in again if needed.' : fallback;
  let reference = 'unavailable';
  try { reference = diagnostics.record('FEE_FAILURE').reference; } catch { /* Keep original recovery usable. */ }
  return `${message} Reference: ${reference}`;
}
// These SQL/REST failures confirm a rejected transaction. Timeouts and unknown
// errors remain pending: retry the exact stored request instead of inventing an ID.
export function feeRejected(error: unknown) {
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
  return ['22023', '40001', '23505', '42501', '42P01', '42703', '42883', 'PGRST202', 'PGRST204', 'PGRST205'].includes(code);
}
export async function loadFeeContext(academy: string): Promise<FeeContext> {
  if (!supabase) throw new Error('Client unavailable');
  async function rows(table: string, columns: string) {
    const all: unknown[] = [];
    for (let offset = 0; ; offset += 500) {
      const result = await supabase!.from(table).select(columns).eq('academy_id', academy).order('id').range(offset, offset + 499);
      if (result.error) throw result.error;
      all.push(...(result.data ?? []));
      if ((result.data?.length ?? 0) < 500) return all;
    }
  }
  const [students, batches, enrolments] = await Promise.all([
    rows('students', 'id,name,archived_at'), rows('batches', 'id,name,monthly_fee_paise,archived_at'),
    rows('enrolments', 'id,student_id,batch_id,starts_on,ends_on'),
  ]);
  return { students, batches, enrolments } as FeeContext;
}
export async function listInvoices(academy: string, month: string, cursor?: Pick<Invoice, 'id' | 'created_at'>) {
  if (!supabase) throw new Error('Client unavailable');
  let query = supabase.from('fee_invoice_balances').select('*').eq('academy_id', academy).eq('billing_month', `${month}-01`)
    .order('created_at', { ascending: false }).order('id', { ascending: false }).limit(50);
  if (cursor) {
    // Stable keyset pagination retains equal-timestamp rows and is unaffected by
    // a newly issued invoice appearing before this page on another device.
    if (!/^[0-9a-f-]{36}$/.test(cursor.id) || !Number.isFinite(Date.parse(cursor.created_at)) || !/^[0-9T:.+Z-]+$/.test(cursor.created_at)) throw new Error('Invalid invoice cursor');
    query = query.or(`created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`);
  }
  const result = await query;
  if (result.error) throw result.error;
  const invoices = (result.data ?? []) as Invoice[];
  return { invoices, more: invoices.length === 50 };
}
export async function getInvoice(academy: string, id: string): Promise<FeeDetail> {
  if (!supabase) throw new Error('Client unavailable');
  const result = await supabase.rpc('get_fee_invoice', { target_academy: academy, target_invoice: id });
  if (result.error) throw result.error;
  const detail = result.data as FeeDetail | null;
  if (!detail?.invoice || detail.invoice.id !== id || detail.invoice.academy_id !== academy || !Array.isArray(detail.payments)) throw new Error('Invoice unavailable');
  return detail;
}
export async function executeFee(academy: string, operation: FeeOperation) {
  if (!supabase) throw new Error('Client unavailable');
  const o = operation;
  const result = o.kind === 'collection' ? await supabase.rpc('collect_student_fee', { target_academy: academy, target_enrolment: o.enrolment, month_start: o.month,
    expected_invoice: o.invoice, expected_fee: o.fee, payment_request: o.id, payment_amount: o.amount, payment_date: o.date, payment_method: o.method, payment_reference: o.reference })
    : o.kind === 'invoice' ? await supabase.rpc('create_fee_invoice', { target_academy: academy, target_invoice: o.id,
    target_enrolment: o.enrolment, month_start: o.month, due_date: o.due, expected_fee_paise: o.amount })
    : o.kind === 'payment' ? await supabase.rpc('record_manual_fee_payment', { target_academy: academy, target_invoice: o.invoice,
      payment_request: o.id, payment_amount: o.amount, payment_date: o.date, payment_method: o.method, payment_reference: o.reference })
    : o.kind === 'reverse' ? await supabase.rpc('reverse_manual_fee_payment', { target_academy: academy, target_payment: o.payment,
      reversal_request: o.id, correction_reason: o.reason })
    : await supabase.rpc('void_fee_invoice', { target_academy: academy, target_invoice: o.invoice, correction_reason: o.reason });
  if (result.error) throw result.error;
  if (typeof result.data !== 'string') throw new Error('Save result not confirmed');
  return o.kind === 'collection' ? result.data : o.kind === 'invoice' ? o.id : o.invoice;
}

export async function allMonthInvoices(academy: string, month: string): Promise<Invoice[]> {
  const all: Invoice[] = [];
  let cursor: Pick<Invoice,'id'|'created_at'> | undefined;
  for (;;) {
    const page = await listInvoices(academy,month,cursor);
    all.push(...page.invoices);
    if (!page.more) return all;
    const next=page.invoices.at(-1)!;
    if (next.id===cursor?.id) throw new Error('Invoice pagination did not advance');
    cursor=next;
  }
}
