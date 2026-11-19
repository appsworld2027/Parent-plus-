import { WorkspaceSwitcher } from '../ui/WorkspaceSwitcher';
import { SignOutButton } from './SignOutButton';
import React, { useEffect, useState } from 'react';
import { randomUUID } from 'expo-crypto';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Text } from '../ui/Typography';
import { SafeAreaView } from 'react-native-safe-area-context';
import { appConfig } from '../config';
import { ErrorBoundary } from '../ErrorBoundary';
import { useAuth, safeAuthFailure } from './AuthProvider';
import { appSessionStorage, authRedirect, supabase } from './client';
import { AuthMode, validateAuth } from './rules';
import { ActionFeedback, useFeedback, useFeedbackMessage } from '../ui/ActionFeedback';

function Button({ title, onPress, disabled = false, soft = false }: { title: string; onPress: () => void; disabled?: boolean; soft?: boolean }) {
  const parent = useAuth().module === 'parent';
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    style={[s.button, soft && s.soft, parent && (soft ? s.parentSoft : s.parentButton), disabled && { opacity: 0.55 }]}>
    <Text style={[s.buttonLabel, soft && s.softLabel, parent && (soft ? s.parentText : s.parentButtonText)]}>{title}</Text>
  </Pressable>;
}
function Field({ label, value, onChange, password = false, email = false, disabled = false }: { label: string; value: string; onChange: (value: string) => void; password?: boolean; email?: boolean; disabled?: boolean }) {
  const parent = useAuth().module === 'parent';
  return <View style={s.field}><Text style={[s.label,parent&&s.parentText]}>{label}</Text><TextInput accessibilityLabel={label} value={value} onChangeText={onChange}
    secureTextEntry={password} autoCapitalize={password || email ? 'none' : 'words'} autoCorrect={false}
    keyboardType={email ? 'email-address' : 'default'} style={[s.input,parent&&s.parentInput,disabled&&{opacity:0.65}]} editable={!disabled} maxLength={password ? 200 : email ? 320 : 100} /></View>;
}
function Page({ children, signup = false, disabled = false }: React.PropsWithChildren<{ signup?: boolean; disabled?: boolean }>) {
  const parent = useAuth().module === 'parent';
  return <SafeAreaView style={[s.safe,parent&&s.parentSafe]}><WorkspaceSwitcher current={parent?'parent':'coach'} signup={signup} disabled={disabled} /><ActionFeedback /><KeyboardAvoidingView style={s.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.page}>
      <Text style={[s.logo,parent&&s.parentText]}>✦  {parent ? 'Parent Plus' : 'Parent Plus Coach'}</Text>{children}<Text style={s.footer}>A little more connected.</Text>
    </ScrollView></KeyboardAvoidingView></SafeAreaView>;
}

