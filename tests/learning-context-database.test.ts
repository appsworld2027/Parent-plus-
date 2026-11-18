import type {PGlite} from '@electric-sql/pglite';
import {existsSync,readFileSync} from 'node:fs';
import {afterAll,afterEach,beforeAll,beforeEach,expect,it} from 'vitest';
import {supabaseDatabase} from './support/supabaseDatabase';

const id=(n:number)=>`00000000-0000-0000-0000-${String(n).padStart(12,'0')}`;
const path='supabase/candidates/202611180021_learning_context.sql';
const stages=[{id:id(201),title:'Foundations',objectives:[{id:id(301),title:'Wait for a turn'}]},
 {id:id(202),title:'Independent practice',objectives:[{id:id(302),title:'Invite a peer to join'}]}];
let db:PGlite;
async function actor(n:number){await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id(n)]);}
async function value(sql:string,args:unknown[]=[]){return(await db.query<{v:any}>(sql,args)).rows[0].v;}
async function deny(run:()=>Promise<unknown>,code='42501'){
 await db.exec('savepoint rejected');try{await expect(run()).rejects.toMatchObject({code});}finally{await db.exec('rollback to savepoint rejected;release savepoint rejected');}
}
const publish=(expected=0,request=501,definitions:unknown=stages,curriculum=101)=>value('select coach_private.workspace_publish_curriculum($1,$2,$3,$4,$5,$6::jsonb) v',[id(11),id(curriculum),expected,id(request),'Social confidence',JSON.stringify(definitions)]);
const plan=(expected=0,request=601,version=1,goals=[301,302])=>value('select coach_private.workspace_save_learning_plan($1,$2,$3,$4,$5,$6,$7,$8::uuid[]) v',[id(11),id(41),expected,id(request),id(101),version,'Practise taking turns in a shared activity.',goals.map(id)]);
const place=(student=21,stage=201,expected=0,request=701,version=1,session=41)=>value('select coach_private.workspace_place_learner($1,$2,$3,$4,$5,$6,$7,$8,$9) v',[id(11),id(session),id(student),id(101),version,id(stage),expected,id(request),'Coach assessed starting point.']);
const context=(student=21,session=41)=>value('select coach_private.workspace_learning_context($1,$2,$3) v',[id(11),id(session),id(student)]);
const assess=(expected=0,request=801,state='practising',goal=301,source=51,sourceRevision=1,planRevision=1,student=21)=>value('select coach_private.workspace_assess_learning($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) v',[id(11),id(41),id(student),id(source),sourceRevision,id(goal),planRevision,expected,id(request),state,'Waited for a turn after one prompt.']);
async function setup(){await actor(1);await publish();await actor(3);await plan();await place();}
beforeAll(async()=>{
 db=await supabaseDatabase();await db.exec(readFileSync('tests/fixtures/workspace-authorization.sql','utf8'));
 for(const n of ['0015_workspace_foundation','0016_workspace_authorization'])await db.exec(readFileSync(`supabase/candidates/20261117${n}.sql`,'utf8'));
 await db.exec(readFileSync('tests/fixtures/workspace-authority.sql','utf8'));
 // The shared permission fixture has current notes but omits version history.
 // This slice requires the actual recorded revision as an evidence reference.
 await db.exec(`insert into public.observation_versions(observation_id,academy_id,revision,note,status,audience,recipient_ids,author_id)
  select o.id,o.academy_id,o.revision,o.note,o.status,o.audience,array(select r.student_id from public.observation_recipients r where r.observation_id=o.id),o.author_id from public.observations o;`);
 for(const n of ['0017_workspace_roster','0018_workspace_staff','0019_workspace_attendance','0020_workspace_feedback'])await db.exec(readFileSync(`supabase/candidates/20261117${n}.sql`,'utf8'));
 if(existsSync(path)){await db.exec(readFileSync(path,'utf8'));await db.exec(readFileSync(path,'utf8'));}
},30000);
beforeEach(async()=>{await db.exec('begin;reset role');await db.query("update auth.users set banned_until=clock_timestamp()+interval '1 day' where id=$1",[id(8)]);await actor(1);});
afterEach(async()=>{await db.exec('rollback;reset role');});afterAll(async()=>{await db?.close();});

