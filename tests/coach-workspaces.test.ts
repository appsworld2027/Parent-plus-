import { describe, expect, it, vi } from 'vitest';
import { listCoachWorkspaces } from '../src/auth/coachWorkspaces';

describe('APVerse Coach workspaces', () => {
  it('loads every active Coach workspace page using the server cursor', async () => {
    const rpc = vi.fn()
      .mockResolvedValueOnce({ data: { academies: [{ workspace_id: '00000000-0000-0000-0000-000000000001', name: 'North Studio', time_zone: 'Asia/Kolkata' }], next_after: '00000000-0000-0000-0000-000000000001' }, error: null })
      .mockResolvedValueOnce({ data: { academies: [{ workspace_id: '00000000-0000-0000-0000-000000000002', name: 'South Studio', time_zone: 'Asia/Kolkata' }], next_after: null }, error: null });

    await expect(listCoachWorkspaces(rpc)).resolves.toEqual([
      { id: '00000000-0000-0000-0000-000000000001', name: 'North Studio', timezone: 'Asia/Kolkata' },
      { id: '00000000-0000-0000-0000-000000000002', name: 'South Studio', timezone: 'Asia/Kolkata' },
    ]);
    expect(rpc).toHaveBeenNthCalledWith(1, 'app_today_academies', { p_after: null });
    expect(rpc).toHaveBeenNthCalledWith(2, 'app_today_academies', { p_after: '00000000-0000-0000-0000-000000000001' });
  });

  it('rejects malformed pages and a cursor that does not advance', async () => {
    const malformed = vi.fn().mockResolvedValue({ data: { academies: [{ workspace_id: 'not-a-uuid', name: 'Studio', time_zone: null }], next_after: null }, error: null });
    await expect(listCoachWorkspaces(malformed)).rejects.toThrow('Invalid Coach workspace response');

    const repeatedPage = { academies: [{ workspace_id: '00000000-0000-0000-0000-000000000001', name: 'Studio', time_zone: null }], next_after: '00000000-0000-0000-0000-000000000001' };
    const repeatedCursor = vi.fn().mockResolvedValue({ data: repeatedPage, error: null });
    await expect(listCoachWorkspaces(repeatedCursor)).rejects.toThrow('Coach workspace pagination did not advance');
  });

  it('surfaces backend errors without treating them as an empty workspace list', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: new Error('Permission denied') });
    await expect(listCoachWorkspaces(rpc)).rejects.toThrow('Permission denied');
  });
});
