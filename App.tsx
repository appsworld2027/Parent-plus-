import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, Keyboard, Platform, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { Text } from './src/ui/Typography';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { appConfig } from './src/config';
import { diagnostics } from './src/diagnostics';
import { deviceStorage } from './src/deviceStorage';
import { ErrorBoundary } from './src/ErrorBoundary';
import { AuthProvider, useAuth } from './src/auth/AuthProvider';
import { AuthGate } from './src/auth/AuthGate';
import { RosterScreen } from './src/roster/RosterScreen';
import { ClassesScreen } from './src/classes/ClassesScreen';
import { ObservationsScreen } from './src/observations/ObservationsScreen';
import { ParentConnectionApprovals } from './src/parent/ParentConnectionApprovals';
import ParentApp from './src/parent/ParentApp';
import { FeesScreen } from './src/fees/FeesScreen';
import { ListingScreen } from './src/provider/ListingScreen';
import { ProviderProfileScreen } from './src/provider/ProviderProfileScreen';
import { SignOutButton } from './src/auth/SignOutButton';
import { AccountSettings } from './src/auth/AccountSettings';
import { CoachSetupCard } from './src/onboarding/CoachSetupCard';
import { TodayClasses } from './src/classes/TodayClasses';
import { appVersion, buildRevision } from './src/version';
import { ConfirmDialog } from './src/ui/ConfirmDialog';
import { WorkspaceSwitcher } from './src/ui/WorkspaceSwitcher';
import { FontLicense } from './src/ui/FontLicense';
import { prototypeColors as c, prototypeWeight } from './src/ui/prototypeTheme';
import { PrototypeIcon } from './src/ui/PrototypeIcon';
import { PrototypeFrame } from './src/ui/PrototypeFrame';
import { ActionFeedback, FeedbackProvider, useFeedbackMessage } from './src/ui/ActionFeedback';
import { NeedsYou } from './src/today/NeedsYou';
import { loadNeedsYouData } from './src/today/service';
import { CoachSignals } from './src/today/CoachSignals';
import { supabase } from './src/auth/client';
import type { Student } from './src/roster/model';
import type { Enrolment } from './src/roster/model';
import type { Observation } from './src/observations/model';
import type { Recipient } from './src/observations/model';

function coachGreeting(timezone:string) { const hour=Number(new Intl.DateTimeFormat('en-GB',{hour:'numeric',hourCycle:'h23',timeZone:timezone}).format(new Date())); return hour<12?'Good morning':hour<17?'Good afternoon':'Good evening'; }

type Screen = 'Today' | 'Schedule' | 'Post' | 'Students' | 'Fees' | 'Profile' | 'Listing' | 'Support';
const tabs: { name: Screen; glyph: string }[] = [
  { name: 'Today', glyph: 'home' }, { name: 'Schedule', glyph: 'cal' },
  { name: 'Post', glyph: 'plus' }, { name: 'Students', glyph: 'users' }, { name: 'Fees', glyph: 'wallet' }, { name: 'Profile', glyph: 'users' }, { name: 'Listing', glyph: 'star' },
];
const stages: Record<string, { title: string; body: string; detail: string }> = {
  Schedule: { title: 'A little structure. More room to teach.', body: 'Your batches and dated class sessions will live here.', detail: 'Scheduling follows account and academy setup. No classes have been loaded.' },
  Post: { title: 'Small observations. Meaningful progress.', body: 'Write an update for a child or your whole batch.', detail: 'Open a class, write feedback, review it and share the child’s update to Parent.' },
  Students: { title: 'Every child has their own story.', body: 'Keep your students, guardian contacts, and batches together.', detail: 'Student management follows secure account setup. No student records have been loaded.' },
  Fees: { title: 'A clearer picture of your fees.', body: 'Invoices, balances, and verified payment updates in one place.', detail: 'Fee tracking and hosted payment links are planned. Live collection is not enabled.' },
};

function Action({ label, onPress, secondary = false }: { label: string; onPress: () => void; secondary?: boolean }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.button, secondary && styles.secondary, pressed && styles.pressed]}>
    <Text style={[styles.buttonLabel, secondary && styles.secondaryLabel]}>{label}</Text>
  </Pressable>;
}

