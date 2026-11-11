import React, { useState } from 'react';
import { Platform, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { appConfig } from './src/config';
import { diagnostics } from './src/diagnostics';
import { ErrorBoundary } from './src/ErrorBoundary';

type Screen = 'Today' | 'Schedule' | 'Post' | 'Students' | 'Fees' | 'Support';
const tabs: { name: Screen; glyph: string }[] = [
  { name: 'Today', glyph: '◷' }, { name: 'Schedule', glyph: '▦' },
  { name: 'Post', glyph: '+' }, { name: 'Students', glyph: '♧' }, { name: 'Fees', glyph: '₹' },
];
const stages: Record<string, { title: string; body: string; detail: string }> = {
  Schedule: { title: 'A little structure. More room to teach.', body: 'Your batches and dated class sessions will live here.', detail: 'Scheduling follows account and academy setup. No classes have been loaded.' },
  Post: { title: 'Small observations. Meaningful progress.', body: 'Write an update for a child or your whole batch.', detail: 'The observation editor follows student setup. Parent delivery is planned for a later release.' },
  Students: { title: 'Every child has their own story.', body: 'Keep your students, guardian contacts, and batches together.', detail: 'Student management follows secure account setup. No student records have been loaded.' },
  Fees: { title: 'A clearer picture of your fees.', body: 'Invoices, balances, and verified payment updates in one place.', detail: 'Fee tracking and hosted payment links are planned. Live collection is not enabled.' },
};

function Action({ label, onPress, secondary = false }: { label: string; onPress: () => void; secondary?: boolean }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.button, secondary && styles.secondary, pressed && styles.pressed]}>
    <Text style={[styles.buttonLabel, secondary && styles.secondaryLabel]}>{label}</Text>
  </Pressable>;
}

