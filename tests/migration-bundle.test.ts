import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

it('the owner dashboard bundle matches generated immutable migrations and excludes 001', () => {
  // Owners deploy this exact artifact. Catch source/bundle drift before handover.
  const before = readFileSync('supabase/setup_after_001.sql', 'utf8');
  execFileSync(process.execPath, ['scripts/prepare-owner-sql.mjs', '--check']);
  expect(readFileSync('supabase/setup_after_001.sql', 'utf8')).toBe(before);
  expect(before).not.toContain('-- SOURCE: 202611110001');
  expect(before.match(/-- SOURCE:/g)).toHaveLength(9);
});

it('the single-file dashboard scanner matches the tested handler and entry point',()=>{
  execFileSync(process.execPath,['scripts/prepare-scan-function.mjs','--check']);
});
