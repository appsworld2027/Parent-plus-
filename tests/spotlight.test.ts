// Browserless scenarios for Spotlight rules and loading (M2-18).
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeSupabase, type Call } from './support/fakeSupabase';
import { daysBetween, noteLabel, pickSpotlight, spotlightCandidates } from '../src/today/spotlight';

const TZ = 'Asia/Kolkata';
const NOW = new Date('2026-11-27T06:00:00Z'); // 11:30 IST on 27 Nov
const cand = (id: string, name = id, classes = ['Clay']) => ({ id, name, classes });
const ago = (days: number) => new Date(NOW.getTime() - days * 86400000).toISOString();
const ctx = (over: Record<string, unknown> = {}) => ({
  sessions: [{ id: 's1', batch_id: 'b1', starts_at: '2026-11-27T05:00:00Z', ends_at: '2026-11-27T06:00:00Z', room: '', status: 'scheduled', attendance_revision: 0 }],
  batches: [{ id: 'b1', name: 'Clay', room: '', monthly_fee_paise: 0, archived_at: null }, { id: 'b2', name: 'Art', room: '', monthly_fee_paise: 0, archived_at: null }],
  students: [{ id: 'a', name: 'Ann', age_years: 7, archived_at: null }, { id: 'z', name: 'Zed', age_years: 7, archived_at: null }],
  enrolments: [{ student_id: 'a', batch_id: 'b1', starts_on: '2020-01-01', ends_on: null }, { student_id: 'z', batch_id: 'b1', starts_on: '2020-01-01', ends_on: null }],
  ...over,
}) as never;

describe('daysBetween and noteLabel', () => {
  it('counts calendar days, including across a month end', () => { expect(daysBetween('2026-11-27', '2026-11-27')).toBe(0); expect(daysBetween('2026-10-31', '2026-11-02')).toBe(2); });
  it('words 0, 1, many and never', () => {
    expect([0, 1, 3, null].map(noteLabel)).toEqual(['Last note today', 'Last note 1 day ago', 'Last note 3 days ago', 'No note yet']);
    expect(noteLabel(-1)).toBe('Last note today'); // a clock-skewed future note is not shown as negative
  });
});
describe('spotlightCandidates', () => {
  it('lists enrolled, non-archived children of non-cancelled classes once', () => {
    const c = ctx({ sessions: [...(ctx() as never as { sessions: unknown[] }).sessions, { id: 's2', batch_id: 'b1', starts_at: '2026-11-27T08:00:00Z', ends_at: '2026-11-27T09:00:00Z', room: '', status: 'scheduled', attendance_revision: 0 }] });
    expect(spotlightCandidates(c, TZ).map(x => x.id)).toEqual(['a', 'z']);
  });
  it('excludes cancelled classes, archived children, ended enrolments and children of classes not on today', () => {
    expect(spotlightCandidates(ctx({ sessions: [{ id: 's1', batch_id: 'b1', starts_at: '2026-11-27T05:00:00Z', status: 'cancelled' }] }), TZ)).toEqual([]);
    expect(spotlightCandidates(ctx({ students: [{ id: 'a', name: 'Ann', archived_at: '2026-01-01' }, { id: 'z', name: 'Zed', archived_at: null }] }), TZ).map(x => x.id)).toEqual(['z']);
    expect(spotlightCandidates(ctx({ enrolments: [{ student_id: 'a', batch_id: 'b1', starts_on: '2020-01-01', ends_on: '2020-06-01' }, { student_id: 'z', batch_id: 'b2', starts_on: '2020-01-01', ends_on: null }] }), TZ)).toEqual([]);
  });
  it('lists every class a child is in, once each', () => {
    const c = ctx({ sessions: [{ id: 's1', batch_id: 'b1', starts_at: '2026-11-27T05:00:00Z', status: 'scheduled' }, { id: 's2', batch_id: 'b2', starts_at: '2026-11-27T08:00:00Z', status: 'scheduled' }],
      enrolments: [{ student_id: 'a', batch_id: 'b1', starts_on: '2020-01-01', ends_on: null }, { student_id: 'a', batch_id: 'b2', starts_on: '2020-01-01', ends_on: null }] });
    expect(spotlightCandidates(c, TZ)).toEqual([{ id: 'a', name: 'Ann', classes: ['Clay', 'Art'] }]);
  });
  it('returns nothing for no sessions', () => { expect(spotlightCandidates(ctx({ sessions: [] }), TZ)).toEqual([]); });
});
describe('pickSpotlight', () => {
  it('ranks never-noted by name, then oldest note; caps at 3', () => {
    const notes = new Map([['c', ago(9)], ['d', ago(20)], ['e', ago(2)]]);
    const out = pickSpotlight([cand('e'), cand('d'), cand('c'), cand('b'), cand('a')], notes, TZ, NOW);
    expect(out.rows.map(r => r.id)).toEqual(['a', 'b', 'd']);
    expect(out.rows[2].daysAgo).toBe(20);
  });
  it('breaks ties between equal note times by name', () => {
    const at = ago(5); const out = pickSpotlight([cand('y', 'Yan'), cand('x', 'Xia')], new Map([['x', at], ['y', at]]), TZ, NOW);
    expect(out.rows.map(r => r.name)).toEqual(['Xia', 'Yan']);
  });
  it('uses the academy day, not UTC, for "today" (a note at 19:00 UTC is already tomorrow in IST)', () => {
    const late = new Date('2026-11-27T19:00:00Z'); // 00:30 IST on 28 Nov
    expect(pickSpotlight([cand('a')], new Map([['a', '2026-11-27T10:00:00Z']]), TZ, late).rows[0].daysAgo).toBe(1);
  });
  it('shows no rows and flags everyone-noted-today when all have a note today', () => {
    const out = pickSpotlight([cand('a'), cand('b')], new Map([['a', ago(0)], ['b', ago(0)]]), TZ, NOW);
    expect(out).toMatchObject({ rows: [], everyoneNotedToday: true, candidates: 2 });
  });
  it('one child without a note today keeps the rows (the noted child ranks last)', () => {
    expect(pickSpotlight([cand('a'), cand('b')], new Map([['a', ago(0)]]), TZ, NOW).rows.map(r => r.id)).toEqual(['b', 'a']);
  });
  it('handles no candidates and does not mutate its input', () => {
    expect(pickSpotlight([], new Map(), TZ, NOW)).toEqual({ rows: [], candidates: 0, everyoneNotedToday: false });
    const list = [cand('b'), cand('a')]; pickSpotlight(list, new Map(), TZ, NOW); expect(list.map(x => x.id)).toEqual(['b', 'a']);
  });
  it('ranks 20,000 children quickly', () => {
    const many = Array.from({ length: 20000 }, (_, i) => cand(`s${i}`, `S${String(i).padStart(5, '0')}`)); const t = performance.now();
    expect(pickSpotlight(many, new Map(), TZ, NOW).rows.map(r => r.name)).toEqual(['S00000', 'S00001', 'S00002']);
    expect(performance.now() - t).toBeLessThan(1500);
  });
});

