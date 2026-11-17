// Real PostgreSQL, independent connections, fictional data only. Refuses remote
// databases and non-test containers. Never run against the Supabase project.
import {spawn,execFileSync} from 'node:child_process';
import {readFileSync,readdirSync} from 'node:fs';
import assert from 'node:assert/strict';
const container=process.env.WORKSPACE_TEST_CONTAINER;
let executable='psql',args=['-X','-qAt','-v','ON_ERROR_STOP=1','-d','parentplus_workspace_test'],environment={...process.env};
if(container){
 assert.match(container,/^parentplus-workspace-test-[a-z0-9-]+$/);
 assert.equal(execFileSync('docker',['inspect','--format','{{index .Config.Labels "parentplus.disposable-workspace-test"}}',container],{encoding:'utf8'}).trim(),'true');
 executable='docker';args=['exec','-i',container,'psql',...args,'-U','postgres'];
}else{
 const url=new URL(process.env.WORKSPACE_TEST_DATABASE_URL??'');
 assert.ok(['postgres:','postgresql:'].includes(url.protocol));
 assert.ok(['127.0.0.1','localhost','[::1]'].includes(url.hostname),'Only a loopback test database is permitted');
 assert.equal(url.pathname,'/parentplus_workspace_test');assert.equal(url.search,'');assert.equal(url.hash,'');
 environment={...environment,PGHOST:url.hostname,PGPORT:url.port||'5432',PGUSER:decodeURIComponent(url.username),PGPASSWORD:decodeURIComponent(url.password)};
}
const uid=n=>`00000000-0000-0000-0000-${String(n).padStart(12,'0')}`;
const workspace=`'${uid(11)}'`,session=`'${uid(41)}'`,member=`'${uid(73)}'`,assignment=`'${uid(81)}'`;
const clients=new Set();let sequence=0;
class Connection{
 constructor(label){
  this.name=`pp_f2_${label}_${++sequence}`;this.output='';this.errors='';this.pending=[];
  this.process=spawn(executable,args,{env:environment,stdio:['pipe','pipe','pipe']});clients.add(this);
  this.closed=new Promise(resolve=>this.process.once('close',resolve));
  this.process.stdout.setEncoding('utf8');this.process.stderr.setEncoding('utf8');
  this.process.stdout.on('data',chunk=>{this.output+=chunk;this.flush();});
  this.process.stderr.on('data',chunk=>{this.errors+=chunk;});
  this.process.on('error',error=>{this.failure=error;this.flush();});
  this.process.stdin.on('error',error=>{this.failure=error;this.flush();});
  this.process.on('close',code=>{this.failure=new Error(`psql exited ${code}: ${this.errors}`);this.flush();clients.delete(this);});
  this.ready=this.send(`set application_name='${this.name}';set statement_timeout='10s';set lock_timeout='8s';\n\\set VERBOSITY verbose`);
 }
 flush(){
  while(this.pending.length){
   const next=this.pending[0],position=this.output.indexOf(next.marker);
   if(position<0){if(this.failure){this.pending.shift();next.reject(this.failure);continue;}break;}
   const value=this.output.slice(0,position).trim();this.output=this.output.slice(position+next.marker.length);this.pending.shift();next.resolve(value);
  }
 }
 send(sql){
  const marker=`PP_DONE_${++sequence}`;
  const response=new Promise((resolve,reject)=>this.pending.push({marker,resolve,reject}));
  // Only fixture SQL goes to stdin; no shell interpretation or secret logging.
  this.process.stdin.write(`${sql}\n\\echo ${marker}\n`);return response;
 }
 close(){
  if(!this.closing&&!this.process.stdin.destroyed&&!this.process.stdin.writableEnded){this.closing=true;this.process.stdin.end('rollback;\n\\q\n');}
  return this.closed;
 }
}
const admin=new Connection('admin');await admin.ready;
const sql=statement=>admin.send(statement);
const as=n=>`set request.jwt.claim.sub='${uid(n)}';`;
const write=`select coach_private.workspace_test_protected_write(${workspace},${session});`;
const revokeMember=`select coach_private.workspace_revoke_membership(${workspace},${member});`;
const revokeAssignment=`select coach_private.workspace_revoke_assignment(${workspace},${assignment});`;
const failures=[];let passed=0;
async function connection(name,actor){const c=new Connection(name);await c.ready;await c.send(`begin;${as(actor)}`);return c;}
async function blocked(c,by){
 const deadline=Date.now()+5000;
 while(Date.now()<deadline){
  const value=await sql(`select exists(select 1 from pg_stat_activity waiting where waiting.application_name='${c.name}' and waiting.wait_event_type='Lock'
   and exists(select 1 from pg_stat_activity holder where holder.application_name='${by.name}' and holder.pid=any(pg_blocking_pids(waiting.pid))));`);
  if(value==='t')return;
  await new Promise(resolve=>setTimeout(resolve,25));
 }
 throw new Error(`${c.name} did not wait for the expected authority lock`);
}
async function mustDeny(operation){await assert.rejects(operation,/42501/);}
async function reset(){
 await sql(`update auth.users set banned_until=null;update coach_private.workspace_memberships set status='active',ended_at=null;
 update coach_private.workspace_teaching_assignments set revoked_at=null;
 update coach_private.workspace_role_grants set valid_until=null;truncate coach_private.workspace_test_writes;`);
}
async function test(name,run){
 try{await reset();await run();passed++;console.log(`PASS ${name}`);}
 catch(error){failures.push(name);console.error(`FAIL ${name}: ${error.message}`);throw error;}
 finally{await Promise.all([...clients].filter(c=>c!==admin).map(c=>c.close()));}
}
try{
 assert.equal(await sql("select to_regclass('public.academies') is null;"),'t','Test database must be empty; refusing to overwrite existing data');
 await sql(readFileSync('tests/fixtures/supabase-base.sql','utf8'));
 for(const file of readdirSync('supabase/migrations').filter(file=>file.endsWith('.sql')&&file<='202611160014_verified_parent_connections.sql').sort())await sql(readFileSync(`supabase/migrations/${file}`,'utf8'));
 await sql(readFileSync('tests/fixtures/workspace-authorization.sql','utf8'));
 for(const file of ['202611170015_workspace_foundation.sql','202611170016_workspace_authorization.sql'])await sql(readFileSync(`supabase/candidates/${file}`,'utf8'));
 await sql(readFileSync('tests/fixtures/workspace-authority.sql','utf8'));
 await sql(`create table coach_private.workspace_test_writes(actor uuid,session_id uuid);
 create function coach_private.workspace_test_protected_write(workspace uuid,session uuid) returns void language plpgsql security definer set search_path='' as $$
 begin perform coach_private.workspace_assert_class_write(workspace,session,'feedback.write');
 insert into coach_private.workspace_test_writes values(auth.uid(),session);end $$;
 revoke all on function coach_private.workspace_test_protected_write(uuid,uuid) from public,anon,authenticated,service_role;`);
 const legacyOwner=await sql(`select id from coach_private.workspace_memberships where workspace_id=${workspace} and user_id='${uid(1)}';`);

 await test('membership revocation commits before a waiting write: write denied',async()=>{
  const revoker=await connection('revoke_first',1);await revoker.send(revokeMember);
  const writer=await connection('waiting_writer',3),attempt=writer.send(write);const denial=mustDeny(attempt);
  await blocked(writer,revoker);await revoker.send('commit;');await denial;
  assert.equal(await sql('select count(*) from coach_private.workspace_test_writes;'),'0');
 });
 await test('write locks authority first: write finishes, revoke waits, subsequent write denied',async()=>{
  const writer=await connection('write_first',3);await writer.send(write);
  const revoker=await connection('waiting_revoker',1),attempt=revoker.send(revokeMember);
  await blocked(revoker,writer);await writer.send('commit;');await attempt;await revoker.send('commit;');
  const later=await connection('after_revoke',3);await mustDeny(later.send(write));
  assert.equal(await sql('select count(*) from coach_private.workspace_test_writes;'),'1');
 });
 await test('assignment revoked while membership stays active: waiting write denied',async()=>{
  const revoker=await connection('assignment_revoker',1);await revoker.send(revokeAssignment);
  const writer=await connection('assignment_writer',3),attempt=writer.send(write);const denial=mustDeny(attempt);
  await blocked(writer,revoker);await revoker.send('commit;');await denial;
  assert.equal(await sql(`select status from coach_private.workspace_memberships where id=${member};`),'active');
 });
 await test('two owners revoke one another concurrently: one accepted owner remains',async()=>{
  const first=await connection('first_owner',1);await first.send(`select coach_private.workspace_revoke_membership(${workspace},'${uid(78)}');`);
  const second=await connection('second_owner',8),attempt=second.send(`select coach_private.workspace_revoke_membership(${workspace},'${legacyOwner}');`);const denial=mustDeny(attempt);
  await blocked(second,first);await first.send('commit;');await denial;
  assert.equal(await sql(`select count(*) from coach_private.workspace_memberships m join coach_private.workspace_role_grants g on g.membership_id=m.id where m.workspace_id=${workspace} and m.status='active' and g.role_code='owner';`),'1');
 });
 await test('two owners leave concurrently: last-owner guard survives serialization',async()=>{
  const first=await connection('leaving_owner',1);await first.send(`select coach_private.workspace_revoke_membership(${workspace},'${legacyOwner}');`);
  const second=await connection('last_owner',8),attempt=second.send(`select coach_private.workspace_revoke_membership(${workspace},'${uid(78)}');`);const denial=mustDeny(attempt);
  await blocked(second,first);await first.send('commit;');await denial;
  assert.equal(await sql(`select status from coach_private.workspace_memberships where id='${uid(78)}';`),'active');
 });
 await test('role expires after transaction start: wall-clock decision denies late write',async()=>{
  const writer=await connection('expired_role',3);
  assert.equal(await writer.send(`update coach_private.workspace_role_grants set valid_until=clock_timestamp()+interval '500 milliseconds' where membership_id=${member};
   select coach_private.workspace_class_access(${workspace},${session},'feedback.write');`),'t');
  await sql("select pg_sleep(0.6);");await mustDeny(writer.send(write));
 });
 await test('account banned while a write waits: stale identity claim cannot bypass',async()=>{
  const holder=await connection('ban_anchor',1);await holder.send(`select coach_private.workspace_lock_actor(${workspace});`);
  const writer=await connection('banned_writer',3),attempt=writer.send(write);const denial=mustDeny(attempt);
  await blocked(writer,holder);await sql(`update auth.users set banned_until=clock_timestamp()+interval '1 day' where id='${uid(3)}';`);
  await holder.send('commit;');await denial;assert.equal(await sql('select count(*) from coach_private.workspace_test_writes;'),'0');
 });
 await test('higher-isolation transaction fails closed instead of retaining stale authority',async()=>{
  const writer=await connection('repeatable_snapshot',3);await writer.send(`rollback;begin isolation level repeatable read;${as(3)}`);await mustDeny(writer.send(write));
  assert.equal(await sql('select count(*) from coach_private.workspace_test_writes;'),'0');
 });
 console.log(`${passed}/8 real PostgreSQL transaction cases passed. Fictional local data only; no Supabase provider acceptance implied.`);
}finally{
 await Promise.all([...clients].map(c=>c.close()));
 if(failures.length)process.exitCode=1;
}
