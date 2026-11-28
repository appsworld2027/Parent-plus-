import type { Invoice } from '../fees/model';
import type { Enrolment, Student } from '../roster/model';

export type OverdueFees = { students: number; pendingPaise: number };
type EnrolmentRow = Enrolment & { id?: string };

export type OverdueRow = { studentId: string; name: string; batches: string[]; months: string[]; paise: number; oldest: string };

// Overdue = due before today, money still owed, not voided, student not archived, enrolment active today.
// One row per student (not invoice); the amount sums remaining balances; oldest due date first. Due today is not overdue.
export function overdueRows(invoices: Invoice[], students: Student[], enrolments: EnrolmentRow[], today: string): OverdueRow[] {
  const enrolmentStudent = new Map(enrolments.filter(e => e.id).map(e => [e.id as string, e]));
  const active = new Map(students.filter(s => !s.archived_at).map(s => [s.id, s]));
  const rows = new Map<string, OverdueRow>();
  for (const invoice of invoices) {
    if (invoice.voided_at || invoice.balance_paise <= 0 || invoice.due_on >= today) continue;
    const enrolment = enrolmentStudent.get(invoice.enrolment_id);
    if (!enrolment || !active.has(enrolment.student_id)) continue;
    if (enrolment.starts_on > today || (enrolment.ends_on && enrolment.ends_on < today)) continue;
    const row = rows.get(enrolment.student_id) ?? { studentId: enrolment.student_id, name: invoice.student_name ?? "", batches: [], months: [], paise: 0, oldest: invoice.due_on };
    row.paise += invoice.balance_paise;
    if (!row.batches.includes(invoice.batch_name ?? "")) row.batches.push(invoice.batch_name ?? "");
    const month = (invoice.billing_month ?? invoice.due_on).slice(0, 7);
    if (!row.months.includes(month)) row.months.push(month);
    if (invoice.due_on < row.oldest) row.oldest = invoice.due_on;
    rows.set(enrolment.student_id, row);
  }
  for (const row of rows.values()) row.months.sort();
  return [...rows.values()].sort((a, b) => a.oldest.localeCompare(b.oldest) || a.name.localeCompare(b.name));
}
export function overdueFees(invoices: Invoice[], students: Student[], enrolments: EnrolmentRow[], today: string): OverdueFees {
  const rows = overdueRows(invoices, students, enrolments, today);
  return { students: rows.length, pendingPaise: rows.reduce((n, r) => n + r.paise, 0) };
}
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const monthLabel = (month: string) => `${MONTHS[Number(month.slice(5, 7)) - 1] ?? month.slice(5, 7)} ${month.slice(0, 4)}`;
export const formatOverdueMessage = (count: number) => count === 1 ? '1 fee overdue' : `${count} fees overdue`;
export const formatPending = (paise: number) => `₹${new Intl.NumberFormat('en-IN').format(Math.round(paise / 100))} pending`;
