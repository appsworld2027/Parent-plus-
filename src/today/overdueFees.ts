import type { Invoice } from '../fees/model';
import type { Enrolment, Student } from '../roster/model';

export type OverdueFees = { students: number; pendingPaise: number };
type EnrolmentRow = Enrolment & { id?: string };

// Overdue = due before today, money still owed, not voided, student not archived, enrolment active today.
// Counted per student (not invoice); the amount sums remaining balances. Due today is not overdue.
export function overdueFees(invoices: Invoice[], students: Student[], enrolments: EnrolmentRow[], today: string): OverdueFees {
  const enrolmentStudent = new Map(enrolments.filter(e => e.id).map(e => [e.id as string, e]));
  const active = new Map(students.filter(s => !s.archived_at).map(s => [s.id, s]));
  const owing = new Map<string, number>();
  for (const invoice of invoices) {
    if (invoice.voided_at || invoice.balance_paise <= 0 || invoice.due_on >= today) continue;
    const enrolment = enrolmentStudent.get(invoice.enrolment_id);
    if (!enrolment || !active.has(enrolment.student_id)) continue;
    if (enrolment.starts_on > today || (enrolment.ends_on && enrolment.ends_on < today)) continue;
    owing.set(enrolment.student_id, (owing.get(enrolment.student_id) ?? 0) + invoice.balance_paise);
  }
  return { students: owing.size, pendingPaise: [...owing.values()].reduce((a, b) => a + b, 0) };
}
export const formatOverdueMessage = (count: number) => count === 1 ? '1 fee overdue' : `${count} fees overdue`;
export const formatPending = (paise: number) => `₹${new Intl.NumberFormat('en-IN').format(Math.round(paise / 100))} pending`;
