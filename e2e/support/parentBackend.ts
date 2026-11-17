import type { Page } from '@playwright/test';
import type { Child, CoachLink, Family, FamilyEvent, Moment, ParentPermission, Todo } from '../../src/parent/model';
import type { ParentRequest } from '../../src/parent/identity';
import { classMediaBackend } from './classMediaBackend';
type ParentFixture={requests:ParentRequest[];inviteEmails:Record<string,string>;accountEmail?:string;identityMissing?:boolean;holdConnections?:boolean;connectionReads?:number;families:Family[];children:Child[];moments:Moment[];todos:Todo[];events:FamilyEvent[];links:(CoachLink&{parent_user_id?:string})[];permissions:ParentPermission[];invites:Record<string,{student:string;used:boolean}>;loseMoment:boolean;missing:boolean;writes:string[]};
declare global {interface Window {__parentFixture:ParentFixture;}}
export async function parentBackend(page:Page){
  await classMediaBackend(page);
  await page.addInitScript(()=>{
    const state:ParentFixture=window.__parentFixture=JSON.parse(sessionStorage.getItem('__fictional_parent')??'null')??{requests:[],inviteEmails:{},families:[],children:[],moments:[],todos:[],events:[],links:[],permissions:[],invites:{},loseMoment:false,missing:false,writes:[]};
    state.requests??=[];state.inviteEmails??={};
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
      if(['get_parent_connection_requests','get_coach_parent_requests'].includes(endpoint)){
        if(state.identityMissing)return reply({code:'PGRST202'},404);
        return reply(endpoint==='get_parent_connection_requests'?state.requests:state.requests.filter(row=>row.status==='pending').map(row=>({...row,student_name:window.__coachFixture.roster.students.find(student=>student.id===row.student_id)?.name??'Student'})));
      }
      if(endpoint==='review_parent_connection_request'||endpoint==='cancel_parent_connection_request'){
        const p=JSON.parse(String(init?.body)),request=state.requests.find(row=>row.id===p.target_request);if(!request)return reply({code:'42501'},403);
        if(endpoint==='cancel_parent_connection_request'){request.status='cancelled';persist();return reply(null);}
        if(typeof p.approve!=='boolean')return reply({code:'22023'},400);
        if(request.status==='approved'&&p.approve)return reply(request.link_id);
        if(request.status!=='pending')return reply({code:'22023'},400);
        if(!p.approve){request.status='rejected';persist();return reply(null);}
        const child=state.children.find(row=>row.id===request.child_id);if(!child||child.name!==request.child_name||child.born_on!==request.born_on)return reply({code:'40001'},409);
        const link={id:crypto.randomUUID(),academy_id:request.academy_id,student_id:request.student_id,child_id:request.child_id,parent_user_id:request.parent_user_id,active:true,academy_name:'Fictional Test Academy',student_name:window.__coachFixture.roster.students.find(child=>child.id===request.student_id)?.name??'Student'};
        state.links.push(link);request.status='approved';request.link_id=link.id;
        state.permissions.push({link_id:link.id,allow_photos:false,allow_videos:false,allow_parent_sharing:false,source:'parent_account',recorded_at:new Date().toISOString()});
        for(const held of window.__mediaFixture.handoffs)if(held.student_id===request.student_id&&held.state==='awaiting_parent_link')held.state='available_to_parent';sessionStorage.setItem('__fictional_media',JSON.stringify(window.__mediaFixture));persist();return reply(link.id);
      }
      if(endpoint==='get_parent_coach_connections')return reply(state.links.filter(value=>value.active));
      // Existing journeys have no fictional class-attendance rows. Dedicated
      // attendance cases install explicit responses above this transport.
      if(endpoint==='get_parent_attendance_sessions')return reply([]);
      if(endpoint==='get_parent_media_permissions')return reply(state.permissions);
      if(endpoint==='parent_coach_links'){state.connectionReads=(state.connectionReads??0)+1;while(state.holdConnections)await new Promise(resolve=>setTimeout(resolve,20));return reply(state.links.filter(link=>link.active&&(!url.searchParams.has('student_id')||link.student_id===url.searchParams.get('student_id')?.slice(3))&&(!url.searchParams.has('academy_id')||link.academy_id===url.searchParams.get('academy_id')?.slice(3))));}
      if(endpoint==='parent_feedback_feed'){
        window.__coachFixture.calls.push(url.pathname);
        return reply(window.__mediaFixture.handoffs.filter(item=>item.state!=='cancelled').flatMap(item=>state.links.filter(link=>link.active&&link.student_id===item.student_id).map(link=>({id:item.id,child_id:link.child_id,reviewed_at:new Date().toISOString(),snapshot:{schema_version:1,note:item.snapshot.note,academy_name:link.academy_name,student_name:link.student_name,recorded_at:new Date().toISOString(),session_id:null,media_ids:item.media_ids}}))));
      }
      if(['issue_parent_link_invite','preview_parent_link','claim_parent_link','parent_media_permission','disconnect_parent_link'].includes(endpoint)){
        const p=JSON.parse(String(init?.body));window.__coachFixture.calls.push(url.pathname);
        if(endpoint==='issue_parent_link_invite'){
          if(!p.guardian_email||!/^\S+@\S+\.\S+$/.test(p.guardian_email))return reply({code:'22023'},400);
          const code=Array.from(crypto.getRandomValues(new Uint8Array(32)),value=>value.toString(16).padStart(2,'0')).join('');state.invites[code]={student:p.target_student,used:false};state.inviteEmails[code]=p.guardian_email.trim().toLowerCase();persist();return reply(code);
        }
        if(endpoint==='preview_parent_link'||endpoint==='claim_parent_link'){
          const invite=state.invites[p.invite_code];if(!invite||state.inviteEmails[p.invite_code]!== (state.accountEmail??'coach@example.test'))return reply({code:'22023'},400);
          if(invite.used){const previous=state.requests.find(row=>row.student_id===invite.student&&row.child_id===p.target_child&&row.status==='pending');return previous?reply(previous.id):reply({code:'22023'},400);}
          if(endpoint==='preview_parent_link')return reply({academy_name:'Fictional Test Academy',student_name:window.__coachFixture.roster.students.find(child=>child.id===invite.student)?.name??'Student'});
          const child=state.children.find(row=>row.id===p.target_child);if(!child)return reply({code:'42501'},403);
          const request:ParentRequest={id:crypto.randomUUID(),academy_id:'academy-test',student_id:invite.student,child_id:child.id,parent_user_id:'00000000-0000-0000-0000-000000000001',guardian_email:state.accountEmail??'coach@example.test',parent_name:state.families.find(row=>row.id===child.family_id)?.parent_name??'Parent',child_name:child.name,born_on:child.born_on,status:'pending',link_id:null};
          state.requests.push(request);invite.used=true;persist();return reply(request.id);
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
