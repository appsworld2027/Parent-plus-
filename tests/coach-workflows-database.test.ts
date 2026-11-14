import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

const id = (n: number) => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
const [owner, other, academy, foreignAcademy, a, b, foreignChild, batch, foreignBatch, enrolment, note, request] = [1,2,11,12,21,22,23,31,32,41,51,71].map(id);
const bucket = 'parentplus-coach-photos';
const addSQL = 'select public.add_batch_students($1,$2,$3::uuid[]) as added';
const profileSQL = 'select public.save_student_profile($1,$2,$3,$4::integer,$5,$6,$7,$8::uuid[],$9) as id';
const profileArgs = [academy,a,'Fictional A',8,'Fictional Guardian','guardian@example.test','12345',[batch],'beginner'];
const collectSQL = 'select public.collect_student_fee($1,$2,$3::date,$4::uuid,$5::bigint,$6,$7::bigint,$8::date,$9,$10) as id';
const collectArgs = [academy,enrolment,'2026-11-01',null,250000,request,100000,'2026-01-01','cash','Fictional receipt'];
const attachSQL = 'select public.attach_coach_photo($1,$2,$3,$4,$5) as path';
const photoPath = (entity = a, kind = 'student', version = 81, scope = academy) => `${scope}/${kind}/${entity}/${id(version)}.jpg`;
let db: PGlite;
async function asUser(user = owner) { await db.exec(`reset role; set request.jwt.claim.sub='${user}'; set role authenticated`); }
async function rejected(sql: string, args: unknown[], code: string) {
  await db.exec('savepoint expected_error');
  try { await expect(db.query(sql,args)).rejects.toMatchObject({code}); }
  finally { await db.exec('rollback to savepoint expected_error; release savepoint expected_error'); }
}
async function upload(path: string, metadata: object = {size:1024,mimetype:'image/jpeg'}) {
  await db.query('insert into storage.objects(bucket_id,name,metadata) values($1,$2,$3::jsonb)',[bucket,path,JSON.stringify(metadata)]);
}
async function attach(path: string | null, expected: string | null = null, entity = a, kind = 'student') {
  return (await db.query<{path:string|null}>(attachSQL,[academy,kind,entity,path,expected])).rows[0].path;
}

