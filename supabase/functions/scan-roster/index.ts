import {createScanHandler} from './handler.ts';
Deno.serve(createScanHandler({url:Deno.env.get('SUPABASE_URL')??'',publicKey:Deno.env.get('SUPABASE_ANON_KEY')??'',serviceKey:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')??'',openAIKey:Deno.env.get('OPENAI_API_KEY')??'',model:Deno.env.get('ROSTER_SCAN_MODEL')||'gpt-4.1-mini'}));
