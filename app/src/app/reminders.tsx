import DateTimePicker from '@react-native-community/datetimepicker';
import { alarmRules, dayLong, nextWindow, plannedReminders, shortStreet, sideName, time, type ReminderSettings } from '@swept/core';
import { router, Stack } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { PrimaryButton } from '../components/Buttons';
import { Group, Row } from '../components/Card';
import { subScreenOptions } from '../components/navOptions';
import { Segmented } from '../components/Segmented';
import { useLang } from '../i18n/useLang';
import { pushConfig, replan } from '../parking/actions';
import { useSwept } from '../state/store';
import { useTheme } from '../theme/useTheme';

const LEADS = [30, 60, 120];

/** Screen 9 — when the reminders fire. */
export default function Reminders() {
  const { c } = useTheme();
  const { lang, s } = useLang();
  const spot = useSwept((st) => st.spot);
  const [r, setR] = useState<ReminderSettings>(useSwept.getState().reminders);
  const set = (patch: Partial<ReminderSettings>) => setR((cur) => ({ ...cur, ...patch }));

  const save = async () => {
    useSwept.getState().setReminders(r);
    pushConfig();
    await replan();
    router.back();
  };

  // A concrete example on the user's own spot beats an abstract description.
  const window = spot ? nextWindow(alarmRules(spot).map((x) => x.rule), new Date()) : undefined;
  const example = window ? plannedReminders(window, r, new Date()).map((p) => `${dayLong(p.at.getDay(), lang)} ${time(p.at, lang)}`) : [];
  const footer =
    spot && example.length === 2
      ? s.remindersExample(`${shortStreet(spot.street)} ${sideName(spot.side, lang)}`, example[0]!, example[1]!)
      : s.remindersGeneric;

  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={styles.content} contentInsetAdjustmentBehavior="automatic">
      <Stack.Screen options={subScreenOptions(s.reminders, s.home, c)} />

      <Group>
        <Row first>
          <SymbolView name="moon" size={20} tintColor={c.acc} />
          <Text style={[styles.label, { color: c.fg }]}>{s.eveningBefore}</Text>
          <Switch value={r.eveningEnabled} onValueChange={(v) => set({ eveningEnabled: v })} trackColor={{ true: c.acc }} />
        </Row>
        <Row>
          <Text style={[styles.label, styles.indent, { color: r.eveningEnabled ? c.fg : c.mut }]}>{s.time}</Text>
          <DateTimePicker
            mode="time"
            display="compact"
            locale={lang === 'fr' ? 'fr-CA' : 'en-GB'}
            minuteInterval={5}
            disabled={!r.eveningEnabled}
            value={new Date(2026, 0, 1, 0, r.eveningAt)}
            onValueChange={(_, d) => set({ eveningAt: d.getHours() * 60 + d.getMinutes() })}
          />
        </Row>
      </Group>

      <Group>
        <Row first>
          <SymbolView name="alarm" size={20} tintColor={c.acc} />
          <Text style={[styles.label, { color: c.fg }]}>{s.beforeStart}</Text>
          <Switch value={r.leadEnabled} onValueChange={(v) => set({ leadEnabled: v })} trackColor={{ true: c.acc }} />
        </Row>
        <Row>
          <View style={styles.flex}>
            <Segmented
              disabled={!r.leadEnabled}
              value={r.leadMinutes}
              onChange={(leadMinutes) => set({ leadMinutes })}
              options={LEADS.map((m) => ({ value: m, label: m < 60 ? `${m} min` : `${m / 60} h` }))}
            />
          </View>
        </Row>
      </Group>

      <Group footer={footer}>
        <Row first>
          <SymbolView name="speaker.wave.2" size={20} tintColor={c.acc} />
          <Text style={[styles.label, { color: c.fg }]}>{s.sound}</Text>
          <Switch value={r.sound} onValueChange={(v) => set({ sound: v })} trackColor={{ true: c.acc }} />
        </Row>
      </Group>

      <PrimaryButton title={s.save} onPress={save} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 20 },
  flex: { flex: 1 },
  label: { flex: 1, fontSize: 16 },
  indent: { marginLeft: 32 },
});
