// Real local GoTrue, PostgREST and Storage integration. No fixture transports.
// Usage: node tests/local-supabase/journeys.mjs /private/local-config.json
import {createClient} from '@supabase/supabase-js';
import {createHash,randomBytes,randomUUID} from 'node:crypto';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const output=resolve(root,'test-results/local-supabase.json');
const startedAt=new Date().toISOString();
const report={schemaVersion:1,environment:'local-real-supabase',authFlow:'SDK PKCE with per-client in-memory proof',startedAt,source:'unknown',endpoints:{api:'http://127.0.0.1:54321',mail:'http://127.0.0.1:54324'},scenarios:[],limits:['No production access, external email delivery, OCR, payments or message providers.','API integration, not browser/native interaction or a capacity benchmark.']};
const rawFetch=globalThis.fetch;
let blockedRequests=0,allowedRequests=0;
class CheckFailure extends Error{constructor(message){super(message);this.name='CheckFailure';}}
function check(value,message){if(!value)throw new CheckFailure(message);}
function safeCode(error){return String(error?.code??error?.status??'unspecified').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,30);}
async function ok(promise,label){const result=await promise;if(result.error)throw new CheckFailure(`${label} failed [${safeCode(result.error)}]`);return result.data;}
async function denied(promise,label,expected){
  const result=await promise,error=result.error;check(Boolean(error),`${label}: expected server rejection`);
  const status=Number(result.status??error.status),code=String(error.code??''),storageCode=String(error.statusCode??error.code??'');
  let matches=false;
  if(expected==='bad-password')matches=status===400&&code==='invalid_credentials';
  else if(expected==='storage-missing')matches=[400,404].includes(status)&&['404','NoSuchKey','not_found'].includes(storageCode);
  else if(expected==='storage-forbidden')matches=[400,403].includes(status)&&storageCode==='403';
  else matches=code===expected&&status===(expected==='42501'?403:400);
  check(matches,`${label}: unexpected failure class [${safeCode(error)}; HTTP ${Number.isFinite(status)?status:'unknown'}]`);
}
async function empty(promise,label){const rows=await ok(promise,label);check(Array.isArray(rows)&&rows.length===0,`${label}: expected no visible records`);}
async function localFetch(input,init){
  const address=typeof input==='string'?input:input instanceof URL?input.href:input.url;
  let url;try{url=new URL(address);}catch{blockedRequests++;throw new CheckFailure('Blocked malformed request URL');}
  if(![report.endpoints.api,report.endpoints.mail].includes(url.origin)||url.username||url.password){blockedRequests++;throw new CheckFailure('Blocked nonlocal network request');}
  allowedRequests++;
  // Never follow HTTP redirects outside the explicit loopback origins.
  return rawFetch(input,{...init,redirect:'manual',signal:init?.signal??AbortSignal.timeout(15000)});
}
function client(config){return createClient(config.apiUrl,config.anonKey,{global:{fetch:localFetch},auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false,flowType:'pkce'}});}
const pause=ms=>new Promise(done=>setTimeout(done,ms));
async function mailbox(email,since){
  for(let attempt=0;attempt<50;attempt++){
    const response=await localFetch(`${report.endpoints.mail}/api/v1/messages`);
    check(response.ok,'Local mailbox list unavailable');
    const body=await response.json(),messages=body.messages??body.Messages??[];
    const found=messages.find(message=>!since.has(message.ID??message.Id??message.id)&&(message.To??message.to??[]).some(recipient=>String(recipient.Address??recipient.address??recipient).toLowerCase()===email));
    if(found){
      const id=found.ID??found.Id??found.id;
      check(typeof id==='string'&&/^[a-zA-Z0-9_-]+$/.test(id),'Invalid local mailbox message identity');
      const detail=await localFetch(`${report.endpoints.mail}/api/v1/message/${id}`);
      check(detail.ok,'Local mailbox message unavailable');return detail.json();
    }
    await pause(200);
  }
  throw new CheckFailure('Expected local verification/recovery email did not arrive');
}
async function messageIds(){const response=await localFetch(`${report.endpoints.mail}/api/v1/messages`);check(response.ok,'Local mailbox unavailable');const body=await response.json();return new Set((body.messages??body.Messages??[]).map(message=>message.ID??message.Id??message.id));}
async function redeem(message,sessionClient,expectedType){
  const text=String(message.Text??message.text??'')+' '+String(message.HTML??message.Html??message.html??'');
  const candidates=text.replaceAll('&amp;','&').match(/https?:\/\/[^\s<>"']+/g)??[];
  let verify;
  for(const candidate of candidates){
    try{const url=new URL(candidate);if(url.origin===report.endpoints.api&&url.pathname==='/auth/v1/verify'&&url.searchParams.get('type')===expectedType){verify=url;break;}}catch{}
  }
  check(verify,'Expected local GoTrue verification link not found');
  const response=await localFetch(verify);
  check([302,303].includes(response.status),'Local GoTrue did not redeem the email link');
  const destination=response.headers.get('location');check(destination,'Local GoTrue callback missing');
  let callback;try{callback=new URL(destination);}catch{throw new CheckFailure('Malformed local callback');}
  // Parse the redirect; do not make a request to the application callback.
  check(callback.origin==='http://127.0.0.1:18082','Auth callback did not match the fixed local application origin');
  check(!callback.searchParams.has('error')&&callback.searchParams.get('code'),'Email link did not produce a local PKCE code');
  // The same isolated SDK client retains the request's in-memory verifier.
  const session=await ok(sessionClient.auth.exchangeCodeForSession(callback.searchParams.get('code')),'Exchange verified local PKCE code');
  check(session.user?.email_confirmed_at,'Email verification was not confirmed by GoTrue');return session.user;
}
async function sourceSha(config){
  if(/^[0-9a-f]{40}$/.test(config.sourceSha??''))return config.sourceSha;
  try{const head=(await readFile(resolve(root,'.git/HEAD'),'utf8')).trim();if(/^[0-9a-f]{40}$/.test(head))return head;if(/^ref: refs\/heads\/[A-Za-z0-9/_-]+$/.test(head)){const sha=(await readFile(resolve(root,'.git',head.slice(5)),'utf8')).trim();if(/^[0-9a-f]{40}$/.test(sha))return sha;}}catch{}
  return 'unknown';
}
const cases=[];
function scenario(id,title,run){cases.push({id,title,run});}
let config;
try{
  check(process.argv.length===3,'Provide one private local configuration file');
  config=JSON.parse(await readFile(resolve(process.argv[2]),'utf8'));
  check(config.apiUrl===report.endpoints.api&&config.mailUrl===report.endpoints.mail,'Refusing endpoints other than the fixed local Supabase and Mailpit URLs');
  check(typeof config.anonKey==='string'&&config.anonKey.length>=20&&typeof config.serviceRoleKey==='string'&&config.serviceRoleKey.length>=20,'Local API keys missing');
  report.source=await sourceSha(config);
  report.dirty=typeof config.dirty==='boolean'?config.dirty:'unknown';
  check(config.migrations&&typeof config.migrations==='object'&&!Array.isArray(config.migrations),'Local migration hash map missing');
  const migrationEntries=Object.entries(config.migrations);
  check(migrationEntries.length===14&&migrationEntries.every(([name,hash])=>/^\d{12}_[a-zA-Z0-9_]+\.sql$/.test(name)&&typeof hash==='string'&&/^[0-9a-f]{64}$/.test(hash)),'Local migration hash map malformed');
  check(migrationEntries.map(([name])=>Number(name.slice(8,12))).sort((a,b)=>a-b).every((number,index)=>number===index+1),'Local integration must use migrations001–014 only');
  for(const [name,hash] of migrationEntries)check(createHash('sha256').update(await readFile(resolve(root,'supabase/migrations',name))).digest('hex')===hash,'Local migration evidence differs from repository source');
  report.migrations=config.migrations;
  report.runnerSha256=createHash('sha256').update(await readFile(fileURLToPath(import.meta.url))).digest('hex');
  const runId=randomBytes(6).toString('hex'),password=`Pp7!${randomBytes(20).toString('hex')}`;
  const accounts={};
  for(const role of ['coach','parent','otherCoach','otherParent']){
    const email=`integration-${role.toLowerCase()}-${runId}@example.test`;
    check(email.endsWith('@example.test'),'Synthetic account address required');
    accounts[role]={email,client:client(config)};
    scenario(`LOCAL-AUTH-SIGNUP-${role.toUpperCase()}`,`Local signup and email verification: ${role}`,async()=>{
      const before=await messageIds();
      const result=await ok(accounts[role].client.auth.signUp({email,password,options:{emailRedirectTo:'http://127.0.0.1:18082/auth/callback'}}),'Synthetic signup');
      check(result.user?.id&&!result.session,'Email confirmations must be enabled in local Auth');
      const user=await redeem(await mailbox(email,before),accounts[role].client,'signup');
      check(user.id===result.user.id&&user.email===email,'Verified account does not match signup');accounts[role].id=user.id;
    });
  }
  scenario('LOCAL-AUTH-RECOVERY','Recovery email is delivered locally, redeemed and password accepted',async()=>{
    const before=await messageIds(),recovery=client(config),account=accounts.parent;
    await ok(recovery.auth.resetPasswordForEmail(account.email,{redirectTo:'http://127.0.0.1:18082/auth/recovery'}),'Request local recovery');
    const user=await redeem(await mailbox(account.email,before),recovery,'recovery');check(user.id===account.id,'Recovery changed account identity');
    const replacement=`Pp8!${randomBytes(20).toString('hex')}`;
    await ok(recovery.auth.updateUser({password:replacement}),'Save recovered password');
    const signed=await ok(client(config).auth.signInWithPassword({email:account.email,password:replacement}),'Sign in with recovered password');check(signed.user?.id===account.id,'Recovered login identity changed');
    await denied(client(config).auth.signInWithPassword({email:account.email,password}),'Old password after reset','bad-password');account.client=recovery;
  });
  const academy=randomUUID(),batch=randomUUID(),student=randomUUID(),family=randomUUID(),otherFamily=randomUUID(),otherChild=randomUUID(),target=randomUUID(),sibling=randomUUID(),observation=randomUUID();
  let invitation,request,link,handoffs;
  const coach=accounts.coach.client,otherCoach=accounts.otherCoach.client,parent=()=>accounts.parent.client,otherParent=accounts.otherParent.client;
  scenario('LOCAL-COACH-ROSTER','Authenticated Coach creates academy, batch, student and enrolment atomically',async()=>{
    await ok(coach.from('profiles').upsert({id:accounts.coach.id,display_name:'Fictional integration Coach'}),'Coach profile');
    await ok(coach.from('academies').insert({id:academy,owner_id:accounts.coach.id,name:'Fictional local academy'}),'Coach academy');
    await ok(coach.from('batches').insert({id:batch,academy_id:academy,name:'Fictional local batch'}),'Coach batch');
    await ok(coach.rpc('save_student_profile',{target_academy:academy,target_student:student,student_name:'Fictional school student',age_years:8,guardian_name:'Fictional guardian',guardian_email:accounts.parent.email,guardian_phone:'',batch_ids:[batch],student_level:'beginner'}),'Atomic student profile');
    const rows=await ok(coach.from('enrolments').select('student_id,batch_id').eq('student_id',student),'Student enrolment');check(rows.length===1&&rows[0].batch_id===batch,'Student enrolment not saved exactly once');
    await ok(otherCoach.rpc('create_academy',{academy_name:'Fictional unrelated academy',owner_name:'Fictional unrelated Coach'}),'Unrelated Coach academy');
    await empty(otherCoach.from('students').select('id').eq('academy_id',academy),'Unrelated Coach roster isolation');
  });
  scenario('LOCAL-PARENT-FAMILY','Parent creates two independent children; another account cannot read them',async()=>{
    await ok(parent().from('parent_families').insert({id:family,owner_id:accounts.parent.id,parent_name:'Fictional local Parent',name:'Fictional local family'}),'Parent family');
    await ok(parent().from('family_children').insert([{id:sibling,family_id:family,name:'Fictional older sibling',born_on:'2015-04-10',color:'sun'},{id:target,family_id:family,name:'Independently named target child',born_on:'2018-06-12',color:'mint'}]),'Independent family children');
    await ok(otherParent.from('parent_families').insert({id:otherFamily,owner_id:accounts.otherParent.id,parent_name:'Fictional unrelated Parent',name:'Fictional unrelated family'}),'Unrelated Parent family');
    await ok(otherParent.from('family_children').insert({id:otherChild,family_id:otherFamily,name:'Fictional unrelated child',color:'sky'}),'Unrelated Parent child');
    const rows=await ok(parent().from('family_children').select('id').eq('family_id',family),'Parent children');check(rows.length===2,'Expected two private child profiles');
    await empty(otherParent.from('family_children').select('id').eq('family_id',family),'Unrelated Parent family isolation');
    await empty(coach.from('family_children').select('id').eq('family_id',family),'Coach private family isolation');
  });
  scenario('LOCAL-PARENT-INVITE-IDENTITY','Only the intended verified guardian can preview an invitation',async()=>{
    invitation=await ok(coach.rpc('issue_parent_link_invite',{target_academy:academy,target_student:student,guardian_email:accounts.parent.email}),'Issue intended guardian invitation');check(/^[0-9a-f]{64}$/.test(invitation),'Invitation code shape invalid');
    await denied(otherParent.rpc('preview_parent_link',{invite_code:invitation}),'Wrong-account invitation preview','22023');
    await denied(otherParent.rpc('claim_parent_link',{invite_code:invitation,target_child:otherChild}),'Wrong-account invitation claim','22023');
    const preview=await ok(parent().rpc('preview_parent_link',{invite_code:invitation}),'Intended guardian preview');check(preview.student_name==='Fictional school student','Intended preview identity mismatch');
  });
  scenario('LOCAL-PARENT-PENDING','Explicit target claim is idempotent and grants no feedback before separate Coach approval',async()=>{
    await denied(parent().rpc('claim_parent_link',{invite_code:invitation,target_child:otherChild}),'Intended guardian cannot select a foreign family child','42501');
    request=await ok(parent().rpc('claim_parent_link',{invite_code:invitation,target_child:target}),'Explicit target claim');
    check(await ok(parent().rpc('claim_parent_link',{invite_code:invitation,target_child:target}),'Exact claim retry')===request,'Claim retry duplicated the request');
    const rows=await ok(parent().rpc('get_parent_connection_requests'),'Read own pending request');check(rows.some(row=>row.id===request&&row.child_id===target&&row.status==='pending'),'Explicit target request was not pending');
    await empty(parent().rpc('get_parent_coach_connections'),'No premature active connection');
    await empty(parent().from('parent_feedback_feed').select('id'),'No premature feedback');
    await denied(parent().rpc('review_parent_connection_request',{target_request:request,approve:true}),'Parent self-approval','42501');
    await denied(otherCoach.rpc('review_parent_connection_request',{target_request:request,approve:true}),'Unrelated Coach approval','42501');
  });
  scenario('LOCAL-FEEDBACK-REVIEW','Recorded Coach feedback stays private until explicitly reviewed and queued',async()=>{
    const saved=await ok(coach.rpc('save_observation',{target_academy:academy,target_observation:observation,expected_revision:0,target_batch:batch,target_session:null,audience_kind:'student',recipient_ids:[student],note_text:'Fictional reviewed learning update',desired_status:'recorded'}).single(),'Record feedback');check(saved.revision===1&&saved.status==='recorded','Feedback was not recorded');
    await empty(parent().from('parent_feedback_feed').select('id'),'Recorded feedback is not a Parent release');
    handoffs=await ok(coach.rpc('queue_parent_feedback',{target_academy:academy,target_observation:observation,expected_revision:1,target_request:randomUUID(),selected_students:[student],selected_media:[]}),'Review and queue feedback');check(handoffs.length===1,'Expected one recipient snapshot');
    await empty(parent().from('parent_feedback_feed').select('id'),'Reviewed feedback withheld while pending');
    await empty(otherCoach.from('observations').select('id').eq('id',observation),'Unrelated Coach note isolation');
  });
  scenario('LOCAL-PARENT-APPROVAL','Separate Coach approval exposes only the explicitly linked child snapshot',async()=>{
    link=await ok(coach.rpc('review_parent_connection_request',{target_request:request,approve:true}),'Separate Coach approval');check(typeof link==='string','Approved link missing');
    const rows=await ok(parent().from('parent_feedback_feed').select('id,child_id,snapshot'),'Approved Parent feed');check(rows.length===1&&rows[0].child_id===target&&rows[0].snapshot.note==='Fictional reviewed learning update','Reviewed feedback mapped to the wrong child');
    await empty(parent().from('parent_feedback_feed').select('id').eq('child_id',sibling),'Sibling feedback isolation');
    await empty(otherParent.from('parent_feedback_feed').select('id'),'Unrelated Parent feedback isolation');
    await empty(otherCoach.from('parent_feedback_feed').select('id'),'Unrelated Coach family feed isolation');
  });
  scenario('LOCAL-STORAGE-PRIVATE','Real private Storage upload and owner download deny unrelated accounts',async()=>{
    const path=`${academy}/student/${student}/${randomUUID()}.png`,bucket='parentplus-coach-photos';
    const bytes=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jN9kAAAAASUVORK5CYII=','base64');
    await ok(coach.storage.from(bucket).upload(path,bytes,{contentType:'image/png',upsert:false}),'Owner private photo upload');
    const downloaded=await ok(coach.storage.from(bucket).download(path),'Owner private photo download');check(Buffer.from(await downloaded.arrayBuffer()).equals(bytes),'Private photo bytes changed');
    await denied(otherCoach.storage.from(bucket).download(path),'Unrelated Coach private photo download','storage-missing');
    await denied(parent().storage.from(bucket).download(path),'Parent access to private Coach profile photo','storage-missing');
    await denied(otherParent.storage.from(bucket).upload(path.replace(/[^/]+$/u,`${randomUUID()}.png`),bytes,{contentType:'image/png'}),'Unrelated Parent photo upload','storage-forbidden');
  });
  scenario('LOCAL-PARENT-DISCONNECT','Disconnect removes current feedback access and stale claim cannot revive it',async()=>{
    await ok(parent().rpc('disconnect_parent_link',{target_link:link}),'Disconnect Parent link');
    await empty(parent().from('parent_feedback_feed').select('id'),'Disconnected Parent feed');
    await empty(parent().rpc('get_parent_coach_connections'),'Disconnected Parent connection');
    await denied(parent().rpc('claim_parent_link',{invite_code:invitation,target_child:target}),'Stale claim after disconnect','22023');
  });
  let blocked=false;
  for(const item of cases){
    if(blocked){report.scenarios.push({id:item.id,title:item.title,status:'blocked',reason:'An earlier prerequisite failed'});continue;}
    const start=Date.now();
    try{await item.run();report.scenarios.push({id:item.id,title:item.title,status:'passed',durationMs:Date.now()-start});console.log(`${item.id}: passed`);}
    catch(error){const reason=error instanceof CheckFailure?error.message:`Unexpected local failure [${safeCode(error)}]`;report.scenarios.push({id:item.id,title:item.title,status:'failed',durationMs:Date.now()-start,reason});console.error(`${item.id}: failed — ${reason}`);blocked=true;}
  }
  check(blockedRequests===0,'Network guard blocked an unexpected request');
}catch(error){
  const reason=error instanceof CheckFailure?error.message:'Local runner setup failed; inspect configuration and local services';
  report.scenarios.push({id:'LOCAL-SETUP',title:'Local integration configuration and network boundary',status:'failed',reason});
  console.error(reason);
}finally{
  report.finishedAt=new Date().toISOString();report.network={allowedRequests,blockedRequests};
  report.summary={passed:report.scenarios.filter(row=>row.status==='passed').length,failed:report.scenarios.filter(row=>row.status==='failed').length,blocked:report.scenarios.filter(row=>row.status==='blocked').length};
  await mkdir(dirname(output),{recursive:true});await writeFile(output,JSON.stringify(report,null,2)+'\n',{mode:0o600});
  console.log(`Local integration: ${report.summary.passed} passed, ${report.summary.failed} failed, ${report.summary.blocked} blocked. Sanitized report: test-results/local-supabase.json`);
  if(report.summary.failed||report.summary.blocked)process.exitCode=1;
}
