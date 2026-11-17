import { expect, it } from 'vitest';
import { canUseMedia, classMediaType, type MediaConsent } from '../src/class-media/model';
const consent=(id:string,share=true):MediaConsent=>({student_id:id,guardian_name:'Fictional guardian',evidence_note:'Written permission',allow_photos:true,allow_videos:false,allow_parent_sharing:share,recorded_at:'2026-11-16'});
it('requires permission from every pictured student and separates video/capture/sharing purposes',()=>{
  expect(canUseMedia([],['a'],'photo')).toBe(false);
  expect(canUseMedia([consent('a')],[],'photo')).toBe(false);
  expect(canUseMedia([consent('a')],['a','a'],'photo')).toBe(false);
  expect(canUseMedia([consent('a')],['a','b'],'photo')).toBe(false);
  expect(canUseMedia([consent('a',false)],['a'],'photo')).toBe(true);
  expect(canUseMedia([consent('a',false)],['a'],'photo',true)).toBe(false);
  expect(canUseMedia([consent('a')],['a'],'video')).toBe(false);
});
it('recognises supported video headers without accepting disguised HEIC images or arbitrary files',()=>{
  const video=new Uint8Array([0,0,0,24,...Array.from('ftypisom',char=>char.charCodeAt(0))]);
  expect(classMediaType(video,'video').mime).toBe('video/mp4');
  expect(()=>classMediaType(new Uint8Array([0,0,0,24,...Array.from('ftypheic',char=>char.charCodeAt(0))]),'video')).toThrow('MP4');
  expect(()=>classMediaType(new Uint8Array(25*1024*1024+1),'video')).toThrow('25 MB');
  expect(()=>classMediaType(new Uint8Array([1,2,3]),'video')).toThrow();
});
