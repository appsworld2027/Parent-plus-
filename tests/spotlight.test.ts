// Rules for docs/product/spotlight-rotation (SP-02..05).
import { describe, expect, it } from 'vitest';
import { spotlight, spotlightLine } from '../src/today/spotlight';

const now = new Date('2026-11-28T12:00:00Z'), today = '2026-11-28', dayOf = (iso: string) => iso.slice(0, 10);
const st = (id: string, archived = false) => ({ id, name: id, age_years: 8, archived_at: archived ? 'x' : null });
const en = (s: string, batch = 'b', extra = {}) => ({ student_id: s, batch_id: batch, starts_on: '2026-01-01', ends_on: null, ...extra });
const run = (students: ReturnType<typeof st>[], enrolments: ReturnType<typeof en>[], observed: Record<string, string>, batches = ['b']) => spotlight(students as never, enrolments as never, batches, observed, today, now, dayOf);
describe('spotlight rotation', () => {
  const kids = ['a', 'b', 'c', 'd'].map(id => st(id));
  it('SP-02 never-observed first, then oldest; max 3', () => {
    const r = run(kids, kids.map(k => en(k.id)), { a: '2026-11-20T10:00:00Z', b: '2026-11-10T10:00:00Z', c: '2026-11-25T10:00:00Z' });
    expect(r.map(x => x.id)).toEqual(['d', 'b', 'a']);
  });
  it('SP-03 wording', () => {
    expect(spotlightLine({ id: 'a', name: 'Ria', days: null })).toBe('Ria · no recorded observation yet');
    expect(spotlightLine({ id: 'a', name: 'Ria', days: 1 })).toBe('Ria · last observed 1 day ago');
    expect(spotlightLine({ id: 'a', name: 'Ria', days: 18 })).toBe('Ria · last observed 18 days ago');
  });
  it('SP-04 child already observed today is skipped', () => expect(run([st('a')], [en('a')], { a: '2026-11-28T03:00:00Z' })).toEqual([]));
  it('SP-05 archived, ended, not started, batch without class today are excluded', () => {
    expect(run([st('a', true)], [en('a')], {})).toEqual([]);
    expect(run([st('a')], [en('a', 'b', { ends_on: '2026-06-30' })], {})).toEqual([]);
    expect(run([st('a')], [en('a', 'b', { starts_on: '2027-01-01' })], {})).toEqual([]);
    expect(run([st('a')], [en('a', 'other')], {})).toEqual([]);
  });
});
