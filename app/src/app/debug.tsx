import { clock } from '@swept/core';
import * as Notifications from 'expo-notifications';
import { Stack } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SecondaryButton } from '../components/Buttons';
import { Card } from '../components/Card';
import { subScreenOptions } from '../components/navOptions';
import { useLang } from '../i18n/useLang';
import { ParkingNative, type ParkEvent } from '../native/parkingNative';
import { syncNative } from '../parking/actions';
import { useTheme } from '../theme/useTheme';

/** Diagnostics: run the Shortcuts actions by hand and see what they did and what is scheduled. */
export default function Debug() {
  const { c } = useTheme();
  const { s } = useLang();
  const [events, setEvents] = useState<ParkEvent[]>([]);
  const [pending, setPending] = useState<{ id: string; title: string }[]>([]);

  const reload = useCallback(async () => {
    setEvents(ParkingNative.events());
    const all = await Notifications.getAllScheduledNotificationsAsync();
    setPending(all.map((n) => ({ id: n.identifier, title: n.content.title ?? '' })).sort((a, b) => a.id.localeCompare(b.id)));
  }, []);
  useEffect(() => void reload(), [reload]);

  const run = async (action: () => Promise<void>) => {
    await action();
    await syncNative();
    await reload();
  };

  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={styles.content} contentInsetAdjustmentBehavior="automatic">
      <Stack.Screen options={subScreenOptions(s.diagnostics, s.settings, c)} />
      <View style={styles.row}>
        <SecondaryButton grow title="Je suis garé" onPress={() => void run(ParkingNative.simulatePark)} />
        <SecondaryButton grow title="Je pars" onPress={() => void run(ParkingNative.simulateLeave)} />
      </View>

      <Text style={[styles.caption, { color: c.mut }]}>INTENT RUNS</Text>
      <Card radius={16} style={styles.card}>
        {events.length === 0 && <Text style={{ color: c.mut }}>—</Text>}
        {events.map((e) => {
          const d = new Date(e.at);
          return (
            <Text key={e.at} style={[styles.line, { color: e.error ? c.now : c.fg }]}>
              {d.toLocaleDateString('fr-CA')} {clock(d.getHours() * 60 + d.getMinutes(), 'en')} · {e.source} · {e.kind}
              {e.error ? ` · ${e.error}` : ''}
              {e.street ? ` · ${e.street} (${e.side})` : ''}
              {e.note ? ` · ${e.note}` : ''}
              {e.accuracy !== undefined ? ` · ±${e.accuracy.toFixed(0)} m · ${e.seconds?.toFixed(1)} s` : ''}
            </Text>
          );
        })}
      </Card>

      <Text style={[styles.caption, { color: c.mut }]}>SCHEDULED ({pending.length})</Text>
      <Card radius={16} style={styles.card}>
        {pending.length === 0 && <Text style={{ color: c.mut }}>—</Text>}
        {pending.map((n) => (
          <Text key={n.id} style={[styles.line, { color: c.fg }]}>
            {n.id.replace('swept.reminder.', '')} · {n.title}
          </Text>
        ))}
      </Card>
      <SecondaryButton title="Clear log" onPress={() => (ParkingNative.clearEvents(), void reload())} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 10 },
  row: { flexDirection: 'row', gap: 10 },
  caption: { fontSize: 12, fontWeight: '500', letterSpacing: 0.4, paddingHorizontal: 12, marginTop: 8 },
  card: { padding: 12, gap: 6 },
  line: { fontSize: 13, lineHeight: 18 },
});
