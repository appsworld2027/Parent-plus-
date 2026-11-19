import type { ParentRequest } from './identity';
import { localParts } from '../classes/model';
export const parentVersion='0.3.1';
export const parentColors = { sun:'#FFD23F',rose:'#FF5D8F',sky:'#3ABEFF',mint:'#2EE6A6',grape:'#A27BFF',tang:'#FF8A3D' };
export type Family = { id:string;owner_id:string;parent_name:string;name:string;timezone:string };
export type Child = { id:string;family_id:string;name:string;born_on:string|null;color:keyof typeof parentColors;archived_at:string|null };
export type Moment = { id:string;family_id:string;child_id:string;note:string;minutes:number;kind:'memory'|'together';occurred_on:string };
export type Todo = { id:string;family_id:string;child_id:string;title:string;done:boolean };
export type FamilyEvent = { id:string;family_id:string;child_id:string;title:string;starts_at:string;ends_at:string;location:string };
export type CoachLink = { id:string;academy_id:string;student_id:string;child_id:string;active:boolean;academy_name:string;student_name:string };
export type ParentPermission = { link_id:string;allow_photos:boolean;allow_videos:boolean;allow_parent_sharing:boolean;source:string;recorded_at:string };
export type ParentFeedback = { id:string;child_id:string;reviewed_at:string;snapshot:{schema_version:number;note:string;academy_name:string;student_name:string;recorded_at:string;session_id:string|null;media_ids:string[]} };
export type ParentData = { identityReady:boolean;connectionRequests:ParentRequest[]; children:Child[];moments:Moment[];todos:Todo[];events:FamilyEvent[];links:CoachLink[];permissions:ParentPermission[];feedback:ParentFeedback[] };
export function parentToday(timezone:string) { return localParts(new Date().toISOString(),timezone).date; }
export function weekStart(today:string) { const date=new Date(`${today}T12:00:00Z`);date.setUTCDate(date.getUTCDate()-((date.getUTCDay()+6)%7));return date.toISOString().slice(0,10); }
export function parentWeek(data:ParentData,child:string,today:string) {
  const start=weekStart(today),moments=data.moments.filter(row=>row.child_id===child&&row.occurred_on>=start&&row.occurred_on<=today);
  return {minutes:moments.reduce((sum,row)=>sum+row.minutes,0),moments:moments.length,todos:data.todos.filter(row=>row.child_id===child&&!row.done).length};
}
// Static activity suggestions, not fabricated family achievements.
export const activities = [
  {id:'paper-boats',title:'Paper boat race',minutes:15,color:'sky' as const,need:'Paper, water and a wide bowl',steps:'Fold two simple paper boats. Float them in a bowl, then blow gently to race. Ask what helps a boat move straight.'},
  {id:'story',title:'Make up a tiny story',minutes:10,color:'grape' as const,need:'Three everyday objects',steps:'Pick three objects together. Take turns adding one sentence to a story that includes them. Let your child decide the ending.'},
  {id:'dance',title:'Freeze-dance party',minutes:10,color:'rose' as const,need:'A little space and a favourite song',steps:'Dance while music plays. Pause and freeze together. Take turns choosing a funny pose; keep the movement comfortable.'},
  {id:'create',title:'Colour scavenger hunt',minutes:15,color:'sun' as const,need:'A safe room to explore',steps:'Choose a colour. Find three objects in that colour together. Talk about their shapes and textures, then swap colours.'},
];
