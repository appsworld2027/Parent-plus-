import { prototypeColors as c, prototypeWeight } from '../ui/prototypeTheme';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { PrototypeIcon } from '../ui/PrototypeIcon';
import { Text } from '../ui/Typography';
import { getStudentsNeedingFeedback, formatNeedsYouMessage } from './needsYou';
import type { Student } from '../roster/model';
import type { Enrolment } from '../roster/model';
import type { Observation } from '../observations/model';
import type { Recipient } from '../observations/model';
import type { Academy } from '../auth/AuthProvider';

type Props = {
  academy: Academy;
  students: Student[];
  enrolments: Enrolment[];
  observations: Observation[];
  recipients: Recipient[];
  onPress: () => void;
  loading?: boolean;
  error?: string | null;
};

export function NeedsYou({
  academy,
  students,
  enrolments,
  observations,
  recipients,
  onPress,
  loading = false,
  error = null,
}: Props) {
  // Loading state: show "Checking…" muted line, no count, no "All caught up"
  if (loading) {
    return (
      <View style={s.card} accessibilityLiveRegion="polite">
        <Text style={s.loadingText}>Checking…</Text>
      </View>
    );
  }

  // Error state: show only the error line with the reference
  if (error) {
    return (
      <View style={s.card} accessibilityLiveRegion="polite">
        <Text style={s.errorText}>{error}</Text>
      </View>
    );
  }

  const needsYouStudents = getStudentsNeedingFeedback(
    students,
    enrolments,
    observations,
    recipients,
    academy.timezone
  );
  const count = needsYouStudents.length;

  if (count === 0) {
    return (
      <View style={s.card} accessibilityLiveRegion="polite">
        <Text style={s.caughtUpTitle}>All caught up</Text>
        <Text style={s.caughtUpBody}>New requests will show here</Text>
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={formatNeedsYouMessage(count)}
      onPress={onPress}
      style={s.card}
    >
      <View style={s.row}>
        <View style={s.iconWrapper}>
          <PrototypeIcon name="star" size={20} strokeWidth={2.2} color={c.sun} />
        </View>
        <View style={s.textColumn}>
          <Text style={s.countText}>{formatNeedsYouMessage(count)}</Text>
          <Text style={s.subText}>No update for over a week</Text>
        </View>
        <PrototypeIcon name="chev" size={20} strokeWidth={2.2} color={c.muted} />
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 18,
    padding: 14,
  },
  caughtUpTitle: {
    fontSize: 15.5,
    fontWeight: '700',
    letterSpacing: -0.2,
    color: c.text,
  },
  caughtUpBody: {
    fontSize: 13,
    lineHeight: 20,
    color: c.muted,
    marginTop: 2,
  },
  loadingText: {
    fontSize: 15.5,
    fontWeight: '700',
    letterSpacing: -0.2,
    color: c.muted,
  },
  errorText: {
    fontSize: 12.5,
    lineHeight: 19,
    color: c.rose,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: c.raised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textColumn: {
    flex: 1,
    gap: 2,
  },
  countText: {
    fontSize: 15.5,
    fontWeight: '700',
    letterSpacing: -0.2,
    color: c.text,
  },
  subText: {
    fontSize: 12.5,
    lineHeight: 19,
    color: c.muted,
  },
});
