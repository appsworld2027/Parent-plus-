// QA lab — Persona data preparation + database-level checks (real migrations, real RLS, PGlite Postgres).
// Every persona is created the way the real app creates it: signed in as that user, through the same RPCs.
// Each preparation step is itself a test (QA-LAB-DB-xx). Results map to testing/qa-scenarios.csv by ID.
import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
// @ts-ignore — plain ESM generator shared with the browser lab
import { generate, expectedNeedsYou } from './personas.mjs';

const data: any = generate();
let db: PGlite;
const stats: Record<string, number | string> = {};
async function as(user: string | null) { await db.exec(user ? `reset role;set request.jwt.claim.sub='${user}';set role authenticated` : `reset role;set request.jwt.claim.sub=''`); }
async function q<T = any>(sql: string, args: unknown[] = []) { return (await db.query<T>(sql, args)).rows; }
// Expect a refusal; the attempt runs in its own transaction and is always rolled back.
async function rejects(sql: string, args: unknown[]) { await db.exec('begin'); try { await db.query(sql, args); return false; } catch { return true; } finally { await db.exec('rollback'); } }
const academyOf = new Map<string, any>(), studentAcademy = new Map<string, any>();

beforeAll(async () => {
  db = new PGlite();
  await db.exec(readFileSync('tests/fixtures/supabase-base.sql', 'utf8'));
  for (const f of readdirSync('supabase/migrations').filter(f => f.endsWith('.sql')).sort()) await db.exec(readFileSync(`supabase/migrations/${f}`, 'utf8'));
}, 120000);
// Setup-only edits that move data in time (e.g. "feedback 8 days ago") run as the database administrator,
// never as a user, and are labelled SETUP so they are never mistaken for app behaviour.
async function setup(sql: string, args: unknown[] = []) { await as(null); await q(sql, args); }

