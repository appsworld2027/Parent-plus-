// No secrets, photos or extracted student details are logged or persisted here.
import {mapVisionResponse} from './vision.ts';
export type ScanEnvironment={url:string;publicKey:string;serviceKey:string;visionKey:string};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const maxImage=5*1024*1024;
export function createScanHandler(env:ScanEnvironment,requestFetch:typeof fetch=fetch){
  return async(request:Request):Promise<Response>=>{
    const reply=(status:number,data:unknown)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS'}});
    if(request.method==='OPTIONS')return reply(200,{});
    if(request.method!=='POST')return reply(405,{code:'METHOD'});
    try{
      const authorization=request.headers.get('Authorization')??'';
      if(!/^Bearer \S+$/.test(authorization))return reply(401,{code:'UNAUTHORIZED'});
      const headers={apikey:env.publicKey,Authorization:authorization};
      const user=await requestFetch(`${env.url}/auth/v1/user`,{headers,signal:AbortSignal.timeout(10000)});
      if(!user.ok)return reply(401,{code:'UNAUTHORIZED'});
      const who=await user.json();if(!uuid.test(who.id??''))return reply(401,{code:'UNAUTHORIZED'});
      if(!env.visionKey||!env.serviceKey)return reply(503,{code:'SETUP'});
      if(!request.headers.get('Content-Type')?.startsWith('multipart/form-data'))return reply(400,{code:'INVALID_IMAGE'});
      // Bound actual streamed bytes; a Content-Length header alone is untrusted.
      const reader=request.body?.getReader();if(!reader)return reply(400,{code:'INVALID_IMAGE'});
      const chunks:Uint8Array[]=[];let size=0;
      for(;;){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>maxImage+65536){await reader.cancel();return reply(413,{code:'INVALID_IMAGE'});}chunks.push(part.value);}
      const combined=new Uint8Array(size);let offset=0;for(const chunk of chunks){combined.set(chunk,offset);offset+=chunk.length;}
      const form=await new Response(combined,{headers:{'Content-Type':request.headers.get('Content-Type')!}}).formData() as unknown as {get(name:string):unknown};
      const academy=form.get('academy'),image=form.get('image');
      // Older clients disclosed OpenAI processing. Require the new provider-aware
      // client protocol before transmitting any register to Google.
      if(form.get('recognizer')!=='cloud-vision-v1')return reply(409,{code:'UPGRADE_REQUIRED'});
      if(typeof academy!=='string'||!uuid.test(academy)||!(image instanceof Blob)||image.size<1||image.size>maxImage)return reply(400,{code:'INVALID_IMAGE'});
      const bytes=new Uint8Array(await image.arrayBuffer());
      let mime='';
      if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255)mime='image/jpeg';
      else if([137,80,78,71,13,10,26,10].every((b,i)=>bytes[i]===b))mime='image/png';
      else if(String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP')mime='image/webp';
      if(!mime)return reply(400,{code:'INVALID_IMAGE'});
      const owned=await requestFetch(`${env.url}/rest/v1/academies?select=id&id=eq.${academy}&owner_id=eq.${who.id}`,{headers,signal:AbortSignal.timeout(10000)});
      if(!owned.ok)return reply(403,{code:'UNAUTHORIZED'});
      const academies=await owned.json();if(!Array.isArray(academies)||academies.length!==1)return reply(403,{code:'UNAUTHORIZED'});
      const reserved=await requestFetch(`${env.url}/rest/v1/rpc/reserve_vision_roster_scan`,{method:'POST',headers:{apikey:env.serviceKey,Authorization:`Bearer ${env.serviceKey}`,'Content-Type':'application/json'},body:JSON.stringify({target_academy:academy}),signal:AbortSignal.timeout(10000)});
      if(!reserved.ok){const error=await reserved.json();return reply(['P0001','P0002'].includes(error.code)?429:503,{code:error.code==='P0002'?'LIMIT_MONTH':error.code==='P0001'?'LIMIT':'SETUP'});}
      let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
      const vision=await requestFetch('https://vision.googleapis.com/v1/images:annotate',{
        method:'POST',headers:{'x-goog-api-key':env.visionKey,'Content-Type':'application/json'},signal:AbortSignal.timeout(40000),
        body:JSON.stringify({requests:[{image:{content:btoa(binary)},features:[{type:'DOCUMENT_TEXT_DETECTION'}]}]})
      });
      if(!vision.ok)return reply(502,{code:'PROVIDER'});
      const extracted=mapVisionResponse(await vision.json());
      if(!extracted.rawLines.length&&!extracted.students.length)return reply(422,{code:'NO_TEXT'});
      return reply(200,extracted);
    }catch{return reply(502,{code:'UNAVAILABLE'});}
  };
}
