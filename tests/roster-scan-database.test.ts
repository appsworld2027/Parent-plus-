import {PGlite} from '@electric-sql/pglite';
import {readFileSync,readdirSync} from 'node:fs';
import {afterAll,afterEach,beforeAll,beforeEach,describe,expect,it} from 'vitest';

const id=(n:number)=>`00000000-0000-0000-0000-${String(n).padStart(12,'0')}`;
const [owner,other,academy,foreignAcademy,existing,foreignStudent,batch,foreignBatch,secondBatch,request]=[1,2,11,12,21,22,31,32,33,71].map(id);
const importSQL='select public.import_roster_scan($1,$2,$3,$4::jsonb) as ids';
const reserveSQL='select public.reserve_roster_scan($1)';
const newStudent=(n=24,name='Fictional Tara')=>({id:id(n),mode:'new',name,age:'9',guardian:'Fictional Guardian',email:'guardian@example.test',phone:'12345',proficiency:'intermediate'});
let db:PGlite;
async function asUser(user=owner){await db.exec(`reset role;set request.jwt.claim.sub='${user}';set role authenticated`);}
async function rejected(sql:string,args:unknown[],code:string){await db.exec('savepoint rejected');try{await expect(db.query(sql,args)).rejects.toMatchObject({code});}finally{await db.exec('rollback to savepoint rejected;release savepoint rejected');}}
async function save(rows:unknown,batchId:string|null=batch,requestId:string=request,scope=academy){return(await db.query<{ids:string[]}>(importSQL,[scope,batchId,requestId,JSON.stringify(rows)])).rows[0].ids;}