describe('QA lab — persona preparation (1,000 users through real app RPCs)', () => {
  it('QA-LAB-DB-01 creates 1,000 fictional auth users (100 coaches, 900 parents) with verified/unverified email states', async () => {
    for (const u of data.users) await q('insert into auth.users(id,email,email_confirmed_at) values($1,$2,$3)', [u.id, u.email, u.verified ? new Date().toISOString() : null]);
    const [{ n }] = await q<{ n: number }>('select count(*)::int n from auth.users');
    expect(n).toBe(1000); stats.users = n;
  });

  it('QA-LAB-DB-02 every coach onboards through create_academy as themselves; one academy per owner', async () => {
    for (const a of data.academies) {
      await as(a.owner);
      const [row] = await q<{ id: string }>('select (public.create_academy($1,$2)).id', [a.name, data.users.find((u: any) => u.id === a.owner).name]);
      academyOf.set(a.id, { ...a, real: row.id });
      // retry is idempotent (same owner => same academy)
      const [again] = await q<{ id: string }>('select (public.create_academy($1,$2)).id', [a.name, 'x']);
      expect(again.id).toBe(row.id);
    }
    await as(null);
    const [{ n }] = await q<{ n: number }>('select count(*)::int n from public.academies'); expect(n).toBe(100); stats.academies = n;
  }, 120000);

  it('QA-LAB-DB-03 coaches create batches and enrol students through save_student_profile (archived / ended / future edge cases)', async () => {
    for (const a of academyOf.values()) {
      await as(a.owner);
      for (const b of a.batches) await q('insert into public.batches(id,academy_id,name) values($1,$2,$3)', [b.id, a.real, b.name]);
      for (const s of a.students) {
        await q('select public.save_student_profile($1,$2,$3,$4,$5,$6,$7,$8::uuid[],$9)', [a.real, s.id, s.name.slice(0, 100), s.age, s.guardianEmail ? 'Guardian' : '', s.guardianEmail ?? '', '', s.batches, 'unassessed']);
        studentAcademy.set(s.id, a);
        if (s.status === 'archived') await q('select public.archive_student($1)', [s.id]);
      }
      for (const s of a.students) {
        if (s.status === 'ended') await setup("update public.enrolments set starts_on='2020-01-01', ends_on='2020-06-30' where student_id=$1", [s.id]);
        if (s.status === 'future') await setup("update public.enrolments set starts_on=current_date+30 where student_id=$1", [s.id]);
      }
    }
    await as(null);
    const [{ s, e }] = await q<{ s: number; e: number }>('select (select count(*)::int from public.students) s,(select count(*)::int from public.enrolments) e');
    expect(s).toBe(data.academies.reduce((n: number, a: any) => n + a.students.length, 0)); stats.students = s; stats.enrolments = e;
  }, 300000);

  it('QA-LAB-DB-04 coaches record feedback through save_observation (drafts, recorded, old and fresh)', async () => {
    for (const a of academyOf.values()) {
      await as(a.owner);
      for (const o of a.observations) await q('select public.save_observation($1,$2,0,$3,null,$4,$5::uuid[],$6,$7)', [a.real, o.id, o.batch, 'student', [o.student], `Fictional note ${o.id.slice(-4)}`, o.status]);
      for (const o of a.observations) await setup("update public.observations set recorded_at=case when status='recorded' then now()-($2||' days')::interval end, created_at=now()-($2||' days')::interval where id=$1", [o.id, String(o.ageDays)]);
    }
    await as(null);
    const [{ n }] = await q<{ n: number }>('select count(*)::int n from public.observations'); expect(n).toBe(data.academies.reduce((n: number, a: any) => n + a.observations.length, 0)); stats.observations = n;
  }, 300000);

  it('QA-LAB-DB-05 900 parents create families and children as themselves', async () => {
    for (const f of data.families) {
      await as(f.owner);
      await q('insert into public.parent_families(id,owner_id,parent_name,name) values($1,$2,$3,$4)', [f.id, f.owner, f.parentName.slice(0, 100), f.name.slice(0, 100)]);
      for (const c of f.children) await q('insert into public.family_children(id,family_id,name,born_on) values($1,$2,$3,$4)', [c.id, f.id, c.name.slice(0, 100), c.bornOn]);
    }
    await as(null);
    const [{ f, c }] = await q<{ f: number; c: number }>('select (select count(*)::int from public.parent_families) f,(select count(*)::int from public.family_children) c');
    expect(f).toBe(900); stats.families = f; stats.children = c;
  }, 300000);

  it('QA-LAB-DB-06 invitation → parent claim → coach approve/reject for every connection; unverified emails are refused', async () => {
    const out = { approved: 0, pending: 0, rejected: 0, blocked: 0, unexpected: [] as string[] };
    for (const f of data.families) for (const c of f.connections) {
      const a = academyOf.get(c.academy);
      await as(a.owner);
      const [{ code }] = await q<{ code: string }>('select public.issue_parent_link_invite($1,$2,$3) code', [a.real, c.student, data.users.find((u: any) => u.id === f.owner).email]);
      await as(f.owner);
      if (c.outcome === 'blocked') { (await rejects('select public.claim_parent_link($1,$2)', [code, c.child])) ? out.blocked++ : out.unexpected.push(`unverified claimed ${c.student}`); continue; }
      const [{ id: req }] = await q<{ id: string }>('select public.claim_parent_link($1,$2) id', [code, c.child]);
      if (c.outcome === 'pending') { out.pending++; continue; }
      await as(a.owner);
      await q('select public.review_parent_connection_request($1,$2)', [req, c.outcome === 'approved']);
      out[c.outcome as 'approved' | 'rejected']++;
    }
    await as(null);
    Object.assign(stats, { approved: out.approved, pending: out.pending, rejected: out.rejected, blockedUnverified: out.blocked });
    expect(out.unexpected).toEqual([]);
    const [{ n }] = await q<{ n: number }>('select count(*)::int n from public.parent_coach_links where active'); expect(n).toBe(out.approved);
  }, 600000);
});

