import { WorkspaceSwitcher } from '../ui/WorkspaceSwitcher';
import { SignOutButton } from './SignOutButton';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text, TextInput } from '../ui/Typography';
import { prototypeColors as c, prototypeWeight } from '../ui/prototypeTheme';
import { PrototypeIcon } from '../ui/PrototypeIcon';
import { SafeAreaView } from 'react-native-safe-area-context';
import { appConfig } from '../config';
import { ErrorBoundary } from '../ErrorBoundary';
import { useAuth, safeAuthFailure, SESSION_ENDED } from './AuthProvider';
import { authRedirect, supabase } from './client';
import { AuthMode, validateAuth } from './rules';
import { ActionFeedback, useFeedback, useFeedbackMessage } from '../ui/ActionFeedback';

function Button({ title, onPress, disabled = false, soft = false }: { title: string; onPress: () => void; disabled?: boolean; soft?: boolean }) {
  const parent = useAuth().module === 'parent';
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    style={[s.button, soft && s.soft, parent && (soft ? s.parentSoft : s.parentButton), disabled && { opacity: 0.55 }]}>
    <Text style={[s.buttonLabel, soft && s.softLabel, parent && (soft ? s.parentText : s.parentButtonText)]}>{title}</Text>
  </Pressable>;
}
function Field({ label, value, onChange, password = false, email = false }: { label: string; value: string; onChange: (value: string) => void; password?: boolean; email?: boolean }) {
  const parent = useAuth().module === 'parent';
  return <View style={s.field}><Text style={[s.label,parent&&s.parentText]}>{label}</Text><TextInput accessibilityLabel={label} value={value} onChangeText={onChange}
    secureTextEntry={password} autoCapitalize={password || email ? 'none' : 'words'} autoCorrect={false}
    keyboardType={email ? 'email-address' : 'default'} style={[s.input,parent&&s.parentInput]} maxLength={password ? 200 : email ? 320 : 100} /></View>;
}
function Page({ children, signup = false, disabled = false }: React.PropsWithChildren<{ signup?: boolean; disabled?: boolean }>) {
  const parent = useAuth().module === 'parent';
  return <SafeAreaView style={[s.safe,parent&&s.parentSafe]}><WorkspaceSwitcher current={parent?'parent':'coach'} signup={signup} disabled={disabled} /><ActionFeedback /><KeyboardAvoidingView style={s.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.page}>
      <View style={s.logoRow}><View style={s.logoMark}><PrototypeIcon name="star" size={16} strokeWidth={2.2} color={c.black}/></View><Text style={s.logo}>{parent ? 'Parent Plus' : 'Parent Plus Coach'}</Text></View>{children}<Text style={s.footer}>A little more connected.</Text>
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
  const [name, setName] = useState('');
  const [owner, setOwner] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useFeedbackMessage('error', 'Workspace needs attention');
  async function save() {
    if (busy) return;
    if (!name.trim() || !owner.trim()) { setError('Enter your name and academy name.'); return; }
    setBusy(true); setError(''); feedback.dismiss();
    try {
      const result = await supabase!.rpc('create_academy', { academy_name: name.trim(), owner_name: owner.trim() });
      if (result.error) throw result.error;
      feedback.show({ kind: 'success', title: 'Workspace created', message: 'Your academy was saved. Loading your workspace…', source: 'academy-created' });
      auth.refreshAcademy();
    } catch { setError(safeAuthFailure('ACADEMY_FAILURE', 'Your academy could not be saved. Your entries are still here; try again.')); }
    finally { setBusy(false); }
  }
  return <Page><Text style={s.kicker}>MAKE YOURSELF AT HOME</Text><Text accessibilityRole="header" style={s.title}>Your academy, your way.</Text>
    <Text style={s.body}>Set up your workspace. You can add students and batches in the next module.</Text>
    <View style={s.card}><Field label="Your name" value={owner} onChange={setOwner} /><Field label="Academy name" value={name} onChange={setName} />
      <Text style={s.hint}>Starting with INR and Asia/Kolkata.</Text>
      {!!error && <Text style={s.error}>{error}</Text>}
      <Button title={busy ? 'Saving…' : 'Create my workspace'} onPress={() => { void save(); }} disabled={busy} />
      <SignOutButton disabled={busy} />
    </View></Page>;
}