// Form state is intentionally local: handled request errors retain usable inputs,
// but unsaved values are not durable across app termination. Never log form contents.
function AuthForm({ onPreview, forceRecovery = false }: { onPreview: () => void; forceRecovery?: boolean }) {
  const auth = useAuth();
  const parent = auth.module === 'parent';
  const feedback = useFeedback();
  const [selected, setSelected] = useState<AuthMode>(() => {
    if(Platform.OS==='web'){
      if(/\/(coach|parent)\/signup\/?$/.test(globalThis.location?.pathname??''))return 'signup';
      if(globalThis.location?.pathname==='/auth/recovery')return 'recover';
    }
    return 'login';
  });
  const mode = forceRecovery ? 'updatePassword' : selected;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useFeedbackMessage('info', 'Email request completed');
  const [failure, setFailure] = useFeedbackMessage('error', 'Action needs attention');
  const titles = { login: 'Welcome back.', signup: parent ? 'More time for the little things.' : 'A calmer teaching day starts here.', recover: 'Let’s get you back in.', updatePassword: 'Choose a new password.' };
  function choose(next: AuthMode) { setSelected(next); setPassword(''); setConfirm(''); setMessage(''); setFailure(''); }
  async function submit() {
    if (busy) return;
    setMessage(''); setFailure('');
    const invalid = validateAuth(mode, email, password, confirm);
    if (invalid) { setFailure(invalid); return; }
    if (!supabase) { setFailure('The project connection needs configuration. Your coding partner can help.'); return; }
    setBusy(true); feedback.dismiss();
    try {
      if ((mode === 'signup' || mode === 'recover') &&
        (!globalThis.crypto?.getRandomValues || !globalThis.crypto?.subtle?.digest || typeof TextEncoder === 'undefined')) {
        throw new Error('Secure email-link support unavailable');
      }
      if (mode === 'login') {
        const result = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (result.error) throw result.error;
        feedback.show({ kind: 'success', title: 'Signed in', message: 'Your account is connected. Opening your workspace…', source: 'auth-sign-in' });
      } else if (mode === 'signup') {
        const result = await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: authRedirect(false,auth.module) } });
        if (result.error) throw result.error;
        setMessage('If registration is available for this email, a confirmation message will arrive. Open it on this device, then sign in.');
        setPassword(''); setConfirm('');
      } else if (mode === 'recover') {
        const result = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: authRedirect(true,auth.module) });
        if (result.error) throw result.error;
        setMessage(`If an account exists, a recovery email will arrive. Open the newest link ${Platform.OS==='web'?'in this browser':'on this device'}.`);
      } else {
        const result = await supabase.auth.updateUser({ password });
        if (result.error) throw result.error;
        setPassword(''); setConfirm('');
        feedback.show({ kind: 'success', title: 'Password updated', message: 'Your new password was saved.', source: 'auth-password' });
        auth.finishRecovery();
      }
    } catch (error) {
      const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : '';
      const text = code === 'invalid_credentials' ? 'Check your email and password, then try again.'
        : code === 'email_not_confirmed' ? 'Open your confirmation email before signing in.'
        : code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit' ? 'Too many attempts. Please wait a little before trying again.'
        : 'This request could not finish. Check your connection and try again.';
      setFailure(safeAuthFailure('AUTH_FAILURE', text));
    } finally { setBusy(false); }
  }
  return <Page signup disabled={busy || forceRecovery}>
    <Text style={[s.kicker,parent&&s.parentText]}>{parent?'YOUR FAMILY WORKSPACE':'YOUR COACH WORKSPACE'}</Text><Text accessibilityRole="header" style={[s.title,parent&&s.parentText]}>{titles[mode]}</Text>
    <Text style={[s.body,parent&&s.parentText]}>{mode === 'login' ? parent ? 'Sign in to your private family workspace.' : 'Sign in to keep your classes and parent feedback together.' : mode === 'signup' ? parent ? 'Create your account, verify your email, then set up your family.' : 'Create your owner account. Verify your email before setting up your academy.' : 'Your password stays private. Never share it with your coding partner.'}</Text>
    {!appConfig.configured && <Text style={s.notice}>Public project settings are missing. The interface is available, but sign-in is not connected.</Text>}
    {!!auth.error && <Text style={s.error}>{auth.error}</Text>}
    <View style={[s.card,parent&&s.parentCard]}>
      {mode !== 'updatePassword' && <Field label="Email address" email value={email} onChange={setEmail} />}
      {mode !== 'recover' && <Field label={mode === 'updatePassword' ? 'New password' : 'Password'} password value={password} onChange={setPassword} />}
      {(mode === 'signup' || mode === 'updatePassword') && <><Field label="Confirm password" password value={confirm} onChange={setConfirm} /><Text style={[s.hint,parent&&s.parentText]}>Use at least 10 characters.</Text></>}
      {!!failure && <Text style={s.error}>{failure}</Text>}
      {/* The fixed feedback area announces this result; retain inline context after dismissal. */}
      {!!message && <Text style={s.notice}>{message}</Text>}
      <Button title={busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : mode === 'signup' ? 'Create account' : mode === 'recover' ? 'Send recovery email' : 'Save new password'} onPress={() => { void submit(); }} disabled={busy} />
      {!forceRecovery && <>
        {mode !== 'login' && <Button title="Back to sign in" onPress={() => choose('login')} soft disabled={busy} />}
        {mode === 'login' && <><Button title="Create an account" onPress={() => choose('signup')} soft disabled={busy} /><Button title="Forgot password?" onPress={() => choose('recover')} soft disabled={busy} /></>}
      </>}
    </View>
    {appConfig.environment !== 'production' && !forceRecovery && <View style={s.preview}>
      <Text style={[s.hint,parent&&s.parentText]}>Development preview only. No signed-in records are loaded.</Text>
      <Button title="Explore interface preview" onPress={onPreview} soft />
    </View>}
  </Page>;
}

