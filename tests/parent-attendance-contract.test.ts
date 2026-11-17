import {expect,it} from 'vitest';
import {decodeAttendanceSessions,mondayOf} from '../src/parent/attendance';
const row={session_id:'00000000-0000-0000-0000-000000000041',academy_id:'00000000-0000-0000-0000-000000000011',academy_name:'Art',batch_name:'Drawing',starts_at:'2026-11-16T10:00:00Z',ends_at:'2026-11-16T11:00:00Z',session_status:'scheduled',attendance_status:null};
it('preserves unrecorded attendance and whitelists the output',()=>{expect(decodeAttendanceSessions([{...row,private_note:'must not copy'}])).toEqual([row]);});
it.each([{attendance_status:'make_up'},{ends_at:row.starts_at},{starts_at:'bad'},{session_id:'bad'},{session_status:'invented'},{academy_name:' '}])('rejects malformed destination rows %j',change=>{expect(decodeAttendanceSessions([{...row,...change}])).toBeNull();});
it('rejects duplicate, unordered or oversized pages',()=>{expect(decodeAttendanceSessions([row,row])).toBeNull();expect(decodeAttendanceSessions(Array(51).fill(row))).toBeNull();expect(decodeAttendanceSessions([{...row,starts_at:'2026-11-16T10:01:00Z'},{...row,session_id:'00000000-0000-0000-0000-000000000042'}])).toBeNull();});
it('accepts empty pages and finds the Monday across a year boundary',()=>{expect(decodeAttendanceSessions([])).toEqual([]);expect(mondayOf('2027-01-01')).toBe('2026-12-28');});
it.each(['2026-02-30','invalid','2026-13-01'])('rejects invalid week input %s',day=>{expect(()=>mondayOf(day)).toThrow('Invalid day');});
