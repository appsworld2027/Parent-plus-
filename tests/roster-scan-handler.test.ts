import {describe,expect,it,vi} from 'vitest';
import {createScanHandler,type ScanEnvironment} from '../supabase/functions/scan-roster/handler';

const owner='00000000-0000-0000-0000-000000000001',academy='00000000-0000-0000-0000-000000000011';
const env:ScanEnvironment={url:'https://backend.example.test',publicKey:'fictional-public-key',serviceKey:'fictional-service-secret',visionKey:'fictional-google-vision-key'};
const ocr={responses:[{fullTextAnnotation:{text:'Student name: Fictional Tara\nAge: 9'}}],internal_secret:env.serviceKey};
const png=new Uint8Array([137,80,78,71,13,10,26,10,0,0,0,0]);
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});
function imageRequest(bytes:Uint8Array=png,scope=academy,declared='image/png',recognizer:string|null='cloud-vision-v1'){
  const form=new FormData();form.append('academy',scope);form.append('image',new Blob([bytes.buffer as ArrayBuffer],{type:declared}),'fictional-register.png');form.append('features','FACE_DETECTION');
  if(recognizer!==null)form.append('recognizer',recognizer);
  return new Request('https://edge.example.test/scan-roster',{method:'POST',headers:{Authorization:'Bearer fictional-user-token'},body:form});
}
type Options={auth?:Response;owned?:Response;quota?:Response;provider?:Response;thrown?:boolean;providerThrows?:boolean};
function harness(options:Options={}){
  const calls:{url:string;init?:RequestInit}[]=[];
  const requestFetch=vi.fn(async(input:RequestInfo|URL,init?:RequestInit)=>{
    const url=String(input);calls.push({url,init});
    if(options.thrown)throw new Error(`${env.serviceKey} ${env.visionKey}: private backend diagnostic`);
    if(url.endsWith('/auth/v1/user'))return options.auth??json({id:owner});
    if(url.includes('/rest/v1/academies?'))return options.owned??json([{id:academy}]);
    if(url.endsWith('/rpc/reserve_vision_roster_scan'))return options.quota??new Response(null,{status:204});
    if(url==='https://vision.googleapis.com/v1/images:annotate'){
      if(options.providerThrows)throw new Error(`${env.visionKey}: private provider diagnostic`);
      return options.provider??json(ocr);
    }
    throw new Error('Unexpected mocked endpoint');
  });
  return {calls,handler:createScanHandler(env,requestFetch as typeof fetch),requestFetch};
}
describe('authenticated Cloud Vision roster scanning with mocked requests only',()=>{
  it('answers preflight/method rejection and rejects missing/invalid bearer auth before any provider call',async()=>{
    const h=harness();
    expect((await h.handler(new Request('https://edge.example.test',{method:'OPTIONS'}))).status).toBe(200);
    expect((await h.handler(new Request('https://edge.example.test'))).status).toBe(405);
    expect((await h.handler(new Request('https://edge.example.test',{method:'POST'}))).status).toBe(401);
    expect(h.calls).toHaveLength(0);
    for(const auth of [json({message:env.serviceKey},401),json({id:'not-a-user'})]){
      const rejected=harness({auth});expect((await rejected.handler(imageRequest())).status).toBe(401);expect(rejected.calls).toHaveLength(1);
    }
  });
  it('verifies owner before quota/provider use and keeps service/provider credentials at their intended boundaries',async()=>{
    const h=harness(),response=await h.handler(imageRequest(png,academy,'text/plain'));
    const result=await response.json();expect(response.status).toBe(200);
    expect(result).toMatchObject({students:[{name:'Fictional Tara',age:9,guardian:null,email:null,phone:null,proficiency:'unassessed'}],rawLines:['Student name: Fictional Tara','Age: 9']});
    expect(Array.isArray(result.warnings)).toBe(true);
    expect(response.headers.get('Cache-Control')).toBe('no-store');expect(h.calls).toHaveLength(4);
    expect(h.calls[1].url).toContain(`owner_id=eq.${owner}`);expect(h.calls[1].url).toContain(`id=eq.${academy}`);
    expect(new Headers(h.calls[0].init?.headers).get('Authorization')).toBe('Bearer fictional-user-token');
    expect(new Headers(h.calls[2].init?.headers).get('Authorization')).toBe(`Bearer ${env.serviceKey}`);
    expect(h.calls.map(c=>new URL(c.url).pathname)).toEqual(['/auth/v1/user','/rest/v1/academies','/rest/v1/rpc/reserve_vision_roster_scan','/v1/images:annotate']);
    const providerHeaders=new Headers(h.calls[3].init?.headers);
    expect(providerHeaders.get('x-goog-api-key')).toBe(env.visionKey);expect(providerHeaders.has('Authorization')).toBe(false);
    expect(h.calls[3].url).toBe('https://vision.googleapis.com/v1/images:annotate');
    const body=JSON.parse(String(h.calls[3].init?.body));
    expect(body).toEqual({requests:[{image:{content:Buffer.from(png).toString('base64')},features:[{type:'DOCUMENT_TEXT_DETECTION'}]}]});
    for(const secret of [env.serviceKey,env.visionKey]){
      expect(h.calls.every(c=>!c.url.includes(secret))).toBe(true);expect(String(h.calls[3].init?.body)).not.toContain(secret);expect(JSON.stringify(result)).not.toContain(secret);
    }
    expect(h.calls.some(c=>c.url.includes('import_roster_scan')||c.url.includes('/storage/'))).toBe(false);
  });
  it('rejects non-owned academies and unavailable setup without spending scan quota',async()=>{
    for(const owned of [json([]),json({message:'private ownership failure'},500)]){
      const h=harness({owned});expect((await h.handler(imageRequest())).status).toBe(403);expect(h.calls).toHaveLength(2);
    }
    for(const missingField of ['visionKey','serviceKey'] as const){
      const h=harness();const missing=createScanHandler({...env,[missingField]:''},h.requestFetch as typeof fetch);
      expect((await missing(imageRequest())).status).toBe(503);expect(h.calls).toHaveLength(1);
    }
  });
  it('rejects missing or old recognizer markers before reserving quota or contacting Google',async()=>{
    for(const marker of [null,'openai-v1','cloud-vision-v2']){
      const h=harness(),response=await h.handler(imageRequest(png,academy,'image/png',marker));
      expect(response.status).toBe(409);expect(await response.json()).toEqual({code:'UPGRADE_REQUIRED'});
      expect(h.calls.some(call=>call.url.includes('/rpc/')||call.url.startsWith('https://vision.googleapis.com/'))).toBe(false);
    }
  });
  it('rejects unsupported/corrupt images, invalid academy IDs and images over5MB before quota/provider calls',async()=>{
    for(const request of [imageRequest(new Uint8Array([1,2,3])),imageRequest(png,'not-an-academy'),imageRequest(new Uint8Array(5*1024*1024+1))]){
      const h=harness();expect((await h.handler(request)).status).toBe(400);expect(h.calls).toHaveLength(1);
    }
    const h=harness();expect((await h.handler(new Request('https://edge.example.test',{method:'POST',headers:{Authorization:'Bearer token','Content-Type':'application/json'},body:'{}'}))).status).toBe(400);expect(h.calls).toHaveLength(1);
  });
  it('bounds actual streamed body bytes even when Content-Length lies and cancels the oversized stream',async()=>{
    let cancelled=false;const stream=new ReadableStream<Uint8Array>({start(controller){controller.enqueue(new Uint8Array(5*1024*1024+65537));},cancel(){cancelled=true;}});
    const request=new Request('https://edge.example.test',{method:'POST',headers:{Authorization:'Bearer token','Content-Type':'multipart/form-data; boundary=fake','Content-Length':'1'},body:stream,duplex:'half'} as RequestInit&{duplex:'half'});
    const h=harness();expect((await h.handler(request)).status).toBe(413);expect(cancelled).toBe(true);expect(h.calls).toHaveLength(1);
  });
  it('maps daily/monthly budget exhaustion and setup failures without calling Google afterward',async()=>{
    for(const [code,status,expected]of [['P0001',429,'LIMIT'],['P0002',429,'LIMIT_MONTH'],['42501',503,'SETUP']] as const){
      const h=harness({quota:json({code,message:`${env.serviceKey}: private quota failure`},400)}),response=await h.handler(imageRequest());
      expect(response.status).toBe(status);expect(await response.json()).toEqual({code:expected});expect(h.calls).toHaveLength(3);
    }
  });
  it('rejects provider errors and malformed/multiple OCR responses without returning raw provider diagnostics',async()=>{
    const bodies=[json({error:{message:env.visionKey}},500),new Response('not-json'),json({}),json({responses:[]}),json({responses:[{},{}]}),json({responses:[null]}),json({responses:[{error:{message:env.visionKey},fullTextAnnotation:{text:'Student name: Wrong\nAge: 9'}}]})];
    for(const provider of bodies){const h=harness({provider}),response=await h.handler(imageRequest());expect(response.status).toBe(502);const text=await response.text();expect(text).not.toContain(env.visionKey);expect(text).not.toContain(env.serviceKey);expect(h.calls).toHaveLength(4);}
  });
  it('reports empty OCR but keeps unknown layouts as raw text for explicit names-only review without invented profile fields',async()=>{
    const empty=harness({provider:json({responses:[{}]})}),response=await empty.handler(imageRequest());
    expect(response.status).toBe(422);expect(await response.json()).toEqual({code:'NO_TEXT'});
    const unknown=harness({provider:json({responses:[{fullTextAnnotation:{text:'Fictional Tara\nFictional Ria'}}]})});
    const raw=await unknown.handler(imageRequest());expect(raw.status).toBe(200);
    expect(await raw.json()).toMatchObject({students:[],rawLines:['Fictional Tara','Fictional Ria']});
    expect(unknown.calls).toHaveLength(4);
  });
  it('redacts thrown backend/provider diagnostics from all client responses',async()=>{
    for(const options of [{thrown:true},{providerThrows:true}]){
      const h=harness(options),response=await h.handler(imageRequest());expect(response.status).toBe(502);expect(await response.json()).toEqual({code:'UNAVAILABLE'});
    }
  });
});