function AppContent() {
  const [screen, setScreen] = useState<Screen>('Today');
  const [report, setReport] = useState('');
  const [notice, setNotice] = useState('');
  const [crash, setCrash] = useState(false);
  if (crash) throw new Error('Controlled development render failure');

  function navigate(next: Screen) { setScreen(next); setNotice(''); }
  function runDiagnostic() {
    const event = diagnostics.record('CONTROLLED_FAILURE');
    setNotice(`Diagnostic check recorded. Reference: ${event.reference}. The app is still working.`);
    setReport(diagnostics.export());
  }
  async function shareReport() {
    const payload = diagnostics.export();
    setReport(payload);
    if (Platform.OS === 'web') {
      setNotice('Your sanitized report is displayed below. You can select and copy it.');
      return;
    }
    try { await Share.share({ message: payload, title: 'Parent Plus diagnostic report' }); }
    catch {
      const event = diagnostics.record('REPORT_SHARE_FAILED');
      setNotice(`Sharing could not open. Your report is still available below. Reference: ${event.reference}`);
    }
  }

  return <SafeAreaView style={styles.safe}>
    <StatusBar style="dark" />
    <View style={styles.shell}>
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <View style={styles.brandIcon}><Text style={styles.brandStar}>✦</Text></View>
          <View><Text style={styles.brand}>Parent Plus Coach</Text><Text style={styles.brandSub}>A little more connected.</Text></View>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Open support and diagnostics" onPress={() => navigate('Support')} style={styles.supportIcon}><Text style={styles.supportSymbol}>?</Text></Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.releaseRow}><Text style={styles.release}>DEVELOPMENT PREVIEW</Text><Text style={styles.version}>v0.1.0</Text></View>
        {screen === 'Today' ? <>
          <Text style={styles.eyebrow}>YOUR TEACHING DAY, TOGETHER</Text>
          <Text accessibilityRole="header" style={styles.heading}>More teaching.{ '\n' }Less juggling.</Text>
          <Text style={styles.subtitle}>A calmer home for your classes, your students, and the little wins along the way.</Text>
          <View style={styles.hero}>
            <Text style={styles.heroKicker}>WELCOME TO YOUR WORKSPACE</Text>
            <Text style={styles.heroTitle}>Let’s lay the foundation.</Text>
            <Text style={styles.heroBody}>We’re building your coach app one tested module at a time. Your records will appear after secure account setup.</Text>
            <Action label="View setup status" onPress={() => navigate('Support')} secondary />
          </View>
          <Text style={styles.sectionTitle}>A place for everything</Text>
          <View style={styles.grid}>
            {[
              { title: 'Your classes', body: 'A plan for every teaching day', color: '#DCEDEA', target: 'Schedule' },
              { title: 'Your students', body: 'Every child, thoughtfully seen', color: '#E9E2F5', target: 'Students' },
              { title: 'Class updates', body: 'Capture the small breakthroughs', color: '#F8EBC6', target: 'Post' },
              { title: 'Fee clarity', body: 'Know what’s paid and pending', color: '#DCECF7', target: 'Fees' },
            ].map(item => <Pressable accessibilityRole="button" key={item.target} onPress={() => navigate(item.target as Screen)} style={[styles.tile, { backgroundColor: item.color }]}>
              <Text style={styles.tileTitle}>{item.title}</Text><Text style={styles.tileBody}>{item.body}</Text><Text style={styles.tileArrow}>{'>'}</Text>
            </Pressable>)}
          </View>
          <View style={styles.note}><Text style={styles.noteTitle}>Built around trust</Text><Text style={styles.small}>No sample students or pretend payments. This preview shows what is available today.</Text></View>
        </> : screen === 'Support' ? <>
          <Text style={styles.eyebrow}>HERE TO HELP</Text>
          <Text accessibilityRole="header" style={styles.heading}>Setup & support</Text>
          <Text style={styles.subtitle}>A clear view of what is ready and what comes next.</Text>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Connection status</Text>
            <View style={styles.statusRow}><Text style={styles.statusLabel}>Public configuration</Text><Text style={styles.statusValue}>{appConfig.configured ? 'Provided' : 'Not configured'}</Text></View>
            <View style={styles.statusRow}><Text style={styles.statusLabel}>Supabase connection</Text><Text style={styles.statusValue}>Not verified</Text></View>
            <View style={styles.statusRow}><Text style={styles.statusLabel}>Payment collection</Text><Text style={styles.statusValue}>Not enabled</Text></View>
            <Text style={styles.small}>{appConfig.configured ? 'Project settings are present. Database and authentication will be connected in the next module.' : 'The app starts safely without project settings. Your coding partner will configure the connection.'}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Report a problem</Text>
            <Text style={styles.small}>Share a sanitized report with your coding partner. Reports contain error references and app version, never student details or credentials.</Text>
            <Action label="Prepare diagnostic report" onPress={() => { void shareReport(); }} />
            <Action label="Clear local diagnostic report" secondary onPress={() => { diagnostics.clear(); setReport(''); setNotice('Local diagnostic report cleared.'); }} />
            <Text style={styles.caption}>Reports stay in memory until you share them. They clear when the app restarts. Remote crash monitoring is not connected.</Text>
          </View>
          {appConfig.environment !== 'production' && <View style={styles.devCard}>
            <Text style={styles.sectionTitle}>Development checks</Text>
            <Text style={styles.small}>These controls intentionally exercise error handling. They are excluded when the app environment is production.</Text>
            <Action label="Run safe error check" secondary onPress={runDiagnostic} />
            <Action label="Test screen recovery" secondary onPress={() => setCrash(true)} />
          </View>}
          {!!notice && <Text accessibilityRole="alert" style={styles.notice}>{notice}</Text>}
          {!!report && <View style={styles.card}><Text style={styles.sectionTitle}>Sanitized report</Text><Text selectable testID="diagnostic-report" style={styles.report}>{report}</Text></View>}
        </> : <>
          <Text style={styles.eyebrow}>{screen === 'Post' ? 'CLASS UPDATES' : screen.toUpperCase()}</Text>
          <Text accessibilityRole="header" style={styles.heading}>{stages[screen].title}</Text>
          <Text style={styles.subtitle}>{stages[screen].body}</Text>
          <View style={styles.empty}>
            <Text style={styles.emptySymbol}>{tabs.find(tab => tab.name === screen)?.glyph}</Text>
            <Text style={styles.sectionTitle}>Coming in the next modules</Text>
            <Text style={styles.emptyBody}>{stages[screen].detail}</Text>
            <Action label="View setup status" secondary onPress={() => navigate('Support')} />
          </View>
        </>}
        <Text style={styles.footer}>Thoughtful teaching starts with the little things.</Text>
      </ScrollView>
      <View accessibilityRole="tablist" style={styles.nav}>
        {tabs.map(tab => <Pressable key={tab.name} accessibilityRole="tab" accessibilityLabel={tab.name} accessibilityState={{ selected: screen === tab.name }} onPress={() => navigate(tab.name)} style={styles.navItem}>
          <View style={[styles.navGlyph, screen === tab.name && styles.navActive, tab.name === 'Post' && styles.postGlyph]}><Text style={[styles.navSymbol, (screen === tab.name || tab.name === 'Post') && styles.navSymbolActive]}>{tab.glyph}</Text></View>
          <Text style={[styles.navLabel, screen === tab.name && styles.navLabelActive]}>{tab.name}</Text>
        </Pressable>)}
      </View>
    </View>
  </SafeAreaView>;
}

