import type { FeeContext, Invoice } from './model';
import { billingOptions } from './model';
export type StudentFee = { enrolment: string; studentId: string; student: string; batchId: string; batch: string;
  expected: number; collected: number; pending: number; invoice: Invoice | null; voided: boolean; archived: boolean };
export type FeeTotals = { students: number; expected: number; collected: number; pending: number };
export function feeTotals(rows: StudentFee[]): FeeTotals {
  return { students: new Set(rows.map(row => row.studentId)).size,
    expected: rows.reduce((n,r) => n+r.expected,0), collected: rows.reduce((n,r) => n+r.collected,0), pending: rows.reduce((n,r) => n+r.pending,0) };
}
// Enrolments without an issued charge still contribute their monthly fee. This
// keeps unbilled students visible instead of pretending their pending amount is0.
// Issued charges retain their historical snapshot; cancelled charges are not
// silently re-created as debt. Distinct students are counted once across batches.
export function feeOverview(context: FeeContext, invoices: Invoice[], month: string) {
  const eligible = new Set(billingOptions(context,month).map(row => row.id));
  const rows: StudentFee[] = [];
  for (const enrolment of context.enrolments) {
    const charges = invoices.filter(i => i.enrolment_id === enrolment.id && i.billing_month === `${month}-01`);
    const invoice = charges.find(i => !i.voided_at) ?? null;
    if (!eligible.has(enrolment.id) && !invoice) continue;
    const student = context.students.find(s => s.id === enrolment.student_id);
    const batch = context.batches.find(b => b.id === enrolment.batch_id);
    const voided = !invoice && charges.some(i => !!i.voided_at);
    const expected = invoice?.amount_paise ?? (voided ? 0 : batch?.monthly_fee_paise ?? 0);
    rows.push({ enrolment: enrolment.id, studentId: enrolment.student_id, student: invoice?.student_name ?? student?.name ?? 'Former student',
      batchId: enrolment.batch_id, batch: invoice?.batch_name ?? batch?.name ?? 'Former batch', expected,
      collected: invoice?.paid_paise ?? 0, pending: invoice?.balance_paise ?? expected, invoice, voided, archived: !!student?.archived_at });
  }
  rows.sort((a,b) => a.student.localeCompare(b.student) || a.enrolment.localeCompare(b.enrolment));
  const batchIds = [...new Set(rows.map(row => row.batchId))];
  const batches = batchIds.map(id => { const students=rows.filter(row => row.batchId===id);return { id,name: students[0].batch, rows: students,...feeTotals(students) }; });
  return { rows, batches, ...feeTotals(rows) };
}
