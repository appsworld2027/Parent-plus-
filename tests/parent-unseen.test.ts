// Rules for docs/product/parent-notification-badge (NB-01, 03..05).
import { describe, expect, it } from 'vitest';
import { unseenCount, unseenLine } from '../src/parent/unseen';

const now = new Date('2026-11-28T12:00:00Z');
describe('unseen coach updates', () => {
  it('NB-01 counts recent unseen items and words the line', () => {
    expect(unseenCount(['2026-11-28T10:00:00Z', '2026-11-27T10:00:00Z'], null, now)).toBe(2);
    expect(unseenLine(1)).toBe('1 new update from your coach'); expect(unseenLine(3)).toBe('3 new updates from your coach');
  });
  it('NB-03 only items newer than the read marker count', () => expect(unseenCount(['2026-11-28T10:00:00Z', '2026-11-27T10:00:00Z'], '2026-11-28T00:00:00Z', now)).toBe(1));
  it('NB-04 items older than 7 days are ignored', () => expect(unseenCount(['2026-11-10T10:00:00Z'], null, now)).toBe(0));
  it('NB-05 nothing means zero', () => expect(unseenCount([], null, now)).toBe(0));
  it('NB-06 markers are per child (pure per-list)', () => { expect(unseenCount(['2026-11-28T10:00:00Z'], '2026-11-28T11:00:00Z', now)).toBe(0); expect(unseenCount(['2026-11-28T10:00:00Z'], null, now)).toBe(1); });
});

describe('independent review: mixed timestamp formats', () => {
  it('NB-08 same instant in +00:00 and Z form is not counted as new', () => {
    const now = new Date('2026-11-28T10:00:00Z');
    expect(unseenCount(['2026-11-28T09:00:00+00:00'], '2026-11-28T09:00:00.000Z', now)).toBe(0);
    expect(unseenCount(['2026-11-28T09:00:01+00:00'], '2026-11-28T09:00:00.000Z', now)).toBe(1);
    expect(unseenCount(['2026-11-28T14:30:00+05:30'], '2026-11-28T09:00:00.000Z', now)).toBe(0);
  });
});
