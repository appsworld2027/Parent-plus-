import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { diagnostics } from './diagnostics';

// Recovers React render failures. Event-handler/async errors need their own catches;
// Android native crashes and OS termination require separate telemetry/recovery.
export class ErrorBoundary extends React.Component<React.PropsWithChildren, { failed: boolean; reference?: string }> {
  state: { failed: boolean; reference?: string } = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() {
    // Raw error text/stacks may contain private data. Keep only a known safe code.
    try { this.setState({ reference: diagnostics.record('SCREEN_FAILURE').reference }); } catch { /* Recovery must still work. */ }
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return <View style={styles.page}>
      <Text accessibilityRole="header" style={styles.title}>Let’s reopen this screen</Text>
      <Text style={styles.text}>Something interrupted the app. You can try again.</Text>
      <Text selectable style={styles.text}>Error reference: {this.state.reference ?? 'unavailable'}</Text>
      <Pressable accessibilityRole="button" style={styles.button} onPress={() => this.setState({ failed: false, reference: undefined })}>
        <Text style={styles.label}>Try again</Text>
      </Pressable>
    </View>;
  }
}
const styles = StyleSheet.create({
  page: { flex: 1, padding: 28, justifyContent: 'center', backgroundColor: '#F3F5F1', gap: 16 },
  title: { fontSize: 24, fontWeight: '700', color: '#22303A' },
  text: { fontSize: 16, color: '#5C6B73' },
  button: { backgroundColor: '#1F6F6B', padding: 16, borderRadius: 14 },
  label: { color: '#fff', fontWeight: '700', textAlign: 'center' },
});
