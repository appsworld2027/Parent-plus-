// Runs the browserless suites (types, unit/database-on-memory, component render) and writes a Markdown report.
// Output: reports/test-report.md, and the GitHub job summary when GITHUB_STEP_SUMMARY is set. Exit code 1 if anything failed.
import { spawnSync } from 'node:child_process';
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

mkdirSync('reports', { recursive: true });
const run = (cmd, args) => spawnSync(cmd, args, { encoding: 'utf8', shell: false });
const suites = [];

const types = run('npx', ['tsc', '--noEmit']);
suites.push({ name: 'Type check', files: [], total: 1, passed: types.status === 0 ? 1 : 0, failed: types.status === 0 ? 0 : 1, skipped: 0, failures: types.status === 0 ? [] : [{ name: 'tsc --noEmit', message: (types.stdout + types.stderr).slice(0, 1500) }] });

for (const [name, args] of [['Unit and in-memory database', ['vitest', 'run']], ['Component render (no browser)', ['vitest', 'run', '-c', 'vitest.component.config.mts']]]) {
  const out = `reports/${name.startsWith('Unit') ? 'unit' : 'component'}.json`;
  run('npx', [...args, '--reporter=json', `--outputFile=${out}`]);
  let json;
  try { json = JSON.parse(readFileSync(out, 'utf8')); } catch { suites.push({ name, files: [], total: 0, passed: 0, failed: 1, skipped: 0, failures: [{ name: 'runner', message: 'No result file written' }] }); continue; }
  const files = json.testResults.map(f => {
    const tests = f.assertionResults;
    return { file: f.name.replace(process.cwd() + '/', ''), total: tests.length, passed: tests.filter(t => t.status === 'passed').length,
      failed: tests.filter(t => t.status === 'failed').length, skipped: tests.filter(t => ['skipped', 'pending', 'todo'].includes(t.status)).length };
  });
  const failures = json.testResults.flatMap(f => f.assertionResults.filter(t => t.status === 'failed').map(t => ({ name: `${f.name.replace(process.cwd() + '/', '')} › ${t.fullName}`, message: (t.failureMessages?.[0] ?? '').slice(0, 800) })));
  suites.push({ name, files, total: json.numTotalTests, passed: json.numPassedTests, failed: json.numFailedTests, skipped: json.numPendingTests + (json.numTodoTests ?? 0), failures });
}

const sum = k => suites.reduce((n, s) => n + s[k], 0);
const ok = sum('failed') === 0;
const lines = [`# Browserless test report ${ok ? '✅ PASSED' : '❌ FAILED'}`, '',
  `Commit: \`${process.env.GITHUB_SHA?.slice(0, 7) ?? 'local'}\` · ${new Date().toISOString()}`, '',
  '| Suite | Total | Passed | Failed | Skipped |', '|---|---:|---:|---:|---:|',
  ...suites.map(s => `| ${s.name} | ${s.total} | ${s.passed} | ${s.failed} | ${s.skipped} |`),
  `| **All** | **${sum('total')}** | **${sum('passed')}** | **${sum('failed')}** | **${sum('skipped')}** |`, ''];
for (const s of suites.filter(s => s.files.length)) {
  lines.push(`## ${s.name} — by file`, '', '| File | Passed | Failed | Skipped |', '|---|---:|---:|---:|', ...s.files.map(f => `| ${f.file} | ${f.passed}/${f.total} | ${f.failed} | ${f.skipped} |`), '');
}
if (!ok) { lines.push('## Failures', '', ...suites.flatMap(s => s.failures).flatMap(f => [`- **${f.name}**`, '  ```', ...f.message.split('\n').slice(0, 8).map(l => `  ${l}`), '  ```'])); lines.push(''); }
lines.push('## Not covered by this report', '', '- Browser journeys (Playwright), real devices, hosted database, real email: run separately; never counted here.', '- Skipped tests are listed above, not treated as passes.');
const md = lines.join('\n');
writeFileSync('reports/test-report.md', md);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + '\n');
console.log(md.split('\n').slice(0, 12).join('\n'));
process.exit(ok ? 0 : 1);
