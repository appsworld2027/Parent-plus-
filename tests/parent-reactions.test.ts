import { describe, expect, it } from 'vitest';
import { countsText, reactionLabel, reactionSummary, REACTIONS } from '../src/parent/reactions';
const r = (h: string, reaction: string, at: string) => ({ handoff_id: h, reaction, reacted_at: at });
describe('parent reactions rules (M2-24)', () => {
  it('PR-01 exactly three fixed reactions, no free text', () => { expect(REACTIONS.map(x => x.kind)).toEqual(['thanks', 'helpful', 'will_try']); });
  it('PR-05 coach counts per note, newest activity first, no parent identity in the result', () => {
    const s = reactionSummary([r('a', 'thanks', '2026-11-01T10:00:00Z'), r('b', 'helpful', '2026-11-02T10:00:00Z'), r('a', 'thanks', '2026-11-03T10:00:00Z'), r('a', 'will_try', '2026-11-01T11:00:00Z')]);
    expect(s.map(x => x.handoff)).toEqual(['a', 'b']);
    expect(s[0].counts).toEqual({ thanks: 2, helpful: 0, will_try: 1 });
    expect(countsText(s[0].counts)).toBe('Thank you ×2 · We will try this ×1');
    expect(JSON.stringify(s)).not.toContain('parent_user');
  });
  it('PR-11 empty input means nothing to show; unknown kinds are ignored', () => {
    expect(reactionSummary([])).toEqual([]); expect(reactionSummary([r('a', 'angry', '2026-11-01T10:00:00Z')])).toEqual([]);
  });
  it('labels fall back to the raw kind', () => { expect(reactionLabel('helpful')).toBe('Helpful'); expect(reactionLabel('zzz')).toBe('zzz'); });
});