function AcademySetup() {
  const auth = useAuth();
  const feedback = useFeedback();
  const apverse = appConfig.projectRef === 'fmavpazczahxeusqbxuh';
  const [name, setName] = useState('');
  const [owner, setOwner] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useFeedbackMessage('error', 'Workspace needs attention');
  const [setupReady, setSetupReady] = useState(!apverse);
  const [attemptLocked, setAttemptLocked] = useState(false);
  const requestId = React.useRef('');
  const storageKey = apverse && auth.session ? `parentplus.coach-workspace-setup.v1.${auth.session.user.id}` : '';
  useEffect(() => {
    if (!apverse || !storageKey) { setSetupReady(true); return; }
    let active = true;
    void appSessionStorage.getItem(storageKey).then(saved => {
      if (!active) return;
      if (saved) {
        const value = JSON.parse(saved) as { requestId?: unknown; name?: unknown };
        if (typeof value.requestId !== 'string' || !/^[0-9a-f-]{36}$/i.test(value.requestId)
          || typeof value.name !== 'string' || value.name.trim().length < 2 || value.name.length > 120) {
          throw new Error('Saved workspace request is invalid');
        }
        requestId.current = value.requestId;
        setName(value.name);
        setAttemptLocked(true);
      } else requestId.current = randomUUID();
      setSetupReady(true);
    }).catch(() => {
      if (active) setError('A previous workspace setup could not be restored safely. Sign out and reconnect before retrying.');
    });
    return () => { active = false; };
  }, [apverse,storageKey,setError]);
  async function save() {
    if (busy) return;
    if (!name.trim() || (!apverse && !owner.trim())) { setError(apverse ? 'Enter your workspace name.' : 'Enter your name and academy name.'); return; }
    setBusy(true); setError(''); feedback.dismiss();
    try {
      if (apverse) {
        const request = requestId.current || randomUUID();
        requestId.current = request;
        await appSessionStorage.setItem(storageKey, JSON.stringify({ requestId: request, name: name.trim() }));
        setAttemptLocked(true);
        const created = await supabase!.rpc('create_workspace', { p_name: name.trim(), p_type: 'academy', p_request_id: request });
        if (created.error) throw created.error;
        if (typeof created.data !== 'string' || !/^[0-9a-f-]{36}$/i.test(created.data)) throw new Error('Workspace creation response was invalid');
        const zone = await supabase!.rpc('configure_private_workspace_zone', { p_workspace_id: created.data, p_zone: 'Asia/Kolkata' });
        if (zone.error) throw zone.error;
        await appSessionStorage.removeItem(storageKey);
      } else {
        const result = await supabase!.rpc('create_academy', { academy_name: name.trim(), owner_name: owner.trim() });
        if (result.error) throw result.error;
      }
      feedback.show({ kind: 'success', title: 'Workspace created', message: 'Your academy was saved. Loading your workspace…', source: 'academy-created' });
      auth.refreshAcademy();
    } catch { setError(safeAuthFailure('ACADEMY_FAILURE', apverse ? 'Workspace setup is not complete. Your request is saved; retry to safely continue the same setup.' : 'Your academy could not be saved. Your entries are still here; try again.')); }
    finally { setBusy(false); }
  }
  return <Page><Text style={s.kicker}>MAKE YOURSELF AT HOME</Text><Text accessibilityRole="header" style={s.title}>{apverse ? 'Your Coach workspace.' : 'Your academy, your way.'}</Text>
    <Text style={s.body}>Set up your workspace. You can add students and batches in the next module.</Text>
    <View style={s.card}>{!apverse && <Field label="Your name" value={owner} onChange={setOwner} />}<Field label={apverse ? 'Workspace name' : 'Academy name'} value={name} onChange={setName} disabled={attemptLocked} />
      <Text style={s.hint}>New workspaces use INR and Asia/Kolkata, the current ParentPlus defaults.</Text>
      {!!error && <Text style={s.error}>{error}</Text>}
      <Button title={busy ? 'Saving…' : 'Create my workspace'} onPress={() => { void save(); }} disabled={busy || !setupReady} />
      <SignOutButton disabled={busy} />
    </View></Page>;
}

