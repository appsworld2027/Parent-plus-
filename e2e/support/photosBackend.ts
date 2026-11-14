import type {Page} from '@playwright/test';
import {backend} from './backend';
declare global {interface Window {__nativePhotoFetch: typeof fetch; __photoFixture:{records:Record<string,{object_path:string}>;objects:string[];failUpload:boolean;failAttach:boolean;deleteCalls:string[]};}}
export async function photosBackend(page:Page) {
  await page.addInitScript(()=>{window.__nativePhotoFetch=window.fetch.bind(window);});
  await backend(page,{academy:true,readyClass:true});
  await page.addInitScript(()=>{
    const state:Window['__photoFixture']=window.__photoFixture={records:JSON.parse(sessionStorage.getItem('__fictional_photos')??'{}'),objects:[],failUpload:false,failAttach:false,deleteCalls:[]};
    const original=window.fetch.bind(window);
    window.fetch=async(input,init)=>{
      const raw=typeof input==='string'?input:input instanceof URL?input.href:input.url;
      if(raw.startsWith('data:')||raw.startsWith('blob:'))return window.__nativePhotoFetch(input,init);
      const url=new URL(raw,location.origin);
      const respond=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
      if(url.pathname.endsWith('/coach_photos')){
        const kind=url.searchParams.get('kind')?.slice(3),id=url.searchParams.get('entity_id')?.slice(3);
        return respond(id?state.records[`${kind}:${id}`]??null:Object.entries(state.records).filter(([key])=>key.startsWith(`${kind}:`)).map(([key,value])=>({entity_id:key.split(':')[1],...value}))); 
      }
      if(url.pathname.endsWith('/rpc/attach_coach_photo')){
        if(state.failAttach)return respond({message:'Private photo attach error'},500);
        const p=JSON.parse(String(init?.body));const key=`${p.entity_kind}:${p.target_entity}`;
        if(p.target_path)state.records[key]={object_path:p.target_path};else delete state.records[key];
        sessionStorage.setItem('__fictional_photos',JSON.stringify(state.records));return respond(p.target_path);
      }
      if(url.pathname.includes('/storage/v1/object/')){
        if(url.pathname.includes('/sign/')&&url.pathname.endsWith('parentplus-coach-photos')){const p=JSON.parse(String(init?.body));return respond(p.paths.map((path:string)=>({path,signedURL:'/object/sign/parentplus-coach-photos/fictional.png?token=fictional',error:null})));}
        if(url.pathname.includes('/sign/'))return respond({signedURL:'/object/sign/parentplus-coach-photos/fictional.png?token=fictional'});
        if(init?.method==='DELETE'){state.deleteCalls.push('delete');return respond([]);}
        if(state.failUpload)return respond({message:'Private storage failure'},500);
        state.objects.push(url.pathname);return respond({Key:url.pathname,Id:crypto.randomUUID()});
      }
      return original(input,init);
    };
  });
  await page.route('**/storage/v1/object/sign/**',route=>route.fulfill({status:200,contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=','base64')}));
}
