export type ErrorCode = 'CONTROLLED_FAILURE' | 'SCREEN_FAILURE' | 'REPORT_SHARE_FAILED';
export type Diagnostic = Readonly<{
  reference: string;
  timestamp: string;
  code: ErrorCode;
  action: 'diagnostic-check' | 'screen-render' | 'share-report';
  build: string;
}>;

const allowedActions = {
  CONTROLLED_FAILURE: 'diagnostic-check',
  SCREEN_FAILURE: 'screen-render',
  REPORT_SHARE_FAILED: 'share-report',
} as const;

// Accept only enumerated codes, never raw exception messages, form data, or API bodies.
// This in-memory buffer is deliberately bounded; it is not remote crash monitoring.
export function createDiagnostics(limit = 30, now = () => new Date()) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new Error('Invalid diagnostic capacity');
  let records: Diagnostic[] = [];
  let sequence = 0;
  const session = Math.random().toString(36).slice(2, 8);
  return {
    record(code: ErrorCode): Diagnostic {
      if (!Object.hasOwn(allowedActions, code)) throw new Error('Unsupported diagnostic code');
      const timestamp = now().toISOString();
      const event = Object.freeze({
        reference: `PP-${session}-${(++sequence).toString(36)}`.toUpperCase(),
        timestamp, code, action: allowedActions[code], build: '0.1.0',
      });
      records = [...records, event].slice(-limit);
      return event;
    },
    list: () => [...records],
    clear: () => { records = []; },
    export: () => JSON.stringify({ application: 'Parent Plus Coach', build: '0.1.0', events: records }, null, 2),
  };
}

export const diagnostics = createDiagnostics();
