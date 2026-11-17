import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

const id = (n: number) => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
const [owner, other, academy, foreignAcademy, student, batch, enrolment, invoice, request] = [1,2,11,12,21,31,41,61,71].map(id);
let db: PGlite;
const issueSQL = 'select public.create_fee_invoice($1,$2,$3,$4::date,$5::date,$6::bigint) as id';
const issueArgs = [academy, invoice, enrolment, '2026-11-01', '2026-11-10', 250000];
const paySQL = 'select public.record_manual_fee_payment($1,$2,$3,$4::bigint,$5::date,$6,$7) as id';
const payArgs = [academy, invoice, request, 100000, '2026-01-01', 'cash', 'Fictional receipt'];
const reverseSQL = 'select public.reverse_manual_fee_payment($1,$2,$3,$4) as id';
const voidSQL = 'select public.void_fee_invoice($1,$2,$3) as id';
async function asUser(user = owner) { await db.exec(`reset role; set request.jwt.claim.sub='${user}'; set role authenticated`); }
async function rejected(sql: string, args: unknown[], code: string) {
  await db.exec('savepoint expected_error');
  try { await expect(db.query(sql, args)).rejects.toMatchObject({ code }); }
  finally { await db.exec('rollback to savepoint expected_error; release savepoint expected_error'); }
}
async function issue(args = issueArgs) { return (await db.query<{ id: string }>(issueSQL, args)).rows[0].id; }
async function pay(args = payArgs) { return (await db.query<{ id: string }>(paySQL, args)).rows[0].id; }
async function balance() {
  return (await db.query<{ amount_paise: number; paid_paise: number; balance_paise: number; test_paise: number; excess_paise: number }>('select * from public.fee_invoice_balances where id=$1', [invoice])).rows[0];
}
describe('trusted monthly billing and manual ledger', () => {
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
      create schema auth; create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema auth,public to authenticated,anon,service_role;
      grant execute on function auth.uid() to authenticated,anon,service_role;`);
    const files = readdirSync('supabase/migrations').filter(file=>file<='202611140006_fees.sql').sort();
    for (const file of [...files, files.at(-1)!]) await db.exec(readFileSync(`supabase/migrations/${file}`, 'utf8'));
    await db.query('insert into auth.users values($1),($2)', [owner,other]);
  }, 30_000);
  beforeEach(async () => {
    await db.exec('begin');
    await db.query('insert into public.academies(id,owner_id,name) values($1,$2,$3),($4,$5,$6)', [academy,owner,'Fictional A',foreignAcademy,other,'Fictional B']);
    await db.query('insert into public.students(id,academy_id,name) values($1,$2,$3)', [student,academy,'Fictional Child']);
    await db.query('insert into public.batches(id,academy_id,name,monthly_fee_paise) values($1,$2,$3,250000)', [batch,academy,'Fictional Class']);
    await db.query("insert into public.enrolments(id,academy_id,student_id,batch_id,starts_on) values($1,$2,$3,$4,'2026-11-15')", [enrolment,academy,student,batch]);
    await asUser();
  });
  afterEach(async () => { await db.exec('rollback; reset role'); });
  afterAll(async () => { await db?.close(); });

  it('snapshots trusted fee and names; fee changes and exact retries never rewrite an invoice', async () => {
    expect(await issue()).toBe(invoice); expect(await issue()).toBe(invoice);
    await db.query("update public.batches set monthly_fee_paise=300000,name='Renamed class' where id=$1", [batch]);
    await db.exec('reset role');
    await db.query("update public.students set name='Renamed child' where id=$1", [student]);
    await asUser();
    await issue();
    const row = (await db.query<{ student_name: string; batch_name: string }>('select * from public.fee_invoices')).rows[0];
    expect(row.student_name).toBe('Fictional Child'); expect(row.batch_name).toBe('Fictional Class');
    expect(Number((await balance()).amount_paise)).toBe(250000);
    await rejected(issueSQL, [academy,id(62),enrolment,'2026-12-01','2026-12-10',250000], '40001');
    await issue([academy,id(62),enrolment,'2026-12-01','2026-12-10',300000]);
  });
  it('accepts overlapping enrolment months and year rollover; rejects missing overlap and duplicate active months', async () => {
    await issue();
    await rejected(issueSQL, [academy,id(62),enrolment,'2026-11-01','2026-11-10',250000], '23505');
    await rejected(issueSQL, [academy,id(62),enrolment,'2026-10-01','2026-10-10',250000], '22023');
    await issue([academy,id(63),enrolment,'2026-12-01','2027-01-10',250000]);
    await issue([academy,id(64),enrolment,'2027-01-01','2027-01-10',250000]);
    expect((await db.query('select * from public.fee_invoices')).rows).toHaveLength(3);
  });
  it('rejects invalid fee/date boundaries and UUID request reuse with changed data atomically', async () => {
    for (const amount of [null,0,-1,100000000001]) await rejected(issueSQL, [...issueArgs.slice(0,5),amount], '22023');
    await rejected(issueSQL, [...issueArgs.slice(0,3),'2026-11-02','2026-11-10',250000], '22023');
    await issue();
    await rejected(issueSQL, [...issueArgs.slice(0,4),'2026-11-11',250000], '22023');
    expect((await db.query('select * from public.fee_invoices')).rows).toHaveLength(1);
  });
  it('calculates unpaid, partial and paid from ledger; duplicate/lost-response retry preserves a single entry', async () => {
    await issue(); expect(Number((await balance()).balance_paise)).toBe(250000);
    const payment = await pay(); expect(await pay()).toBe(payment);
    expect(Number((await balance()).balance_paise)).toBe(150000);
    await pay([academy,invoice,id(72),150000,'2026-01-01','bank','']);
    expect(Number((await balance()).balance_paise)).toBe(0);
    expect((await db.query('select * from public.fee_payments')).rows).toHaveLength(2);
    await rejected(paySQL, [academy,invoice,id(73),1,'2026-01-01','cash',''], '40001');
    const entry = (await db.query<{ source: string; mode: string; recorded_by: string; provider_payment_id: null }>('select * from public.fee_payments where id=$1', [payment])).rows[0];
    expect(entry).toMatchObject({ source: 'manual', mode: 'live', recorded_by: owner, provider_payment_id: null });
  });
  it('rejects invalid or changed payment requests without changing totals', async () => {
    await issue(); await pay();
    await rejected(paySQL, [...payArgs.slice(0,3),100001,...payArgs.slice(4)], '22023');
    for (const amount of [null,0,-1,100000000001]) await rejected(paySQL, [academy,invoice,id(72),amount,'2026-01-01','cash',''], '22023');
    await rejected(paySQL, [academy,invoice,id(72),150001,'2026-01-01','cash',''], '40001');
    await rejected(paySQL, [academy,invoice,id(72),1,'2100-01-01','cash',''], '22023');
    await rejected(paySQL, [academy,invoice,id(72),1,'2026-01-01','gateway',''], '22023');
    expect(Number((await balance()).paid_paise)).toBe(100000);
  });
  it('retains reversed manual entry and attribution, restores balance and permits an auditable replacement', async () => {
    await issue(); const payment = await pay();
    const args = [academy,payment,id(81),'Wrong amount entered'];
    await db.query(reverseSQL,args); await db.query(reverseSQL,args);
    expect(Number((await balance()).paid_paise)).toBe(0);
    expect((await db.query('select * from public.fee_payments')).rows).toHaveLength(1);
    const audit = (await db.query<{ reason: string; reversed_by: string }>('select * from public.fee_payment_reversals')).rows;
    expect(audit).toHaveLength(1); expect(audit[0]).toMatchObject({ reason: 'Wrong amount entered', reversed_by: owner });
    await rejected(reverseSQL,[academy,payment,id(82),'Another reason'], '40001');
    await pay([academy,invoice,id(72),90000,'2026-01-01','upi','Corrected receipt']);
    expect(Number((await balance()).balance_paise)).toBe(160000);
    expect(await pay()).toBe(payment); // A stale retry cannot resurrect a reversed entry.
    expect(Number((await balance()).balance_paise)).toBe(160000);
  });
  it('requires correcting payments before void, preserves voided history and allows replacement invoice', async () => {
    await issue(); const payment = await pay();
    await rejected(voidSQL,[academy,invoice,'Incorrect month'], '22023');
    await db.query(reverseSQL,[academy,payment,id(81),'Mistaken invoice']);
    await db.query(voidSQL,[academy,invoice,'Incorrect month']);
    await db.query(voidSQL,[academy,invoice,'Incorrect month']);
    await rejected(paySQL,[academy,invoice,id(72),1,'2026-01-01','cash',''], '22023');
    await issue([academy,id(62),...issueArgs.slice(2)]);
    expect((await db.query('select * from public.fee_invoices')).rows).toHaveLength(2);
    const voided = (await db.query<{ void_reason: string; voided_by: string }>('select * from public.fee_invoices where id=$1',[invoice])).rows[0];
    expect(voided).toMatchObject({ void_reason: 'Incorrect month', voided_by: owner });
    await rejected(voidSQL,[academy,invoice,'Changed reason'], '40001');
  });
  it('excludes gateway test money from real balance and flags excess live money for review', async () => {
    await issue(); await db.exec('reset role');
    await db.query("insert into public.fee_payments(academy_id,invoice_id,amount_paise,source,mode,provider_payment_id,request_id) values($1,$2,250000,'gateway','test','fictional_test',$3),($1,$2,260000,'gateway','live','fictional_live',$4)", [academy,invoice,id(91),id(92)]);
    await asUser();
    const row = await balance();
    expect(Number(row.paid_paise)).toBe(260000); expect(Number(row.test_paise)).toBe(250000); expect(Number(row.excess_paise)).toBe(10000);
    const gateway = (await db.query<{ id: string }>('select id from public.fee_payments limit 1')).rows[0].id;
    await rejected(reverseSQL,[academy,gateway,id(81),'Not a manual payment'], '22023');
    await rejected(voidSQL,[academy,invoice,'Has gateway payments'], '22023');
  });
  it('blocks foreign/anonymous RPCs and direct writes; invoker view/detail cannot leak another academy', async () => {
    await issue(); const payment = await pay(); await asUser(other);
    await rejected(issueSQL,issueArgs,'42501'); await rejected(paySQL,payArgs,'42501');
    await rejected(reverseSQL,[academy,payment,id(81),'Foreign'], '42501'); await rejected(voidSQL,[academy,invoice,'Foreign'], '42501');
    expect((await db.query('select * from public.fee_invoice_balances')).rows).toEqual([]);
    expect((await db.query<{ detail: null }>('select public.get_fee_invoice($1,$2) as detail',[academy,invoice])).rows[0].detail).toBeNull();
    await asUser();
    for (const sql of ["update public.fee_invoices set amount_paise=1", "delete from public.fee_invoices", "update public.fee_payments set source='gateway'", "delete from public.fee_payments", "delete from public.fee_payment_reversals"]) await rejected(sql,[], '42501');
    await db.exec('reset role; set role anon'); await rejected(issueSQL,issueArgs,'42501'); await rejected(paySQL,payArgs,'42501');
    await rejected('select public.get_fee_invoice($1,$2)',[academy,invoice],'42501');
  });
  it('returns one consistent detail with original receipt and its reversal', async () => {
    await issue(); const payment = await pay(); await db.query(reverseSQL,[academy,payment,id(81),'Fictional correction']);
    const value = (await db.query<{ detail: { invoice: { balance_paise: number }; payments: { reversal: { reason: string } }[] } }>('select public.get_fee_invoice($1,$2) as detail',[academy,invoice])).rows[0].detail;
    expect(value.invoice.balance_paise).toBe(250000); expect(value.payments).toHaveLength(1);
    expect(value.payments[0].reversal.reason).toBe('Fictional correction');
  });
});
