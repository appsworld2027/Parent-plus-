import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '../ui/Typography';
import { prototypeColors as c } from '../ui/prototypeTheme';
import { diagnostics } from '../diagnostics';
import { localParts } from '../classes/model';
import type { Spotlight as SpotlightData } from './spotlight';
import { loadSpotlight } from './spotlightService';
import { SpotlightView } from './SpotlightView';

export function Spotlight({ academyId, timezone, onOpen }: { academyId: string; timezone: string; onOpen: () => void }) {
  const [data, setData] = useState<SpotlightData | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    setData(null); setError(null);
    loadSpotlight(academyId, localParts(new Date().toISOString(), timezone).date, timezone)
      .then(value => { if (active) setData(value); })
      .catch(() => { if (active) setError(`Spotlight could not load. Reference: ${diagnostics.record('OBSERVATION_FAILURE').reference}`); });
    return () => { active = false; };
  }, [academyId, timezone]);
  if (error) return <View style={s.card}><Text style={s.error}>{error}</Text></View>;
  return data ? <SpotlightView data={data} onOpen={onOpen} /> : null;
}
const s = StyleSheet.create({
  card: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 18, padding: 14, gap: 8 },
  error: { fontSize: 12.5, lineHeight: 19, color: c.rose },
});
