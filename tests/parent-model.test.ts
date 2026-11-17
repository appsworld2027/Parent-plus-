import { expect,it } from 'vitest';
import { parentWeek,weekStart,type ParentData } from '../src/parent/model';
it('counts only the selected child and current week from saved records, including an empty week',()=>{
  const data={children:[],moments:[{child_id:'a',occurred_on:'2026-11-16',minutes:12},{child_id:'b',occurred_on:'2026-11-16',minutes:50},{child_id:'a',occurred_on:'2026-11-15',minutes:30}],todos:[{child_id:'a',done:false},{child_id:'a',done:true}],events:[],links:[],permissions:[],feedback:[]} as unknown as ParentData;
  expect(weekStart('2026-11-22')).toBe('2026-11-16');
  expect(parentWeek(data,'a','2026-11-16')).toEqual({minutes:12,moments:1,todos:1});
  expect(parentWeek(data,'c','2026-11-16')).toEqual({minutes:0,moments:0,todos:0});
});
