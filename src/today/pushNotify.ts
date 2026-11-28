import { supabase } from '../auth/client';

// Best-effort browser push after the in-app notice is saved (the in-app notice is the source of truth; WPN-08).
export async function notifyFamilies(batchId: string, message: string): Promise<void> {
  try { await supabase?.functions.invoke('notify-batch', { body: { batch_id: batchId, message } }); } catch { /* In-app notice already saved. */ }
}
