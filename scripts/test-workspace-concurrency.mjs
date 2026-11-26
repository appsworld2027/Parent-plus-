// Real PostgreSQL, independent connections, fictional data only. Refuses remote
// databases and non-test containers. Never run against the Supabase project.
import {spawn,execFileSync} from 'node:child_process';
import {readFileSync,readdirSync} from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
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
  this.ready=this.send(`set application_name='${this.name}';set statement_timeout='10s';set lock_timeout='8s';set client_min_messages='warning';\n\\set VERBOSITY verbose`);
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
 await sql(readFileSync('supabase/candidates/202611170017_workspace_roster.sql','utf8'));
 await sql(readFileSync('supabase/candidates/202611170018_workspace_staff.sql','utf8'));
 await sql(readFileSync('supabase/candidates/202611170019_workspace_attendance.sql','utf8'));
 await sql(readFileSync('supabase/candidates/202611170020_workspace_feedback.sql','utf8'));
 await sql(readFileSync('supabase/candidates/202611180021_learning_context.sql','utf8'));
 await sql(`insert into auth.users(id,email,email_confirmed_at) values('${uid(101)}','new@example.test',clock_timestamp()),('${uid(102)}','second@example.test',clock_timestamp()),('${uid(103)}','third@example.test',clock_timestamp());`);
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
 // Exercise actual new operations, not just the original protected-write fixture.
 await sql(`insert into coach_private.workspace_role_grants(workspace_id,membership_id,role_code,scope,source) values(${workspace},${member},'admin','workspace','explicit_grant');`);
 const saveBatch=(target,revision,request,name)=>`select coach_private.workspace_save_batch(${workspace},'${uid(target)}',${revision},'${uid(request)}','${name}','Studio','${uid(61)}');`;
 await test('actual batch save waiting behind committed membership removal is denied',async()=>{
  const revoker=await connection('actual_revoke',1);await revoker.send(revokeMember);
  const writer=await connection('actual_write',3),attempt=writer.send(saveBatch(601,0,701,'Blocked'));
  const denial=mustDeny(attempt);await blocked(writer,revoker);await revoker.send('commit;');await denial;
  assert.equal(await sql(`select count(*) from public.batches where id='${uid(601)}';`),'0');
  assert.equal(await sql('select count(*) from coach_private.workspace_resource_receipts;'),'0');
 });
 await test('two actual batch edits with one revision serialize and reject the stale editor',async()=>{
  await sql(`${as(1)}${saveBatch(602,0,702,'Original')}`);
  const first=await connection('first_editor',1);await first.send(saveBatch(602,1,703,'First edit'));
  const second=await connection('stale_editor',8),attempt=second.send(saveBatch(602,1,704,'Stale edit'));
  const conflict=assert.rejects(attempt,/40001/);await blocked(second,first);await first.send('commit;');await conflict;
  assert.equal(await sql(`select name from public.batches where id='${uid(602)}';`),'First edit');
  assert.equal(await sql(`select revision from coach_private.workspace_resource_versions where batch_id='${uid(602)}';`),'2');
 });
 await test('same actual save retried concurrently returns one receipt and one resource version',async()=>{
  const first=await connection('first_request',1);await first.send(saveBatch(603,0,705,'One request'));
  const second=await connection('repeat_request',1),attempt=second.send(saveBatch(603,0,705,'One request'));
  await blocked(second,first);await first.send('commit;');const replay=await attempt;await second.send('commit;');
  assert.equal(JSON.parse(replay).revision,1);
  assert.equal(await sql(`select count(*) from coach_private.workspace_resource_receipts where request_id='${uid(705)}';`),'1');
  assert.equal(await sql(`select revision from coach_private.workspace_resource_versions where batch_id='${uid(603)}';`),'1');
 });
 await sql(`delete from coach_private.workspace_role_grants where membership_id=${member} and role_code='admin';`);
 await test('actual roster read serializes with a class move and denies the instructor after transfer',async()=>{
  await sql(`${as(1)}select coach_private.workspace_save_class(${workspace},'${uid(604)}',0,'${uid(706)}','${uid(31)}',now()-interval '30 minutes',now()+interval '30 minutes','Studio','scheduled');`);
  const reader=await connection('assigned_reader',3);
  assert.equal((await reader.send(`select count(*) from coach_private.workspace_class_roster(${workspace},'${uid(604)}');`)),'2');
  const writer=await connection('moving_manager',1),attempt=writer.send(`select coach_private.workspace_save_class(${workspace},'${uid(604)}',1,'${uid(707)}','${uid(32)}',now()-interval '30 minutes',now()+interval '30 minutes','Studio','scheduled');`);
  await blocked(writer,reader);await reader.send('commit;');await attempt;await writer.send('commit;');
  const later=await connection('after_transfer',3);await mustDeny(later.send(`select * from coach_private.workspace_class_roster(${workspace},'${uid(604)}');`));
 });
 // These are fixture tokens, never application credentials. Production callers
 // must generate their raw invitation token cryptographically and retain retries.
 const staffToken=n=>String(n).padStart(64,'a');
 const staffExpiry=await sql("select (clock_timestamp()+interval '2 days')::text;");
 const issueStaff=(n,email='new@example.test',ownership=false)=>`select coach_private.workspace_issue_staff_offer(${workspace},'${uid(1100+n)}','${email}','${createHash('sha256').update(staffToken(n)).digest('hex')}','${staffExpiry}','[{"role":"${ownership?'owner':'instructor'}","branch":${ownership?'null':`"${uid(61)}"`}}]',${ownership});`;
 const acceptStaff=n=>`select coach_private.workspace_accept_staff_offer('${staffToken(n)}','Test staff','Test coach');`;
 await test('staff offer revocation commits before waiting acceptance: no membership created',async()=>{
  await sql(`${as(1)}${issueStaff(1)}`);
  const revoker=await connection('offer_revoker',1);await revoker.send(`select coach_private.workspace_revoke_staff_offer(${workspace},'${uid(1101)}');`);
  const recipient=await connection('waiting_recipient',101),attempt=recipient.send(acceptStaff(1));const denial=mustDeny(attempt);
  await blocked(recipient,revoker);await revoker.send('commit;');await denial;
  assert.equal(await sql(`select count(*) from coach_private.workspace_memberships where user_id='${uid(101)}';`),'0');
 });
 let joinedStaff;
 await test('two identical staff acceptances serialize into one membership and receipt',async()=>{
  await sql(`${as(1)}${issueStaff(2)}`);
  const first=await connection('first_acceptance',101);joinedStaff=await first.send(acceptStaff(2));
  const second=await connection('repeat_acceptance',101),attempt=second.send(acceptStaff(2));
  await blocked(second,first);await first.send('commit;');assert.equal(await attempt,joinedStaff);await second.send('commit;');
  assert.equal(await sql(`select count(*) from coach_private.workspace_memberships where user_id='${uid(101)}';`),'1');
  assert.equal(await sql(`select count(*) from coach_private.workspace_staff_events where invite_id='${uid(1102)}' and kind='accepted';`),'1');
 });
 await test('issuer membership removal commits before waiting acceptance: stale issuer denied',async()=>{
  await sql(`${as(1)}${issueStaff(3,'second@example.test')}`);
  const revoker=await connection('issuer_removal',8);await revoker.send(`select coach_private.workspace_revoke_membership(${workspace},'${legacyOwner}');`);
  const recipient=await connection('issuer_removed_recipient',102),attempt=recipient.send(acceptStaff(3));const denial=mustDeny(attempt);
  await blocked(recipient,revoker);await revoker.send('commit;');await denial;
  assert.equal(await sql(`select count(*) from coach_private.workspace_memberships where user_id='${uid(102)}';`),'0');
 });
 await test('accepted instructor gains only an explicit class roster and loses it on assignment removal',async()=>{
  await sql(`${as(8)}select coach_private.workspace_save_class(${workspace},'${uid(1301)}',0,'${uid(1302)}','${uid(31)}',clock_timestamp()+interval '1 hour',clock_timestamp()+interval '2 hours','Studio','scheduled');`);
  const recipient=await connection('joined_unassigned',101);await mustDeny(recipient.send(`select * from coach_private.workspace_class_roster(${workspace},'${uid(1301)}');`));await recipient.close();
  await sql(`${as(8)}with bounds as materialized(select clock_timestamp() t) select coach_private.workspace_assign_teacher(${workspace},'${uid(1303)}','${joinedStaff}',null,'${uid(1301)}','lead',t,t+interval '3 hours',t,t+interval '4 hours',t+interval '4 hours') from bounds;`);
  assert.equal(await sql(`${as(101)}select count(*) from coach_private.workspace_class_roster(${workspace},'${uid(1301)}');`),'2');
  await sql(`${as(8)}select coach_private.workspace_revoke_assignment(${workspace},'${uid(1303)}');`);
  const removed=await connection('assignment_removed',101);await mustDeny(removed.send(`select * from coach_private.workspace_class_roster(${workspace},'${uid(1301)}');`));
 });
 const attendancePage=async()=>JSON.parse(await sql(`${as(3)}select coach_private.workspace_class_attendance(${workspace},${session});`));
 const saveAttendance=(page,request,status='present')=>`select coach_private.workspace_save_attendance(${workspace},${session},${page.revision},'${page.context}','${uid(request)}','[{"student_id":"${uid(21)}","status":"${status}"},{"student_id":"${uid(22)}","status":"${status}"}]');`;
 await test('actual attendance save waiting behind assignment removal is denied without marks or revision',async()=>{
  const page=await attendancePage();
  const revoker=await connection('attendance_assignment_revoker',1);await revoker.send(revokeAssignment);
  const writer=await connection('attendance_waiter',3),attempt=writer.send(saveAttendance(page,1501));const denial=mustDeny(attempt);
  await blocked(writer,revoker);await revoker.send('commit;');await denial;
  assert.equal(await sql(`select attendance_revision from public.class_sessions where id=${session};`),String(page.revision));
  assert.equal(await sql('select count(*) from public.attendance;'),'0');
 });
 await test('two actual attendance editors serialize and reject a stale second instructor',async()=>{
  const page=await attendancePage();
  const first=await connection('attendance_first_editor',3);await first.send(saveAttendance(page,1502,'late'));
  const second=await connection('attendance_stale_editor',4),attempt=second.send(saveAttendance(page,1503,'absent'));const conflict=assert.rejects(attempt,/40001/);
  await blocked(second,first);await first.send('commit;');await conflict;
  assert.equal(await sql(`select bool_and(status='late') from public.attendance where session_id=${session};`),'t');
  assert.equal(await sql('select count(*) from coach_private.workspace_attendance_submissions;'),'1');
 });
 await test('identical actual attendance submissions return one immutable receipt and revision',async()=>{
  const page=await attendancePage();
  const first=await connection('attendance_original_request',3);const original=await first.send(saveAttendance(page,1504));
  const second=await connection('attendance_same_request',3),attempt=second.send(saveAttendance(page,1504));
  await blocked(second,first);await first.send('commit;');assert.deepEqual(JSON.parse(await attempt),JSON.parse(original));await second.send('commit;');
  assert.equal(await sql(`select count(*) from coach_private.workspace_attendance_submissions where request_id='${uid(1504)}';`),'1');
  assert.equal(await sql(`select attendance_revision from public.class_sessions where id=${session};`),String(page.revision+1));
 });
 await test('actual attendance locks first: save commits, revoke waits, even the receipt replay is then denied',async()=>{
  const page=await attendancePage();
  const writer=await connection('attendance_write_first',3);await writer.send(saveAttendance(page,1505));
  const revoker=await connection('attendance_revoke_waiter',1),attempt=revoker.send(revokeAssignment);
  await blocked(revoker,writer);await writer.send('commit;');await attempt;await revoker.send('commit;');
  const later=await connection('attendance_replay_after_revoke',3);await mustDeny(later.send(saveAttendance(page,1505)));
  assert.equal(await sql(`select attendance_revision from public.class_sessions where id=${session};`),String(page.revision+1));
 });
 const saveFeedback=(target,revision,request,note,status='draft')=>`select coach_private.workspace_save_class_feedback(${workspace},'${uid(target)}',${revision},'${uid(request)}',${session},'student',array['${uid(21)}']::uuid[],'${note}','${status}');`;
 await test('actual feedback creation waiting behind assignment removal is denied without a note or author link',async()=>{
  const revoker=await connection('feedback_assignment_revoker',1);await revoker.send(revokeAssignment);
  const writer=await connection('feedback_waiter',3),attempt=writer.send(saveFeedback(1601,0,1701,'Denied feedback'));const denial=mustDeny(attempt);
  await blocked(writer,revoker);await revoker.send('commit;');await denial;
  assert.equal(await sql(`select count(*) from public.observations where id='${uid(1601)}';`),'0');
  assert.equal(await sql('select count(*) from coach_private.workspace_feedback_submissions;'),'0');
 });
 await test('actual feedback edits serialize and reject a stale note rather than losing an update',async()=>{
  await sql(`${as(3)}${saveFeedback(1602,0,1702,'Original')}`);
  const first=await connection('feedback_first_editor',3);await first.send(saveFeedback(1602,1,1703,'First edit'));
  const second=await connection('feedback_stale_editor',3),attempt=second.send(saveFeedback(1602,1,1704,'Stale edit'));const conflict=assert.rejects(attempt,/40001/);
  await blocked(second,first);await first.send('commit;');await conflict;
  assert.equal(await sql(`select note from public.observations where id='${uid(1602)}';`),'First edit');
 });
 await test('identical actual feedback requests create one author link, version and receipt',async()=>{
  const first=await connection('feedback_original_request',3);const original=await first.send(saveFeedback(1603,0,1705,'One note'));
  const second=await connection('feedback_same_request',3),attempt=second.send(saveFeedback(1603,0,1705,'One note'));
  await blocked(second,first);await first.send('commit;');assert.deepEqual(JSON.parse(await attempt),JSON.parse(original));await second.send('commit;');
  assert.equal(await sql(`select count(*) from public.observation_versions where observation_id='${uid(1603)}';`),'1');
  assert.equal(await sql(`select count(*) from coach_private.workspace_feedback_submissions where request_id='${uid(1705)}';`),'1');
 });
 await test('correction commits before a waiting author edit: stale edit denied and original teacher preserved',async()=>{
  await sql(`${as(3)}${saveFeedback(1604,0,1706,'Original recorded note','recorded')}`);
  const editor=await connection('feedback_corrector',1);await editor.send(`select coach_private.workspace_correct_feedback(${workspace},'${uid(1604)}',1,'${uid(1801)}','Corrected note','Factual correction');`);
  const author=await connection('feedback_author_waiting',3),attempt=author.send(saveFeedback(1604,1,1707,'Stale author edit','recorded'));const conflict=assert.rejects(attempt,/40001/);
  await blocked(author,editor);await editor.send('commit;');await conflict;
  assert.equal(await sql(`select author_id='${uid(3)}' and updated_by='${uid(1)}' and note='Corrected note' from public.observations where id='${uid(1604)}';`),'t');
 });
 // LRN-05-SC-011: actual statements wait on the same authority anchor. These
 // tests use separate psql sessions and verify the durable result after commit.
 async function learningSetup(n){
  const curriculum=uid(2100+n),stageA=uid(2200+n*2),stageB=uid(2201+n*2),goalA=uid(2300+n*2),goalB=uid(2301+n*2);
  const definitions=JSON.stringify([{id:stageA,title:'Foundations',objectives:[{id:goalA,title:'Wait for a turn'}]},
   {id:stageB,title:'Independent',objectives:[{id:goalB,title:'Invite a peer'}]}]);
  const current=Number(await sql(`select coalesce(max(revision),0) from coach_private.learning_class_plans where workspace_id=${workspace} and session_id=${session};`));
  await sql(`${as(8)}select coach_private.workspace_publish_curriculum(${workspace},'${curriculum}',0,'${uid(2500+n)}','Social confidence','${definitions}'::jsonb);
   ${as(3)}select coach_private.workspace_save_learning_plan(${workspace},${session},${current},'${uid(2600+n)}','${curriculum}',1,'Shared activity',array['${goalA}','${goalB}']::uuid[]);
   select coach_private.workspace_place_learner(${workspace},${session},'${uid(21)}','${curriculum}',1,'${stageA}',0,'${uid(2700+n)}','Starting point');
   ${saveFeedback(4600+n,0,4700+n,'Observed waiting for a turn.','recorded')}`);
  return {curriculum,stageA,stageB,goalA,goalB,revision:current+1,feedback:uid(4600+n)};
 }
 const learningContext=`select coach_private.workspace_learning_context(${workspace},${session},'${uid(21)}');`;
 await test('learning placement commits before a waiting context read: no mixed learner stage and objectives',async()=>{
  const p=await learningSetup(1),writer=await connection('learning_stage_writer',3);
  await writer.send(`select coach_private.workspace_place_learner(${workspace},${session},'${uid(21)}','${p.curriculum}',1,'${p.stageB}',1,'${uid(2801)}','Advanced after assessment');`);
  const reader=await connection('learning_stage_reader',4),attempt=reader.send(learningContext);
  await blocked(reader,writer);await writer.send('commit;');const result=JSON.parse(await attempt);
  assert.equal(result.placement.stage_id,p.stageB);assert.deepEqual(result.objectives.map(g=>g.id),[p.goalB]);
 });
 await test('learning plan commits before a waiting context read: one complete plan revision',async()=>{
  const p=await learningSetup(2),writer=await connection('learning_plan_writer',3);
  await writer.send(`select coach_private.workspace_save_learning_plan(${workspace},${session},${p.revision},'${uid(2802)}','${p.curriculum}',1,'Revised activity',array['${p.goalA}']::uuid[]);`);
  const reader=await connection('learning_plan_reader',4),attempt=reader.send(learningContext);
  await blocked(reader,writer);await writer.send('commit;');const result=JSON.parse(await attempt);
  assert.equal(result.plan.revision,p.revision+1);assert.equal(result.plan.content,'Revised activity');assert.deepEqual(result.objectives.map(g=>g.id),[p.goalA]);
 });
 await test('learning evidence waiting behind assignment revocation is denied without assessment or receipt',async()=>{
  const p=await learningSetup(3),revoker=await connection('learning_revoker',1);await revoker.send(revokeAssignment);
  const teacher=await connection('learning_revoked_writer',3);
  const attempt=teacher.send(`select coach_private.workspace_assess_learning(${workspace},${session},'${uid(21)}','${p.feedback}',1,'${p.goalA}',${p.revision},0,'${uid(2803)}','observed','Waited with a prompt');`),denial=mustDeny(attempt);
  await blocked(teacher,revoker);await revoker.send('commit;');await denial;
  assert.equal(await sql(`select count(*) from coach_private.learning_assessments where curriculum_id='${p.curriculum}';`),'0');
  assert.equal(await sql(`select count(*) from coach_private.learning_receipts where request_id='${uid(2803)}';`),'0');
 });
 await test('identical concurrent learning evidence creates one immutable assessment and receipt',async()=>{
  const p=await learningSetup(4),statement=`select coach_private.workspace_assess_learning(${workspace},${session},'${uid(21)}','${p.feedback}',1,'${p.goalA}',${p.revision},0,'${uid(2804)}','practising','Waited with a prompt');`;
  const first=await connection('learning_first_receipt',3),original=await first.send(statement);
  const second=await connection('learning_second_receipt',3),attempt=second.send(statement);
  await blocked(second,first);await first.send('commit;');assert.deepEqual(JSON.parse(await attempt),JSON.parse(original));await second.send('commit;');
  assert.equal(await sql(`select count(*) from coach_private.learning_assessments where curriculum_id='${p.curriculum}';`),'1');
  assert.equal(await sql(`select count(*) from coach_private.learning_receipts where request_id='${uid(2804)}';`),'1');
 });
 await test('ownership handoff commits before an old owner write: waiting old owner denied',async()=>{
  await sql(`${as(1)}${issueStaff(4,'second@example.test',true)}`);
  const successor=await connection('new_owner_accepting',102);await successor.send(acceptStaff(4));
  const former=await connection('former_owner_waiting',1),attempt=former.send(saveBatch(1304,0,1305,'Former owner write'));const denial=mustDeny(attempt);
  await blocked(former,successor);await successor.send('commit;');await denial;
  assert.equal(await sql(`select count(*) from public.batches where id='${uid(1304)}';`),'0');
  assert.equal(await sql(`${as(102)}select coach_private.workspace_has_role(${workspace},'owner',null);`),'t');
 });
 console.log(`${passed}/29 real PostgreSQL transaction cases passed. Fictional local data only; no Supabase provider acceptance implied.`);
}finally{
 await Promise.all([...clients].map(c=>c.close()));
 if(failures.length)process.exitCode=1;
}