function WorkspaceSelection() {
  const auth = useAuth();
  return <Page><Text style={s.kicker}>YOUR COACH WORKSPACES</Text><Text accessibilityRole="header" style={s.title}>Where would you like to work?</Text>
    <Text style={s.body}>Choose a workspace. Your access is checked again by APVerse whenever Coach data is requested.</Text>
    <View style={s.card}>{auth.academyChoices.map(choice => <Pressable key={choice.id} accessibilityRole="button" accessibilityLabel={`Open ${choice.name}`} onPress={() => auth.selectAcademy(choice.id)} style={s.workspaceChoice}>
      <Text style={s.workspaceName}>{choice.name}</Text><Text style={s.hint}>{choice.timezoneConfigured === false ? 'Time zone setup needed' : choice.timezone}</Text>
    </Pressable>)}<SignOutButton /></View>
  </Page>;
}

function WorkspaceTimeZoneSetup() {
  const auth = useAuth();
  const [busy,setBusy] = useState(false);
  const [error,setError] = useFeedbackMessage('error','Workspace needs attention');
  const academy = auth.academy!;
  async function configure() {
    if (busy || !supabase) return;
    setBusy(true);setError('');
    try {
      const result = await supabase.rpc('configure_private_workspace_zone',{p_workspace_id:academy.id,p_zone:'Asia/Kolkata'});
      if (result.error) throw result.error;
      auth.refreshAcademy();
    } catch (failure) {
      const code=typeof failure==='object'&&failure&&'code' in failure?String(failure.code):'';
      setError(code==='42501'?'Only an active workspace owner or admin can set its time zone. Ask the workspace owner to complete this setup.':safeAuthFailure('ACADEMY_FAILURE','The workspace time zone could not be saved. Retry or ask the owner to check workspace access.'));
    } finally { setBusy(false); }
  }
  return <Page><Text style={s.kicker}>WORKSPACE SETUP</Text><Text accessibilityRole="header" style={s.title}>Set the workspace time zone.</Text>
    <Text style={s.body}>{academy.name} has no time zone set. ParentPlus currently uses Asia/Kolkata for new workspaces; this setting controls class dates and attendance.</Text>
    <View style={s.card}><Text style={s.sectionLabel}>Asia/Kolkata</Text>{!!error&&<Text style={s.error}>{error}</Text>}
      <Button title={busy?'Saving…':'Use Asia/Kolkata'} onPress={()=>{void configure();}} disabled={busy}/><SignOutButton disabled={busy}/>
    </View></Page>;
}

