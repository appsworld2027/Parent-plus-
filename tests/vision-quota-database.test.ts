import {PGlite} from '@electric-sql/pglite';
import {readFileSync,readdirSync} from 'node:fs';
import {afterAll,beforeAll,beforeEach,describe,expect,it} from 'vitest';

const id=(n:number)=>`00000000-0000-0000-0000-${String(n).padStart(12,'0')}`;
const [owner,other,academy,secondAcademy]=[1,2,11,12].map(id);
const sql='select public.reserve_vision_roster_scan($1)';
let db:PGlite;
async function reserve(scope=academy){await db.transaction(tx=>tx.query(sql,[scope]));}
async function rejected(code:string,scope=academy){await expect(db.transaction(tx=>tx.query(sql,[scope]))).rejects.toMatchObject({code});}
async function counts(){await db.exec('reset role');const monthly=(await db.query<{attempts:number}>('select attempts from coach_private.vision_scan_months order by month desc')).rows;const daily=(await db.query<{attempts:number}>('select attempts from coach_private.roster_scan_usage order by academy_id,day desc')).rows;await db.exec('set role service_role');return{monthly,daily};}

describe('global Vision allowance plus atomic academy/day reservations',()=>{
  beforeAll(async()=>{
    db=new PGlite();
    await db.exec(`create role anon nologin;create role authenticated nologin;create role service_role nologin bypassrls;
      create schema auth;create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema auth,public to authenticated,anon,service_role;grant execute on function auth.uid() to authenticated,anon,service_role;
      create schema storage;create table storage.buckets(id text primary key,name text not null,public boolean not null default false,file_size_limit bigint,allowed_mime_types text[]);
      create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text not null references storage.buckets(id),name text not null,metadata jsonb,unique(bucket_id,name));
      alter table storage.objects enable row level security;grant usage on schema storage to anon,authenticated,service_role;
      grant select on storage.objects to anon;grant select,insert,update,delete on storage.objects to authenticated;grant all on storage.objects,storage.buckets to service_role;`);
    const files=readdirSync('supabase/migrations').filter(f=>f.endsWith('.sql')&&f<='202611150010_vision_monthly_limit.sql').sort();
    for(const file of [...files,'202611150010_vision_monthly_limit.sql'])await db.exec(readFileSync(`supabase/migrations/${file}`,'utf8'));
    await db.query('insert into auth.users values($1),($2)',[owner,other]);
    await db.query('insert into public.academies(id,owner_id,name) values($1,$2,$3),($4,$5,$6)',[academy,owner,'Fictional A',secondAcademy,other,'Fictional B']);
  },30_000);
  beforeEach(async()=>{
    // This database is disposable and contains only the two fictional academies.
    await db.exec("reset role;set timezone='UTC';delete from coach_private.vision_scan_months;delete from coach_private.roster_scan_usage;set role service_role");
  });
  afterAll(async()=>{await db?.close();});

  it('reserves one shared monthly attempt and one academy/day attempt together',async()=>{
    await reserve();expect(await counts()).toEqual({monthly:[{attempts:1}],daily:[{attempts:1}]});
    await rejected('P0001');expect(await counts()).toEqual({monthly:[{attempts:1}],daily:[{attempts:1}]});
    await reserve(secondAcademy);expect(await counts()).toEqual({monthly:[{attempts:2}],daily:[{attempts:1},{attempts:1}]});
  });
  it('daily-limit rejection never consumes the monthly allowance',async()=>{
    await db.exec("reset role;insert into coach_private.roster_scan_usage values('"+academy+"',(now() at time zone 'UTC')::date,9,now()-interval '11 seconds');set role service_role");
    await reserve();await db.exec("reset role;update coach_private.roster_scan_usage set last_attempt=now()-interval '11 seconds';set role service_role");
    await rejected('P0001');expect(await counts()).toEqual({monthly:[{attempts:1}],daily:[{attempts:10}]});
  });
  it('rejects attempt901 globally before touching another academy daily allowance',async()=>{
    await db.exec("reset role;insert into coach_private.vision_scan_months values(date_trunc('month',now() at time zone 'UTC')::date,899);set role service_role");
    await reserve();await rejected('P0002',secondAcademy);
    expect(await counts()).toEqual({monthly:[{attempts:900}],daily:[{attempts:1}]});
  });
  it('concurrent queued transactions at899 admit only one final reservation across academies',async()=>{
    await db.exec("reset role;insert into coach_private.vision_scan_months values(date_trunc('month',now() at time zone 'UTC')::date,899);set role service_role");
    // PGlite queues transactions on one engine. This checks transactional
    // boundary behavior; production multi-session advisory locks remain separate.
    const results=await Promise.allSettled([reserve(),reserve(secondAcademy)]);
    expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);
    const failure=results.find(r=>r.status==='rejected') as PromiseRejectedResult;
    expect(failure.reason).toMatchObject({code:'P0002'});
    expect(await counts()).toEqual({monthly:[{attempts:900}],daily:[{attempts:1}]});
  });
  it('concurrent queued calls for one academy cannot bypass its cooldown',async()=>{
    const results=await Promise.allSettled([reserve(),reserve(),reserve()]);
    expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);
    for(const result of results)if(result.status==='rejected')expect(result.reason).toMatchObject({code:'P0001'});
    expect(await counts()).toEqual({monthly:[{attempts:1}],daily:[{attempts:1}]});
  });
  it('keeps prior-month use separate and uses UTC month even with another session timezone',async()=>{
    await db.exec("reset role;insert into coach_private.vision_scan_months values((date_trunc('month',now() at time zone 'UTC')-interval '1 month')::date,900);set timezone='Pacific/Kiritimati';set role service_role");
    await reserve();await db.exec('reset role');
    const current=(await db.query<{month:string;expected:string;attempts:number}>("select month::text,(date_trunc('month',now() at time zone 'UTC')::date)::text as expected,attempts from coach_private.vision_scan_months order by month desc")).rows;
    expect(current).toHaveLength(2);expect(current[0].month).toBe(current[0].expected);expect(current[0].attempts).toBe(1);expect(current[1].attempts).toBe(900);
  });
  it('rolls back every reservation when the academy does not exist',async()=>{
    await rejected('42501',id(999));expect(await counts()).toEqual({monthly:[],daily:[]});
  });
  it('denies authenticated/anonymous execution and access to monthly counters',async()=>{
    for(const role of ['authenticated','anon']){
      await db.exec(`reset role;set request.jwt.claim.sub='${owner}';set role ${role}`);
      await rejected('42501');
      for(const statement of ['select * from coach_private.vision_scan_months','update coach_private.vision_scan_months set attempts=1','delete from coach_private.vision_scan_months'])await expect(db.transaction(tx=>tx.query(statement))).rejects.toMatchObject({code:'42501'});
    }
  });
});
