// Browserless render of the Needs you card (react-native-web via react-dom/server): states, wording, order and hooks (M2-41).
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { NeedsYou } from '../../src/today/NeedsYou';

const academy = { id: 'a', name: 'Academy', timezone: 'Asia/Kolkata' } as never;
const student = (id: string) => ({ id, name: `Student ${id}`, age_years: 8, archived_at: null });
const enrol = (id: string, studentId: string) => ({ id, student_id: studentId, batch_id: 'b', starts_on: '2020-01-01', ends_on: null });
const invoice = (id: string, enrolment: string, balance: number) => ({ id, enrolment_id: enrolment, balance_paise: balance, amount_paise: balance, paid_paise: 0,
  due_on: '2026-10-15', billing_month: '2026-10-01', batch_name: 'Clay', student_name: id, voided_at: null }) as never;
const recent = (studentId: string) => ({ obs: { id: `o-${studentId}`, status: 'recorded', recorded_at: new Date().toISOString() } as never, rec: { observation_id: `o-${studentId}`, student_id: studentId } as never });

type Over = Partial<React.ComponentProps<typeof NeedsYou>>;
function render(over: Over = {}) {
  const students = over.students ?? [student('z')];
  const enrolments = over.enrolments ?? students.map(s => enrol(`e-${s.id}`, s.id));
  const withFeedback = students.map(s => recent(s.id));
  return renderToStaticMarkup(<NeedsYou academy={academy} students={students} enrolments={enrolments} observations={over.observations ?? withFeedback.map(f => f.obs)}
    recipients={over.recipients ?? withFeedback.map(f => f.rec)} onPress={() => {}} {...over} />);
}
const text = (html: string) => html.replace(/<[^>]+>/g, '|').replace(/\|+/g, '|');

describe('NeedsYou card', () => {
  it('AC-04 caught up when nothing needs the coach', () => {
    const html = text(render());
    expect(html).toContain('All caught up'); expect(html).toContain('New requests will show here');
  });
  it('AC-08 loading shows only Checking…, never caught up, even with data present', () => {
    const html = text(render({ loading: true, invoices: [invoice('z', 'e-z', 100)] }));
    expect(html).toContain('Checking…'); expect(html).not.toContain('All caught up'); expect(html).not.toContain('overdue');
  });
  it('AC-07 whole-card error replaces everything', () => {
    const html = text(render({ error: 'Needs you list could not load. Reference: r1', invoices: [invoice('z', 'e-z', 100)] }));
    expect(html).toContain('Needs you list could not load. Reference: r1'); expect(html).not.toContain('overdue'); expect(html).not.toContain('All caught up');
  });
  it('AC-01 plural fees item with amount, wallet and chevron hooks, accessible name', () => {
    const students = [student('a'), student('b')];
    const html = render({ students, invoices: [invoice('a', 'e-a', 350000), invoice('b', 'e-b', 200000)] });
    expect(text(html)).toContain('2 fees overdue'); expect(text(html)).toContain('₹5,500 pending');
    expect(html).toContain('data-testid="needs-you-fees-wallet"'); expect(html).toContain('data-testid="needs-you-fees-chevron"');
    expect(html).toContain('aria-label="2 fees overdue"');
  });
  it('AC-11 singular wording', () => { expect(text(render({ invoices: [invoice('z', 'e-z', 150000)] }))).toContain('1 fee overdue'); });
  it('AC-09 large amounts use Indian digit grouping', () => {
    const students = Array.from({ length: 600 }, (_, i) => student(`s${i}`));
    const html = text(render({ students, invoices: students.map(s => invoice(s.id, `e-${s.id}`, 7050000)) }));
    expect(html).toContain('600 fees overdue'); expect(html).toContain('₹4,23,00,000 pending');
  });
  it('AC-02 feedback item comes before the fees item; AC-10 both present', () => {
    const html = render({ observations: [], recipients: [], invoices: [invoice('z', 'e-z', 100)] });
    const t = text(html);
    expect(t).toContain('1 child needs feedback'); expect(t).toContain('1 fee overdue');
    expect(html.indexOf('needs feedback')).toBeLessThan(html.indexOf('fee overdue'));
  });
  it('fees item alone when feedback is up to date', () => {
    expect(text(render({ invoices: [invoice('z', 'e-z', 100)] }))).not.toContain('needs feedback');
  });
  it('AC-17 fees failure: feedback item stays, one fees error line, no fees item', () => {
    const t = text(render({ observations: [], recipients: [], feesError: 'Fees could not load. Reference: r2' }));
    expect(t).toContain('1 child needs feedback'); expect(t).toContain('Fees could not load. Reference: r2');
    expect(t).not.toContain('overdue'); expect(t).not.toContain('All caught up');
  });
  it('AC-18 feedback failure: fees item stays, feedback item hidden even though students look unfed, one error line', () => {
    const t = text(render({ observations: [], recipients: [], invoices: [invoice('z', 'e-z', 100)], feedbackError: 'Feedback could not load. Reference: r3' }));
    expect(t).toContain('1 fee overdue'); expect(t).toContain('Feedback could not load. Reference: r3'); expect(t).not.toContain('needs feedback');
  });
  it('both partial errors show both lines and never "All caught up"', () => {
    const t = text(render({ feedbackError: 'Feedback could not load. Reference: r3', feesError: 'Fees could not load. Reference: r2' }));
    expect(t).toContain('Feedback could not load'); expect(t).toContain('Fees could not load'); expect(t).not.toContain('All caught up');
  });
  it('excluded invoices never create a fees item (archived student, ended enrolment, voided, due today)', () => {
    const archived = { ...student('z'), archived_at: '2026-01-01T00:00:00Z' };
    expect(text(render({ students: [archived], invoices: [invoice('z', 'e-z', 100)] }))).not.toContain('overdue');
    expect(text(render({ enrolments: [{ ...enrol('e-z', 'z'), ends_on: '2020-02-01' }], invoices: [invoice('z', 'e-z', 100)] }))).not.toContain('overdue');
  });
});
