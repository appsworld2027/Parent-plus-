import type { Page } from '@playwright/test';
import type { FeeDetail, FeePayment, Invoice } from '../../src/fees/model';
import { backend } from './backend';

declare global {
  interface Window {
    __feeFixture: { invoices: Invoice[]; payments: (FeePayment & { invoice_id: string; request_id: string })[];
      failWrite: boolean; failRead: boolean; loseResponse: boolean; hold: boolean; writes: number; missing: boolean };
  }
}
export async function feesBackend(page: Page, options: { missing?: boolean } = {}) {
  await backend(page, { academy: true, readyClass: true });
  await page.addInitScript(({ options }) => {
    const stored = JSON.parse(sessionStorage.getItem('__fictional_fees') ?? 'null');
    const state: Window['__feeFixture'] = window.__feeFixture = { invoices: stored?.invoices ?? [], payments: stored?.payments ?? [],
      failWrite: false, failRead: false, loseResponse: false, hold: false, writes: 0, missing: options.missing ?? false };
    const original = window.fetch.bind(window);
    window.fetch = async (input, init) => {
      const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url, window.location.origin);
      const path = url.pathname;
      if (!url.hostname.endsWith('.supabase.co') || !/fee_invoice_balances|\/rpc\/(create_fee_invoice|record_manual_fee_payment|reverse_manual_fee_payment|void_fee_invoice|get_fee_invoice)$/.test(path)) return original(input,init);
      const payload = JSON.parse(String(init?.body ?? '{}'));
      const response = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
      if (state.missing) return response({ code: 'PGRST205', message: 'Private missing schema detail' },404);
      const totals = (invoice: Invoice): Invoice => {
        const payments = state.payments.filter(p => p.invoice_id === invoice.id && !p.reversal);
        const paid = payments.filter(p => p.mode === 'live').reduce((n,p) => n+p.amount_paise,0);
        return { ...invoice, paid_paise: paid, balance_paise: Math.max(0,invoice.amount_paise-paid), excess_paise: Math.max(0,paid-invoice.amount_paise),
          test_paise: payments.filter(p => p.mode === 'test').reduce((n,p) => n+p.amount_paise,0) };
      };
      const invoice = state.invoices.find(i => i.id === payload.target_invoice);
      if (path.endsWith('/fee_invoice_balances') || path.endsWith('/get_fee_invoice')) {
        if (state.failRead) return response({ message: 'Private read failure' },500);
        if (path.endsWith('/get_fee_invoice')) return response(invoice ? { invoice: totals(invoice), payments: state.payments.filter(p => p.invoice_id === invoice.id) } satisfies FeeDetail : null);
        const month = url.searchParams.get('billing_month')?.slice(3);
        let rows = state.invoices.filter(i => i.billing_month === month).sort((a,b) => b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id));
        const cursor = url.searchParams.get('or')?.match(/created_at\.eq\.([^,]+),id\.lt\.([0-9a-f-]+)/);
        if (cursor) rows=rows.filter(row => row.created_at<cursor[1] || (row.created_at===cursor[1] && row.id<cursor[2]));
        return response(rows.slice(0,50).map(totals));
      }
      state.writes++;
      while (state.hold) await new Promise(resolve => setTimeout(resolve,20));
      if (state.failWrite) return response({ message: 'Private billing backend failure' },500);
      let result: string;
      if (path.endsWith('/create_fee_invoice')) {
        if (!invoice) {
          if (state.invoices.some(i => i.enrolment_id === payload.target_enrolment && i.billing_month === payload.month_start && !i.voided_at)) return response({ code: '23505', message: 'Duplicate invoice' },409);
          const batch = window.__coachFixture.roster.batches[0];
          if (payload.expected_fee_paise !== batch.monthly_fee_paise) return response({ code: '40001', message: 'Changed fee' },409);
          state.invoices.push({ id: payload.target_invoice, academy_id: payload.target_academy, enrolment_id: payload.target_enrolment,
            billing_month: payload.month_start, due_on: payload.due_date, amount_paise: batch.monthly_fee_paise,
            student_name: window.__coachFixture.roster.students[0].name, batch_name: batch.name, created_by: '00000000-0000-0000-0000-000000000001',
            created_at: new Date().toISOString(), voided_at: null, voided_by: null, void_reason: null,
            paid_paise: 0,balance_paise: batch.monthly_fee_paise,test_paise: 0,excess_paise: 0 });
        }
        result = payload.target_invoice;
      } else if (path.endsWith('/record_manual_fee_payment')) {
        const existing = state.payments.find(p => p.request_id === payload.payment_request);
        if (existing) result = existing.id;
        else {
          if (!invoice || invoice.voided_at || payload.payment_amount > totals(invoice).balance_paise) return response({ code: '40001',message: 'Changed balance' },409);
          result = crypto.randomUUID();
          state.payments.push({ id: result,invoice_id: invoice.id,request_id: payload.payment_request,amount_paise: payload.payment_amount,
            paid_on: payload.payment_date,method: payload.payment_method,reference: payload.payment_reference,source: 'manual',mode: 'live',
            recorded_at: new Date().toISOString(),recorded_by: '00000000-0000-0000-0000-000000000001',reversal: null });
        }
      } else if (path.endsWith('/reverse_manual_fee_payment')) {
        const payment = state.payments.find(p => p.id === payload.target_payment)!;
        payment.reversal ??= { reason: payload.correction_reason,reversed_at: new Date().toISOString(),reversed_by: '00000000-0000-0000-0000-000000000001' };
        result = payment.id;
      } else {
        if (!invoice || state.payments.some(p => p.invoice_id === invoice.id && !p.reversal)) return response({ code: '22023',message: 'Correct payment first' },400);
        invoice.voided_at ??= new Date().toISOString(); invoice.voided_by = '00000000-0000-0000-0000-000000000001'; invoice.void_reason = payload.correction_reason;
        result = invoice.id;
      }
      sessionStorage.setItem('__fictional_fees',JSON.stringify({ invoices: state.invoices,payments: state.payments }));
      if (state.loseResponse) { state.loseResponse = false; throw new TypeError('Simulated fee save response lost after commit'); }
      return response(result);
    };
  }, { options });
}
