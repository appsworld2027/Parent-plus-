import {createScanHandler} from './handler.ts';
Deno.serve(createScanHandler({url:Deno.env.get('SUPABASE_URL')??'',publicKey:Deno.env.get('SUPABASE_ANON_KEY')??'',serviceKey:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')??'',visionKey:Deno.env.get('GOOGLE_CLOUD_VISION_API_KEY')??''}));
