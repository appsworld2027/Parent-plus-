import React, { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Keyboard, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Text } from './Typography';
import { prototypeColors as c, prototypeWeight } from './prototypeTheme';

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
  position:{paddingHorizontal:18,paddingVertical:8,alignItems:'center'},card:{width:'100%',maxWidth:430,borderRadius:12,borderWidth:0,paddingVertical:10,paddingHorizontal:14,backgroundColor:c.white,shadowColor:c.black,shadowOpacity:.6,shadowRadius:30,shadowOffset:{width:0,height:10},elevation:12},
  success:{backgroundColor:c.white},failure:{backgroundColor:c.white},information:{backgroundColor:c.white},
  title:{color:c.black,fontSize:12.5,lineHeight:17.5,fontWeight:prototypeWeight(750),marginBottom:5},message:{color:c.black,fontSize:12.5,lineHeight:17.5},
  dismiss:{minHeight:44,alignSelf:'flex-end',paddingHorizontal:11,paddingVertical:8,justifyContent:'center'},dismissLabel:{color:c.black,fontWeight:'800',fontSize:11.5},
});
