import { describe, expect, it } from 'vitest';
import { classValues, completeMarks, dayRange, eligibleStudents, localParts, sameMarks, wallTime } from '../src/classes/model';
import { createAttendanceDrafts, parseAttendanceDraft } from '../src/classes/drafts';
import type { AttendanceDraft, ClassContext, ClassDraft, ClassSession } from '../src/classes/model';

const session: ClassSession = { id: 'class-1', batch_id: 'batch-1', starts_at: '2026-11-12T18:45:00.000Z', ends_at: '2026-11-12T19:45:00.000Z', room: '', status: 'scheduled', attendance_revision: 0 };
const draft: ClassDraft = { id: 'class-1', batch: 'batch-1', startDate: '2026-11-12', startTime: '23:30', endDate: '2026-11-13', endTime: '00:30', room: '', status: 'scheduled' };
function memory() { const values = new Map<string, string>(); return { values, storage: { getItem: async (key: string) => values.get(key) ?? null,
  setItem: async (key: string, value: string) => { values.set(key, value); }, removeItem: async (key: string) => { values.delete(key); } } }; }
const local: AttendanceDraft = { version: 1, owner: 'owner-1', academy: 'academy-1', session: 'class-1', fingerprint: 'batch-1|2026-11-12T18:45:00.000Z|2026-11-12T19:45:00.000Z|scheduled', revision: 0, marks: { 'student-1': 'present' }, savedAt: '2026-11-12T20:00:00.000Z' };

describe('academy dates and class validation', () => {
  it('uses the academy timezone even when UTC dates differ', () => {
    expect(localParts(session.starts_at, 'Asia/Kolkata')).toEqual({ date: '2026-11-13', time: '00:15' });
    expect(wallTime('2026-11-13', '00:15', 'Asia/Kolkata')).toBe(session.starts_at);
  });
  it('accepts overnight classes and rejects reversed/equal end times', () => {
    expect(classValues(draft, 'Asia/Kolkata')).toEqual({ starts: '2026-11-12T18:00:00.000Z', ends: '2026-11-12T19:00:00.000Z' });
    expect(() => classValues({ ...draft, endDate: draft.startDate, endTime: '23:30' }, 'Asia/Kolkata')).toThrow('after its start');
  });
  it('rejects normalized invalid dates and invalid time input', () => {
    for (const date of ['2026-02-30', '12/11/2026', '1999-01-01']) expect(() => wallTime(date, '12:00', 'Asia/Kolkata')).toThrow();
    expect(() => wallTime('2026-11-12', '24:00', 'Asia/Kolkata')).toThrow();
    expect(() => classValues({ ...draft, batch: '' }, 'Asia/Kolkata')).toThrow('Choose a batch');
  });
  it('rejects DST gaps and repeated ambiguous times rather than guessing', () => {
    expect(() => wallTime('2026-03-08', '02:30', 'America/New_York')).toThrow('skipped');
    expect(() => wallTime('2026-11-01', '01:30', 'America/New_York')).toThrow('repeats');
    expect(wallTime('2026-03-08', '03:30', 'America/New_York')).toBe('2026-03-08T07:30:00.000Z');
  });
  it('queries a local day using timezone-aware next-day boundaries', () => {
    expect(dayRange('2026-11-12', 'Asia/Kolkata')).toEqual({ start: '2026-11-11T18:30:00.000Z', end: '2026-11-12T18:30:00.000Z' });
    const range = dayRange('2026-03-08', 'America/New_York');
    expect(Date.parse(range.end) - Date.parse(range.start)).toBe(23 * 3_600_000);
  });
  it('marks only students enrolled on the local class date, excluding archives', () => {
    const context: ClassContext = { sessions: [session], batches: [], students: ['valid', 'future', 'ended', 'archived'].map(id => ({ id, name: id, age_years: null, archived_at: id === 'archived' ? '2026-11-12' : null })),
      enrolments: ['valid', 'future', 'ended', 'archived'].map(student_id => ({ student_id, batch_id: 'batch-1', starts_on: student_id === 'future' ? '2026-11-14' : '2026-11-13', ends_on: student_id === 'ended' ? '2026-11-12' : null })) };
    expect(eligibleStudents(context, session, 'Asia/Kolkata').map(s => s.id)).toEqual(['valid']);
  });
  it('recognizes an already-saved desired state but not an empty or differing draft', () => {
    expect(sameMarks({ a: 'present' }, { a: 'present', b: 'absent' })).toBe(true);
    expect(sameMarks({}, {})).toBe(false); expect(sameMarks({ a: 'late' }, { a: 'present' })).toBe(false);
  });
});

describe('private attendance device drafts', () => {
  it('survives reopening and clears only the matching owner/academy/session', async () => {
    const { storage } = memory(); const store = createAttendanceDrafts(storage);
    await store.save(local);
    const reopened = createAttendanceDrafts(storage); expect(await reopened.read()).toEqual(local);
    await reopened.clear({ owner: 'other', academy: local.academy, session: local.session });
    expect(await reopened.read()).not.toBeNull();
    await reopened.clear({ owner: local.owner, academy: local.academy, session: local.session });
    expect(await reopened.read()).toBeNull();
  });
  it('strips arbitrary data and rejects invalid or oversized marks', () => {
    expect(parseAttendanceDraft(JSON.stringify({ ...local, name: 'PRIVATE', marks: { 'student-1': ['present'] } }))).toBeNull();
    expect(JSON.stringify(parseAttendanceDraft(JSON.stringify({ ...local, name: 'PRIVATE' })))).not.toContain('PRIVATE');
    expect(parseAttendanceDraft(JSON.stringify({ ...local, marks: Object.fromEntries(Array.from({ length: 501 }, (_, i) => [`id-${i}`, 'present'])) }))).toBeNull();
    expect(parseAttendanceDraft('broken')).toBeNull();
  });
  it('serializes a pending write and sign-out clear so a draft cannot reappear', async () => {
    const { storage } = memory(); const store = createAttendanceDrafts(storage);
    const writing = store.save(local); const clearing = store.clear();
    await writing; await clearing; expect(await store.read()).toBeNull();
  });
  it('reports storage failure without mutating the in-memory input', async () => {
    const store = createAttendanceDrafts({ getItem: async () => null, setItem: async () => { throw new Error('full'); }, removeItem: async () => {} });
    await expect(store.save(local)).rejects.toThrow('full'); expect(local.marks['student-1']).toBe('present');
  });
});

it('a matching saved subset is not complete when the roster gained a student', () => {
  const context: ClassContext = { sessions: [session], batches: [], students: ['a','b'].map(id => ({ id, name: id, age_years: null, archived_at: null })), enrolments: ['a','b'].map(student_id => ({ student_id, batch_id: session.batch_id, starts_on: '2020-01-01', ends_on: null })) };
  expect(sameMarks({ a: 'present' }, { a: 'present' })).toBe(true);
  expect(completeMarks({ a: 'present' }, context, session, 'Asia/Kolkata')).toBe(false);
});
