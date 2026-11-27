// Pure rules for docs/product/fee-receipts (FR-02..07). Fictional data only.
import { describe, expect, it } from 'vitest';
import { canReceipt, receiptNumber, receiptText } from '../src/fees/receipt';

const invoice = { student_name: 'Fictional Ria', batch_name: 'Fictional Clay Class', billing_month: '2026-11-01' } as never;
const pay = (id: string, extra = {}) => ({ id, amount_paise: 250000, source: 'manual', mode: 'live', paid_on: '2026-11-20', method: 'upi', reference: 'UPI123',
  recorded_at: '2026-11-20T10:00:00Z', recorded_by: null, reversal: null, ...extra }) as never;
describe('fee receipts', () => {
  it('FR-02/07 shows every field with ₹ grouping', () => {
    const t = receiptText('Fictional Academy', invoice, pay('11111111-2222-3333-4444-555555555555'));
    expect(t).toContain('Fictional Academy — Fee receipt'); expect(t).toContain('Receipt no: RCPT-11111111');
    expect(t).toContain('Student: Fictional Ria'); expect(t).toContain('Batch: Fictional Clay Class'); expect(t).toContain('Fee month: 2026-11');
    expect(t).toContain('Amount received: ₹2,500'); expect(t).toContain('Date: 2026-11-20'); expect(t).toContain('Method: UPI'); expect(t).toContain('Reference: UPI123');
  });
  it('FR-03 no reference line when empty or null', () => {
    for (const reference of ['', null]) { const t = receiptText('A', invoice, pay('aaaaaaaa-0000', { reference })); expect(t).not.toContain('Reference'); expect(t).not.toContain('undefined'); }
  });
  it('FR-04/05 reversed and TEST payments get no receipt; live does', () => {
    expect(canReceipt(pay('a1', { reversal: { reason: 'x', reversed_at: 'y', reversed_by: 'z' } }))).toBe(false);
    expect(canReceipt(pay('a2', { mode: 'test' }))).toBe(false);
    expect(canReceipt(pay('a3'))).toBe(true);
  });
  it('FR-06 distinct payments distinct numbers; stable per payment', () => {
    const a = pay('aaaaaaaa-1111'), b = pay('bbbbbbbb-1111');
    expect(receiptNumber(a)).not.toBe(receiptNumber(b)); expect(receiptNumber(a)).toBe(receiptNumber(a));
  });
});
