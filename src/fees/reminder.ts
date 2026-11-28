import { formatFee } from '../roster/model';
import type { Invoice } from './model';

export type ReminderLevel = 1 | 2 | 3;
export const daysOverdue = (due: string, today: string) => Math.floor((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${due}T00:00:00Z`)) / 86_400_000);
// Gentle ladder (FRM-01..04): 1-7 days friendly nudge, 8-21 polite reminder, 22+ kind but clear. Never threatening.
export function canRemind(invoice: Invoice, today: string) { return !invoice.voided_at && invoice.balance_paise > 0 && invoice.due_on < today; }
export function reminder(academy: string, invoice: Invoice, today: string): { level: ReminderLevel; text: string } | null {
  if (!canRemind(invoice, today)) return null;
  const days = daysOverdue(invoice.due_on, today), amount = formatFee(invoice.balance_paise), month = invoice.billing_month.slice(0, 7);
  const level: ReminderLevel = days <= 7 ? 1 : days <= 21 ? 2 : 3;
  const head = `${academy}\n`;
  const body = level === 1 ? `Hi! A gentle reminder that ${invoice.student_name}'s ${month} fee (${amount}) is pending. If you have already paid, please ignore this. Thank you!`
    : level === 2 ? `Hello, this is a reminder that ${invoice.student_name}'s ${month} fee of ${amount} is still pending (due ${invoice.due_on}). Please let us know if there is anything we can help with.`
    : `Hello, ${invoice.student_name}'s ${month} fee of ${amount} has been pending since ${invoice.due_on}. Could you please clear it, or message us if you would like to talk about it? We value having ${invoice.student_name} in class.`;
  return { level, text: `${head}${body}\n\n— Your coach` };
}