// Render priority matters: loading and password recovery precede the workspace.
// The database still enforces ownership; hiding a screen is not an access policy.
export function AuthGate({ render }: { render: (exitPreview?: () => void) => React.ReactNode }) {
  const auth = useAuth();
  const parent = auth.module === 'parent';
  const [preview, setPreview] = useState(false);
  const [, showAuthError] = useFeedbackMessage('error', 'Account needs attention');
  // M18 already shows inline on the sign-in screen; a second toast would repeat it.
  useEffect(() => { showAuthError(auth.error === SESSION_ENDED ? '' : auth.error); }, [auth.error, showAuthError]);
  if (preview && appConfig.environment !== 'production') return <ErrorBoundary>{render(() => setPreview(false))}</ErrorBoundary>;
  if (auth.loading || auth.academyLoading) return <Page><ActivityIndicator accessibilityLabel="Loading workspace" color={c.sky} size="large" /><Text style={[s.body,parent&&s.parentText]}>Opening your workspace…</Text></Page>;
  if (auth.recovery && auth.session) return <AuthForm forceRecovery onPreview={() => {}} />;
  if (!auth.session) return <AuthForm onPreview={() => setPreview(true)} />;
  if (auth.error) return <Page><Text accessibilityRole="header" style={[s.title,parent&&s.parentText]}>Let’s reconnect.</Text><Text style={s.error}>{auth.error}</Text>
    <Button title="Retry connection" onPress={auth.reload} /><SignOutButton /></Page>;
  if (auth.module === 'coach' && !auth.academy) return <AcademySetup />;
  return <ErrorBoundary>{render()}</ErrorBoundary>;
}

const s = StyleSheet.create({
  parentSafe:{backgroundColor:c.background},parentText:{},parentCard:{backgroundColor:c.surface,borderColor:c.border},parentInput:{backgroundColor:c.raised,borderColor:c.border,color:c.white},parentButton:{backgroundColor:c.white},parentButtonText:{color:c.black},parentSoft:{backgroundColor:c.raised},
  safe:{flex:1,backgroundColor:c.background},fill:{flex:1},page:{width:'100%',alignSelf:'center',padding:18,gap:16,flexGrow:1,justifyContent:'center'},
  logoRow:{flexDirection:'row',alignItems:'center',gap:9,marginBottom:12},logoMark:{width:30,height:30,backgroundColor:c.white,borderRadius:10,alignItems:'center',justifyContent:'center'},
  logo:{color:c.white,fontSize:15,fontWeight:'800'},kicker:{color:c.sky,fontSize:10.5,letterSpacing:1.2,fontWeight:'800'},
  title:{color:c.white,fontSize:30,lineHeight:31.5,fontWeight:'700',letterSpacing:-1.2},body:{color:c.muted,fontSize:13,lineHeight:18.2},
  card:{backgroundColor:c.surface,padding:14,borderRadius:18,borderWidth:1,borderColor:c.border,gap:14},field:{gap:7},label:{color:c.muted,fontSize:12,fontWeight:prototypeWeight(750)},
  input:{borderWidth:1,borderColor:c.border,borderRadius:12,paddingVertical:10,paddingHorizontal:11,minHeight:44,fontSize:13,color:c.white,backgroundColor:c.raised},
  button:{minHeight:44,paddingVertical:13,paddingHorizontal:16,borderRadius:14,alignItems:'center',justifyContent:'center',backgroundColor:c.white},
  buttonLabel:{color:c.black,fontWeight:'800',fontSize:13.5},soft:{backgroundColor:c.raised},softLabel:{color:c.white},hint:{color:c.muted,fontSize:11.5,lineHeight:17},preview:{gap:10,paddingTop:10},
  error:{color:c.rose,backgroundColor:c.raised,padding:12,borderRadius:14,lineHeight:19},notice:{color:c.sky,backgroundColor:c.raised,padding:12,borderRadius:14,lineHeight:19},
  footer:{color:c.dim,textAlign:'center',fontSize:10.5,paddingVertical:12},
});
