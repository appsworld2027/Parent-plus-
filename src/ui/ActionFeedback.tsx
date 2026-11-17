import React, { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Keyboard, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Text } from './Typography';

type Kind = 'success' | 'error' | 'info';
type Options = { kind: Kind; title: string };
type Notice = Options & { message: string; source: string };
type Feedback = { notice: Notice | null; show: (notice: Notice) => void; dismiss: (source?: string) => void };
const Context = createContext<Feedback | null>(null);

// This is in-app feedback, not OS push notifications. It lives outside all page
// ScrollViews, so scrolling or closing a saved form cannot hide the result.
// Scoped messages stay until dismissed, replaced, or their screen leaves.
// Account completion notices survive the transition between auth and workspace.
// Do not log/persist message text: it may contain private form context.
export function FeedbackProvider({ children }: React.PropsWithChildren) {
  const [notice, setNotice] = useState<Notice | null>(null);
  const show = useCallback((next: Notice) => { Keyboard.dismiss(); setNotice(next); }, []);
  const dismiss = useCallback((source?: string) => {
    setNotice(current => !source || current?.source === source ? null : current);
  }, []);
  const value = useMemo(() => ({ notice, show, dismiss }), [notice, show, dismiss]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

// Hosts reserve a fixed row outside their ScrollView. Unlike an overlay this
// remains visible without covering navigation or buttons the coach must tap.
export function ActionFeedback() {
  const { notice, dismiss } = useFeedback();
  const { height } = useWindowDimensions();
  if (!notice) return null;
  return <View style={s.position}>
    {/* Use ARIA role, not accessibilityRole=status (unsupported on Android). */}
    <View testID="action-feedback" role={notice.kind === 'error' ? 'alert' : 'status'}
      accessibilityLiveRegion={notice.kind === 'error' ? 'assertive' : 'polite'}
      style={[s.card, notice.kind === 'error' ? s.failure : notice.kind === 'success' ? s.success : s.information]}>
      <ScrollView style={{ maxHeight: Math.min(280, height * 0.4) }} keyboardShouldPersistTaps="handled">
        <Text style={s.title}>{notice.kind === 'error' ? '! ' : notice.kind === 'success' ? '✓ ' : 'ⓘ '}{notice.title}</Text>
        <Text style={s.message}>{notice.message}</Text>
      </ScrollView>
      <Pressable accessibilityRole="button" accessibilityLabel="Dismiss notification" onPress={() => dismiss()} style={s.dismiss}>
        <Text style={s.dismissLabel}>Dismiss</Text>
      </Pressable>
    </View>
  </View>;
}
export function useFeedback() {
  const feedback = useContext(Context);
  if (!feedback) throw new Error('Feedback provider missing');
  return feedback;
}

// Explicit setter calls publish outcomes, including repeated identical messages.
// Watching state with an effect would miss repeated saves and could re-announce
// stale success while a later request is pending. Empty strings clear only this source.
export function useFeedbackMessage(kind: Kind, title: string) {
  const [message, setMessage] = useState('');
  const source = useId();
  const mounted = useRef(true);
  const { show, dismiss } = useFeedback();
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; dismiss(source); };
  }, [source, dismiss]);
  const publish = useCallback((next: string, options?: Partial<Options>) => {
    if (!mounted.current) return;
    setMessage(next);
    if (next) show({ source, message: next, kind: options?.kind ?? kind, title: options?.title ?? title });
    else dismiss(source);
  }, [source, show, dismiss, kind, title]);
  return [message, publish] as const;
}
const s = StyleSheet.create({
  position: { paddingHorizontal: 16, paddingVertical: 8, alignItems: 'center' },
  card: { width: '100%', maxWidth: 520, borderRadius: 16, borderWidth: 2, padding: 16,
    shadowColor: '#22303A', shadowOpacity: 0.22, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 16 },
  success: { backgroundColor: '#E6F4EC', borderColor: '#287552' },
  failure: { backgroundColor: '#FCE8EB', borderColor: '#9E3542' },
  information: { backgroundColor: '#E5F1F7', borderColor: '#38778A' },
  title: { color: '#22303A', fontSize: 18, lineHeight: 25, fontWeight: '700', marginBottom: 6 },
  message: { color: '#22303A', fontSize: 15, lineHeight: 23 },
  dismiss: { minHeight: 44, alignSelf: 'flex-end', paddingHorizontal: 12, paddingVertical: 10, justifyContent: 'center' },
  dismissLabel: { color: '#22303A', fontWeight: '700', fontSize: 14 },
});
