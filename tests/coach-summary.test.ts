import { describe, expect, it } from 'vitest';
import { feeOverview } from '../src/fees/summary';
import type { FeeContext, Invoice } from '../src/fees/model';

function context(): FeeContext {
  return {students:[{id:'a',name:'A',age_years:null,archived_at:null},{id:'b',name:'B',age_years:null,archived_at:null}],
    batches:[{id:'clay',name:'Clay',room:'',monthly_fee_paise:250000,archived_at:null},{id:'art',name:'Art',room:'',monthly_fee_paise:100000,archived_at:null}],
    enrolments:[{id:'a-clay',student_id:'a',batch_id:'clay',starts_on:'2020-01-01',ends_on:null},{id:'a-art',student_id:'a',batch_id:'art',starts_on:'2020-01-01',ends_on:null},{id:'b-clay',student_id:'b',batch_id:'clay',starts_on:'2020-01-01',ends_on:null}]};
}
function invoice(enrolment='a-clay', overrides: Partial<Invoice> = {}): Invoice {
  return {id:`charge-${enrolment}`,academy_id:'academy',enrolment_id:enrolment,billing_month:'2026-11-01',due_on:'2026-11-30',amount_paise:250000,
    paid_paise:0,balance_paise:250000,excess_paise:0,test_paise:0,student_name:'Original A',batch_name:'Original Clay',created_at:'2026-11-01T00:00:00Z',created_by:'owner',voided_at:null,voided_by:null,void_reason:null,...overrides};
}
describe('student-first monthly fee summary', () => {
  it('counts distinct students separately from batch memberships and includes unbilled expected fees', () => {
    const summary=feeOverview(context(),[],'2026-11');
    expect(summary).toMatchObject({students:2,expected:600000,collected:0,pending:600000});
    expect(summary.rows).toHaveLength(3);expect(summary.batches.find(b=>b.id==='clay')).toMatchObject({students:2,expected:500000});
    expect(summary.batches.find(b=>b.id==='art')).toMatchObject({students:1,expected:100000});
  });
  it('uses trusted paid/partial/reversed balances, excludes test receipts and preserves excess collected for review', () => {
    const charges=[invoice('a-clay',{paid_paise:250000,balance_paise:0}),invoice('a-art',{amount_paise:100000,paid_paise:40000,balance_paise:60000,test_paise:100000}),invoice('b-clay',{paid_paise:0,balance_paise:250000})];
    expect(feeOverview(context(),charges,'2026-11')).toMatchObject({expected:600000,collected:290000,pending:310000});
    charges[2]=invoice('b-clay',{paid_paise:260000,balance_paise:0,excess_paise:10000});
    expect(feeOverview(context(),charges,'2026-11')).toMatchObject({expected:600000,collected:550000,pending:60000});
  });
  it('keeps invoice amount/name snapshots after batch fee and student name changes', () => {
    const roster=context();roster.students[0].name='New A';roster.batches[0].monthly_fee_paise=300000;
    const summary=feeOverview(roster,[invoice()],'2026-11');
    expect(summary.rows.find(row=>row.enrolment==='a-clay')).toMatchObject({expected:250000,student:'Original A',batch:'Original Clay'});
    expect(summary.rows.find(row=>row.enrolment==='b-clay')).toMatchObject({expected:300000});
  });
  it('retains archived historical charges but does not invent new charges for archived students or ended enrolments', () => {
    const roster=context();roster.students[0].archived_at='2026-11-10';roster.enrolments[2].ends_on='2026-10-31';
    const summary=feeOverview(roster,[invoice()],'2026-11');
    expect(summary.rows).toHaveLength(1);expect(summary.rows[0]).toMatchObject({archived:true,expected:250000});
    expect(summary.students).toBe(1);
  });
  it('excludes voided charges from money totals and does not silently recreate cancelled debt', () => {
    const summary=feeOverview(context(),[invoice('a-clay',{voided_at:'2026-11-02',void_reason:'Corrected'})],'2026-11');
    expect(summary.rows.find(row=>row.enrolment==='a-clay')).toMatchObject({voided:true,expected:0,collected:0,pending:0,invoice:null});
    expect(summary).toMatchObject({expected:350000,collected:0,pending:350000});
  });
  it('does not let an earlier month invoice replace the selected months unbilled fee or current snapshot', () => {
    const old=invoice('a-clay',{billing_month:'2026-10-01',amount_paise:100000,paid_paise:100000,balance_paise:0});
    expect(feeOverview(context(),[old],'2026-11').rows.find(row=>row.enrolment==='a-clay')).toMatchObject({expected:250000,collected:0,pending:250000,invoice:null});
    expect(feeOverview(context(),[old,invoice()],'2026-11').rows.find(row=>row.enrolment==='a-clay')?.invoice?.billing_month).toBe('2026-11-01');
  });
});
