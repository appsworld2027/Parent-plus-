import type { Page } from '@playwright/test';
import type { ClassMedia, MediaConsent } from '../../src/class-media/model';
import { photosBackend } from './photosBackend';
type Handoff = { id:string; student_id:string; observation_revision:number; observation_id:string; media_ids:string[]; snapshot:{note:string;student_id:string}; state:string };
declare global { interface Window { __mediaFixture: { consents:MediaConsent[]; media:ClassMedia[]; handoffs:Handoff[]; requests:Record<string,string[]>; uploads:string[]; loseFinish:boolean; loseQueue:boolean; missing:boolean }; } }
export async function classMediaBackend(page:Page) {
  await photosBackend(page);
  await page.addInitScript(()=>{
    const state:Window['__mediaFixture']=window.__mediaFixture=JSON.parse(sessionStorage.getItem('__fictional_media')??'null')??{consents:[],media:[],handoffs:[],requests:{},uploads:[],loseFinish:false,loseQueue:false,missing:false};
    const original=window.fetch.bind(window), persist=()=>sessionStorage.setItem('__fictional_media',JSON.stringify(state));
    window.fetch=async(input,init)=>{
      const raw=typeof input==='string'?input:input instanceof URL?input.href:input.url;
      if(raw.startsWith('blob:')||raw.startsWith('data:'))return original(input,init);
      const url=new URL(raw,location.origin), endpoint=url.pathname.split('/').at(-1);
      const respond=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});
      if(state.missing&&['coach_media_consents','class_media','parent_feedback_handoffs'].includes(endpoint??''))return respond({code:'PGRST205'},404);
      if(endpoint==='coach_media_consents')return respond(state.consents);
      if(endpoint==='class_media')return respond(state.media.filter(item=>item.state==='ready'));
      if(endpoint==='parent_feedback_handoffs')return respond(state.handoffs.filter(item=>item.observation_id===url.searchParams.get('observation_id')?.slice(3)));
      if(url.pathname.includes('/storage/v1/object/parentplus-class-media/')){
        if(state.uploads.includes(url.pathname))return respond({statusCode:'409',error:'Duplicate',message:'Already exists'},409);
        state.uploads.push(url.pathname);persist();return respond({Key:url.pathname,Id:crypto.randomUUID()});
      }
      if(['record_coach_media_consent','prepare_class_media','finish_class_media','queue_parent_feedback','cancel_parent_feedback'].includes(endpoint??'')){
        const p=JSON.parse(String(init?.body??'{}'));
        window.__coachFixture.calls.push(url.pathname);
        if(endpoint==='record_coach_media_consent'){
          state.consents=state.consents.filter(item=>item.student_id!==p.target_student);
          state.consents.push({student_id:p.target_student,guardian_name:p.guardian_name,evidence_note:p.evidence_note,allow_photos:p.allow_photos,allow_videos:p.allow_videos,allow_parent_sharing:p.allow_parent_sharing,recorded_at:new Date().toISOString()});
          for(const held of state.handoffs)if(held.media_ids.some(id=>state.media.find(item=>item.id===id)?.subject_ids.includes(p.target_student))&&(!p.allow_photos||!p.allow_videos||!p.allow_parent_sharing))held.state='cancelled';
          persist();return respond(1);
        }
        if(endpoint==='prepare_class_media'){
          let item=state.media.find(item=>item.id===p.target_media);
          if(!item){item={id:p.target_media,session_id:p.target_session,subject_ids:p.subjects,kind:p.media_kind,object_path:`${p.target_academy}/${p.target_session}/${p.target_media}.${p.media_kind==='photo'?'jpg':'mp4'}`,content_type:p.mime,byte_size:p.size_bytes,state:'prepared',created_at:new Date().toISOString()};state.media.push(item);}
          persist();return respond(item.object_path);
        }
        if(endpoint==='finish_class_media'){
          const item=state.media.find(item=>item.id===p.target_media)!;item.state='ready';persist();
          if(state.loseFinish){state.loseFinish=false;persist();throw new TypeError('Fictional lost media result');}
          return respond(item.id);
        }
        if(endpoint==='queue_parent_feedback'){
          let ids=state.requests[p.target_request];
          if(!ids){ids=p.selected_students.map((child:string)=>{
            const existing=state.handoffs.find(item=>item.observation_id===p.target_observation&&item.observation_revision===p.expected_revision&&item.student_id===child&&item.state==='awaiting_parent_link');
            if(existing)return existing.id;
            const note=window.__coachFixture.observations.find(item=>item.id===p.target_observation)!;
            const held={id:crypto.randomUUID(),student_id:child,observation_id:note.id,observation_revision:note.revision,media_ids:p.selected_media,snapshot:{note:note.note,student_id:child},state:'awaiting_parent_link'};
            state.handoffs.push(held);return held.id;
          });state.requests[p.target_request]=ids!;persist();}
          if(state.loseQueue){state.loseQueue=false;persist();throw new TypeError('Fictional lost review result');}
          return respond(ids);
        }
        if(endpoint==='cancel_parent_feedback'){const held=state.handoffs.find(item=>item.id===p.target_handoff);if(held)held.state='cancelled';persist();return respond(null);}
      }
      return original(input,init);
    };
  });
}
