// Pure rules for docs/product/child-progress-timeline (CT-01..03, 05..07).
import { describe, expect, it } from 'vitest';
import { timelineCount, timelineGroups } from '../src/parent/timeline';

const row = (id: string, at: string, child = 'c1') => ({ id, child_id: child, reviewed_at: at });
describe('child progress timeline', () => {
  it('CT-01/02 months newest first, updates newest first inside a month', () => {
    const g = timelineGroups([row('a', '2026-10-05T10:00:00Z'), row('b', '2026-11-02T10:00:00Z'), row('c', '2026-11-20T10:00:00Z')], 'Asia/Kolkata');
    expect(g.map(x => x.label)).toEqual(['November 2026', 'October 2026']);
    expect(g[0].items.map(x => x.id)).toEqual(['c', 'b']);
  });
  it('CT-03 count wording', () => { expect(timelineCount(1)).toBe('1 update from your coaches'); expect(timelineCount(3)).toBe('3 updates from your coaches'); });
  it('CT-05 grouping works on one child list; empty list gives no groups (CT-04)', () => {
    const own = [row('a', '2026-11-02T10:00:00Z'), row('x', '2026-09-02T10:00:00Z', 'c2')].filter(r => r.child_id === 'c1');
    expect(timelineGroups(own, 'Asia/Kolkata')).toHaveLength(1); expect(timelineGroups([], 'Asia/Kolkata')).toEqual([]);
  });
  it('CT-06 uses the family timezone: 30 Nov 20:00 UTC is 1 Dec in India', () => {
    expect(timelineGroups([row('a', '2026-11-30T20:00:00Z')], 'Asia/Kolkata')[0].label).toBe('December 2026');
    expect(timelineGroups([row('a', '2026-11-30T20:00:00Z')], 'UTC')[0].label).toBe('November 2026');
  });
  it('CT-07 missing timezone falls back to Asia/Kolkata', () => {
    expect(timelineGroups([row('a', '2026-11-30T20:00:00Z')], undefined)[0].label).toBe('December 2026');
    expect(timelineGroups([row('a', '2026-11-30T20:00:00Z')], '')[0].label).toBe('December 2026');
  });
});

describe('independent review: mixed timestamp formats', () => {
  it('CT-08 newest first even when formats differ (+00:00 vs Z)', () => {
    const g = timelineGroups([{ reviewed_at: '2026-11-10T09:00:00+00:00' }, { reviewed_at: '2026-11-10T09:30:00.000Z' }], 'Asia/Kolkata');
    expect(g[0].items.map(i => i.reviewed_at)).toEqual(['2026-11-10T09:30:00.000Z', '2026-11-10T09:00:00+00:00']);
  });
});