describe('reviewed roster imports and server-only scan budgets',()=>{
  beforeAll(async()=>{
    db=new PGlite();
    await db.exec(`create role anon nologin;create role authenticated nologin;create role service_role nologin bypassrls;
      create schema auth;create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema auth,public to authenticated,anon,service_role;
      grant execute on function auth.uid() to authenticated,anon,service_role;
      create schema storage;
      create table storage.buckets(id text primary key,name text not null,public boolean not null default false,file_size_limit bigint,allowed_mime_types text[]);
      create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text not null references storage.buckets(id),name text not null,metadata jsonb,unique(bucket_id,name));
      alter table storage.objects enable row level security;
      grant usage on schema storage to anon,authenticated,service_role;
      grant select on storage.objects to anon;
      grant select,insert,update,delete on storage.objects to authenticated;
      grant all on storage.objects,storage.buckets to service_role;`);
    const files=readdirSync('supabase/migrations').filter(f=>f.endsWith('.sql')&&f<='202611150009_roster_scan.sql').sort();
    for(const file of [...files,'202611150009_roster_scan.sql'])await db.exec(readFileSync(`supabase/migrations/${file}`,'utf8'));
    await db.query('insert into auth.users values($1),($2)',[owner,other]);
  },30_000);
  beforeEach(async()=>{
    await db.exec('begin');
    await db.query('insert into public.academies(id,owner_id,name) values($1,$2,$3),($4,$5,$6)',[academy,owner,'Fictional A',foreignAcademy,other,'Fictional B']);
    await db.query('insert into public.batches(id,academy_id,name) values($1,$2,$3),($4,$5,$6),($7,$2,$8)',[batch,academy,'Class A',foreignBatch,foreignAcademy,'Class B',secondBatch,'Class C']);
    await db.query("insert into public.students(id,academy_id,name,age_years,proficiency_level) values($1,$2,'Fictional Existing',8,'beginner'),($3,$4,'Foreign student',10,'advanced')",[existing,academy,foreignStudent,foreignAcademy]);
    await db.query("insert into public.student_contacts(academy_id,student_id,name,email,is_primary) values($1,$2,'Original Guardian','original@example.test',true)",[academy,existing]);
    await db.query("insert into public.enrolments(academy_id,student_id,batch_id,starts_on) values($1,$2,$3,'2020-01-01')",[academy,existing,batch]);
    await asUser();
  });
  afterEach(async()=>{await db.exec('rollback;reset role');});afterAll(async()=>{await db?.close();});

  it('imports reviewed names, ages, guardian and proficiency atomically with optional batch membership',async()=>{
    expect(await save([newStudent(24,'काल्पनिक तारा'),newStudent(25,'Fictional Ria')])).toEqual([id(24),id(25)]);
    expect((await db.query('select name,age_years,proficiency_level from public.students where id=$1',[id(24)])).rows[0]).toEqual({name:'काल्पनिक तारा',age_years:9,proficiency_level:'intermediate'});
    expect((await db.query('select * from public.student_contacts where student_id=$1',[id(24)])).rows).toHaveLength(1);
    expect((await db.query('select * from public.enrolments where student_id in ($1,$2)',[id(24),id(25)])).rows).toHaveLength(2);
    await save([newStudent(26,'Fictional Unbatched')],null,id(72));
    expect((await db.query('select * from public.enrolments where student_id=$1',[id(26)])).rows).toEqual([]);
  });
  it('exact lost-response retry returns original IDs after roster changes and rejects changed-payload reuse',async()=>{
    const rows=[newStudent()];await save(rows);
    await db.exec('reset role');await db.query('update public.students set archived_at=now() where id=$1',[id(24)]);await asUser();
    await db.query('update public.batches set archived_at=now() where id=$1',[batch]);
    expect(await save(rows)).toEqual([id(24)]);
    await rejected(importSQL,[academy,batch,request,JSON.stringify([{...newStudent(),age:'10'}])],'22023');
    expect((await db.query('select * from public.students where id=$1',[id(24)])).rows).toHaveLength(1);
    await db.exec('reset role');expect((await db.query('select * from coach_private.roster_imports')).rows).toHaveLength(1);
  });
  it('links an existing profile without overwriting any reviewed personal fields or its historical memberships',async()=>{
    const row={id:existing,mode:'existing',name:'Must not overwrite',age:'120',guardian:'Wrong guardian',email:'wrong@example.test',proficiency:'advanced'};
    expect(await save([row],secondBatch)).toEqual([existing]);await save([row],secondBatch);
    expect((await db.query('select name,age_years,proficiency_level from public.students where id=$1',[existing])).rows[0]).toEqual({name:'Fictional Existing',age_years:8,proficiency_level:'beginner'});
    expect((await db.query('select name,email from public.student_contacts where student_id=$1',[existing])).rows).toEqual([{name:'Original Guardian',email:'original@example.test'}]);
    const memberships=(await db.query<{batch_id:string;starts_on:Date}>('select batch_id,starts_on from public.enrolments where student_id=$1',[existing])).rows;
    expect(memberships).toHaveLength(2);expect(memberships.find(m=>m.batch_id===batch)?.starts_on.toISOString().slice(0,10)).toBe('2020-01-01');
  });
  it('rejects normalized duplicate names, including surrounding tabs/newlines, without partially importing earlier rows',async()=>{
    for(const name of ['fictional existing','  Fictional   Existing  ','\tFictional   Existing\n']){
      await rejected(importSQL,[academy,batch,request,JSON.stringify([newStudent(24,'First valid'),newStudent(25,name)])],'22023');
      expect((await db.query('select * from public.students where id in ($1,$2)',[id(24),id(25)])).rows).toEqual([]);
    }
    await rejected(importSQL,[academy,batch,request,JSON.stringify([newStudent(24,'Same Name'),newStudent(25,' same   name ')])],'22023');
  });
  it('rolls back students, guardians, memberships and receipt-of-import audit when any reviewed row is invalid',async()=>{
    for(const invalid of [{...newStudent(25),age:'121'},{...newStudent(25),proficiency:'expert'},{...newStudent(25),email:'not-an-email'},{...newStudent(25),mode:'auto-save'}]){
      await rejected(importSQL,[academy,batch,request,JSON.stringify([newStudent(),invalid])],'22023');
      expect((await db.query('select * from public.students where id=$1',[id(24)])).rows).toEqual([]);
      expect((await db.query('select * from public.student_contacts where student_id=$1',[id(24)])).rows).toEqual([]);
      expect((await db.query('select * from public.enrolments where student_id=$1',[id(24)])).rows).toEqual([]);
    }
    await db.exec('reset role');expect((await db.query('select * from coach_private.roster_imports')).rows).toEqual([]);
  });
  it('rejects empty/oversized payloads, duplicate IDs, null request IDs and ID collisions',async()=>{
    for(const rows of [[],null,{},Array.from({length:51},(_,n)=>newStudent(100+n,`Fictional ${n}`)),[newStudent(),newStudent()],[{...newStudent(),notes:'x'.repeat(100001)}]]){
      await rejected(importSQL,[academy,batch,request,JSON.stringify(rows)],'22023');
    }
    await rejected(importSQL,[academy,batch,null,JSON.stringify([newStudent()])],'22023');
    await rejected(importSQL,[academy,batch,request,JSON.stringify([{...newStudent(),id:existing}])],'22023');
  });
  it('denies foreign/anonymous imports, foreign batch or existing-profile references and private audit access',async()=>{
    const args=[academy,batch,request,JSON.stringify([newStudent()])];
    await asUser(other);await rejected(importSQL,args,'42501');await asUser();
    await rejected(importSQL,[academy,foreignBatch,request,args[3]],'42501');
    await rejected(importSQL,[academy,batch,request,JSON.stringify([{id:foreignStudent,mode:'existing'}])],'42501');
    await rejected('select * from coach_private.roster_imports',[],'42501');
    await rejected('select * from coach_private.roster_scan_usage',[],'42501');
    await rejected(reserveSQL,[academy],'42501');
    await db.exec('reset role;set role anon');await rejected(importSQL,args,'42501');await rejected(reserveSQL,[academy],'42501');
  });
  it('reserves scan quota only for the service role and enforces cooldown and ten daily attempts',async()=>{
    await db.exec('reset role;set role service_role');await db.query(reserveSQL,[academy]);
    await rejected(reserveSQL,[academy],'P0001');
    for(let count=2;count<=10;count++){
      await db.exec("reset role;update coach_private.roster_scan_usage set last_attempt=now()-interval '11 seconds';set role service_role");
      await db.query(reserveSQL,[academy]);
    }
    await db.exec("reset role;update coach_private.roster_scan_usage set last_attempt=now()-interval '11 seconds';set role service_role");
    await rejected(reserveSQL,[academy],'P0001');await db.exec('reset role');
    expect((await db.query<{attempts:number}>('select attempts from coach_private.roster_scan_usage')).rows).toEqual([{attempts:10}]);
  });
  it('keeps quota independent per academy and UTC day and refuses a nonexistent academy',async()=>{
    await db.exec("reset role;insert into coach_private.roster_scan_usage(academy_id,day,attempts,last_attempt) select id,(now() at time zone 'UTC')::date-1,10,now()-interval '1 day' from public.academies;set role service_role");
    await db.query(reserveSQL,[academy]);await db.query(reserveSQL,[foreignAcademy]);await rejected(reserveSQL,[id(999)],'42501');
    await db.exec('reset role');expect((await db.query('select * from coach_private.roster_scan_usage')).rows).toHaveLength(4);
  });
});
