export type CoachWorkspace = {
  id: string;
  name: string;
  timezone: string | null;
};

type WorkspacePage = { academies: CoachWorkspace[]; next_after: string | null };
type WorkspaceRpc = (
  functionName: 'app_today_academies',
  args: { p_after: string | null },
) => Promise<{ data: unknown; error: unknown | null }>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PAGE_LIMIT = 50;
const MAX_PAGES = 100;

function parsePage(value: unknown): WorkspacePage {
  if (!value || typeof value !== 'object') throw new Error('Invalid Coach workspace response');
  const page = value as Record<string, unknown>;
  if (!Array.isArray(page.academies) || !(page.next_after === null || typeof page.next_after === 'string')) {
    throw new Error('Invalid Coach workspace response');
  }
  if (page.academies.length > PAGE_LIMIT || (page.next_after !== null && !UUID.test(page.next_after))) {
    throw new Error('Invalid Coach workspace response');
  }
  const academies = page.academies.map((value): CoachWorkspace => {
    if (!value || typeof value !== 'object') throw new Error('Invalid Coach workspace response');
    const row = value as Record<string, unknown>;
    if (typeof row.workspace_id !== 'string' || !UUID.test(row.workspace_id)
      || typeof row.name !== 'string' || !row.name.trim()
      || !(row.time_zone === null || typeof row.time_zone === 'string')) {
      throw new Error('Invalid Coach workspace response');
    }
    return { id: row.workspace_id, name: row.name.trim(), timezone: row.time_zone as string | null };
  });
  if (page.next_after !== null && academies.at(-1)?.id !== page.next_after) {
    throw new Error('Invalid Coach workspace response');
  }
  return { academies, next_after: page.next_after as string | null };
}

/** Reads workspace contexts using APVerse's authenticated, membership-checked RPC. */
export async function listCoachWorkspaces(rpc: WorkspaceRpc): Promise<CoachWorkspace[]> {
  const workspaces: CoachWorkspace[] = [];
  const seenIds = new Set<string>();
  let after: string | null = null;

  for (let pageCount = 0; pageCount < MAX_PAGES; pageCount += 1) {
    const result = await rpc('app_today_academies', { p_after: after });
    if (result.error) throw result.error;
    const page = parsePage(result.data);
    if (page.next_after !== null && page.next_after === after) {
      throw new Error('Coach workspace pagination did not advance');
    }
    for (const workspace of page.academies) {
      if (seenIds.has(workspace.id)) throw new Error('Invalid Coach workspace response');
      seenIds.add(workspace.id);
      workspaces.push(workspace);
    }
    if (page.next_after === null) return workspaces;
    after = page.next_after;
  }

  throw new Error('Coach workspace list exceeded the supported size');
}