// Workspace navigation stays here; feature forms own their inputs and API calls.
// Feature dirty/busy callbacks let tab changes and Android Back respect pending edits.
function AppContent({ exitPreview }: { exitPreview?: () => void }) {
  const auth = useAuth();
  const [screen, setScreen] = useState<Screen>('Today');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [launchRosterSetup,setLaunchRosterSetup]=useState(false);
  const [launchBatch,setLaunchBatch]=useState(false);
  const [classLaunch,setClassLaunch]=useState<{batch?:string;session?:string}|null>(null);
  const [feedbackLaunch,setFeedbackLaunch]=useState<{session:import('./src/classes/model').ClassSession;students:string[]}|null>(null);
  const feedbackLaunchHandled=useCallback(()=>setFeedbackLaunch(null),[]);
  const rosterLaunchHandled=useCallback(()=>{setLaunchRosterSetup(false);setLaunchBatch(false);},[]);
  const [report, setReport] = useState('');
  const [notice, setNotice] = useFeedbackMessage('info', 'Update');
  const [crash, setCrash] = useState(false);
  const [formDirty, setFormDirty] = useState(false);
  const [formBusy, setFormBusy] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<Screen | null>(null);
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const scrollToTop = useCallback(() => scroll.current?.scrollTo({ y: 0, animated: false }), []);
  useEffect(scrollToTop, [screen, scrollToTop]);

  // Needs you data
  const [needsYouStudents, setNeedsYouStudents] = useState<Student[]>([]);
  const [needsYouEnrolments, setNeedsYouEnrolments] = useState<Enrolment[]>([]);
  const [needsYouObservations, setNeedsYouObservations] = useState<Observation[]>([]);
  const [needsYouRecipients, setNeedsYouRecipients] = useState<Recipient[]>([]);
  const [needsYouError, setNeedsYouError] = useState<string | null>(null);
  const [needsYouLoading, setNeedsYouLoading] = useState(false);

  useEffect(() => {
    if (screen !== 'Today' || !auth.academy) return;
    let active = true;
    setNeedsYouLoading(true);
    setNeedsYouError(null);
    async function load() {
      try {
        const data = await loadNeedsYouData(auth.academy!.id);
        if (!active) return;
        setNeedsYouStudents(data.students);
        setNeedsYouEnrolments(data.enrolments);
        setNeedsYouObservations(data.observations);
        setNeedsYouRecipients(data.recipients);
      } catch (error) {
        if (active) {
          const ref = diagnostics.record('OBSERVATION_FAILURE').reference;
          setNeedsYouError(`Needs you list could not load. Reference: ${ref}`);
        }
      } finally {
        if (active) setNeedsYouLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [screen, auth.academy?.id]);
  useEffect(() => {
    const back = BackHandler.addEventListener('hardwareBackPress', () => {
      if (screen === 'Today') return false;
      navigate('Today'); return true;
    });
    return () => back.remove();
  }, [screen, formDirty, formBusy]);
  if (crash) throw new Error('Controlled development render failure');

  function navigate(next: Screen) {
    setSettingsOpen(false); // Any navigation, including the support icon, leaves Settings.
    if (formBusy) { setNotice('Please wait for the save to finish.'); return; }
    if ((screen === 'Students' || screen === 'Schedule' || screen === 'Post' || screen === 'Fees') && next !== screen && formDirty) { Keyboard.dismiss(); setPendingNavigation(next); return; }
    if (next !== 'Schedule') setClassLaunch(null);
    if (next !== 'Post') setFeedbackLaunch(null);
    setScreen(next); setNotice('');
  }
  function runDiagnostic() {
    const event = diagnostics.record('CONTROLLED_FAILURE');
    setNotice(`Diagnostic check recorded. Reference: ${event.reference}. The app is still working.`);
    setReport(diagnostics.export());
  }
  async function shareReport() {
    await diagnostics.ready();
    await diagnostics.flush();
    const payload = diagnostics.export();
    setReport(payload);
    if (Platform.OS === 'web') {
      setNotice('Your sanitized report is displayed below. You can select and copy it.');
      return;
    }
    try { await Share.share({ message: payload, title: 'Parent Plus diagnostic report' }); setNotice('Your diagnostic report is prepared. The share sheet does not confirm delivery.', { title: 'Report prepared' }); }
    catch {
      const event = diagnostics.record('REPORT_SHARE_FAILED');
      setNotice(`Sharing could not open. Your report is still available below. Reference: ${event.reference}`, { kind: 'error', title: 'Sharing could not open' });
    }
  }

  return <SafeAreaView style={styles.safe}>
    <StatusBar style="light" />
    <View style={styles.shell}>
      <ActionFeedback />
      <ScrollView testID="workspace-scroll" ref={scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <View style={styles.brandIcon}><PrototypeIcon name="star" size={16} strokeWidth={2.2} color={c.black}/></View>
          <View><Text style={styles.brand}>Parent Plus Coach</Text><Text style={styles.brandSub}>{auth.academy?.name??'A little more connected.'}</Text></View>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Open support and diagnostics" onPress={() => navigate('Support')} style={styles.supportIcon}><PrototypeIcon name="menu" size={20}/></Pressable>
      </View>
      <View style={styles.content}>
        {exitPreview&&<View style={styles.releaseRow}><Text style={styles.release}>DEVELOPMENT PREVIEW</Text><Text style={styles.version}>v{appVersion} · {buildRevision}</Text></View>}
        {(screen === 'Students' || screen === 'Schedule' || screen === 'Post' || screen === 'Fees') && !!notice && <Text style={styles.notice}>{notice}</Text>}
        {screen === 'Today' ? <>
          <Text accessibilityRole="header" style={styles.heading}>{coachGreeting(auth.academy?.timezone??'Asia/Kolkata')}</Text>
          <Text style={styles.subtitle}>{new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'short',timeZone:auth.academy?.timezone??'Asia/Kolkata'})}</Text>
          {auth.academy && <>
            <Text accessibilityRole="header" style={styles.needsYouHeading}>Needs you</Text>
            <NeedsYou
              academy={auth.academy}
              students={needsYouStudents}
              enrolments={needsYouEnrolments}
              observations={needsYouObservations}
              recipients={needsYouRecipients}
              onPress={() => navigate('Post')}
              loading={needsYouLoading}
              error={needsYouError}
            />
          </>}
          {auth.academy && <CoachSignals academyId={auth.academy.id} timezone={auth.academy.timezone ?? 'Asia/Kolkata'} />}
          {auth.academy && <TodayClasses academy={auth.academy} onOpen={() => navigate('Schedule')} onOpenSession={session=>{setClassLaunch({session});navigate('Schedule');}} />}
          {auth.academy&&<ParentConnectionApprovals academy={auth.academy.id} disabled={formBusy} onWorking={setFormBusy} />}
          <Text style={styles.sectionTitle}>Your teaching workspace</Text>
          {auth.academy && <View style={styles.card}>
            <Action label="Write feedback for parents" onPress={() => navigate('Post')} />
            <Action label="Create a batch" onPress={() => { setLaunchBatch(true); navigate('Students'); }} secondary />
            <Action label="Schedule a class" onPress={() => { setClassLaunch({}); navigate('Schedule'); }} secondary />
          </View>}
          {auth.academy&&<CoachSetupCard academy={auth.academy.id} onStart={()=>{setLaunchRosterSetup(true);navigate('Students');}}/>}
          {!auth.academy&&<View style={styles.card}><Text style={styles.sectionTitle}>Your classes and students belong here</Text><Text style={styles.small}>Sign in to load your workspace. No sample students, attendance or parent engagement figures are shown.</Text></View>}
        </> : screen === 'Support' && settingsOpen ? <AccountSettings onBack={() => setSettingsOpen(false)} /> : screen === 'Support' ? <>
          <Text style={styles.eyebrow}>HERE TO HELP</Text>
          <Text accessibilityRole="header" style={styles.heading}>Setup & support</Text>
          <Text style={styles.subtitle}>A clear view of what is ready and what comes next.</Text>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Connection status</Text>
            <View style={styles.statusRow}><Text style={styles.statusLabel}>Public configuration</Text><Text style={styles.statusValue}>{appConfig.configured ? 'Provided' : 'Not configured'}</Text></View>
            <View style={styles.statusRow}><Text style={styles.statusLabel}>Supabase connection</Text><Text style={styles.statusValue}>{auth.academy ? 'Workspace loaded' : 'Not verified'}</Text></View>
            <View style={styles.statusRow}><Text style={styles.statusLabel}>Payment collection</Text><Text style={styles.statusValue}>Not enabled</Text></View>
            <Text style={styles.small}>{auth.academy ? `Academy: ${auth.academy.name}` : appConfig.configured ? 'Project settings are present. Sign in to verify your workspace connection.' : 'The app starts safely without project settings. Your coding partner will configure the connection.'}</Text>
            {!exitPreview && <Action label="Settings" secondary onPress={() => setSettingsOpen(true)} />}
            {exitPreview ? <Action label="Return to sign in" secondary onPress={exitPreview} /> : <SignOutButton />}
          </View>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Report a problem</Text>
            <Text style={styles.small}>Share a sanitized report with your coding partner. Reports contain error references and app version, never student details or credentials.</Text>
            <Action label="Prepare diagnostic report" onPress={() => { void shareReport(); }} />
            <Action label="Clear local diagnostic report" secondary onPress={() => { diagnostics.clear(); setReport(''); setNotice('Local diagnostic report cleared.'); }} />
            <Text style={styles.caption}>Reports contain up to 30 safe events, saved on this device when storage is available. Saved events older than 14 days are removed when restored. Sign-out clears them. Remote/native crash monitoring is not connected.</Text>
          </View>
          {appConfig.environment !== 'production' && <View style={styles.devCard}>
            <Text style={styles.sectionTitle}>Development checks</Text>
            <Text style={styles.small}>These controls intentionally exercise error handling. They are excluded when the app environment is production.</Text>
            <Action label="Run safe error check" secondary onPress={runDiagnostic} />
            <Action label="Test screen recovery" secondary onPress={() => setCrash(true)} />
          </View>}
          {!!notice && <Text style={styles.notice}>{notice}</Text>}
          <FontLicense />
          {!!report && <View style={styles.card}><Text style={styles.sectionTitle}>Sanitized report</Text><Text selectable testID="diagnostic-report" style={styles.report}>{report}</Text></View>}
        </> : screen === 'Profile' && auth.session ? <ProviderProfileScreen key={auth.session.user.id} /> : screen === 'Listing' && auth.session ? <ListingScreen key={auth.session.user.id} onOpenProfile={() => navigate('Profile')} /> : screen === 'Fees' && auth.academy && auth.session ? <FeesScreen key={auth.academy.id} academy={auth.academy} owner={auth.session.user.id} onDirtyChange={setFormDirty} onBusyChange={setFormBusy} onViewChange={scrollToTop} /> : screen === 'Post' && auth.academy && auth.session ? <ObservationsScreen initialClass={feedbackLaunch} onLaunchHandled={feedbackLaunchHandled} key={auth.academy.id} academy={auth.academy} owner={auth.session.user.id} onDirtyChange={setFormDirty} onBusyChange={setFormBusy} onViewChange={scrollToTop} /> : screen === 'Schedule' && auth.academy && auth.session ? <ClassesScreen key={auth.academy.id} startWithCreate={!!classLaunch&&!classLaunch.session} initialSession={classLaunch?.session} initialBatch={classLaunch?.batch} onWriteFeedback={(session,students)=>{setFeedbackLaunch({session,students});navigate('Post');}} academy={auth.academy} owner={auth.session.user.id} onDirtyChange={setFormDirty} onBusyChange={setFormBusy} onViewChange={scrollToTop} /> : screen === 'Students' && auth.academy ? <RosterScreen key={auth.academy.id} academy={auth.academy.id} timezone={auth.academy.timezone} startWithScan={launchRosterSetup} startWithBatch={launchBatch} onScheduleBatch={batch => { setClassLaunch({batch}); navigate('Schedule'); }} onLaunchHandled={rosterLaunchHandled} onDirtyChange={setFormDirty} onBusyChange={setFormBusy} onViewChange={scrollToTop} /> : <>
          <Text style={styles.eyebrow}>{screen === 'Post' ? 'CLASS UPDATES' : screen.toUpperCase()}</Text>
          <Text accessibilityRole="header" style={styles.heading}>{stages[screen].title}</Text>
          <Text style={styles.subtitle}>{stages[screen].body}</Text>
          <View style={styles.empty}>
            <PrototypeIcon name={tabs.find(tab => tab.name === screen)?.glyph??'star'} size={38} color={c.sky}/>
            <Text style={styles.sectionTitle}>Coming in the next modules</Text>
            <Text style={styles.emptyBody}>{stages[screen].detail}</Text>
            <Action label="View setup status" secondary onPress={() => navigate('Support')} />
          </View>
        </>}
        <WorkspaceSwitcher current="coach" disabled={formDirty||formBusy} />
        <Text style={styles.footer}>Thoughtful teaching starts with the little things.</Text>
      </View></ScrollView>
      <View accessibilityRole="tablist" style={styles.nav}>
        {tabs.map(tab => <Pressable key={tab.name} accessibilityRole="tab" accessibilityLabel={tab.name === 'Post' ? 'Feedback' : tab.name} accessibilityState={{ selected: screen === tab.name }} aria-selected={screen===tab.name} onPress={() => navigate(tab.name)} style={[styles.navItem,tab.name==='Post'&&styles.postItem]}>
          <View style={[styles.navGlyph, tab.name === 'Post' && styles.postGlyph]}><PrototypeIcon name={tab.glyph} size={tab.name==='Post'?26:22} strokeWidth={tab.name==='Post'?2.4:1.9} color={tab.name==='Post'?c.black:screen===tab.name?c.white:'#8a8a96'}/></View>
          <Text style={[styles.navLabel, screen === tab.name && styles.navLabelActive]}>{tab.name === 'Post' ? 'Feedback' : tab.name}</Text>
        </Pressable>)}
      </View>
      <ConfirmDialog visible={pendingNavigation !== null} title="Leave your unsaved changes?" message={screen === 'Post' ? 'Your latest edits have not been saved on this device. Keep editing and retry saving, or leave and lose these latest edits. Any earlier device draft is retained.' : screen === 'Schedule' ? 'Unsaved edits will be discarded. Attendance drafts already saved on this device are retained.' : 'Your changes have not been saved. Keep editing or discard this form before leaving.'}
        confirmLabel="Discard and leave" cancelLabel="Keep editing" onCancel={() => setPendingNavigation(null)}
        onConfirm={() => { if (pendingNavigation) { setFormDirty(false); if (pendingNavigation !== 'Schedule') setClassLaunch(null); setScreen(pendingNavigation); setPendingNavigation(null); } }} />
    </View>
  </SafeAreaView>;
}

// AuthProvider owns identity/data readiness; AuthGate decides which screen is safe to show.
// This React error boundary cannot catch every Android native crash.
export default function App() {
  const [fontsLoaded,fontError] = useFonts([{fontFamily:'Bricolage',fontDefinitions:[{path:require('./assets/fonts/BricolageGrotesque.ttf'),weight:'200 800'}]}]);
  useEffect(() => { void diagnostics.connect(deviceStorage); }, []);
  let parentRoute = process.env.EXPO_PUBLIC_APP_MODULE === 'parent';
  if (Platform.OS === 'web') {
    parentRoute = parentRoute || globalThis.location.pathname.startsWith('/parent');
    if (globalThis.location.pathname.startsWith('/auth')) {
      const returnModule=new URLSearchParams(globalThis.location.search).get('module');
      if(returnModule==='coach'||returnModule==='parent')parentRoute=process.env.EXPO_PUBLIC_APP_MODULE==='parent'||returnModule==='parent';
      else try { parentRoute = parentRoute || globalThis.sessionStorage.getItem('parentplus.auth.return-module') === 'parent'; } catch { /* A normal sign-in remains available. */ }
    }
  }
  if (!fontsLoaded && !fontError) return <View style={{flex:1,backgroundColor:c.background,alignItems:'center',justifyContent:'center'}}><Text style={{color:c.text}}>Loading Parent Plus…</Text></View>;
  if (parentRoute) return <PrototypeFrame variant="parent"><ParentApp /></PrototypeFrame>;
  return <PrototypeFrame variant="coach"><SafeAreaProvider><ErrorBoundary><FeedbackProvider><AuthProvider><AuthGate render={exitPreview => <AppContent exitPreview={exitPreview} />} /></AuthProvider></FeedbackProvider></ErrorBoundary></SafeAreaProvider></PrototypeFrame>;
}

const styles = StyleSheet.create({
  safe: { flex:1, backgroundColor:c.background }, shell:{flex:1,width:'100%',alignSelf:'center'},
  header:{paddingHorizontal:18,paddingTop:12,paddingBottom:6,flexDirection:'row',justifyContent:'space-between',alignItems:'center'},
  brandRow:{flexDirection:'row',alignItems:'center',gap:9},brandIcon:{width:30,height:30,borderRadius:10,backgroundColor:c.white,alignItems:'center',justifyContent:'center'},
  brand:{fontSize:15,color:c.white,fontWeight:'800'},brandSub:{fontSize:10.5,color:c.muted,fontWeight:'700',marginTop:1},
  supportIcon:{width:40,height:40,borderRadius:14,backgroundColor:c.surface,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:c.outline},
  scrollContent:{paddingBottom:118},content:{paddingHorizontal:18,paddingTop:10,gap:12},releaseRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},
  release:{fontSize:9.5,fontWeight:prototypeWeight(750),color:c.muted},version:{fontSize:10,color:c.dim},
  eyebrow:{fontSize:10,fontWeight:'800',letterSpacing:1.5,color:c.sky,marginTop:10},heading:{fontSize:30,lineHeight:31.5,fontWeight:'700',letterSpacing:-1.2,color:c.white},
  subtitle:{fontSize:13,lineHeight:18.2,color:c.muted},needsYouHeading:{fontSize:15.5,fontWeight:'700',letterSpacing:-0.2,color:c.white,marginTop:10},needsYouError:{fontSize:12.5,lineHeight:19,color:c.rose,marginTop:6},
  button:{backgroundColor:c.white,paddingVertical:13,paddingHorizontal:16,minHeight:44,borderRadius:14,alignItems:'center',justifyContent:'center'},
  buttonLabel:{color:c.black,fontSize:13.5,fontWeight:'800'},secondary:{backgroundColor:c.raised},secondaryLabel:{color:c.white},pressed:{opacity:0.75},
  sectionTitle:{fontSize:15.5,fontWeight:'700',color:c.white,letterSpacing:-.2},small:{fontSize:13,lineHeight:20,color:c.muted},
  card:{backgroundColor:c.surface,borderWidth:1,borderColor:c.border,borderRadius:18,padding:14,gap:10},statusRow:{flexDirection:'row',justifyContent:'space-between',gap:10,flexWrap:'wrap'},
  statusLabel:{color:c.muted,fontSize:12},statusValue:{color:c.white,fontSize:12,fontWeight:'700'},caption:{color:c.muted,fontSize:11,lineHeight:17},
  devCard:{backgroundColor:c.surface,padding:14,borderRadius:18,gap:12,borderWidth:1,borderColor:c.border},notice:{padding:12,color:c.sky,backgroundColor:c.raised,lineHeight:20,borderRadius:14},
  report:{fontFamily:Platform.OS==='ios'?'Menlo':'monospace',fontSize:11,lineHeight:18,color:c.white},empty:{backgroundColor:c.surface,padding:18,borderRadius:18,gap:14,borderWidth:1,borderColor:c.border,marginTop:12},
  emptyBody:{color:c.muted,fontSize:13,lineHeight:20},footer:{color:c.dim,fontSize:10,textAlign:'center',paddingVertical:12},
  nav:{position:'absolute',left:12,right:12,bottom:14,height:70,borderRadius:24,backgroundColor:Platform.OS==='web'?'var(--parentplus-coach-nav)':'#141417ef',borderWidth:1,borderColor:'#2c2c33',flexDirection:'row',alignItems:'center',shadowColor:c.black,shadowOpacity:.5,shadowRadius:28,shadowOffset:{width:0,height:12},elevation:8},
  navItem:{flex:1,alignItems:'center',justifyContent:'center',minHeight:52,gap:3},navGlyph:{height:26,alignItems:'center',justifyContent:'center'},postItem:{marginTop:-24},
  postGlyph:{width:56,height:56,borderRadius:19,backgroundColor:c.white,shadowColor:c.black,shadowOpacity:.5,shadowRadius:22,shadowOffset:{width:0,height:8},elevation:4},navLabel:{color:'#8a8a96',fontSize:10.5,fontWeight:prototypeWeight(750)},navLabelActive:{color:c.white},
});
