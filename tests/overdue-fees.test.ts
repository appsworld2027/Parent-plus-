// Covers docs/product/needs-you-fees-overdue AC-01,05,06,09,11,12,13,15 as pure rules. AC-14 (TEST receipts) depends on the database view and is NOT covered here.
import { describe, expect, it } from 'vitest';
import { overdueFees, formatOverdueMessage, formatPending } from '../src/today/overdueFees';

const today = '2026-11-27';
const student = (id: string, archived = false) => ({ id, name: id, age_years: 8, archived_at: archived ? '2026-01-01T00:00:00Z' : null });
const enrol = (id: string, studentId: string, ends: string | null = null) => ({ id, student_id: studentId, batch_id: 'b', starts_on: '2026-01-01', ends_on: ends });
const inv = (n: string, enrolment: string, balance: number, due = '2026-11-01', voided: string | null = null) =>
  ({ id: n, enrolment_id: enrolment, balance_paise: balance, paid_paise: 0, amount_paise: balance, due_on: due, voided_at: voided } as never);

describe('overdue fees for Needs you', () => {
  const students = [student('a'), student('b'), student('c', true)];
  const enrolments = [enrol('ea', 'a'), enrol('eb', 'b'), enrol('ec', 'c'), enrol('ended', 'a', '2026-06-30')];
  it('AC-01 two students, amounts summed', () => {
    expect(overdueFees([inv('1', 'ea', 350000), inv('2', 'eb', 200000)], students, enrolments, today)).toEqual({ students: 2, pendingPaise: 550000 });
    expect(formatOverdueMessage(2)).toBe('2 fees overdue'); expect(formatPending(550000)).toBe('₹5,500 pending');
  });
  it('AC-11 singular wording', () => { expect(formatOverdueMessage(1)).toBe('1 fee overdue'); expect(formatPending(150000)).toBe('₹1,500 pending'); });
  it('AC-05 ended enrolment, AC-06 archived student, AC-12 due today, AC-13 voided are all excluded', () => {
    expect(overdueFees([inv('1', 'ended', 100)], [student('a')], [enrol('ended', 'a', '2026-06-30')], today).students).toBe(0);
    expect(overdueFees([inv('1', 'ec', 100)], students, enrolments, today).students).toBe(0);
    expect(overdueFees([inv('1', 'ea', 100, today)], students, enrolments, today).students).toBe(0);
    expect(overdueFees([inv('1', 'ea', 100, '2026-11-01', '2026-11-02T00:00:00Z')], students, enrolments, today).students).toBe(0);
  });
  it('AC-15 one student with two partly paid invoices counts once, sums balances', () => {
    expect(overdueFees([inv('1', 'ea', 50000), inv('2', 'ea', 100000)], students, enrolments, today)).toEqual({ students: 1, pendingPaise: 150000 });
  });
  it('AC-09 fifteen students totalling ₹42,300', () => {
    const many = Array.from({ length: 15 }, (_, i) => student(`s${i}`)), en = many.map(s => enrol(`e${s.id}`, s.id));
    const invoices = en.map((e, i) => inv(`i${i}`, e.id, i < 14 ? 282000 : 282000 - 0));
    const r = overdueFees(invoices, many, en, today); expect(r.students).toBe(15); expect(r.pendingPaise).toBe(15 * 282000); expect(formatPending(r.pendingPaise)).toBe('₹42,300 pending');
  });
  it('a zero balance is not overdue', () => { expect(overdueFees([inv('1', 'ea', 0)], students, enrolments, today).students).toBe(0); });
});
