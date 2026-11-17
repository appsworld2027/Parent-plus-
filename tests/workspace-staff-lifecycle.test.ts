import type {PGlite} from '@electric-sql/pglite';
import {createHash} from 'node:crypto';
import {existsSync,readFileSync} from 'node:fs';
import {afterAll,afterEach,beforeAll,beforeEach,expect,it} from 'vitest';
import {supabaseDatabase} from './support/supabaseDatabase';
const id=(n:number)=>`00000000-0000-0000-0000-${String(n).padStart(12,'0')}`;
const path='supabase/candidates/202611170018_workspace_staff.sql';
const token=(n=1)=>String(n).padStart(64,'a');
const digest=(value:string)=>createHash('sha256').update(value).digest('hex');
let db:PGlite;let expiry:string;
async function actor(n:number){await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id(n)]);}
async function issue(n=1,email='new@example.test',roles:unknown=[{role:'instructor',branch:id(61)}],ownership=false){
 return(await db.query<{value:string}>('select coach_private.workspace_issue_staff_offer($1,$2,$3,$4,$5,$6::jsonb,$7) as value',[id(11),id(800+n),email,digest(token(n)),expiry,JSON.stringify(roles),ownership])).rows[0].value;
}
async function accept(n=1,name='Shared staff name',coach:string|null='Coach name'){
 return(await db.query<{value:string}>('select coach_private.workspace_accept_staff_offer($1,$2,$3) as value',[token(n),name,coach])).rows[0].value;
}
async function fail(run:()=>Promise<unknown>,code='42501'){
 await db.exec('savepoint denied');try{await expect(run()).rejects.toMatchObject({code});}finally{await db.exec('rollback to savepoint denied;release savepoint denied');}
}
async function joined(n=1){await actor(1);await issue(n);await actor(101);return accept(n);}
async function assignment(member:string,n=1,session=0){
 return(await db.query<{value:string}>(`with bounds as materialized(select clock_timestamp() t) select coach_private.workspace_assign_teacher($1,$2,$3,$4,$5,'lead',t+interval '1 hour',t+interval '2 hours',t,t+interval '3 hours',t+interval '3 hours') as value from bounds`,[id(11),id(900+n),member,session?null:id(31),session?id(session):null])).rows[0].value;
}
beforeAll(async()=>{
 db=await supabaseDatabase();await db.exec(readFileSync('tests/fixtures/workspace-authorization.sql','utf8'));
 for(const file of ['202611170015_workspace_foundation.sql','202611170016_workspace_authorization.sql'])await db.exec(readFileSync(`supabase/candidates/${file}`,'utf8'));
 await db.exec(readFileSync('tests/fixtures/workspace-authority.sql','utf8'));await db.exec(readFileSync('supabase/candidates/202611170017_workspace_roster.sql','utf8'));
 await db.query("insert into auth.users(id,email,email_confirmed_at) values($1,'new@example.test',now()),($2,'second@example.test',now()),($3,'third@example.test',now())",[id(101),id(102),id(103)]);
 expiry=(await db.query<{value:string}>("select (clock_timestamp()+interval '2 days')::text as value")).rows[0].value;
 if(existsSync(path)){await db.exec(readFileSync(path,'utf8'));await db.exec(readFileSync(path,'utf8'));}
},30000);
beforeEach(async()=>{await db.exec('begin;reset role');await actor(1);});afterEach(async()=>{await db.exec('rollback;reset role');});afterAll(async()=>{await db?.close();});

