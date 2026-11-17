import { describe, expect, it } from 'vitest';
import { createObservationDrafts, parseDeviceObservation } from '../src/observations/drafts';
import { eligibleRecipients, sameAudience, validateObservation } from '../src/observations/model';
import type { DeviceObservation } from '../src/observations/model';
const snapshot: DeviceObservation = { version: 1, owner: 'owner-1', academy: 'academy-1', savedAt: '2026-11-12T10:00:00.000Z',
  draft: { id: 'note-1', batch: 'batch-1', session: '', audience: 'student', recipients: ['student-1'], note: 'Fictional private observation', revision: 0, status: 'draft' } };
function memory() { const values = new Map<string,string>(); return { values, driver: { getItem: async (key: string) => values.get(key) ?? null,
  setItem: async (key: string, value: string) => { values.set(key,value); }, removeItem: async (key: string) => { values.delete(key); } } }; }

describe('private observation device drafts', () => {
  it('restores the complete scoped draft without extra fields', async () => {
    const { driver } = memory(); const first=createObservationDrafts(driver);
    await first.save(snapshot,first.token()); const next=createObservationDrafts(driver);
    expect(await next.read()).toEqual(snapshot);
    expect(JSON.stringify(parseDeviceObservation(JSON.stringify({ ...snapshot, token: 'SHOULD-NOT-RETAIN' })))).not.toContain('SHOULD-NOT-RETAIN');
  });
  it('rejects corrupt/oversized or widened individual drafts', () => {
    expect(() => parseDeviceObservation('corrupt')).toThrow();
    expect(() => parseDeviceObservation('x'.repeat(150001))).toThrow();
    expect(() => parseDeviceObservation(JSON.stringify({ ...snapshot,draft:{...snapshot.draft,recipients:['a','b']} }))).toThrow();
    expect(() => parseDeviceObservation(JSON.stringify({ ...snapshot,draft:{...snapshot.draft,note:'x'.repeat(10001)} }))).toThrow();
  });
  it('coalesces queued edits and keeps the most recent text', async () => {
    const { driver }=memory(); const store=createObservationDrafts(driver); const token=store.token();
    const newer={...snapshot,draft:{...snapshot.draft,note:'Newest fictional text'}};
    const results=await Promise.all([store.save(snapshot,token),store.save(newer,token)]);
    expect(results).toEqual(['superseded','saved']); expect((await store.read())?.draft.note).toBe(newer.draft.note);
  });
  it('sign-out invalidates scheduled writers so private text cannot reappear', async () => {
    const { driver }=memory(); const store=createObservationDrafts(driver); const token=store.token();
    await store.save(snapshot,token); const clearing=store.clear();
    await expect(store.save(snapshot,token)).rejects.toThrow('expired'); await clearing;
    expect(await store.read()).toBeNull();
  });
  it('an older request cleanup cannot delete newer edits', async () => {
    const { driver }=memory(); const store=createObservationDrafts(driver); const token=store.token();
    const newer={...snapshot,savedAt:'2026-11-12T10:01:00.000Z',draft:{...snapshot.draft,note:'Newer text'}};
    await store.save(snapshot,token); await store.save(newer,token); await store.clear(snapshot);
    expect(await store.read()).toEqual(newer); await store.clear(newer); expect(await store.read()).toBeNull();
  });
  it('keeps storage failure explicit instead of falsely confirming a draft', async () => {
    const store=createObservationDrafts({ getItem:async()=>null, setItem:async()=>{throw new Error('full');}, removeItem:async()=>{} });
    await expect(store.save(snapshot,store.token())).rejects.toThrow('full');
  });
  it('allows incomplete server drafts but requires text and recipients to record', () => {
    expect(validateObservation({...snapshot.draft,note:'',recipients:[]},false)).toBeNull();
    expect(validateObservation({...snapshot.draft,note:''},true)).toContain('Write');
    expect(validateObservation({...snapshot.draft,recipients:[]},true)).toContain('Choose');
    expect(eligibleRecipients({ batches: [], students: [], enrolments: [], sessions: [] }, 'batch-1', 'unknown-older-class', 'Asia/Kolkata')).toEqual([]);
    expect(sameAudience(snapshot.draft,{...snapshot.draft,audience:'batch',recipients:['student-1','student-2']})).toBe(false);
  });
});
