// Advisory: every ticked feature in docs/product/BACKLOG.md needs SCENARIOS.csv, a workbook and a founder-test-script row.
// Pass --strict to exit 1 on any gap. Features marked legacy are listed, not blocked.
import { existsSync, readFileSync } from 'node:fs';
const strict = process.argv.includes('--strict');
const backlog = readFileSync('docs/product/BACKLOG.md', 'utf8');
const script = existsSync('docs/product/FOUNDER_TEST_SCRIPT.md') ? readFileSync('docs/product/FOUNDER_TEST_SCRIPT.md', 'utf8') : '';
const slugs = [...backlog.matchAll(/^- \[x\] ([a-z0-9-]+) —/gm)].map(m => m[1]);
let gaps = 0;
for (const slug of slugs) {
  const missing = [];
  if (!existsSync(`docs/product/${slug}/SCENARIOS.csv`)) missing.push('SCENARIOS.csv');
  if (!existsSync(`testing/workbooks/${slug}.xlsx`)) missing.push('workbook');
  if (!script.includes(`<!-- feature:${slug} -->`)) missing.push('founder test script row');
  console.log(`${missing.length ? '⚠️ ' : '✅'} ${slug}${missing.length ? ' — missing: ' + missing.join(', ') : ''}`);
  gaps += missing.length;
}
console.log(`\n${slugs.length} ticked features, ${gaps} gaps${strict ? '' : ' (advisory)'}`);
process.exit(strict && gaps ? 1 : 0);