it('binds a neutral owner-issued offer to one verified recipient, with no access before acceptance',async()=>{
 expect(await issue()).toBe(id(801));
 expect((await db.query('select * from coach_private.workspace_memberships where user_id=$1',[id(101)])).rows).toHaveLength(0);
 await actor(101);const preview=(await db.query<{value:Record<string,unknown>}>('select coach_private.workspace_preview_staff_offer($1) as value',[token()])).rows[0].value;
 expect(preview).toMatchObject({workspace_name:'Academy A',kind:'staff',roles:[{role:'instructor',branch:id(61)}]});
 const member=await accept();expect(member).toMatch(/^[0-9a-f-]{36}$/);
 expect((await db.query('select user_id,status from coach_private.workspace_memberships where id=$1',[member])).rows).toEqual([{user_id:id(101),status:'active'}]);
 expect((await db.query('select display_name from coach_private.workspace_staff_profiles where membership_id=$1',[member])).rows).toEqual([{display_name:'Shared staff name'}]);
 expect((await db.query('select * from coach_private.workspace_teaching_assignments where membership_id=$1',[member])).rows).toHaveLength(0);
});
it('stores only token digests and returns the same offer for exact issue retries',async()=>{
 await issue();await issue();expect((await db.query('select * from coach_private.workspace_invites')).rows).toHaveLength(1);
 const stored=(await db.query<{token_hash:string}>('select token_hash from coach_private.workspace_invites')).rows[0];expect(stored.token_hash).toBe(digest(token()));expect(stored.token_hash).not.toBe(token());
 await fail(()=>issue(1,'changed@example.test'),'22023');
});
it.each([2,3,4,5,6,7])('cannot issue staff offers using unrelated, instructor, finance or unverified authority %s',async n=>{await actor(n);await fail(()=>issue());});
it('rejects wrong recipients, missing/changed verification, disabled recipients and unknown tokens uniformly',async()=>{
 await issue();await actor(102);await fail(()=>accept());await fail(()=>db.query('select coach_private.workspace_preview_staff_offer($1)',[token()]));
 await actor(101);await db.query('update auth.users set email_confirmed_at=null where id=$1',[id(101)]);await fail(()=>accept());
 await db.query("update auth.users set email_confirmed_at=now(),banned_until=now()+interval '1 hour' where id=$1",[id(101)]);await fail(()=>accept());
 await db.query("update auth.users set banned_until=null,email='changed@example.test' where id=$1",[id(101)]);await fail(()=>accept());
 await fail(()=>db.query('select coach_private.workspace_accept_staff_offer($1,\'Name\',null)',[token(8)]));
});
it('rechecks issuer ownership and eligibility before acceptance',async()=>{
 await issue();await db.query('update coach_private.workspace_role_grants set revoked_at=clock_timestamp() where membership_id in (select id from coach_private.workspace_memberships where user_id=$1) and role_code=\'owner\'',[id(1)]);
 await actor(101);await fail(()=>accept());
 await db.exec('update coach_private.workspace_role_grants set revoked_at=null');await db.query("update auth.users set banned_until=now()+interval '1 day' where id=$1",[id(1)]);await fail(()=>accept());
});
it('makes accept retries harmless after later role removal without restoring grants',async()=>{
 const member=await joined();expect(await accept()).toBe(member);
 await db.query('update coach_private.workspace_role_grants set revoked_at=clock_timestamp() where membership_id=$1',[member]);expect(await accept()).toBe(member);
 expect((await db.query('select * from coach_private.workspace_role_grants where membership_id=$1 and revoked_at is null',[member])).rows).toHaveLength(0);
 expect((await db.query("select * from coach_private.workspace_staff_events where kind='accepted'")).rows).toHaveLength(1);
});
it('revokes pending invitations without granting membership and blocks expired offers',async()=>{
 await issue();await db.query('select coach_private.workspace_revoke_staff_offer($1,$2)',[id(11),id(801)]);await db.query('select coach_private.workspace_revoke_staff_offer($1,$2)',[id(11),id(801)]);
 await actor(101);await fail(()=>accept());await actor(1);await issue(2);
 await db.exec("update coach_private.workspace_invites set created_at=now()-interval '3 days',expires_at=now()-interval '1 day' where state='pending'");
 await actor(101);await fail(()=>accept(2));
});
it('does not let old acceptance or pre-offboarding offers revive a removed membership',async()=>{
 const member=await joined();await actor(1);await issue(2);await db.query('select coach_private.workspace_revoke_membership($1,$2)',[id(11),member]);
 await actor(101);await fail(()=>accept());await fail(()=>accept(2));
 await actor(1);await issue(3);await actor(101);const rehire=await accept(3);expect(rehire).not.toBe(member);
 expect((await db.query('select * from coach_private.workspace_teaching_assignments where membership_id=$1',[rehire])).rows).toHaveLength(0);
});
it('never bypasses a suspended membership or silently upgrades another active membership',async()=>{
 await issue(1,'fixture7@example.test',[{role:'finance',branch:null}]);await actor(7);await fail(()=>accept(),'22023');
 await actor(1);await db.query("update coach_private.workspace_memberships set status='suspended' where id=$1",[id(77)]);await issue(2,'fixture7@example.test',[{role:'finance',branch:null}]);
 await actor(7);await fail(()=>accept(2));
});
it('caps new membership and grants at the issuer authority ceiling',async()=>{
 await db.query("update coach_private.workspace_memberships set valid_until=now()+interval '1 day' where user_id=$1 and workspace_id=$2",[id(1),id(11)]);
 await issue();const until=(await db.query<{valid_until:string}>('select valid_until from coach_private.workspace_memberships where user_id=$1 and workspace_id=$2',[id(1),id(11)])).rows[0].valid_until;
 await actor(101);const member=await accept();
 expect((await db.query<{valid_until:string}>('select valid_until from coach_private.workspace_memberships where id=$1',[member])).rows[0].valid_until).toEqual(until);
 expect((await db.query<{valid_until:string}>('select valid_until from coach_private.workspace_role_grants where membership_id=$1',[member])).rows[0].valid_until).toEqual(until);
});
it.each([{roles:[{role:'owner'}]},{roles:[{role:'branch_manager'}]},{roles:[{role:'admin',branch:id(61)}]},{roles:[{role:'instructor',branch:id(63)}]},{roles:[{role:'superadmin'}]}])('rejects malformed or escalated staff proposals %j',async({roles})=>{await fail(()=>issue(1,'new@example.test',roles),'22023');});
it('creates admin-only membership without inventing a Coach identity',async()=>{
 await issue(1,'new@example.test',[{role:'admin',branch:null}]);await actor(101);await accept(1,'Academy administrator',null);
 expect((await db.query('select * from coach_private.coach_identities where user_id=$1',[id(101)])).rows).toHaveLength(0);
});
it('requires explicit teaching profile acceptance for a new instructor',async()=>{
 await issue();await actor(101);await fail(()=>accept(1,'Name',null),'22023');
 const member=await accept();expect((await db.query('select user_id from coach_private.coach_identities where user_id=$1',[id(101)])).rows).toHaveLength(1);
 expect((await db.query('select * from coach_private.workspace_teaching_assignments where membership_id=$1',[member])).rows).toHaveLength(0);
});
it('transfers ownership only after a different verified recipient accepts, and preserves a current owner',async()=>{
 await issue(1,'new@example.test',[{role:'owner',branch:null}],true);
 expect((await db.query('select count(*)::int as n from coach_private.workspace_role_grants where role_code=\'owner\' and workspace_id=$1 and revoked_at is null',[id(11)])).rows[0]).toEqual({n:2});
 await actor(101);const member=await accept(1,'New owner',null);expect(await accept(1,'New owner',null)).toBe(member);
 const rows=(await db.query('select m.user_id from coach_private.workspace_role_grants g join coach_private.workspace_memberships m on m.id=g.membership_id where g.role_code=\'owner\' and g.workspace_id=$1 and g.revoked_at is null order by m.user_id',[id(11)])).rows;
 expect(rows).toEqual([{user_id:id(8)},{user_id:id(101)}]);
 await actor(1);await fail(()=>issue(2));
 expect((await db.query('select * from public.academies where id=$1 and owner_id=$2',[id(11),id(1)])).rows).toHaveLength(1); // legacy activation gate unchanged
});
it('rejects self-transfer and bounded owner transfers',async()=>{
 await issue(1,'fixture1@example.test',[{role:'owner',branch:null}],true);await fail(()=>accept(1,'Self',null));
 await db.query("update coach_private.workspace_memberships set valid_until=now()+interval '1 day' where user_id=$1 and workspace_id=$2",[id(1),id(11)]);
 await fail(()=>issue(2,'new@example.test',[{role:'owner',branch:null}],true),'22023');
});
it('replaces only an earlier pending ownership offer and never revives it by retry',async()=>{
 await issue(1,'new@example.test',[{role:'owner',branch:null}],true);await issue(2,'second@example.test',[{role:'owner',branch:null}],true);
 await actor(101);await fail(()=>accept(1,'Owner',null));await actor(102);await accept(2,'Owner',null);
});
it('does not revive a pending invitation when its issuer regains ownership later',async()=>{
 await issue(1,'third@example.test');
 await issue(2,'new@example.test',[{role:'owner',branch:null}],true);
 await actor(101);await accept(2,'Successor',null);
 await issue(3,'fixture1@example.test',[{role:'owner',branch:null}],true);
 await actor(1);await accept(3,'Returning owner',null);
 await fail(()=>issue(1,'third@example.test'));
 await actor(103);await fail(()=>accept(1));
 await fail(()=>db.query('select coach_private.workspace_preview_staff_offer($1)',[token(1)]));
});
it('does not hand permanent ownership to an existing temporary owner grant',async()=>{
 await db.query("update coach_private.workspace_role_grants set valid_until=clock_timestamp()+interval '1 day' where membership_id=$1 and role_code='owner'",[id(78)]);
 await issue(1,'fixture8@example.test',[{role:'owner',branch:null}],true);
 await actor(8);await fail(()=>accept(1,'Temporary owner',null),'22023');
 await actor(1);expect((await db.query<{ok:boolean}>('select coach_private.workspace_has_role($1,\'owner\',null) as ok',[id(11)])).rows[0].ok).toBe(true);
});
it('creates explicit bounded assignments only for the accepted instructor and correct branch',async()=>{
 const member=await joined();await actor(1);expect(await assignment(member)).toBe(id(901));
 await fail(()=>db.query("select coach_private.workspace_assign_teacher($1,$2,$3,$4,null,'lead',now()+interval '1 hour',now()+interval '2 hours',now(),now()+interval '3 hours',now()+interval '3 hours')",[id(11),id(902),member,id(32)]));
 await actor(101);await fail(()=>assignment(member,3));
});
it('does not grant retrospective classes or arbitrary history through a new assignment',async()=>{
 const member=await joined();await actor(1);await fail(()=>assignment(member,1,42),'22023');
 expect((await db.query('select * from coach_private.workspace_history_grants where membership_id=$1',[member])).rows).toHaveLength(0);
});
it('does not treat a bounded membership as an instructor grant after teaching authority is removed',async()=>{
 const member=await joined();
 await db.query('update coach_private.workspace_role_grants set revoked_at=clock_timestamp() where membership_id=$1 and role_code=\'instructor\'',[member]);
 await db.query("update coach_private.workspace_memberships set valid_until=clock_timestamp()+interval '1 day' where id=$1",[member]);
 await actor(1);await fail(()=>assignment(member));
});
it('does not let temporary owners delegate assignment access beyond their own authority',async()=>{
 const member=await joined();await actor(1);
 await db.query("update coach_private.workspace_memberships set valid_until=clock_timestamp()+interval '30 minutes' where user_id=$1 and workspace_id=$2",[id(1),id(11)]);
 await fail(()=>assignment(member),'22023');
});
it('accepts ownership for an existing indefinite staff member without rewriting their teaching identity',async()=>{
 const member=await joined();await actor(1);await issue(2,'new@example.test',[{role:'owner',branch:null}],true);
 await actor(101);expect(await accept(2,'Existing staff',null)).toBe(member);
 expect((await db.query('select display_name from coach_private.coach_identities where user_id=$1',[id(101)])).rows).toEqual([{display_name:'Coach name'}]);
 const result=await db.query<{value:{revision:number}}>('select coach_private.workspace_save_batch($1,$2,0,$3,\'Owned batch\',\'\',null) as value',[id(11),id(1201),id(1202)]);
 expect(result.rows[0].value.revision).toBe(1);
});
it('returns workspace-local staff profiles without other employment, auth IDs or family data',async()=>{
 const member=await joined();await actor(1);
 const rows=(await db.query<Record<string,unknown>>('select * from coach_private.workspace_staff_directory($1)',[id(11)])).rows;
 expect(rows.find(r=>r.membership_id===member)).toMatchObject({display_name:'Shared staff name',status:'active'});
 expect(rows.every(r=>Object.keys(r).sort().join(',')==='display_name,membership_id,roles,status')).toBe(true);
 await actor(101);await fail(()=>db.query('select * from coach_private.workspace_staff_directory($1)',[id(11)]));
});
it('keeps every offer/profile/event function and table private, with no production ledger change',async()=>{
 const names=[...readFileSync(path,'utf8').matchAll(/create or replace function coach_private\.([a-z_]+)/g)].map(m=>m[1]);
 const rows=(await db.query<{ok:boolean}>(`select p.prosecdef and p.proconfig @> array['search_path=""'] and not has_function_privilege('anon',p.oid,'execute') and not has_function_privilege('authenticated',p.oid,'execute') and not has_function_privilege('service_role',p.oid,'execute') as ok from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='coach_private' and p.proname=any($1::text[])`,[names])).rows;
 expect(rows).toHaveLength(names.length);expect(rows.every(r=>r.ok)).toBe(true);
 expect((await db.query("select * from coach_private.schema_migrations where version>'202611160014'")).rows).toHaveLength(0);
});