describe('batch membership, student-first collection and private photos', () => {
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
      create schema auth; create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema auth,public to authenticated,anon,service_role;
      grant execute on function auth.uid() to authenticated,anon,service_role;
      create schema storage;
      create table storage.buckets(id text primary key,name text not null,public boolean not null default false,file_size_limit bigint,allowed_mime_types text[]);
      create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text not null references storage.buckets(id),name text not null,metadata jsonb,unique(bucket_id,name));
      alter table storage.objects enable row level security;
      grant usage on schema storage to anon,authenticated,service_role;
      grant select on storage.objects to anon;
      grant select,insert,update,delete on storage.objects to authenticated;
      grant all on storage.objects,storage.buckets to service_role;
      insert into storage.buckets(id,name,public) values('parentplus-coach-photos','parentplus-coach-photos',true),('unrelated','unrelated',false);`);
    const files = readdirSync('supabase/migrations').filter(file=>file.endsWith('.sql')&&file<='202611150008_private_photos.sql').sort();
    for (const file of [...files,...files.filter(file=>/000[78]_/.test(file))]) await db.exec(readFileSync(`supabase/migrations/${file}`,'utf8'));
    await db.query('insert into auth.users values($1),($2)',[owner,other]);
  },30_000);
  beforeEach(async () => {
    await db.exec('begin');
    await db.query('insert into public.academies(id,owner_id,name) values($1,$2,$3),($4,$5,$6)',[academy,owner,'Fictional Academy',foreignAcademy,other,'Other Academy']);
    await db.query('insert into public.students(id,academy_id,name) values($1,$2,$3),($4,$2,$5),($6,$7,$8)',[a,academy,'Fictional A',b,'Fictional B',foreignChild,foreignAcademy,'Other child']);
    await db.query('insert into public.batches(id,academy_id,name,monthly_fee_paise) values($1,$2,$3,250000),($4,$5,$6,100000)',[batch,academy,'Fictional Batch',foreignBatch,foreignAcademy,'Other Batch']);
    await db.query("insert into public.enrolments(id,academy_id,student_id,batch_id,starts_on) values($1,$2,$3,$4,'2020-01-01')",[enrolment,academy,a,batch]);
    await db.query("insert into public.observations(id,academy_id,author_id,batch_id,note) values($1,$2,$3,$4,'Fictional draft')",[note,academy,owner,batch]);
    await asUser();
  });
  afterEach(async () => { await db.exec('rollback; reset role'); });
  afterAll(async () => { await db?.close(); });

  it('round-trips age and all supported proficiency levels on new and existing profiles', async () => {
    const target=id(24);
    for (const level of ['unassessed','new','beginner','intermediate','advanced']) {
      const args=[academy,target,'Fictional Profile',8,'Guardian','guardian@example.test','12345',[batch],level];
      expect((await db.query<{id:string}>(profileSQL,args)).rows[0].id).toBe(target);
      expect((await db.query('select name,age_years,proficiency_level from public.students where id=$1',[target])).rows[0])
        .toEqual({name:'Fictional Profile',age_years:8,proficiency_level:level});
    }
    for (const age of [0,120,null]) {
      await db.query(profileSQL,[academy,target,'Fictional Profile',age,'Guardian','guardian@example.test','12345',[batch],'advanced']);
      expect((await db.query<{age_years:number|null}>('select age_years from public.students where id=$1',[target])).rows[0].age_years).toBe(age);
    }
    expect((await db.query('select * from public.enrolments where student_id=$1',[target])).rows).toHaveLength(1);
    expect((await db.query('select * from public.student_contacts where student_id=$1',[target])).rows).toHaveLength(1);
  });
  it('rejects invalid proficiency or age atomically without changing profile, guardian or memberships', async () => {
    await db.query(profileSQL,profileArgs);
    const changed=[academy,a,'Must not persist',9,'Changed guardian','changed@example.test','999',[],'advanced'];
    for (const level of [null,'','expert','Beginner']) await rejected(profileSQL,[...changed.slice(0,8),level],'22023');
    for (const age of [-1,121]) await rejected(profileSQL,[...changed.slice(0,3),age,...changed.slice(4)],'22023');
    expect((await db.query('select name,age_years,proficiency_level from public.students where id=$1',[a])).rows[0])
      .toEqual({name:'Fictional A',age_years:8,proficiency_level:'beginner'});
    expect((await db.query('select name,email,phone from public.student_contacts where student_id=$1',[a])).rows)
      .toEqual([{name:'Fictional Guardian',email:'guardian@example.test',phone:'12345'}]);
    expect((await db.query('select * from public.enrolments where student_id=$1',[a])).rows).toHaveLength(1);
    await rejected(profileSQL,[academy,id(24),'Invalid new profile',8,'Guardian','','',[batch],'expert'],'22023');
    expect((await db.query('select * from public.students where id=$1',[id(24)])).rows).toEqual([]);
  });
  it('preserves original membership dates and secondary guardians while adding batches from a retried profile save', async () => {
    await db.query(profileSQL,profileArgs);
    await db.exec('reset role');
    await db.query('insert into public.batches(id,academy_id,name) values($1,$2,$3)',[id(33),academy,'Additional batch']);
    await db.query('insert into public.student_contacts(academy_id,student_id,name,is_primary) values($1,$2,$3,false)',[academy,a,'Secondary guardian']);
    await asUser();
    const updated=[academy,a,'Fictional A',9,'Fictional Guardian','guardian@example.test','12345',[id(33)],'intermediate'];
    await db.query(profileSQL,updated);await db.query(profileSQL,updated);
    expect((await db.query('select * from public.enrolments where student_id=$1',[a])).rows).toHaveLength(2);
    expect((await db.query<{starts_on:Date}>('select starts_on from public.enrolments where id=$1',[enrolment])).rows[0].starts_on.toISOString().slice(0,10)).toBe('2020-01-01');
    expect((await db.query('select name,is_primary from public.student_contacts where student_id=$1 order by name',[a])).rows)
      .toEqual([{name:'Fictional Guardian',is_primary:true},{name:'Secondary guardian',is_primary:false}]);
    expect((await db.query('select age_years,proficiency_level from public.students where id=$1',[a])).rows[0])
      .toEqual({age_years:9,proficiency_level:'intermediate'});
  });
  it('denies foreign/anonymous profile writes and direct proficiency edits', async () => {
    await asUser(other);await rejected(profileSQL,profileArgs,'42501');await asUser();
    await rejected(profileSQL,[academy,foreignChild,...profileArgs.slice(2)],'42501');
    await rejected(profileSQL,[...profileArgs.slice(0,7),[foreignBatch],'advanced'],'42501');
    await rejected('update public.students set proficiency_level=$1 where id=$2',['advanced',a],'42501');
    expect((await db.query('select age_years,proficiency_level from public.students where id=$1',[a])).rows[0])
      .toEqual({age_years:null,proficiency_level:'unassessed'});
    await db.exec('reset role; set role anon');await rejected(profileSQL,profileArgs,'42501');
  });
  it('replays update007 without resetting a saved proficiency, guardian or historical membership', async () => {
    await db.query(profileSQL,[...profileArgs.slice(0,8),'advanced']);await db.exec('reset role');
    // Keep the test fixture transaction open while exercising the canonical DDL.
    const upgrade=readFileSync('supabase/migrations/202611150007_coach_workflows.sql','utf8').replace(/^begin;\s*/,'').replace(/commit;\s*$/,'');
    await db.exec(upgrade);await asUser();
    expect((await db.query('select age_years,proficiency_level from public.students where id=$1',[a])).rows[0])
      .toEqual({age_years:8,proficiency_level:'advanced'});
    expect((await db.query('select * from public.student_contacts where student_id=$1',[a])).rows).toHaveLength(1);
    expect((await db.query('select * from public.enrolments where student_id=$1',[a])).rows).toHaveLength(1);
  });
  it('adds existing students atomically and retries without overwriting original membership dates', async () => {
    expect((await db.query<{added:number}>(addSQL,[academy,batch,[a,b,b]])).rows[0].added).toBe(1);
    expect((await db.query<{added:number}>(addSQL,[academy,batch,[a,b]])).rows[0].added).toBe(0);
    expect((await db.query<{starts_on:Date}>('select starts_on from public.enrolments where id=$1',[enrolment])).rows[0].starts_on.toISOString().slice(0,10)).toBe('2020-01-01');
    expect((await db.query('select * from public.enrolments')).rows).toHaveLength(2);
  });
  it('rejects foreign/archived students and rolls back every new membership if any selection is invalid', async () => {
    await rejected(addSQL,[academy,batch,[b,foreignChild]],'22023');
    expect((await db.query('select * from public.enrolments where student_id=$1',[b])).rows).toEqual([]);
    await db.exec('reset role');await db.query('update public.students set archived_at=now() where id=$1',[b]);await asUser();
    await rejected(addSQL,[academy,batch,[b]],'22023');
    for (const selected of [[],null,[null]]) await rejected(addSQL,[academy,batch,selected],'22023');
  });
  it('does not reactivate or rewrite a previously ended membership', async () => {
    await db.exec('reset role');await db.query("update public.enrolments set ends_on='2021-01-01' where id=$1",[enrolment]);await asUser();
    await rejected(addSQL,[academy,batch,[b,a]],'22023');
    expect((await db.query('select * from public.enrolments where student_id=$1',[b])).rows).toEqual([]);
    expect((await db.query<{ends_on:Date}>('select ends_on from public.enrolments where id=$1',[enrolment])).rows[0].ends_on.toISOString().slice(0,10)).toBe('2021-01-01');
  });
  it('creates the monthly charge and receipt in one transaction; exact retry survives later roster changes', async () => {
    expect((await db.query<{id:string}>(collectSQL,collectArgs)).rows[0].id).toBe(request);
    await db.exec('reset role');await db.query('update public.students set archived_at=now() where id=$1',[a]);await asUser();
    await db.query('update public.batches set monthly_fee_paise=300000 where id=$1',[batch]);
    expect((await db.query<{id:string}>(collectSQL,collectArgs)).rows[0].id).toBe(request);
    expect((await db.query('select * from public.fee_invoices')).rows).toHaveLength(1);
    expect((await db.query('select * from public.fee_payments')).rows).toHaveLength(1);
    const row=(await db.query<{amount_paise:number;balance_paise:number;due_on:Date}>('select * from public.fee_invoice_balances')).rows[0];
    expect(Number(row.amount_paise)).toBe(250000);expect(Number(row.balance_paise)).toBe(150000);expect(row.due_on.toISOString().slice(0,10)).toBe('2026-11-30');
    await rejected(collectSQL,[...collectArgs.slice(0,6),100001,...collectArgs.slice(7)],'22023');
  });
  it('rolls back auto-created charges when the receipt is invalid, oversized or based on a changed fee', async () => {
    await rejected(collectSQL,[...collectArgs.slice(0,6),250001,...collectArgs.slice(7)],'40001');
    await rejected(collectSQL,[...collectArgs.slice(0,6),0,...collectArgs.slice(7)],'22023');
    await rejected(collectSQL,[...collectArgs.slice(0,8),'gateway',''],'22023');
    await rejected(collectSQL,[...collectArgs.slice(0,4),249999,...collectArgs.slice(5)],'40001');
    expect((await db.query('select * from public.fee_invoices')).rows).toEqual([]);
    expect((await db.query('select * from public.fee_payments')).rows).toEqual([]);
  });
  it('rejects stale concurrent-state expectations and permits the reviewed remainder against an existing charge', async () => {
    await db.query(collectSQL,collectArgs);
    const next=[...collectArgs];next[5]=id(72);next[6]=150000;
    await rejected(collectSQL,next,'40001'); // Another device created the charge since the summary was read.
    next[3]=request;
    await db.query(collectSQL,next);
    const stale=[...next];stale[5]=id(73);stale[6]=1;
    await rejected(collectSQL,stale,'40001');
    expect((await db.query('select * from public.fee_payments')).rows).toHaveLength(2);
  });
  it('denies foreign and anonymous workflow execution', async () => {
    await asUser(other);await rejected(addSQL,[academy,batch,[a]],'42501');await rejected(collectSQL,collectArgs,'42501');
    await asUser();await rejected(addSQL,[academy,foreignBatch,[a]],'42501');
    const foreignEnrolment=[...collectArgs];foreignEnrolment[1]=id(999);await rejected(collectSQL,foreignEnrolment,'22023');
    await db.query('update public.batches set archived_at=now() where id=$1',[batch]);await rejected(addSQL,[academy,batch,[b]],'42501');
    await db.exec('reset role; set role anon');await rejected(addSQL,[academy,batch,[a]],'42501');await rejected(collectSQL,collectArgs,'42501');
  });
  it('keeps the photo bucket private with bounded supported types after repeat installation', async () => {
    await db.exec('reset role');
    const row=(await db.query<{public:boolean;file_size_limit:number;allowed_mime_types:string[]}>('select * from storage.buckets where id=$1',[bucket])).rows[0];
    expect(row.public).toBe(false);expect(Number(row.file_size_limit)).toBe(5242880);expect(row.allowed_mime_types).toEqual(['image/jpeg','image/png','image/webp']);
  });
  it('isolates object reads/inserts/deletes by academy and rejects malformed or spoofed entity paths', async () => {
    const path=photoPath();await upload(path);await asUser(other);
    expect((await db.query('select * from storage.objects')).rows).toEqual([]);
    expect((await db.query('delete from storage.objects returning id')).rows).toEqual([]);
    await rejected('insert into storage.objects(bucket_id,name,metadata) values($1,$2,$3::jsonb)',[bucket,photoPath(a,'student',82),'{"size":1,"mimetype":"image/jpeg"}'],'42501');
    await rejected(attachSQL,[academy,'student',a,path,null],'42501');
    await asUser();
    for (const invalid of [photoPath(foreignChild),photoPath(a,'student',82,foreignAcademy),`${academy}/student/${a}/../photo.jpg`,`${academy}/student/${a}/${id(82)}.exe`]) {
      await rejected('insert into storage.objects(bucket_id,name) values($1,$2)',[bucket,invalid],'42501');
    }
    await rejected('insert into storage.objects(bucket_id,name) values($1,$2)',['unrelated',path],'42501');
    await db.exec('reset role; set role anon');expect((await db.query('select * from storage.objects')).rows).toEqual([]);
  });
  it('allows optimistic metadata replacement and exact retry while denying direct metadata writes', async () => {
    const first=photoPath(),second=photoPath(a,'student',82);await upload(first);await upload(second);
    expect(await attach(first)).toBe(first);expect(await attach(first)).toBe(first);
    await rejected(attachSQL,[academy,'student',a,second,null],'40001');
    expect(await attach(second,first)).toBe(second);expect(await attach(second,first)).toBe(second);
    await rejected('update public.coach_photos set object_path=$1',[first],'42501');
    await rejected('insert into public.coach_photos select * from public.coach_photos',[],'42501');
    await rejected('delete from public.coach_photos',[],'42501');
    await asUser(other);expect((await db.query('select * from public.coach_photos')).rows).toEqual([]);
    await db.exec('reset role; set role anon');await rejected(attachSQL,[academy,'student',a,second,first],'42501');
  });
  it('rejects missing/unsupported uploads and blocks cross-entity photo attachment', async () => {
    await rejected(attachSQL,[academy,'student',a,photoPath(),null],'22023');
    const wrongType=photoPath(a,'student',82);await upload(wrongType,{size:100,mimetype:'text/plain'});
    await rejected(attachSQL,[academy,'student',a,wrongType,null],'22023');
    const oversized=photoPath(a,'student',83);await upload(oversized,{size:5242881,mimetype:'image/jpeg'});
    await rejected(attachSQL,[academy,'student',a,oversized,null],'22023');
    const another=photoPath(b,'student',84);await upload(another);await rejected(attachSQL,[academy,'student',a,another,null],'22023');
  });
  it('keeps objects immutable and protects referenced objects, but permits orphan cleanup after replacement/removal', async () => {
    const first=photoPath(),second=photoPath(a,'student',82);await upload(first);await upload(second);await attach(first);
    expect((await db.query("update storage.objects set metadata='{}' returning id")).rows).toEqual([]);
    expect((await db.query('delete from storage.objects where name=$1 returning id',[first])).rows).toEqual([]);
    // The FK also protects against a concurrent/privileged delete after an old
    // RLS snapshot saw an unattached object; policy filtering alone is not enough.
    await db.exec('reset role');await rejected('delete from storage.objects where name=$1',[first],'23503');await asUser();
    await attach(second,first);
    expect((await db.query('delete from storage.objects where name=$1 returning id',[first])).rows).toHaveLength(1);
    expect(await attach(null,second)).toBeNull();
    expect((await db.query('delete from storage.objects where name=$1 returning id',[second])).rows).toHaveLength(1);
  });
  it('locks recorded observation photos and archived student photos while retaining their private reads and exact retries', async () => {
    const observed=photoPath(note,'observation'),replacement=photoPath(note,'observation',82);await upload(observed);await upload(replacement);await attach(observed,null,note,'observation');
    const student=photoPath();await upload(student);await attach(student);
    await db.exec('reset role');await db.query("update public.observations set status='recorded',recorded_at=now() where id=$1",[note]);await db.query('update public.students set archived_at=now() where id=$1',[a]);await asUser();
    expect(await attach(observed,null,note,'observation')).toBe(observed);
    for (const path of [replacement,null]) await rejected(attachSQL,[academy,'observation',note,path,observed],'22023');
    await rejected(attachSQL,[academy,'student',a,null,student],'22023');
    await rejected('insert into storage.objects(bucket_id,name) values($1,$2)',[bucket,photoPath(note,'observation',83)],'42501');
    expect((await db.query('select * from storage.objects where name=$1',[observed])).rows).toHaveLength(1);
    expect((await db.query('delete from storage.objects where name=$1 returning id',[observed])).rows).toEqual([]);
  });
});
