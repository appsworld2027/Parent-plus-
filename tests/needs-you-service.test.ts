// Browserless scenarios for loading Needs you data: partial failure, paging and query filters (M2-41).
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeSupabase, type Call } from './support/fakeSupabase';

const holder = vi.hoisted(() => ({ client: null as unknown }));
vi.mock('../src/auth/client', () => ({ get supabase() { return holder.client; } }));
vi.mock('../src/diagnostics', () => ({ diagnostics: { record: () => ({ reference: 'ref-1' }) } }));
import { loadNeedsYouData } from '../src/today/service';

const boom = { message: 'boom' };
const invoices = (n: number, offset = 0) => Array.from({ length: n }, (_, i) => ({ id: `i${offset + i}`, balance_paise: 100 }));
function use(handler: (call: Call) => { data?: unknown[]; error?: unknown }) { const f = fakeSupabase(handler); holder.client = f.client; return f; }
const ok = (call: Call) => call.table === 'students' ? { data: [{ id: 's' }] } : call.table === 'enrolments' ? { data: [{ id: 'e' }] } : {};

describe('loadNeedsYouData', () => {
  beforeEach(() => { holder.client = null; });
  it('throws when the client is unavailable', async () => { await expect(loadNeedsYouData('a', '2026-11-27')).rejects.toThrow('Client unavailable'); });
  it('returns everything with no failure flags when all reads succeed', async () => {
    use(call => call.table === 'fee_invoice_balances' ? { data: invoices(2) } : ok(call));
    const data = await loadNeedsYouData('a', '2026-11-27');
    expect(data).toMatchObject({ feedbackFailed: false, feesFailed: false });
    expect(data.invoices).toHaveLength(2); expect(data.students).toHaveLength(1);
  });
  it('fees fail, feedback ok: keeps feedback data and flags fees', async () => {
    use(call => call.table === 'fee_invoice_balances' ? { error: boom } : ok(call));
    expect(await loadNeedsYouData('a', '2026-11-27')).toMatchObject({ feesFailed: true, feedbackFailed: false, invoices: [] });
  });
  it('feedback fails, fees ok: keeps invoices and flags feedback, empty feedback data', async () => {
    use(call => call.table === 'observations' ? { error: boom } : call.table === 'fee_invoice_balances' ? { data: invoices(1) } : ok(call));
    const data = await loadNeedsYouData('a', '2026-11-27');
    expect(data).toMatchObject({ feedbackFailed: true, feesFailed: false, observations: [], recipients: [] });
    expect(data.invoices).toHaveLength(1);
  });
  it('recipient read failure also counts as a feedback failure', async () => {
    use(call => call.table === 'observations' ? { data: [{ id: 'o1' }] } : call.table === 'observation_recipients' ? { error: boom } : ok(call));
    expect((await loadNeedsYouData('a', '2026-11-27')).feedbackFailed).toBe(true);
  });
  it('both feedback and fees failing fails the whole card', async () => {
    use(call => call.table === 'observations' || call.table === 'fee_invoice_balances' ? { error: boom } : ok(call));
    await expect(loadNeedsYouData('a', '2026-11-27')).rejects.toBe(boom);
  });
  it('a missing roster fails the whole card even when fees and feedback load', async () => {
    use(call => call.table === 'students' ? { error: boom } : {});
    await expect(loadNeedsYouData('a', '2026-11-27')).rejects.toBe(boom);
  });
  it('pages overdue invoices past 500 rows (1,201 rows = 3 pages) and stops on a short page', async () => {
    const f = use(call => call.table !== 'fee_invoice_balances' ? ok(call) : { data: invoices(Math.min(500, 1201 - call.offset), call.offset) });
    const data = await loadNeedsYouData('a', '2026-11-27');
    expect(data.invoices).toHaveLength(1201);
    expect(f.calls.filter(c => c.table === 'fee_invoice_balances').map(c => c.offset).sort((a, b) => a - b)).toEqual([0, 500, 1000]);
  });
  it('asks only for this academy\'s unpaid, unvoided invoices due before today', async () => {
    const f = use(ok);
    await loadNeedsYouData('academy-7', '2026-11-27');
    const filters = f.calls.find(c => c.table === 'fee_invoice_balances')!.filters;
    expect(filters).toEqual(expect.arrayContaining([['eq', 'academy_id', 'academy-7'], ['lt', 'due_on', '2026-11-27'], ['gt', 'balance_paise', 0], ['is', 'voided_at', null]]));
  });
  it('an exact multiple of 500 rows triggers one extra empty page and still returns all rows', async () => {
    use(call => call.table !== 'fee_invoice_balances' ? ok(call) : { data: call.offset < 500 ? invoices(500) : [] });
    expect((await loadNeedsYouData('a', '2026-11-27')).invoices).toHaveLength(500);
  });
});
