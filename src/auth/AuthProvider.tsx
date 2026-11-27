import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState, Linking, Platform } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './client';
import { parseAuthLink } from './rules';
import { clearFeedbackJourney } from '../parent/feedbackJourney';
import { diagnostics } from '../diagnostics';
import { observationDrafts } from '../observations/localDrafts';
import { attendanceDrafts } from '../classes/localDrafts';
import { useFeedback } from '../ui/ActionFeedback';
import { deviceStorage } from '../deviceStorage';

// M18 and M13: exact wording from the approved Login contracts (docs/product/login-session-stability).
export const SESSION_ENDED = 'Your session ended. Please sign in again.';
// M16: a confirmation link that could not sign this device in. Never claims the email is unverified.
export const LINK_NOT_SIGNED_IN = 'We could not sign you in from this link. Try signing in. If your email is not confirmed yet, request a new link.';
export const LINK_UNUSABLE = 'This link could not be used. Request a new one from this device, then open the newest email here.';
// Which account is in the middle of a password reset. Kept on this device (this tab on web) so a
// reload or app restart cannot open the workspace before a new password is saved (RC-03).
const RECOVERY_KEY = 'parentplus.recovery.pending.v1';
export type Academy = { id: string; name: string; timezone: string; currency: string };
type AuthState = {
  module: 'coach' | 'parent';
  session: Session | null; loading: boolean; academy: Academy | null;
  academyLoading: boolean; error: string; recovery: boolean;
  reload: () => void; logout: (options?: { keepDrafts?: boolean; everywhere?: boolean }) => Promise<string | null>; dismissError: () => void;
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
export function AuthProvider({ children, module = 'coach' }: React.PropsWithChildren<{ module?: 'coach' | 'parent' }>) {
  const { show, dismiss } = useFeedback();
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
  const draftCleanup = useRef<Promise<string | null>>(Promise.resolve(null));
  // True only while the coach themselves is signing out. Any other SIGNED_OUT
  // (service ended or revoked the session) must keep unsent drafts (C1.1a SS-04/05).
  const chosenSignOut = useRef(false);
  // Cancel during a password reset ends the session but is not a request to delete drafts.
  const keepDraftsSignOut = useRef(false);
  // Set when the service (not the coach) ended the session, so a failing academy check
  // cannot replace the M18 message with a different error.
  const sessionEndedByService = useRef(false);
  const [recheck, setRecheck] = useState(0);
  const [recoveryChecked, setRecoveryChecked] = useState('');

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    let active = true;
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      // Do not await SDK calls inside this callback: the SDK holds its auth lock.
      if (!active) return;
      if (event === 'PASSWORD_RECOVERY') setRecovery(true);
      if (event === 'SIGNED_OUT') {
        if (Platform.OS === 'web') { try { clearFeedbackJourney(globalThis.sessionStorage); globalThis.sessionStorage.removeItem('parentplus.family-child.v1'); } catch { /* Account ownership is still checked before use. */ } }
        diagnostics.clear(); setAcademy(null); setRecovery(false); void deviceStorage.removeItem(RECOVERY_KEY).catch(() => undefined);
        // Invalidate observation writers synchronously; queued removal runs once.
        // Explicit logout awaits this same job instead of racing a second clear.
        if (!chosenSignOut.current && !keepDraftsSignOut.current) { sessionEndedByService.current = true; setError(SESSION_ENDED); }
        draftCleanup.current = !chosenSignOut.current ? Promise.resolve(null) : Promise.all([attendanceDrafts.clear(), observationDrafts.clear()]).then(() => null).catch(() => {
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

  const [linkFailed, setLinkFailed] = useState<'' | 'recovery' | 'confirm'>('');
  const userId = session?.user.id;
  // A bad link must never replace a working signed-in screen (SS-10). Wait until the
  // stored session is known, then tell a signed-in coach with a message and keep them in.
  useEffect(() => {
    if (!linkFailed || loading) return;
    const text = linkFailed === 'recovery' ? LINK_UNUSABLE : LINK_NOT_SIGNED_IN;
    setLinkFailed('');
    if (session) show({ kind: 'error', title: 'Link not used', message: text, source: 'auth-link' });
    else setError(safeAuthFailure('AUTH_CALLBACK_FAILURE', text));
  }, [linkFailed, loading, session, show]);

  // Restore an unfinished reset before any workspace screen can render, and keep it saved.
  useEffect(() => {
    if (!userId) { setRecoveryChecked(''); return; }
    let live = true;
    void (async () => {
      try { const saved = await deviceStorage.getItem(RECOVERY_KEY); if (saved === userId || saved === 'pending') setRecovery(true); } catch { /* No saved reset. */ }
      if (live) setRecoveryChecked(userId);
    })();
    return () => { live = false; };
  }, [userId]);
  useEffect(() => {
    if (recovery && userId) void deviceStorage.setItem(RECOVERY_KEY, userId).catch(() => undefined);
  }, [recovery, userId]);

  // Unsent drafts belong to one coach. A different coach signing in deletes them (SS-06).
  useEffect(() => {
    if (!userId) return;
    setError(current => (current === SESSION_ENDED ? '' : current));
    void (async () => {
      try {
        sessionEndedByService.current = false;
        // Remove only the exact draft that was read, so a draft the new coach saves
        // in the meantime is never deleted. Drafts also expire after 7 days (SS-05).
        const expired = (savedAt: string) => Date.now() - Date.parse(savedAt) > 7 * 24 * 60 * 60 * 1000;
        const attendance = await attendanceDrafts.read();
        if (attendance && (attendance.owner !== userId || expired(attendance.savedAt))) {
          await attendanceDrafts.clear({ owner: attendance.owner, academy: attendance.academy, session: attendance.session });
        }
        const observation = await observationDrafts.read();
        if (observation && (observation.owner !== userId || expired(observation.savedAt))) await observationDrafts.clear(observation);
      } catch { /* Ownership is still checked before any draft is shown. */ }
    })();
  }, [userId]);

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
        if (module === 'parent') return;
        const result = await supabase.from('academies').select('id,name,timezone,currency').eq('owner_id', user.data.user.id).maybeSingle();
        if (result.error) throw result.error;
        if (active) setAcademy(result.data);
      } catch {
        if (active && !sessionEndedByService.current) setError(safeAuthFailure('ACADEMY_FAILURE', 'Your workspace could not be loaded. Check your connection and retry.'));
      } finally { if (active) { setCheckedSession(session.user.id); setAcademyLoading(false); } }
    })();
    return () => { active = false; };
  }, [session?.user.id, revision, recheck, module]);

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
      let recoveryLink = false;
      try {
        const parsed = parseAuthLink(url, Platform.OS === 'web' ? globalThis.location.origin : undefined);
        if (!parsed) return;
        recoveryLink = parsed.recovery;
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
        // Mark the reset as pending before the session exists, so a kill or restart cannot reach the workspace.
        if (parsed.recovery) await deviceStorage.setItem(RECOVERY_KEY, 'pending').catch(() => undefined);
        const result = await supabase!.auth.exchangeCodeForSession(parsed.code,parsed.flowId?{flowId:parsed.flowId}:undefined);
        if (result.error) { await deviceStorage.removeItem(RECOVERY_KEY).catch(() => undefined); throw result.error; }
        // A new session arrived by link: check the account and academy again.
        if (active) { setRecovery(parsed.recovery); setError(''); setRecheck(value => value + 1); }
      } catch {
        if (!active) return;
        setLinkFailed(recoveryLink ? 'recovery' : 'confirm'); // Reported once the stored session has been restored (see effect below).
      }
    };
    if (Platform.OS === 'web') void handle(globalThis.location.href);
    else {
      void Linking.getInitialURL().then(url => { if (url && active) void handle(url); });
    }
    const subscription = Linking.addEventListener('url', event => { void handle(event.url); });
    return () => { active = false; subscription.remove(); };
  }, []);

  const logout = useCallback(async (options?: { keepDrafts?: boolean; everywhere?: boolean }) => {
    if (!supabase) return null;
    dismiss();
    try {
      // End this device session. Account deletion and other-device logout are separate.
      if (options?.keepDrafts) keepDraftsSignOut.current = true; else chosenSignOut.current = true;
      const result = await supabase.auth.signOut({ scope: options?.everywhere ? 'global' : 'local' });
      if (result.error) throw result.error;
      setSession(null); setAcademy(null); setError(''); setRecovery(false); diagnostics.clear();
      const cleanupError = await draftCleanup.current;
      if (cleanupError) { setError(cleanupError); return cleanupError; }
      await diagnostics.flush();
      show({ kind: 'success', title: 'Signed out', message: options?.keepDrafts ? 'Your session ended. Unsent drafts stay on this device.' : 'Your session and device-only drafts have been cleared.', source: 'auth-sign-out' });
      return null;
    } catch { return safeAuthFailure('AUTH_FAILURE', 'Sign-out could not complete. Please retry.'); }
    finally { chosenSignOut.current = false; keepDraftsSignOut.current = false; }
  }, [show, dismiss]);

  return <Context.Provider value={{ module, session, loading, academy,
    academyLoading: academyLoading || (!!session && (checkedSession !== session.user.id || recoveryChecked !== session.user.id)), error, recovery,
    reload: () => { setLoading(true); setRevision(x => x + 1); }, logout,
    dismissError: () => setError(''), finishRecovery: () => { setRecovery(false); void deviceStorage.removeItem(RECOVERY_KEY).catch(() => undefined); }, refreshAcademy: () => setRevision(x => x + 1) }}>{children}</Context.Provider>;
}

export function useAuth() {
  const value = useContext(Context);
  if (!value) throw new Error('Auth provider missing');
  return value;
}
