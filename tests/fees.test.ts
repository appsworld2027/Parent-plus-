import { describe, expect, it } from 'vitest';
import { billingOptions, invoiceStatus, nextMonth, paymentAmount, validDay, validMonth } from '../src/fees/model';
import type { FeeContext, Invoice, PendingFee } from '../src/fees/model';
import { createPendingFees, parsePending } from '../src/fees/pending';

describe('billing calendar and integer money', () => {
  it('validates dates, leap years, month/year rollover and partial enrolment overlap', () => {
    expect(validMonth('2026-13')).toBe(false); expect(validMonth('2026-1')).toBe(false);
    expect(validDay('2026-02-29')).toBe(false); expect(validDay('2028-02-29')).toBe(true);
    expect(nextMonth('2026-12')).toBe('2027-01-01');
    const context: FeeContext = { students: [{ id: 's', name: 'Child', age_years: null, archived_at: null }],
      batches: [{ id: 'b', name: 'Class', room: '', monthly_fee_paise: 100, archived_at: null }],
      enrolments: [{ id: 'e', student_id: 's', batch_id: 'b', starts_on: '2026-12-31', ends_on: '2027-01-01' }] };
    expect(billingOptions(context,'2026-11')).toHaveLength(0);
    expect(billingOptions(context,'2026-12')).toHaveLength(1); expect(billingOptions(context,'2027-01')).toHaveLength(1);
    expect(billingOptions(context,'2027-02')).toHaveLength(0);
    context.students[0].archived_at = 'archived'; expect(billingOptions(context,'2026-12')).toHaveLength(0);
  });
  it('distinguishes unpaid, partial, paid, overdue and void, including the due-date boundary', () => {
    const invoice = { due_on: '2026-11-10', paid_paise: 0, balance_paise: 100, voided_at: null } as Invoice;
    expect(invoiceStatus(invoice,'2026-11-10')).toBe('Unpaid');
    expect(invoiceStatus(invoice,'2026-11-11')).toBe('Overdue');
    invoice.paid_paise = 50; expect(invoiceStatus(invoice,'2026-11-10')).toBe('Partially paid');
    expect(invoiceStatus(invoice,'2026-11-11')).toBe('Overdue · partially paid');
    invoice.balance_paise = 0; expect(invoiceStatus(invoice,'2026-11-11')).toBe('Paid');
    invoice.voided_at = '2026-11-12'; expect(invoiceStatus(invoice,'2026-11-11')).toBe('Voided');
  });
  it('parses paise without rounding and rejects zero, overpayment and fractional paise', () => {
    expect(paymentAmount('0.29',100)).toBe(29); expect(paymentAmount('100.01',10001)).toBe(10001);
    for (const value of ['0','-1','1.001','1e2','1,000','9999999999']) expect(paymentAmount(value,10000)).toBeNull();
    expect(paymentAmount('100.01',10000)).toBeNull();
  });
});
describe('durable exact-request fee recovery', () => {
  const pending: PendingFee = { version: 1, owner: 'owner', academy: 'academy', operation: { kind: 'payment', id: 'request-1', invoice: 'invoice-1', amount: 29, date: '2026-11-14', method: 'cash', reference: 'Fictional receipt' } };
  it('restores only whitelisted fields in the same account/academy', () => {
    const raw = JSON.stringify({ ...pending, secret: 'not retained', operation: { ...pending.operation, student_name: 'private' } });
    expect(parsePending(raw,'owner','academy')).toEqual(pending);
    expect(() => parsePending(raw,'other','academy')).toThrow();
    for (const raw of ['bad','{}',JSON.stringify({ ...pending, operation: { ...pending.operation, amount: 0 } })]) expect(() => parsePending(raw,'owner','academy')).toThrow();
  });
  it('survives a new adapter instance, rejects replacement and clears only the exact request', async () => {
    const map = new Map<string,string>();
    const storage = { getItem: async (key: string) => map.get(key) ?? null, setItem: async (key: string,value: string) => { map.set(key,value); }, removeItem: async (key: string) => { map.delete(key); } };
    const first = createPendingFees(storage); await first.save(pending);
    const second = createPendingFees(storage); expect(await second.read('owner','academy')).toEqual(pending);
    expect(await second.read('other','academy')).toBeNull();
    const changed = { ...pending, operation: { ...pending.operation,id: 'request-2' } };
    await expect(second.save(changed)).rejects.toThrow(); await expect(second.clear(changed)).rejects.toThrow();
    await second.save(pending); await second.clear(pending); expect(await second.read('owner','academy')).toBeNull();
  });
  it('propagates unavailable storage instead of claiming a safely recoverable request', async () => {
    const adapter = createPendingFees({ getItem: async () => null, setItem: async () => { throw new Error('Full'); }, removeItem: async () => {} });
    await expect(adapter.save(pending)).rejects.toThrow('Full');
  });
});
