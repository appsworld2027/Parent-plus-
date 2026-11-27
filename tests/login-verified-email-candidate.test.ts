// Validates supabase/candidates/202611270022_verified_email_gate.sql on a DISPOSABLE in-memory database only.
// Proves the two known gaps from login-academy-isolation-database.test.ts (AI-06, AI-09) close once the candidate
// is applied. It does not apply anything to a hosted project.
import { readFileSync } from 'node:fs';
import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';
import { supabaseDatabase } from './support/supabaseDatabase';

const id = (n: number) => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
const [verified, unverified] = [1, 2].map(id);
const [academyV, academyU] = [11, 12].map(id);
let db: PGlite;
const as = (user: string) => db.exec(`reset role; set request.jwt.claim.sub = '${user}'; set role authenticated;`);
async function rows(sql: string, args: unknown[] = []) {
  await db.exec('begin');
  try { return (await db.query(sql, args)).rows.length; } catch { return 0; } finally { await db.exec('rollback'); }
}

beforeAll(async () => {
  db = await supabaseDatabase();
  await db.exec(readFileSync('supabase/candidates/202611270022_verified_email_gate.sql', 'utf8'));
  await db.exec('reset role');
  await db.query(`insert into auth.users(id,email,email_confirmed_at) values ($1,'v@example.test',now()),($2,'u@example.test',null)`, [verified, unverified]);
  await db.query(`insert into public.academies(id,owner_id,name) values ($1,$2,'Fictional V'),($3,$4,'Fictional U')`, [academyV, verified, academyU, unverified]);
});

describe('verified-email gate candidate (disposable database)', () => {
  it('AI-06 an unverified account cannot create an academy by function or direct insert', async () => {
    await as(id(3));
    await db.exec('reset role'); await db.query(`insert into auth.users(id,email,email_confirmed_at) values ($1,'n@example.test',null)`, [id(3)]); await as(id(3));
    expect(await rows("select * from public.create_academy('Fictional X','X')")).toBe(0);
    expect(await rows("insert into public.academies(owner_id,name) values ($1,'Fictional Direct') returning id", [id(3)])).toBe(0);
  });
  it('AI-09 an unverified account cannot read the academy it owns or its students', async () => {
    await as(unverified);
    expect(await rows('select * from public.academies')).toBe(0);
    expect(await rows('select * from public.students')).toBe(0);
  });
  it('a verified account still works exactly as before', async () => {
    await as(verified);
    expect(await rows('select * from public.academies')).toBe(1);
    expect(await rows("select * from public.create_academy('Fictional V','V')")).toBe(1);
  });
});
