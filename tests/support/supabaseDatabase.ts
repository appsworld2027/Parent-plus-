import {PGlite} from '@electric-sql/pglite';
import {readFileSync,readdirSync} from 'node:fs';
// Disposable SQL/role fixture; never deployed and not an Auth/email simulation.
export async function supabaseDatabase(){
 const db=new PGlite();
 await db.exec(readFileSync('tests/fixtures/supabase-base.sql','utf8'));
 for(const file of readdirSync('supabase/migrations').filter(file=>file.endsWith('.sql')&&file<='202611160014_verified_parent_connections.sql').sort())await db.exec(readFileSync(`supabase/migrations/${file}`,'utf8'));
 return db;
}