export default function App() {
  return <SafeAreaProvider><ErrorBoundary><AppContent /></ErrorBoundary></SafeAreaProvider>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F3F5F1' },
  shell: { flex: 1, width: '100%', maxWidth: 640, alignSelf: 'center' },
  header: { paddingHorizontal: 24, paddingVertical: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#E3E8E2' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: '#1F6F6B', alignItems: 'center', justifyContent: 'center' },
  brandStar: { color: '#fff', fontSize: 24 }, brand: { fontSize: 16, color: '#22303A', fontWeight: '700' }, brandSub: { fontSize: 11, color: '#5C6B73', marginTop: 3 },
  supportIcon: { width: 44, height: 44, borderRadius: 15, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E3E8E2' }, supportSymbol: { fontSize: 20, color: '#1F6F6B', fontWeight: '600' },
  content: { padding: 24, paddingBottom: 24, gap: 18 },
  releaseRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, release: { fontSize: 9, fontWeight: '700', letterSpacing: 1.2, color: '#63756F', backgroundColor: '#E6ECE4', paddingVertical: 6, paddingHorizontal: 9, borderRadius: 5 }, version: { fontSize: 11, color: '#63756F' },
  eyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 1.8, color: '#1F6F6B', marginTop: 10 },
  heading: { fontSize: 38, lineHeight: 43, fontWeight: '700', letterSpacing: -1.5, color: '#22303A' },
  subtitle: { fontSize: 15, lineHeight: 24, color: '#5C6B73' },
  hero: { backgroundColor: '#1F6F6B', padding: 23, borderRadius: 23, gap: 14 }, heroKicker: { color: '#BBDAD4', fontSize: 9, fontWeight: '700', letterSpacing: 1.3 }, heroTitle: { color: '#fff', fontSize: 24, fontWeight: '600', letterSpacing: -0.5 }, heroBody: { color: '#E0EEEA', fontSize: 14, lineHeight: 23 },
  button: { backgroundColor: '#1F6F6B', padding: 15, minHeight: 48, borderRadius: 13, alignItems: 'center' }, buttonLabel: { color: '#fff', fontSize: 14, fontWeight: '700' }, secondary: { backgroundColor: '#EDF1EC' }, secondaryLabel: { color: '#22303A' }, pressed: { opacity: 0.75 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#22303A', letterSpacing: -0.3 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, tile: { width: '47.8%', flexGrow: 1, padding: 17, minHeight: 138, borderRadius: 18, gap: 8 }, tileTitle: { color: '#22303A', fontWeight: '700', fontSize: 15 }, tileBody: { color: '#4E6266', fontSize: 12, lineHeight: 18 }, tileArrow: { alignSelf: 'flex-end', color: '#22303A', fontSize: 20 },
  note: { borderTopWidth: 1, borderTopColor: '#DEE5DD', paddingTop: 18, gap: 6 }, noteTitle: { color: '#22303A', fontWeight: '600', fontSize: 13 }, small: { fontSize: 13, color: '#5C6B73', lineHeight: 21 },
  card: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E3E8E2', borderRadius: 18, padding: 18, gap: 14 }, statusRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }, statusLabel: { color: '#5C6B73', fontSize: 13 }, statusValue: { color: '#22303A', fontSize: 13, fontWeight: '600' },
  caption: { color: '#63756F', fontSize: 11, lineHeight: 18 }, devCard: { backgroundColor: '#F8EBC6', padding: 18, borderRadius: 18, gap: 12 }, notice: { padding: 16, color: '#1F6F6B', backgroundColor: '#DCEDEA', lineHeight: 22, borderRadius: 12 }, report: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 11, lineHeight: 18, color: '#22303A' },
  empty: { backgroundColor: '#fff', padding: 24, borderRadius: 22, gap: 18, borderWidth: 1, borderColor: '#E3E8E2', marginTop: 12 }, emptySymbol: { color: '#1F6F6B', fontSize: 38 }, emptyBody: { color: '#5C6B73', fontSize: 14, lineHeight: 23 },
  footer: { color: '#63756F', fontSize: 10, textAlign: 'center', paddingVertical: 12 },
  nav: { backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E3E8E2', flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 6 }, navItem: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 52, gap: 4 }, navGlyph: { width: 40, height: 32, borderRadius: 11, alignItems: 'center', justifyContent: 'center' }, navActive: { backgroundColor: '#1F6F6B' }, postGlyph: { backgroundColor: '#1F6F6B' }, navSymbol: { color: '#63756F', fontSize: 23 }, navSymbolActive: { color: '#fff' }, navLabel: { color: '#63756F', fontSize: 10, fontWeight: '600' }, navLabelActive: { color: '#1F6F6B' },
});
