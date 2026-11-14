import type { Batch, Enrolment, Student } from '../roster/model';
import { parseFee } from '../roster/model';

export type FeeContext = { students: Student[]; batches: Batch[]; enrolments: (Enrolment & { id: string })[] };
export type Invoice = { id: string; academy_id: string; enrolment_id: string; billing_month: string; due_on: string;
  amount_paise: number; paid_paise: number; balance_paise: number; excess_paise: number; test_paise: number;
  student_name: string; batch_name: string; created_at: string; created_by: string | null;
  voided_at: string | null; voided_by: string | null; void_reason: string | null };
export type FeePayment = { id: string; amount_paise: number; source: 'manual' | 'gateway'; mode: 'test' | 'live';
  paid_on: string | null; method: string | null; reference: string | null; recorded_at: string; recorded_by: string | null;
  reversal: { reason: string; reversed_at: string; reversed_by: string } | null };
export type FeeDetail = { invoice: Invoice; payments: FeePayment[] };
export type FeeOperation =
  | { kind: 'invoice'; id: string; enrolment: string; month: string; due: string; amount: number }
  | { kind: 'payment'; id: string; invoice: string; amount: number; date: string; method: 'cash' | 'bank' | 'upi' | 'other'; reference: string }
  | { kind: 'reverse'; id: string; invoice: string; payment: string; reason: string }
  | { kind: 'void'; id: string; invoice: string; reason: string };
export type PendingFee = { version: 1; owner: string; academy: string; operation: FeeOperation };

export function validDay(value: string) {
  return /^20\d{2}-\d{2}-\d{2}$|^2100-\d{2}-\d{2}$/.test(value)
    && Number.isFinite(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
}
export function validMonth(value: string) { return /^\d{4}-\d{2}$/.test(value) && validDay(`${value}-01`); }
export function nextMonth(value: string) {
  if (!validMonth(value)) return '';
  const [year, month] = value.split('-').map(Number);
  return `${year + (month === 12 ? 1 : 0)}-${String(month === 12 ? 1 : month + 1).padStart(2, '0')}-01`;
}
export function invoiceStatus(invoice: Invoice, today: string) {
  if (invoice.voided_at) return 'Voided';
  if (invoice.balance_paise === 0) return 'Paid';
  if (invoice.due_on < today) return invoice.paid_paise > 0 ? 'Overdue · partially paid' : 'Overdue';
  return invoice.paid_paise > 0 ? 'Partially paid' : 'Unpaid';
}
export function billingOptions(context: FeeContext, month: string) {
  if (!validMonth(month)) return [];
  return context.enrolments.flatMap(enrolment => {
    const student = context.students.find(s => s.id === enrolment.student_id && !s.archived_at);
    const batch = context.batches.find(b => b.id === enrolment.batch_id && !b.archived_at);
    return student && batch && enrolment.starts_on < nextMonth(month) && (!enrolment.ends_on || enrolment.ends_on >= `${month}-01`)
      ? [{ id: enrolment.id, student: student.name, batch: batch.name, amount: batch.monthly_fee_paise }] : [];
  });
}
export function paymentAmount(text: string, balance: number) {
  const amount = parseFee(text);
  return amount !== null && amount > 0 && amount <= balance ? amount : null;
}
export function operationSummary(operation: FeeOperation) {
  if (operation.kind === 'invoice') return `Create invoice for ${operation.month.slice(0, 7)}, due ${operation.due}`;
  if (operation.kind === 'payment') return `Manual ${operation.method} payment dated ${operation.date}`;
  return operation.kind === 'reverse' ? 'Reverse a manual payment record' : 'Void an invoice';
}