it('LRN-01-SC-001 publishes immutable curriculum versions without rewriting earlier stage meaning',async()=>{
 expect(await publish()).toEqual({curriculum_id:id(101),version:1});
 expect(await publish(1,502,[{...stages[0],title:'Updated foundations'}])).toMatchObject({version:2});
 expect((await db.query('select version,title from coach_private.learning_stages where curriculum_id=$1 and stage_id=$2 order by version',[id(101),id(201)])).rows).toEqual([{version:1,title:'Foundations'},{version:2,title:'Updated foundations'}]);
 await deny(()=>db.exec("update coach_private.learning_stages set title='Rewritten'"));
});
it.each([3,4,5,6,7,8])('LRN-01-SC-002 denies curriculum publication without current global management %s',async n=>{await actor(n);await deny(()=>publish());});
it.each([null,[],[{...stages[0],objectives:[]}],[stages[0],stages[0]],[{...stages[0],objectives:[stages[0].objectives[0],stages[0].objectives[0]]}],[{...stages[0],unexpected:'instruction'}]])('LRN-01-SC-003 rejects malformed or duplicate definitions %j atomically',async definitions=>{
 await deny(()=>publish(0,501,definitions),'22023');expect(await value('select count(*)::int v from coach_private.learning_curriculum_versions')).toBe(0);
});
it('LRN-01-SC-004 replays exact requests without reverting newer versions and rejects changed or stale requests',async()=>{
 const first=await publish();await publish(1,502);expect(await publish()).toEqual(first);
 await deny(()=>publish(1,501),'22023');await deny(()=>publish(0,503),'40001');
 await db.query('update auth.users set banned_until=now()+interval \'1 day\' where id=$1',[id(1)]);await deny(()=>publish());
});
it('LRN-02-SC-001 keeps two same-batch learners at different stages and curricula independently',async()=>{
 await setup();await place(22,202,0,702);
 expect((await context()).objectives.map((g:any)=>g.id)).toEqual([id(301)]);
 expect((await context(22)).objectives.map((g:any)=>g.id)).toEqual([id(302)]);
 await actor(1);await publish(0,502,stages,102);await actor(3);
 await value('select coach_private.workspace_place_learner($1,$2,$3,$4,$5,$6,$7,$8,$9) v',[id(11),id(41),id(21),id(102),1,id(202),0,id(703),'Different subject.']);
 expect((await context()).placement.stage_id).toBe(id(201));
});
it('LRN-02-SC-002 reports missing placement and version remapping without guessing a level',async()=>{
 await setup();const unknown=await context(22);expect(unknown.missing).toContain('stage_placement');expect(unknown.objectives).toEqual([]);
 await actor(1);await publish(1,502);await actor(3);await plan(1,602,2);
 expect((await context()).missing).toContain('stage_placement');
 expect((await context()).evidence).toEqual([]);
});
it('LRN-02-SC-003 keeps dated placement history and does not infer attainment from a stage move',async()=>{
 await setup();await place(21,202,1,702);expect((await context()).placement.revision).toBe(2);
 expect((await context()).evidence).toEqual([]);expect(await value('select count(*)::int v from coach_private.learning_placements')).toBe(2);
 await deny(()=>place(21,201,1,703),'40001');expect(await place()).toMatchObject({revision:1});
 expect((await context()).placement.stage_id).toBe(id(202));
});
it('LRN-03-SC-001 snapshots plans and rejects foreign/unplanned references while keeping prior versions',async()=>{
 await setup();await plan(1,602,1,[301]);await deny(()=>plan(2,603,1,[999]),'22023');
 await deny(()=>plan(1,604),'40001');expect(await plan()).toMatchObject({revision:1});
 expect((await context()).plan.revision).toBe(2);expect(await value('select count(*)::int v from coach_private.learning_class_plans')).toBe(2);
 await deny(()=>db.exec("delete from coach_private.learning_class_plans"));
});
it('LRN-03-SC-002 lets admin-only users plan but never impersonate teaching evidence',async()=>{
 await publish();await plan();await place();expect((await context()).placement.stage_id).toBe(id(201));
 await deny(()=>assess());
});
it('LRN-04-SC-001 binds an assessment to exact recorded child feedback, plan and stage',async()=>{
 await setup();expect(await assess()).toMatchObject({revision:1,state:'practising'});
 const packet=await context();expect(packet.evidence).toHaveLength(1);
 expect(packet.evidence[0]).toMatchObject({objective_id:id(301),feedback_id:id(51),feedback_revision:1,state:'practising'});
 expect(JSON.stringify(packet)).not.toContain('Fictional feedback');expect(await value('select count(*)::int v from public.parent_feedback_handoffs')).toBe(0);
});
it.each([{source:53},{source:54},{source:52},{source:999},{student:22}])('LRN-04-SC-002 denies drafts, group notes, other classes and wrong-child evidence %j',async args=>{
 await setup();await deny(()=>assess(0,801,'achieved',301,args.source??51,1,1,args.student??21));
 expect(await value('select count(*)::int v from coach_private.learning_assessments')).toBe(0);
});
it('LRN-04-SC-003 rejects stale feedback/plan, wrong-stage goals and future observation claims',async()=>{
 await setup();await deny(()=>assess(0,801,'achieved',301,51,99),'40001');await deny(()=>assess(0,801,'achieved',302),'22023');
 await plan(1,602);await deny(()=>assess(),'40001');
 await db.query("update public.class_sessions set starts_at=now()+interval '1 day',ends_at=now()+interval '1 day 1 hour' where id=$1",[id(41)]);
 await deny(()=>assess(0,801,'achieved',301,51,1,2),'22023');
});
it('LRN-04-SC-004 appends corrections without mutating history, and old retry never restores mastery',async()=>{
 await setup();await assess(0,801,'achieved');await assess(1,802,'withdrawn');
 expect(await assess(0,801,'achieved')).toMatchObject({revision:1});expect((await context()).evidence[0].state).toBe('withdrawn');
 expect(await value('select count(*)::int v from coach_private.learning_assessments')).toBe(2);
 await deny(()=>assess(0,803),'40001');await deny(()=>assess(1,801),'22023');await deny(()=>db.exec("update coach_private.learning_assessments set state='achieved'"));
});
it('LRN-04-SC-005 prevents a co-instructor from adopting another teacher evidence or revising it',async()=>{
 await setup();await assess();await actor(4);await deny(()=>assess(1,802));
});
it('LRN-04-SC-005 refuses a manager-authored correction as if the original teacher authored that exact revision',async()=>{
 await setup();await actor(1);
 await value('select coach_private.workspace_correct_feedback($1,$2,$3,$4,$5,$6) v',[id(11),id(51),1,id(1901),'Manager corrected the factual observation.','Factual correction.']);
 await actor(3);await deny(()=>assess(0,801,'achieved',301,51,2));
});
it('LRN-04-SC-002 refuses an actual teacher-authored multi-child recorded source',async()=>{
 await setup();
 await value('select coach_private.workspace_save_class_feedback($1,$2,$3,$4,$5,$6,$7::uuid[],$8,$9) v',[id(11),id(1601),0,id(1701),id(41),'batch',[id(21),id(22)],'Both learners shared materials.','recorded']);
 await deny(()=>assess(0,801,'achieved',301,1601));
});
it('LRN-04-SC-005 cannot withdraw a colleague assessment by supplying a new note of its own',async()=>{
 await setup();await assess(0,801,'achieved');await actor(4);
 await value('select coach_private.workspace_save_class_feedback($1,$2,$3,$4,$5,$6,$7::uuid[],$8,$9) v',[id(11),id(1602),0,id(1702),id(41),'student',[id(21)],'A separate observation by the substitute.','recorded']);
 await deny(()=>assess(1,802,'withdrawn',301,1602));
 expect((await context()).evidence[0].state).toBe('achieved');
 // A new evidenced observation is distinct from retracting someone else's.
 expect(await assess(1,803,'observed',301,1602)).toMatchObject({revision:2,state:'observed'});
});
it('LRN-04-SC-006 supports actual post-class feedback and learning evidence for a completed class',async()=>{
 await setup();await db.query("update public.class_sessions set status='completed' where id=$1",[id(41)]);
 expect(await assess()).toMatchObject({revision:1});expect((await context()).class_status).toBe('completed');
});
it.each([5,6,7,8])('LRN-05-SC-001 denies learner context to finance, unverified, unrelated and banned users %s',async n=>{
 await setup();await actor(n);await deny(()=>context());
});
it('LRN-05-SC-002 denies foreign, unassigned, archived and no-longer-enrolled student contexts',async()=>{
 await setup();await deny(()=>context(23));await deny(()=>context(21,43));await deny(()=>context(23,44));
 await db.query('update public.students set archived_at=now() where id=$1',[id(21)]);await deny(()=>context());
});
it('LRN-05-SC-002 denies an ended enrolment and an archived batch',async()=>{
 await setup();await db.query("update public.enrolments set ends_on='2020-02-01' where student_id=$1",[id(21)]);await deny(()=>context());
 await db.query('update public.enrolments set ends_on=null where student_id=$1',[id(21)]);
 await db.query('update public.batches set archived_at=clock_timestamp() where id=$1',[id(31)]);await deny(()=>context());
});
it('LRN-05-SC-003 caps actual assessment output at10 and labels truncated context',async()=>{
 const goals=Array.from({length:11},(_,i)=>({id:id(310+i),title:`Learning objective ${i+1}`}));
 await publish(0,501,[{...stages[0],objectives:goals}]);await actor(3);await plan(0,601,1,goals.map((_,i)=>310+i));await place();
 for(let i=0;i<11;i++)await assess(0,810+i,'observed',310+i);
 const p=await context();expect(p.evidence).toHaveLength(10);expect(p.evidence_truncated).toBe(true);
});
it('LRN-05-SC-003 excludes future learning, other students, contacts, family and raw teacher notes',async()=>{
 await setup();await assess();await place(22,202,0,702);const packet=await context();
 const text=JSON.stringify(packet);for(const forbidden of [id(22),'Private family','fixture','Fictional feedback','email','phone','owner_id','author_user_id'])expect(text).not.toContain(forbidden);
 expect(packet.schema_version).toBe(1);expect(packet.evidence.length).toBeLessThanOrEqual(10);
 // Reopen a dated class before that assessment occurred. Neither a later
 // placement nor later evidence may be projected back into the earlier date.
 await db.query("update public.class_sessions set starts_at=now()-interval '1 day',ends_at=now()-interval '23 hours' where id=$1",[id(41)]);
 expect((await context()).evidence).toEqual([]);
});
it('LRN-05-SC-004 rechecks assignment revocation before reading and even exact write replay',async()=>{
 await setup();await assess();await db.query('update coach_private.workspace_teaching_assignments set revoked_at=clock_timestamp() where id=$1',[id(81)]);
 await deny(()=>context());await deny(()=>assess());await deny(()=>place());await deny(()=>plan());
});
it('LRN-05-SC-005 has explicit missing-plan context and no guessed or seeded achievements',async()=>{
 const packet=await context();expect(packet.missing).toEqual(['class_plan']);expect(packet.curriculum).toBeNull();expect(packet.evidence).toEqual([]);
});
it('LRN-05-SC-006 keeps all new tables/functions private and app ledger unchanged on reapplication',async()=>{
 const tables=await db.query<{ok:boolean}>(`select relrowsecurity and not has_table_privilege('authenticated',c.oid,'select,insert,update,delete') and not has_table_privilege('anon',c.oid,'select,insert,update,delete') and not has_table_privilege('service_role',c.oid,'select,insert,update,delete') ok from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='coach_private' and c.relkind='r' and c.relname like 'learning_%'`);
 expect(tables.rows).toHaveLength(8);expect(tables.rows.every(r=>r.ok)).toBe(true);
 const funcs=await db.query<{ok:boolean}>(`select prosecdef and proconfig @> array['search_path=""'] and not has_function_privilege('authenticated',p.oid,'execute') and not has_function_privilege('anon',p.oid,'execute') and not has_function_privilege('service_role',p.oid,'execute') ok from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='coach_private' and (p.proname like 'workspace_%learning%' or p.proname in ('workspace_publish_curriculum','workspace_place_learner'))`);
 expect(funcs.rows.length).toBeGreaterThanOrEqual(7);expect(funcs.rows.every(r=>r.ok)).toBe(true);
 expect(await value("select count(*)::int v from coach_private.schema_migrations where version>'202611160014'")).toBe(0);
});
it('LRN-05-SC-006 structurally rejects mismatched placement versions/stages and foreign feedback even for a trusted insert',async()=>{
 await setup();await assess();await actor(1);await publish(1,502);await actor(3);await plan(1,602,2);await place(21,201,1,702,2);
 await assess(0,802,'observed',301,51,1,2);
 const fields=['workspace_id','student_id','curriculum_id','version','objective_id','revision','session_id','plan_revision','placement_revision','stage_id','feedback_id','feedback_revision','state','explanation','observed_at','actor_user_id','actor_membership_id'];
 const row=(await db.query<Record<string,unknown>>('select * from coach_private.learning_assessments where version=2')).rows[0];
 // Create an otherwise valid foreign feedback identity and exact version.
 await db.query(`insert into public.observations(id,academy_id,batch_id,session_id,author_id,note,status,revision) values($1,$2,$3,$4,$5,'Foreign','recorded',1)`,[id(1991),id(12),id(33),id(44),id(2)]);
 await db.query(`insert into coach_private.workspace_feedback_links(observation_id,academy_id,workspace_id,author_user_id,provenance) values($1,$2,$2,$3,'legacy_account')`,[id(1991),id(12),id(2)]);
 await db.query(`insert into public.observation_versions(observation_id,academy_id,revision,note,status,audience,recipient_ids,author_id) values($1,$2,1,'Foreign','recorded','student',$3::uuid[],$4)`,[id(1991),id(12),[id(23)],id(2)]);
 for(const change of [{placement_revision:1},{stage_id:id(202)},{feedback_id:id(1991)}]){
  const changed={...row,...change,revision:2};
  await deny(()=>db.query(`insert into coach_private.learning_assessments(${fields.join(',')}) values(${fields.map((_,i)=>`$${i+1}`).join(',')})`,fields.map(k=>changed[k as keyof typeof changed])),'23503');
 }
});
