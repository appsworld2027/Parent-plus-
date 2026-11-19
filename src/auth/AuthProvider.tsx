import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState, Linking, Platform } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './client';
import { listCoachWorkspaces } from './coachWorkspaces';
import { appConfig } from '../config';
import { parseAuthLink } from './rules';
import { clearFeedbackJourney } from '../parent/feedbackJourney';
import { diagnostics } from '../diagnostics';
import { observationDrafts } from '../observations/localDrafts';
import { attendanceDrafts } from '../classes/localDrafts';
import { useFeedback } from '../ui/ActionFeedback';

export type Academy = { id: string; name: string; timezone: string; currency?: string; timezoneConfigured?: boolean };
type AuthState = {
  module: 'coach' | 'parent';
  session: Session | null; loading: boolean; academy: Academy | null;
  academyChoices: Academy[]; selectAcademy: (id: string) => void;
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

// Single owner of authentication and academy state. See ai-workspace/architecture/ARCHITECTURE.md.
// Keep SDK lifecycle work here so screens cannot create competing auth subscriptions.
export function AuthProvider({ children, module = 'coach' }: React.PropsWithChildren<{ module?: 'coach' | 'parent' }>) {
  const { show, dismiss } = useFeedback();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [academy, setAcademy] = useState<Academy | null>(null);
  const [academyChoices, setAcademyChoices] = useState<Academy[]>([]);
  const selectedAcademyId = useRef<string | null>(null);
  const [academyLoading, setAcademyLoading] = useState(false);
  // Tie academy readiness to the token that was actually checked. A refreshed/new
  // session must not briefly reveal a workspace validated for the previous token.
  const [checkedSession, setCheckedSession] = useState('');
  const [error, setError] = useState('');
  const [recovery, setRecovery] = useState(false);
  const [revision, setRevision] = useState(0);
  const draftCleanup = useRef<Promise<string | null>>(Promise.resolve(null));

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    let active = true;
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      // Do not await SDK calls inside this callback: the SDK holds its auth lock.
      if (!active) return;
      if (event === 'PASSWORD_RECOVERY') setRecovery(true);
      if (event === 'SIGNED_OUT') {
        if (Platform.OS === 'web') { try { clearFeedbackJourney(globalThis.sessionStorage); globalThis.sessionStorage.removeItem('parentplus.family-child.v1'); } catch { /* Account ownership is still checked before use. */ } }
        diagnostics.clear(); setAcademy(null); setAcademyChoices([]); selectedAcademyId.current = null; setRecovery(false);
        // Invalidate observation writers synchronously; queued removal runs once.
        // Explicit logout awaits this same job instead of racing a second clear.
        draftCleanup.current = Promise.all([attendanceDrafts.clear(), observationDrafts.clear()]).then(() => null).catch(() => {
          const message = safeAuthFailure('SESSION_FAILURE', 'You are signed out, but a device draft could not be cleared. Your coding partner can help.');
          if (active) setError(message);
          return message;
        });
      }
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
    if (!supabase || !session) { setAcademy(null); setAcademyChoices([]); selectedAcademyId.current = null; setAcademyLoading(false); setCheckedSession(''); return; }
    let active = true;
    setAcademyLoading(true); setAcademy(null); setError('');
    setAcademyChoices([]);
    void (async () => {
      try {
        const user = await supabase.auth.getUser();
        if (user.error || !user.data.user) throw new Error('Session validation failed');
        if (!user.data.user.email_confirmed_at) {
          if (active) setError('Please verify your email address before continuing.');
          return;
        }
        if (module === 'parent') return;
        if (appConfig.projectRef === 'fmavpazczahxeusqbxuh') {
          const workspaces = await listCoachWorkspaces(async (name, args) => {
            const result = await supabase!.rpc(name, args);
            return { data: result.data, error: result.error };
          });
          const choices: Academy[] = workspaces.map(workspace => ({
            id: workspace.id,
            name: workspace.name,
            timezone: workspace.timezone ?? 'Asia/Kolkata',
            timezoneConfigured: workspace.timezone !== null,
          }));
          if (active) {
            setAcademyChoices(choices);
            const selected = choices.find(choice => choice.id === selectedAcademyId.current);
            const next = selected ?? (choices.length === 1 ? choices[0] : null);
            selectedAcademyId.current = next?.id ?? null;
            setAcademy(next);
          }
        } else {
          const result = await supabase.from('academies').select('id,name,timezone,currency').eq('owner_id', user.data.user.id).maybeSingle();
          if (result.error) throw result.error;
          if (active) {
            const choices = result.data ? [result.data] : [];
            setAcademyChoices(choices);
            const next = choices.find(choice => choice.id === selectedAcademyId.current) ?? result.data;
            selectedAcademyId.current = next?.id ?? null;
            setAcademy(next);
          }
        }
      } catch {
        if (active) setError(safeAuthFailure('ACADEMY_FAILURE', 'Your workspace could not be loaded. Check your connection and retry.'));
      } finally { if (active) { setCheckedSession(session.access_token); setAcademyLoading(false); } }
    })();
    return () => { active = false; };
  }, [session?.access_token, revision, module]);

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
        const incoming=new URL(url);
        // The public recovery address is also a useful "Forgot password"
        // entry point. An address without an email code is never a session.
        if(Platform.OS==='web'&&parsed.recovery&&!parsed.code&&!parsed.error&&!incoming.hash
          &&[...incoming.searchParams.keys()].every(key=>key==='module'))return;
        if (Platform.OS === 'web') globalThis.history.replaceState({}, '', module === 'parent' ? '/parent' : '/');
        if (parsed.error || !parsed.code) throw new Error('Invalid email link');
        // Android may deliver the same initial link again as a live URL event.
        // Exchange a given one-time code once per mounted provider.
        if (parsed.code === lastCode) return;
        lastCode = parsed.code;
        // Sensitive callback parameters have been removed before any exchange.
        // Capture the exact PKCE flow before removing URL parameters. Without
        // it the SDK can use a newer email's fallback proof and burn this code.
        const result = await supabase!.auth.exchangeCodeForSession(parsed.code,parsed.flowId?{flowId:parsed.flowId}:undefined);
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
    dismiss();
    try {
      // End this device session. Account deletion and other-device logout are separate.
      const result = await supabase.auth.signOut({ scope: 'local' });
      if (result.error) throw result.error;
      setSession(null); setAcademy(null); setAcademyChoices([]); selectedAcademyId.current = null; setError(''); setRecovery(false); diagnostics.clear();
      const cleanupError = await draftCleanup.current;
      if (cleanupError) { setError(cleanupError); return cleanupError; }
      await diagnostics.flush();
      show({ kind: 'success', title: 'Signed out', message: 'Your session and device-only drafts have been cleared.', source: 'auth-sign-out' });
      return null;
    } catch { return safeAuthFailure('AUTH_FAILURE', 'Sign-out could not complete. Please retry.'); }
  }, [show, dismiss]);

  const selectAcademy = useCallback((id: string) => {
    const selected = academyChoices.find(choice => choice.id === id);
    if (selected) { selectedAcademyId.current = selected.id; setAcademy(selected); }
  }, [academyChoices]);

  return <Context.Provider value={{ module, session, loading, academy, academyChoices, selectAcademy,
    academyLoading: academyLoading || (!!session && checkedSession !== session.access_token), error, recovery,
    reload: () => { setLoading(true); setRevision(x => x + 1); }, logout,
    finishRecovery: () => setRecovery(false), refreshAcademy: () => setRevision(x => x + 1) }}>{children}</Context.Provider>;
}

export function useAuth() {
  const value = useContext(Context);
  if (!value) throw new Error('Auth provider missing');
  return value;
}
