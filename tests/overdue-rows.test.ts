// Browserless scenarios for the overdue-fees rules behind Needs you and the Fees "Overdue" section (M2-41).
import { describe, expect, it } from 'vitest';
import { monthLabel, overdueFees, overdueRows } from '../src/today/overdueFees';

const today = '2026-11-27';
const student = (id: string, archived = false) => ({ id, name: `Student ${id}`, age_years: 8, archived_at: archived ? '2026-01-01T00:00:00Z' : null });
const enrol = (id: string, studentId: string, o: { starts?: string; ends?: string | null } = {}) =>
  ({ id, student_id: studentId, batch_id: 'b', starts_on: o.starts ?? '2026-01-01', ends_on: o.ends ?? null });
let n = 0;
const inv = (enrolment: string, balance: number, o: { due?: string; month?: string; batch?: string; name?: string; voided?: boolean } = {}) =>
  ({ id: `i${n++}`, enrolment_id: enrolment, balance_paise: balance, due_on: o.due ?? '2026-11-01', billing_month: o.month ?? '2026-11-01',
    batch_name: o.batch ?? 'Clay', student_name: o.name ?? 'Student', voided_at: o.voided ? '2026-11-02T00:00:00Z' : null } as never);

describe('overdueRows', () => {
  const students = [student('a'), student('b'), student('c')];
  const enrolments = [enrol('ea', 'a'), enrol('eb', 'b'), enrol('ec', 'c')];
  it('orders students by their oldest overdue date, ties by name', () => {
    const rows = overdueRows([inv('eb', 100, { due: '2026-10-15', name: 'Bea' }), inv('ea', 100, { due: '2026-09-15', name: 'Ann' }), inv('ec', 100, { due: '2026-10-15', name: 'Aya' })], students, enrolments, today);
    expect(rows.map(r => r.name)).toEqual(['Ann', 'Aya', 'Bea']);
  });
  it('merges one student\'s invoices: sorted unique months, unique batches, summed balance', () => {
    const [row] = overdueRows([inv('ea', 200, { month: '2026-10-01', due: '2026-10-15', batch: 'Clay' }), inv('ea', 300, { month: '2026-09-01', due: '2026-09-15', batch: 'Art' }), inv('ea', 50, { month: '2026-10-01', due: '2026-10-20', batch: 'Clay' })], students, enrolments, today);
    expect(row.months).toEqual(['2026-09', '2026-10']);
    expect(row.batches).toEqual(['Clay', 'Art']);
    expect(row.paise).toBe(550);
    expect(row.oldest).toBe('2026-09-15');
  });
  it('excludes: due today, future, zero or negative balance, voided, archived, ended, not yet started, unknown enrolment', () => {
    const list = [inv('ea', 100, { due: today }), inv('ea', 100, { due: '2026-12-01' }), inv('ea', 0), inv('ea', -5), inv('ea', 100, { voided: true }),
      inv('ec2', 100), inv('ex', 100), inv('nope', 100), inv('eb', 100)];
    const rows = overdueRows(list, [...students, student('arch', true)], [...enrolments, enrol('ec2', 'arch'), enrol('ex', 'c', { starts: '2026-12-01' })], today);
    expect(rows.map(r => r.studentId)).toEqual(['b']);
  });
  it('keeps an enrolment that ends today and drops one that ended yesterday', () => {
    const e = [enrol('end-today', 'a', { ends: today }), enrol('end-yesterday', 'b', { ends: '2026-11-26' })];
    expect(overdueRows([inv('end-today', 100), inv('end-yesterday', 100)], students, e, today).map(r => r.studentId)).toEqual(['a']);
  });
  it('returns nothing for no invoices and does not mutate its inputs', () => {
    expect(overdueRows([], students, enrolments, today)).toEqual([]);
    const list = [inv('ea', 100)]; const copy = JSON.stringify(list);
    overdueRows(list, students, enrolments, today); expect(JSON.stringify(list)).toBe(copy);
  });
  it('counts a student once and handles 5,000 invoices quickly', () => {
    const many = Array.from({ length: 5000 }, (_, i) => student(`s${i}`)), e = many.map(s => enrol(`e${s.id}`, s.id));
    const t = performance.now();
    const totals = overdueFees(e.flatMap(x => [inv(x.id, 100), inv(x.id, 50)]), many, e, today);
    expect(totals).toEqual({ students: 5000, pendingPaise: 750000 });
    expect(performance.now() - t).toBeLessThan(1500);
  });
});
describe('monthLabel', () => {
  it('formats every month and keeps unknown input readable', () => {
    expect(['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'].map(m => monthLabel(`2026-${m}`)).join(' '))
      .toBe('Jan 2026 Feb 2026 Mar 2026 Apr 2026 May 2026 Jun 2026 Jul 2026 Aug 2026 Sep 2026 Oct 2026 Nov 2026 Dec 2026');
    expect(monthLabel('2026-13')).toBe('13 2026');
  });
});
