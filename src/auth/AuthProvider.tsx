import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { AppState, Linking, Platform } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './client';
import { parseAuthLink } from './rules';
import { diagnostics } from '../diagnostics';

export type Academy = { id: string; name: string; timezone: string; currency: string };
type AuthState = {
  session: Session | null; loading: boolean; academy: Academy | null;
  academyLoading: boolean; error: string; recovery: boolean;
  reload: () => void; logout: () => Promise<string | null>;
  finishRecovery: () => void; refreshAcademy: () => void;
};
const Context = createContext<AuthState | null>(null);

export function safeAuthFailure(code: 'AUTH_FAILURE' | 'SESSION_FAILURE' | 'ACADEMY_FAILURE' | 'AUTH_CALLBACK_FAILURE', message: string) {
  let reference = 'unavailable';
  try { reference = diagnostics.record(code).reference; } catch { /* Report failure must not mask recovery. */ }
  return `${message} Reference: ${reference}`;
}

// Single owner of authentication and academy state. See docs/ARCHITECTURE.md.
// Keep SDK lifecycle work here so screens cannot create competing auth subscriptions.
export function AuthProvider({ children }: React.PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [academy, setAcademy] = useState<Academy | null>(null);
  const [academyLoading, setAcademyLoading] = useState(false);
  // Tie academy readiness to the token that was actually checked. A refreshed/new
  // session must not briefly reveal a workspace validated for the previous token.
  const [checkedSession, setCheckedSession] = useState('');
  const [error, setError] = useState('');
  const [recovery, setRecovery] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    let active = true;
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      // Do not await SDK calls inside this callback: the SDK holds its auth lock.
      if (!active) return;
      if (event === 'PASSWORD_RECOVERY') setRecovery(true);
      if (event === 'SIGNED_OUT') { diagnostics.clear(); setAcademy(null); setRecovery(false); }
      setSession(next); setLoading(false);
    });
    void supabase.auth.getSession().then(({ data: value, error: failure }) => {
      if (!active) return;
      if (failure) setError(safeAuthFailure('SESSION_FAILURE', 'Your session could not be restored. Try again.'));
      else { setError(''); setSession(value.session); }
      setLoading(false);
    }).catch(() => {
      if (active) { setError(safeAuthFailure('SESSION_FAILURE', 'Your device could not restore the session. Try again.')); setLoading(false); }
    });
    return () => { active = false; data.subscription.unsubscribe(); };
  }, [revision]);

  useEffect(() => {
    if (!supabase || !session) { setAcademy(null); setAcademyLoading(false); setCheckedSession(''); return; }
    let active = true;
    setAcademyLoading(true); setAcademy(null); setError('');
    void (async () => {
      try {
        const user = await supabase.auth.getUser();
        if (user.error || !user.data.user) throw new Error('Session validation failed');
        if (!user.data.user.email_confirmed_at) {
          if (active) setError('Please verify your email address before continuing.');
          return;
        }
        const result = await supabase.from('academies').select('id,name,timezone,currency').eq('owner_id', user.data.user.id).maybeSingle();
        if (result.error) throw result.error;
        if (active) setAcademy(result.data);
      } catch {
        if (active) setError(safeAuthFailure('ACADEMY_FAILURE', 'Your workspace could not be loaded. Check your connection and retry.'));
      } finally { if (active) { setCheckedSession(session.access_token); setAcademyLoading(false); } }
    })();
    return () => { active = false; };
  }, [session?.access_token, revision]);

  useEffect(() => {
    if (!supabase || Platform.OS === 'web') return;
    // Mobile background timers are unreliable; refresh only while the app is active.
    const sync = () => { if (AppState.currentState === 'active') supabase!.auth.startAutoRefresh(); else supabase!.auth.stopAutoRefresh(); };
    sync();
    const subscription = AppState.addEventListener('change', sync);
    return () => { subscription.remove(); supabase!.auth.stopAutoRefresh(); };
  }, []);

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    let lastCode = '';
    const handle = async (url: string) => {
      try {
        const parsed = parseAuthLink(url, Platform.OS === 'web' ? globalThis.location.origin : undefined);
        if (!parsed) return;
        if (parsed.error || !parsed.code) throw new Error('Invalid email link');
        // Android may deliver the same initial link again as a live URL event.
        // Exchange a given one-time code once per mounted provider.
        if (parsed.code === lastCode) return;
        lastCode = parsed.code;
        // Remove code from browser history before doing a network operation.
        if (Platform.OS === 'web') globalThis.history.replaceState({}, '', '/');
        const result = await supabase!.auth.exchangeCodeForSession(parsed.code);
        if (result.error) throw result.error;
        if (active) { setRecovery(parsed.recovery); setError(''); }
      } catch {
        if (active) setError(safeAuthFailure('AUTH_CALLBACK_FAILURE', 'This email link could not be opened. Request a new link on this device.'));
      }
    };
    if (Platform.OS === 'web') void handle(globalThis.location.href);
    else {
      void Linking.getInitialURL().then(url => { if (url && active) void handle(url); });
    }
    const subscription = Linking.addEventListener('url', event => { void handle(event.url); });
    return () => { active = false; subscription.remove(); };
  }, []);

  const logout = useCallback(async () => {
    if (!supabase) return null;
    try {
      // End this device session. Account deletion and other-device logout are separate.
      const result = await supabase.auth.signOut({ scope: 'local' });
      if (result.error) throw result.error;
      setSession(null); setAcademy(null); setError(''); setRecovery(false); diagnostics.clear();
      return null;
    } catch { return safeAuthFailure('AUTH_FAILURE', 'Sign-out could not complete. Please retry.'); }
  }, []);

  return <Context.Provider value={{ session, loading, academy,
    academyLoading: academyLoading || (!!session && checkedSession !== session.access_token), error, recovery,
    reload: () => { setLoading(true); setRevision(x => x + 1); }, logout,
    finishRecovery: () => setRecovery(false), refreshAcademy: () => setRevision(x => x + 1) }}>{children}</Context.Provider>;
}

export function useAuth() {
  const value = useContext(Context);
  if (!value) throw new Error('Auth provider missing');
  return value;
}
