import { supabase } from '../auth/client';
import { addConnectedChildToBatch, loadApVerseRoster, type ApVerseRosterRpc } from './apverseService';

const call: ApVerseRosterRpc = async (name, args) => {
  if (!supabase) return { data: null, error: new Error('Supabase is not configured') };
  const result = await supabase.rpc(name, args as never);
  return { data: result.data, error: result.error };
};

export const loadConnectedCoachRoster = (workspaceId: string) => loadApVerseRoster(workspaceId, call);
export const enrollConnectedChild = (workspaceId: string, batchId: string, childId: string, requestId: string) =>
  addConnectedChildToBatch(workspaceId, batchId, childId, requestId, call);
