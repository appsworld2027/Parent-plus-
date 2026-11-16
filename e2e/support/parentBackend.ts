import type { Page } from '@playwright/test';
import type { Child, CoachLink, Family, FamilyEvent, Moment, ParentPermission, Todo } from '../../src/parent/model';
import { classMediaBackend } from './classMediaBackend';
type ParentFixture={families:Family[];children:Child[];moments:Moment[];todos:Todo[];events:FamilyEvent[];links:CoachLink[];permissions:ParentPermission[];invites:Record<string,{student:string;used:boolean}>;loseMoment:boolean;missing:boolean;writes:string[]};
declare global {interface Window {__parentFixture:ParentFixture;}}
export async function parentBackend(page:Page){
  await classMediaBackend(page);
  await page.addInitScript(()=>{
    const state:ParentFixture=window.__parentFixture=JSON.parse(sessionStorage.getItem('__fictional_parent')??'null')??{families:[],children:[],moments:[],todos:[],events:[],links:[],permissions:[],invites:{},loseMoment:false,missing:false,writes:[]};
    const original=window.fetch.bind(window),persist=()=>sessionStorage.setItem('__fictional_parent',JSON.stringify(state));
    const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});
    window.fetch=async(input,init)=>{
      const raw=typeof input==='string'?input:input instanceof URL?input.href:input.url;
      if(raw.startsWith('blob:')||raw.startsWith('data:'))return original(input,init);
      const url=new URL(raw,location.origin),endpoint=url.pathname.split('/').at(-1)??'',method=init?.method??(input instanceof Request?input.method:'GET');
      const tables:Record<string,keyof ParentFixture>={parent_families:'families',family_children:'children',family_moments:'moments',family_todos:'todos',family_events:'events'};
      if((endpoint in tables||['parent_coach_links','parent_feedback_feed'].includes(endpoint))&&state.missing)return reply({code:'PGRST205'},404);
      if(endpoint in tables){
        window.__coachFixture.calls.push(url.pathname);
        const key=tables[endpoint] as 'families'|'children'|'moments'|'todos'|'events';
        const list=state[key] as {id:string}[];
        if(method==='POST'){
          const payload=JSON.parse(String(init?.body));const previous=list.findIndex(row=>row.id===payload.id);if(previous<0)list.push(payload);else list[previous]=payload;
          state.writes.push(`${endpoint}:${payload.id}`);persist();
          if(endpoint==='family_moments'&&state.loseMoment){state.loseMoment=false;persist();throw new TypeError('Fictional lost memory result');}
          return reply(payload);
        }
        return reply(list.slice(Number(url.searchParams.get('offset')??0),Number(url.searchParams.get('offset')??0)+Number(url.searchParams.get('limit')??1000)));
      }
      if(endpoint==='get_parent_coach_connections')return reply(state.links.filter(value=>value.active));
      if(endpoint==='get_parent_media_permissions')return reply(state.permissions);
      if(endpoint==='parent_coach_links')return reply(state.links.filter(value=>value.active));
      if(endpoint==='parent_feedback_feed'){
        window.__coachFixture.calls.push(url.pathname);
        return reply(window.__mediaFixture.handoffs.filter(item=>item.state!=='cancelled').flatMap(item=>state.links.filter(link=>link.active&&link.student_id===item.student_id).map(link=>({id:item.id,child_id:link.child_id,reviewed_at:new Date().toISOString(),snapshot:{schema_version:1,note:item.snapshot.note,academy_name:link.academy_name,student_name:link.student_name,recorded_at:new Date().toISOString(),session_id:null,media_ids:item.media_ids}}))));
      }
      if(['issue_parent_link_invite','preview_parent_link','claim_parent_link','parent_media_permission','disconnect_parent_link'].includes(endpoint)){
        const p=JSON.parse(String(init?.body));window.__coachFixture.calls.push(url.pathname);
        if(endpoint==='issue_parent_link_invite'){
          const code=Array.from(crypto.getRandomValues(new Uint8Array(32)),value=>value.toString(16).padStart(2,'0')).join('');state.invites[code]={student:p.target_student,used:false};persist();return reply(code);
        }
        if(endpoint==='preview_parent_link'||endpoint==='claim_parent_link'){
          const invite=state.invites[p.invite_code];if(!invite||invite.used)return reply({code:'22023'},400);
          if(endpoint==='preview_parent_link')return reply({academy_name:'Fictional Test Academy',student_name:window.__coachFixture.roster.students.find(child=>child.id===invite.student)?.name??'Student'});
          const link={id:crypto.randomUUID(),academy_id:'academy-test',student_id:invite.student,child_id:p.target_child,active:true,academy_name:'Fictional Test Academy',student_name:window.__coachFixture.roster.students.find(child=>child.id===invite.student)?.name??'Student'};
          state.links.push(link);invite.used=true;state.permissions.push({link_id:link.id,allow_photos:false,allow_videos:false,allow_parent_sharing:false,source:'parent_account',recorded_at:new Date().toISOString()});persist();return reply(link.id);
        }
        if(endpoint==='parent_media_permission'){
          const permission=state.permissions.find(value=>value.link_id===p.target_link)!;permission.allow_photos=p.photos;permission.allow_videos=p.videos;permission.allow_parent_sharing=p.sharing;persist();return reply(null);
        }
        if(endpoint==='disconnect_parent_link'){
          const link=state.links.find(value=>value.id===p.target_link)!;link.active=false;
          for(const held of window.__mediaFixture.handoffs)if(held.student_id===link.student_id)held.state='cancelled';
          sessionStorage.setItem('__fictional_media',JSON.stringify(window.__mediaFixture));persist();return reply(null);
        }
      }
      if(endpoint==='queue_parent_feedback'){
        const result=await original(input,init);
        for(const held of window.__mediaFixture.handoffs)if(held.state!=='cancelled'&&state.links.some(link=>link.active&&link.student_id===held.student_id))held.state='available_to_parent';
        sessionStorage.setItem('__fictional_media',JSON.stringify(window.__mediaFixture));return result;
      }
      return original(input,init);
    };
  });
}