describe('QA lab — isolation and correctness across all personas', () => {
  it('QA-LAB-DB-10 no coach can read another academy\'s students (all 100 coaches)', async () => {
    const leaks: string[] = [];
    for (const a of academyOf.values()) {
      await as(a.owner);
      const [{ n }] = await q<{ n: number }>('select count(*)::int n from public.students where academy_id<>$1', [a.real]);
      if (n) leaks.push(`${a.name}: ${n}`);
    }
    await as(null); expect(leaks).toEqual([]);
  }, 120000);

  it('QA-LAB-DB-11 no coach can read any family, child or private family record', async () => {
    const leaks: string[] = [];
    for (const a of academyOf.values()) {
      await as(a.owner);
      const [{ f, c }] = await q<{ f: number; c: number }>('select (select count(*)::int from public.parent_families) f,(select count(*)::int from public.family_children) c');
      if (f || c) leaks.push(`${a.name}: families ${f}, children ${c}`);
    }
    await as(null); expect(leaks).toEqual([]);
  }, 120000);

  it('QA-LAB-DB-12 each parent sees only their own family and children (all 900 parents)', async () => {
    const leaks: string[] = [];
    for (const f of data.families) {
      await as(f.owner);
      const [{ fam, kids }] = await q<{ fam: number; kids: number }>('select (select count(*)::int from public.parent_families) fam,(select count(*)::int from public.family_children) kids');
      if (fam !== 1 || kids !== f.children.length) leaks.push(`${f.name}: sees ${fam} families/${kids} children`);
    }
    await as(null); expect(leaks).toEqual([]);
  }, 300000);

  it('QA-LAB-DB-13 parents cannot read coach academy data (students, observations, notes)', async () => {
    const leaks: string[] = [];
    for (const f of data.families.filter((_: any, i: number) => i % 3 === 0)) {
      await as(f.owner);
      const [{ s, o }] = await q<{ s: number; o: number }>('select (select count(*)::int from public.students) s,(select count(*)::int from public.observations) o');
      if (s || o) leaks.push(`${f.name}: students ${s}, observations ${o}`);
    }
    await as(null); expect(leaks).toEqual([]);
  }, 120000);

  it('QA-LAB-DB-14 pending and rejected requests never create a readable connection', async () => {
    const bad: string[] = [];
    const checked = data.families.filter((x: any) => x.archetype === 'pending-approval' || x.archetype === 'rejected');
    for (const f of checked) {
      await as(f.owner);
      const rows = await q('select * from public.get_parent_coach_connections()');
      if (rows.length) bad.push(`${f.name} (${f.archetype}) sees ${rows.length} connection(s)`);
      const [{ pend }] = await q<{ pend: number }>('select count(*)::int pend from public.get_parent_connection_requests()');
      if (f.archetype === 'pending-approval' && pend < 1) bad.push(`${f.name}: pending request not visible to its own parent`);
    }
    await as(null);
    expect(checked.length, 'sanity: personas checked').toBeGreaterThan(200);
    const [{ links }] = await q<{ links: number }>("select count(*)::int links from public.parent_coach_links l join public.parent_connection_requests r on r.id=l.approval_request_id where r.status<>'approved'");
    expect(links, 'no link exists for a non-approved request').toBe(0);
    expect(bad).toEqual([]);
  }, 120000);

  it('QA-LAB-DB-15 approved parents see exactly their approved connections', async () => {
    const bad: string[] = [];
    for (const f of data.families.filter((x: any) => x.connections.some((c: any) => c.outcome === 'approved'))) {
      await as(f.owner);
      const rows = await q('select * from public.get_parent_coach_connections()');
      const expected = f.connections.filter((c: any) => c.outcome === 'approved').length;
      if (rows.length !== expected) bad.push(`${f.name}: ${rows.length} vs expected ${expected}`);
    }
    await as(null); expect(bad).toEqual([]);
  }, 300000);

  it('QA-LAB-DB-16 Needs you: the app\'s own query (same filters as src/today/service.ts) matches the contract oracle for all 100 academies', async () => {
    const wrong: string[] = []; const dist: Record<string, number> = {};
    for (const a of academyOf.values()) {
      await as(a.owner);
      const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
      const [{ n }] = await q<{ n: number }>(`
        select count(distinct s.id)::int n from public.students s
        join public.enrolments e on e.student_id=s.id and e.academy_id=s.academy_id and e.starts_on<=current_date and (e.ends_on is null or e.ends_on>=current_date)
        where s.academy_id=$1 and s.archived_at is null
          and not exists(select 1 from public.observation_recipients r join public.observations o on o.id=r.observation_id
            where r.student_id=s.id and o.academy_id=$1 and o.status='recorded' and o.recorded_at>=$2)`, [a.real, since]);
      const exp = expectedNeedsYou(a);
      dist[a.archetype] = (dist[a.archetype] ?? 0) + n;
      if (n !== exp) wrong.push(`${a.name} (${a.archetype}): db ${n} vs contract ${exp}`);
    }
    await as(null); stats.needsYouByArchetype = JSON.stringify(dist);
    expect(Object.values(dist).reduce((n, v) => n + v, 0), 'sanity: some academies need feedback').toBeGreaterThan(100);
    expect(dist['all-caught-up'], 'all-caught-up persona must be 0').toBe(0);
    expect(wrong).toEqual([]);
  }, 120000);

  it('QA-LAB-DB-17 a coach cannot invite, record feedback or enrol into another academy', async () => {
    const [a, b] = [...academyOf.values()].filter(x => x.students.length && x.batches.length);
    expect(a && b, 'sanity: two academies with students').toBeTruthy();
    await as(a.owner);
    const s = b.students.find((x: any) => x.status === 'active').id;
    expect(await rejects('select public.issue_parent_link_invite($1,$2,$3)', [b.real, s, 'x@example.test'])).toBe(true);
    expect(await rejects('select public.save_observation($1,$2,0,$3,null,$4,$5::uuid[],$6,$7)', [b.real, '9a000000-0000-4000-8000-000000000001', b.batches[0]?.id, 'student', [s], 'x', 'recorded'])).toBe(true);
    expect(await rejects('select public.save_student_profile($1,$2,$3,$4,$5,$6,$7,$8::uuid[],$9)', [b.real, '9b000000-0000-4000-8000-000000000001', 'Intruder', 7, '', '', '', [], 'unassessed'])).toBe(true);
    // control: the same calls on the coach's OWN academy succeed, proving the refusals above are about ownership
    const own = a.students.find((x: any) => x.status === 'active');
    expect(await rejects('select public.save_observation($1,$2,0,$3,null,$4,$5::uuid[],$6,$7)', [a.real, '9a000000-0000-4000-8000-000000000002', own.batches[0], 'student', [own.id], 'x', 'draft'])).toBe(false);
    await as(null);
  });

  it('QA-LAB-DB-18 the same child cannot be linked to two students of one academy (business rule)', async () => {
    // Find an approved link whose academy still has another active, unlinked student.
    let f: any, c: any, a: any, other: any;
    for (const fam of data.families) for (const con of fam.connections.filter((x: any) => x.outcome === 'approved')) {
      const ac = academyOf.get(con.academy);
      const cand = ac.students.find((s: any) => s.status === 'active' && s.batches.length && s.id !== con.student && !s.guardianEmail);
      if (cand && !f) { f = fam; c = con; a = ac; other = cand; }
    }
    expect(other, 'sanity: a second unlinked student exists in that academy').toBeTruthy();
    await as(a.owner);
    const [{ code }] = await q<{ code: string }>('select public.issue_parent_link_invite($1,$2,$3) code', [a.real, other.id, data.users.find((u: any) => u.id === f.owner).email]);
    await as(f.owner);
    expect(await rejects('select public.claim_parent_link($1,$2)', [code, c.child])).toBe(true);
    await as(null);
  });

  it('QA-LAB-DB-99 writes the lab data summary', () => {
    mkdirSync('qa-results', { recursive: true });
    writeFileSync('qa-results/lab-data-summary.json', JSON.stringify({ seed: data.seed, ...stats }, null, 1));
    expect(Number(stats.users)).toBe(1000);
  });
});