// Render priority matters: loading and password recovery precede the workspace.
// The database still enforces ownership; hiding a screen is not an access policy.
export function AuthGate({ render }: { render: (exitPreview?: () => void) => React.ReactNode }) {
  const auth = useAuth();
  const parent = auth.module === 'parent';
  const [preview, setPreview] = useState(false);
  const [, showAuthError] = useFeedbackMessage('error', 'Account needs attention');
  useEffect(() => { showAuthError(auth.error); }, [auth.error, showAuthError]);
  if (preview && appConfig.environment !== 'production') return <ErrorBoundary>{render(() => setPreview(false))}</ErrorBoundary>;
  if (auth.loading || auth.academyLoading) return <Page><ActivityIndicator accessibilityLabel="Loading workspace" color="#1F6F6B" size="large" /><Text style={[s.body,parent&&s.parentText]}>Opening your workspace…</Text></Page>;
  if (auth.recovery && auth.session) return <AuthForm forceRecovery onPreview={() => {}} />;
  if (!auth.session) return <AuthForm onPreview={() => setPreview(true)} />;
  if (auth.error) return <Page><Text accessibilityRole="header" style={[s.title,parent&&s.parentText]}>Let’s reconnect.</Text><Text style={s.error}>{auth.error}</Text>
    <Button title="Retry connection" onPress={auth.reload} /><SignOutButton /></Page>;
  if (auth.module === 'coach' && auth.academyChoices.length > 1 && !auth.academy) return <WorkspaceSelection />;
  if (auth.module === 'coach' && auth.academy?.timezoneConfigured === false) return <WorkspaceTimeZoneSetup />;
  if (auth.module === 'coach' && !auth.academy) return <AcademySetup />;
  return <ErrorBoundary>{render()}</ErrorBoundary>;
}

const s = StyleSheet.create({
  parentSafe:{backgroundColor:'#060A0E'},parentText:{color:'#F9FBFC'},parentCard:{backgroundColor:'#151A20',borderColor:'#313A45'},parentInput:{backgroundColor:'#20262F',borderColor:'#313A45',color:'#F9FBFC'},parentButton:{backgroundColor:'#2EE6A6'},parentButtonText:{color:'#06251B'},parentSoft:{backgroundColor:'#20262F'},
  safe: { flex: 1, backgroundColor: '#F3F5F1' }, fill: { flex: 1 },
  page: { width: '100%', maxWidth: 520, alignSelf: 'center', padding: 25, gap: 20, flexGrow: 1, justifyContent: 'center' },
  logo: { color: '#1F6F6B', fontSize: 20, fontWeight: '700', marginVertical: 12 },
  kicker: { color: '#1F6F6B', fontSize: 10, letterSpacing: 1.6, fontWeight: '700' },
  title: { color: '#22303A', fontSize: 34, lineHeight: 40, fontWeight: '700', letterSpacing: -1 },
  body: { color: '#5C6B73', fontSize: 15, lineHeight: 24 },
  card: { backgroundColor: '#fff', padding: 20, borderRadius: 20, borderWidth: 1, borderColor: '#E3E8E2', gap: 16 },
  field: { gap: 8 }, label: { color: '#22303A', fontSize: 13, fontWeight: '600' },
  input: { borderWidth: 1, borderColor: '#CED8CC', borderRadius: 12, padding: 13, minHeight: 48, fontSize: 16, color: '#22303A', backgroundColor: '#FAFBF8' },
  button: { minHeight: 48, padding: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1F6F6B' },
  buttonLabel: { color: '#fff', fontWeight: '700', fontSize: 14 }, soft: { backgroundColor: '#EDF1EC' }, softLabel: { color: '#22303A' },
  hint: { color: '#5C6B73', fontSize: 12, lineHeight: 20 }, preview: { gap: 10, paddingTop: 10 },
  error: { color: '#8D2635', backgroundColor: '#FCE8EB', padding: 14, borderRadius: 12, lineHeight: 22 },
  workspaceChoice:{padding:16,borderWidth:1,borderColor:'#CED8CC',borderRadius:14,gap:6},workspaceName:{color:'#22303A',fontSize:16,fontWeight:'700'},sectionLabel:{color:'#22303A',fontSize:16,fontWeight:'700'},
  notice: { color: '#1F6F6B', backgroundColor: '#DCEDEA', padding: 14, borderRadius: 12, lineHeight: 22 },
  footer: { color: '#63756F', textAlign: 'center', fontSize: 11, paddingVertical: 12 },
});
