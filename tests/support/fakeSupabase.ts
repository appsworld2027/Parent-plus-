// A chainable stand-in for the Supabase query builder. Records every call so tests can assert filters and paging.
export type Call = { table: string; filters: [string, ...unknown[]][]; offset: number; end: number | null };
export function fakeSupabase(respond: (call: Call) => { data?: unknown[]; error?: unknown }) {
  const calls: Call[] = [];
  const from = (table: string) => {
    const call: Call = { table, filters: [], offset: 0, end: null };
    const builder: Record<string, unknown> = {};
    for (const name of ['select', 'eq', 'gte', 'lt', 'gt', 'is', 'in', 'order']) {
      builder[name] = (...args: unknown[]) => { call.filters.push([name, ...args]); return builder; };
    }
    builder.range = (from: number, to: number) => { call.offset = from; call.end = to; return builder; };
    builder.then = (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) => {
      calls.push(call);
      const r = respond(call);
      return Promise.resolve({ data: r.data ?? [], error: r.error ?? null }).then(resolve, reject);
    };
    return builder;
  };
  return { client: { from }, calls };
}
