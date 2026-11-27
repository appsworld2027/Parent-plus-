import { describe, expect, it } from 'vitest';
import { announcementProblem } from '../src/today/CoachAnnounce';
import { announcementsForChild } from '../src/parent/signals';
describe('class announcements rules', () => {
  it('CA-03/04 blank and over-long text are refused', () => {
    expect(announcementProblem('  ')).not.toBeNull();
    expect(announcementProblem('x'.repeat(501))).not.toBeNull();
    expect(announcementProblem('x'.repeat(500))).toBeNull();
  });
  it('CA-06 shows a child only their announcements, newest first', () => {
    const rows = [{ id: '1', child_id: 'a', batch_name: 'B', body: 'old', created_at: '2026-11-01T00:00:00Z' }, { id: '2', child_id: 'a', batch_name: 'B', body: 'new', created_at: '2026-11-02T00:00:00Z' }, { id: '3', child_id: 'b', batch_name: 'B', body: 'x', created_at: '2026-11-03T00:00:00Z' }];
    expect(announcementsForChild(rows, 'a').map(r => r.id)).toEqual(['2', '1']);
  });
});
