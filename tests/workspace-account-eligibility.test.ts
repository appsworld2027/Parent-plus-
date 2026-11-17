import type {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import {beforeAll,afterAll,beforeEach,afterEach,expect,it} from 'vitest';
import {supabaseDatabase} from './support/supabaseDatabase';
let db:PGlite;
const actor='00000000-0000-0000-0000-000000000001';
const file='supabase/candidates/workspace_account_eligibility.sql';
beforeAll(async()=>{
 db=await supabaseDatabase();
 await db.exec(readFileSync(file,'utf8'));
 await db.exec(readFileSync(file,'utf8'));
},30000);
beforeEach(async()=>{
 await db.exec('begin');
 await db.query("insert into auth.users(id,email,email_confirmed_at) values($1,'actor@example.test',now())",[actor]);
 await db.query("select set_config('request.jwt.claim.sub',$1,true)",[actor]);
});
afterEach(async()=>{await db.exec('rollback');});
afterAll(async()=>{await db?.close();});
async function eligible(){return (await db.query<{ok:boolean}>('select coach_private.workspace_actor_eligible() as ok')).rows[0].ok;}
it('accepts a verified existing account',async()=>{expect(await eligible()).toBe(true);});
it('rejects unverified accounts',async()=>{await db.query('update auth.users set email_confirmed_at=null where id=$1',[actor]);expect(await eligible()).toBe(false);});
it('rejects an account with a current ban',async()=>{await db.query("update auth.users set banned_until=now()+interval '1 day' where id=$1",[actor]);expect(await eligible()).toBe(false);});
it('allows an expired ban',async()=>{await db.query("update auth.users set banned_until=now()-interval '1 day' where id=$1",[actor]);expect(await eligible()).toBe(true);});
it('rejects a soft-deleted account even with a verified email',async()=>{await db.query('update auth.users set deleted_at=now() where id=$1',[actor]);expect(await eligible()).toBe(false);});
it('rejects a removed account with a stale identity claim',async()=>{await db.query('delete from auth.users where id=$1',[actor]);expect(await eligible()).toBe(false);});
it('rejects a missing identity claim',async()=>{await db.exec("set local request.jwt.claim.sub='' ");expect(await eligible()).toBe(false);});
it.each(['anon','authenticated','service_role'])('does not expose the candidate helper to %s',async(role)=>{
 await db.exec(`set local role ${role}`);
 await expect(db.query('select coach_private.workspace_actor_eligible()')).rejects.toMatchObject({code:'42501'});
});
