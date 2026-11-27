import { formatFee } from '../roster/model';
import type { FeePayment, Invoice } from './model';

// A receipt exists only for a live (non-test), non-reversed payment (FR-04/05).
export const canReceipt = (p: FeePayment) => p.mode !== 'test' && !p.reversal;
export const receiptNumber = (p: FeePayment) => `RCPT-${p.id.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
export function receiptText(academy: string, invoice: Invoice, p: FeePayment): string {
  const lines = [`${academy} — Fee receipt`, `Receipt no: ${receiptNumber(p)}`, `Student: ${invoice.student_name}`, `Batch: ${invoice.batch_name}`,
    `Fee month: ${invoice.billing_month.slice(0, 7)}`, `Amount received: ${formatFee(p.amount_paise)}`,
    `Date: ${p.paid_on ?? p.recorded_at.slice(0, 10)}`, `Method: ${(p.method ?? p.mode).toUpperCase()}`];
  if (p.reference) lines.push(`Reference: ${p.reference}`);
  return lines.join('\n');
}
