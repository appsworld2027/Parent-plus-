import { readFileSync, writeFileSync } from 'node:fs';
const migrations=['202611160011_reviewed_feedback_media.sql','202611160012_parent_workspace.sql','202611160013_parent_link_lifecycle.sql'];
const body=migrations.map(name=>{
  const source=readFileSync(new URL(`../supabase/migrations/${name}`,import.meta.url),'utf8');
  return `-- ${name}\n`+source.replace(/^begin;\s*$/m,'').replace(/^commit;\s*$/m,'').replace(/^select version as installed_update.*;\s*$/m,'').trim();
}).join('\n\n');
const expected=`-- Parent Plus: new updates011–013 only, after installed001–010.\n-- Run the whole file once. Existing family, teaching and fee records are preserved.\n-- One transaction: either all three updates install, or none of their changes commit.\nbegin;\n\n${body}\n\ncommit;\nselect version as installed_update from coach_private.schema_migrations\nwhere version in ('202611160011','202611160012','202611160013') order by version;\n`;
const output=new URL('../supabase/update_011_013.sql',import.meta.url);
if(process.argv.includes('--check')) { if(readFileSync(output,'utf8')!==expected)throw new Error('Regenerate update_011_013.sql before delivering it.');console.log('Parent owner SQL matches all tested migrations.'); }
else { writeFileSync(output,expected);console.log('Prepared update_011_013.sql (new updates011–013 only).'); }