const holder = vi.hoisted(() => ({ client: null as unknown }));
vi.mock('../src/auth/client', () => ({ get supabase() { return holder.client; } }));
import { loadLastNotes } from '../src/today/spotlightService';
const use = (h: (c: Call) => { data?: unknown[]; error?: unknown }) => { const f = fakeSupabase(h); holder.client = f.client; return f; };

describe('loadLastNotes', () => {
  beforeEach(() => { holder.client = null; });
  it('fails closed without a client', async () => { await expect(loadLastNotes('a', new Set())).rejects.toThrow('Client unavailable'); });
  it('keeps the newest recorded note per child, only for requested children, and reads recorded notes only', async () => {
    const f = use(c => c.table === 'observations' ? { data: [{ id: 'o1', recorded_at: '2026-11-01T00:00:00Z' }, { id: 'o2', recorded_at: '2026-11-20T00:00:00Z' }, { id: 'draft', recorded_at: null }] }
      : { data: [{ observation_id: 'o1', student_id: 'a' }, { observation_id: 'o2', student_id: 'a' }, { observation_id: 'o1', student_id: 'other' }] });
    const last = await loadLastNotes('acad', new Set(['a']));
    expect([...last]).toEqual([['a', '2026-11-20T00:00:00Z']]);
    expect(f.calls.find(c => c.table === 'observations')!.filters).toEqual(expect.arrayContaining([['eq', 'academy_id', 'acad'], ['eq', 'status', 'recorded']]));
  });
  it('reads recipients in chunks of 100 observation ids', async () => {
    const f = use(c => c.table === 'observations' ? { data: Array.from({ length: 250 }, (_, i) => ({ id: `o${i}`, recorded_at: '2026-11-01T00:00:00Z' })) } : {});
    await loadLastNotes('a', new Set(['x']));
    expect(f.calls.filter(c => c.table === 'observation_recipients').map(c => (c.filters.find(x => x[0] === 'in')![2] as string[]).length)).toEqual([100, 100, 50]);
  });
  it('pages observations past 500 rows', async () => {
    const f = use(c => c.table === 'observations' ? { data: Array.from({ length: Math.min(500, 1100 - c.offset) }, (_, i) => ({ id: `o${c.offset + i}`, recorded_at: '2026-11-01T00:00:00Z' })) } : {});
    await loadLastNotes('a', new Set());
    expect(f.calls.filter(c => c.table === 'observations').map(c => c.offset)).toEqual([0, 500, 1000]);
  });
  it('propagates a read failure (the card then shows its error line)', async () => {
    use(c => c.table === 'observation_recipients' ? { error: { message: 'x' } } : { data: [{ id: 'o1', recorded_at: '2026-11-01T00:00:00Z' }] });
    await expect(loadLastNotes('a', new Set(['a']))).rejects.toEqual({ message: 'x' });
  });
});
