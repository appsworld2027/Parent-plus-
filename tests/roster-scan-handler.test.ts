import {describe,expect,it,vi} from 'vitest';
import {createScanHandler,type ScanEnvironment} from '../supabase/functions/scan-roster/handler';

const owner='00000000-0000-0000-0000-000000000001',academy='00000000-0000-0000-0000-000000000011';
const env:ScanEnvironment={url:'https://backend.example.test',publicKey:'fictional-public-key',serviceKey:'fictional-service-secret',openAIKey:'fictional-provider-secret',model:'fictional-vision-model'};
const extracted={students:[{name:'Fictional Tara',age:9,guardian:null,email:null,phone:null,proficiency:'unassessed',warnings:[]}],warnings:[]};
const png=new Uint8Array([137,80,78,71,13,10,26,10,0,0,0,0]);
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});
function imageRequest(bytes:Uint8Array=png,scope=academy,declared='image/png'){
  const form=new FormData();form.append('academy',scope);form.append('image',new Blob([bytes.buffer as ArrayBuffer],{type:declared}),'fictional-register.png');form.append('model','untrusted-client-model');
  return new Request('https://edge.example.test/scan-roster',{method:'POST',headers:{Authorization:'Bearer fictional-user-token'},body:form});
}
type Options={auth?:Response;owned?:Response;quota?:Response;provider?:Response;thrown?:boolean};
function harness(options:Options={}){
  const calls:{url:string;init?:RequestInit}[]=[];
  const requestFetch=vi.fn(async(input:RequestInfo|URL,init?:RequestInit)=>{
    const url=String(input);calls.push({url,init});
    if(options.thrown)throw new Error(`${env.serviceKey} ${env.openAIKey}: private provider diagnostic`);
    if(url.endsWith('/auth/v1/user'))return options.auth??json({id:owner});
    if(url.includes('/rest/v1/academies?'))return options.owned??json([{id:academy}]);
    if(url.endsWith('/rpc/reserve_roster_scan'))return options.quota??new Response(null,{status:204});
    if(url==='https://api.openai.com/v1/chat/completions')return options.provider??json({choices:[{finish_reason:'stop',message:{content:JSON.stringify(extracted)}}],internal_secret:env.serviceKey});
    throw new Error('Unexpected mocked endpoint');
  });
  return {calls,handler:createScanHandler(env,requestFetch as typeof fetch),requestFetch};
}
describe('authenticated roster scanning edge handler with mocked providers',()=>{
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
    const result=await response.json();expect(response.status).toBe(200);expect(result).toEqual(extracted);
    expect(response.headers.get('Cache-Control')).toBe('no-store');expect(h.calls).toHaveLength(4);
    expect(h.calls[1].url).toContain(`owner_id=eq.${owner}`);expect(h.calls[1].url).toContain(`id=eq.${academy}`);
    expect(new Headers(h.calls[0].init?.headers).get('Authorization')).toBe('Bearer fictional-user-token');
    expect(new Headers(h.calls[2].init?.headers).get('Authorization')).toBe(`Bearer ${env.serviceKey}`);
    expect(new Headers(h.calls[3].init?.headers).get('Authorization')).toBe(`Bearer ${env.openAIKey}`);
    const body=JSON.parse(String(h.calls[3].init?.body));expect(body).toMatchObject({model:env.model,store:false,response_format:{type:'json_schema',json_schema:{strict:true}}});
    expect(body.messages[1].content[1].image_url.url).toMatch(/^data:image\/png;base64,/);
    expect(String(h.calls[3].init?.body)).not.toContain(env.serviceKey);expect(JSON.stringify(result).includes(env.serviceKey)).toBe(false);
    expect(h.calls.some(c=>c.url.includes('import_roster_scan')||c.url.includes('/storage/'))).toBe(false);
  });
  it('rejects non-owned academies and unavailable setup without spending scan quota',async()=>{
    for(const owned of [json([]),json({message:'private ownership failure'},500)]){
      const h=harness({owned});expect((await h.handler(imageRequest())).status).toBe(403);expect(h.calls).toHaveLength(2);
    }
    const h=harness();const missing=createScanHandler({...env,openAIKey:''},h.requestFetch as typeof fetch);
    expect((await missing(imageRequest())).status).toBe(503);expect(h.calls).toHaveLength(1);
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
  it('maps budget exhaustion and setup failures safely and never calls the AI provider afterward',async()=>{
    for(const [code,status,expected]of [['P0001',429,'LIMIT'],['42501',503,'SETUP']] as const){
      const h=harness({quota:json({code,message:`${env.serviceKey}: private quota failure`},400)}),response=await h.handler(imageRequest());
      expect(response.status).toBe(status);expect(await response.json()).toEqual({code:expected});expect(h.calls).toHaveLength(3);
    }
  });
  it('rejects provider errors, truncation, refusals, malformed JSON and absent/oversized student lists without leaking secrets',async()=>{
    const bodies=[json({message:env.openAIKey},500),json({choices:[{finish_reason:'length',message:{content:'private'}}]}),json({choices:[{finish_reason:'stop',message:{refusal:'private'}}]}),json({choices:[{finish_reason:'stop',message:{content:'not-json'}}]}),...[[ ],Array(51).fill(extracted.students[0])].map(students=>json({choices:[{finish_reason:'stop',message:{content:JSON.stringify({students,warnings:[]})}}]}))];
    for(const provider of bodies){const h=harness({provider}),response=await h.handler(imageRequest());expect([422,502]).toContain(response.status);const text=await response.text();expect(text).not.toContain(env.openAIKey);expect(text).not.toContain(env.serviceKey);expect(h.calls).toHaveLength(4);}
  });
  it('validates the provider row/envelope schema before returning a successful extraction',async()=>{
    for(const malformed of [{students:[null],warnings:[]},{students:[{name:'Only a name'}],warnings:[]},{students:[{...extracted.students[0],age:3.5}],warnings:[]},{students:[{...extracted.students[0],proficiency:'expert'}],warnings:[]},{students:extracted.students,warnings:'not-an-array'}]){
      const h=harness({provider:json({choices:[{finish_reason:'stop',message:{content:JSON.stringify(malformed)}}]})});expect((await h.handler(imageRequest())).status).toBe(422);
    }
  });
  it('redacts thrown backend/provider diagnostics from all client responses',async()=>{
    const h=harness({thrown:true}),response=await h.handler(imageRequest());expect(response.status).toBe(502);expect(await response.json()).toEqual({code:'UNAVAILABLE'});
  });
});
