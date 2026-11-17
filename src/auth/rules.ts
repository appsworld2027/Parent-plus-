export type AuthMode = 'login' | 'signup' | 'recover' | 'updatePassword';

export function validateAuth(mode: AuthMode, email: string, password: string, confirm: string): string | null {
  if (mode !== 'updatePassword' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Enter a valid email address.';
  if (mode !== 'recover' && !password) return 'Enter your password.';
  if ((mode === 'signup' || mode === 'updatePassword') && password.length < 10) return 'Choose a password with at least 10 characters.';
  if ((mode === 'signup' || mode === 'updatePassword') && password !== confirm) return 'The passwords do not match.';
  return null;
}

export function parseAuthLink(raw: string, webOrigin?: string): { code: string; recovery: boolean; error: boolean; flowId?:string } | null {
  const url = new URL(raw);
  const native = url.protocol === 'parentplus-coach:' && url.host === 'auth';
  const web = !!webOrigin && url.origin === webOrigin;
  const path = native ? url.pathname : web && url.pathname.startsWith('/auth/') ? url.pathname.slice(5) : '';
  if ((!native && !web) || !['/callback', '/recovery'].includes(path)) return null;
  // PKCE exchanges one-time codes, never trusts access tokens from an arbitrary URL.
  const flowIds=url.searchParams.getAll('sb_flow_id'),flowId=flowIds[0];
  const invalidFlow=flowIds.length>1||(flowIds.length===1&&!/^[a-zA-Z0-9_-]{8,64}$/.test(flowId));
  return { code: url.searchParams.get('code') ?? '', recovery: path === '/recovery', error: invalidFlow||url.searchParams.has('error')||url.searchParams.has('error_code'),
    ...(flowId&&!invalidFlow?{flowId}:{}), };
}
