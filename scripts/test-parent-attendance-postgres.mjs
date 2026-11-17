// Real PG17 role/API/migration test. Fictional data; refuses hosted databases.
import {execFileSync} from 'node:child_process';
import {readFileSync,readdirSync} from 'node:fs';
import assert from 'node:assert/strict';
const container=process.env.PARENT_READ_TEST_CONTAINER;
let executable='psql',args=['-X','-qAt','-v','ON_ERROR_STOP=1','-d','parentplus_parent_read_test'],environment={...process.env};
if(container){
 assert.match(container,/^parentplus-parent-test-[a-z0-9-]+$/);
 assert.equal(execFileSync('docker',['inspect','--format','{{index .Config.Labels "parentplus.disposable-parent-test"}}',container],{encoding:'utf8'}).trim(),'true');
 executable='docker';args=['exec','-i',container,'psql',...args,'-U','postgres'];
}else{
 const url=new URL(process.env.PARENT_READ_TEST_DATABASE_URL??'');
 assert.ok(['postgres:','postgresql:'].includes(url.protocol));
 assert.ok(['127.0.0.1','localhost','[::1]'].includes(url.hostname));
 assert.equal(url.pathname,'/parentplus_parent_read_test');assert.equal(url.search,'');assert.equal(url.hash,'');
 environment={...environment,PGHOST:url.hostname,PGPORT:url.port||'5432',PGUSER:decodeURIComponent(url.username),PGPASSWORD:decodeURIComponent(url.password)};
}
const sql=input=>execFileSync(executable,args,{input,env:environment,encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim();
assert.equal(sql("select to_regclass('public.academies') is null;"),'t','Refusing existing application DB');
sql(readFileSync('tests/fixtures/supabase-base.sql','utf8'));
for(const file of readdirSync('supabase/migrations').filter(f=>f.endsWith('.sql')&&f<='202611160014_verified_parent_connections.sql').sort())sql(readFileSync(`supabase/migrations/${file}`,'utf8'));
sql('create function public.rls_auto_enable() returns event_trigger language plpgsql security definer as $$ begin return; end $$;');
const migration=readFileSync('supabase/migrations/20261117090944_parent_attendance_read.sql','utf8');
sql(migration);sql(migration);
assert.equal(sql("select has_function_privilege('anon','public.rls_auto_enable()','execute') or has_function_privilege('authenticated','public.rls_auto_enable()','execute');"),'f');
assert.equal(sql("select to_regclass('coach_private.workspaces') is null;"),'t');
sql(readFileSync('tests/fixtures/parent-attendance-acceptance.sql','utf8'));
assert.equal(sql('select count(*) from public.parent_families;'),'0','Fixture rollback must remove families');
console.log('PASS real PostgreSQL: migration replay, approved own-child/null attendance, wrong account, banned account, platform/private/API privileges, legacy isolation, rollback cleanup. No provider/device acceptance implied.');
