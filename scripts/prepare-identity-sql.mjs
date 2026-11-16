import {readFileSync,writeFileSync} from 'node:fs';
const source=readFileSync(new URL('../supabase/migrations/202611160014_verified_parent_connections.sql',import.meta.url),'utf8');
const target=new URL('../supabase/update_014.sql',import.meta.url);
if(process.argv.includes('--check')){if(readFileSync(target,'utf8')!==source)throw new Error('Regenerate update_014.sql before delivery.');console.log('Owner update014 matches the tested migration.');}
else{writeFileSync(target,source);console.log('Prepared update014 only; do not rerun001–013.');}
