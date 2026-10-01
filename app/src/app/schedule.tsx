import DateTimePicker from '@react-native-community/datetimepicker';
import {
  clock,
  dayKey,
  dayLong,
  dayShort,
  nextWindow,
  plannedReminders,
  sideName,
  time,
  type CleaningRule,
  type Weekday,
} from '@swept/core';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card, Group, Row } from '../components/Card';
import { sideById } from '../data/db';
import { useLang } from '../i18n/useLang';
import { park, withManualSchedule } from '../parking/actions';
import { useSwept } from '../state/store';
import { useTheme } from '../theme/useTheme';

const WEEK: Weekday[] = [1, 2, 3, 4, 5, 6, 0];
const YEAR = 2026; // any year: only the month and day of a season matter
const atMinutes = (m: number) => new Date(YEAR, 0, 1, 0, m);
const minutesOf = (d: Date) => d.getHours() * 60 + d.getMinutes();

/** Screen 8 — type in the schedule from the sign, when the city has none or it is wrong. */
export default function Schedule() {
  const { c } = useTheme();
  const { lang, s } = useLang();
  const { side: sideParam } = useLocalSearchParams<{ side: string }>();
  const sideId = Number(sideParam);
  const found = sideById(sideId);
  const existing = found && withManualSchedule(found).rules[0]?.rule;
  const setManual = useSwept((st) => st.setManualSchedule);
  const reminders = useSwept((st) => st.reminders);

  const [days, setDays] = useState<Weekday[]>(existing?.days ?? []);
  const [start, setStart] = useState(existing?.windows[0]?.start ?? 9 * 60);
  const [end, setEnd] = useState(existing?.windows[0]?.end ?? 10 * 60);
  const [from, setFrom] = useState(existing?.season.from ?? { month: 4, day: 1 });
  const [to, setTo] = useState(existing?.season.to ?? { month: 12, day: 1 });
  if (!found) return null;

  const rule: CleaningRule = {
    days: [...days].sort(),
    windows: [{ start, end }],
    season: { from, to },
    kind: 'no-parking',
  };
  const valid = days.length > 0;
  const toggle = (d: Weekday) => setDays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]));

  const save = async () => {
    setManual(sideId, [{ rule, poles: 0 }]);
    const { spot } = useSwept.getState();
    if (spot?.sideId === sideId) await park({ ...spot, schedule: { rules: [{ rule, poles: 0 }] }, manualSchedule: true, unconfirmed: undefined });
    router.back();
  };

  const next = valid ? nextWindow([rule], new Date()) : undefined;
  const preview = next
    ? plannedReminders(next, reminders, new Date()).map((r) => `${dayLong(r.at.getDay(), lang)} ${time(r.at, lang)}`)
    : [];

  return (
    <View style={[styles.screen, { backgroundColor: c.bg }]}>
      <View style={styles.nav}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Text style={[styles.navAction, { color: c.acc }]}>{s.cancel}</Text>
        </Pressable>
        <Text style={[styles.navTitle, { color: c.fg }]}>{s.schedule}</Text>
        <Pressable onPress={save} disabled={!valid} hitSlop={10}>
          <Text style={[styles.navAction, styles.navSave, { color: c.acc, opacity: valid ? 1 : 0.35 }]}>{s.save}</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Card radius={20} style={styles.hint}>
          {/* A miniature of the street sign, filled in as the user types. */}
          <View style={styles.sign}>
            <View style={styles.noParking}>
              <Text style={styles.noParkingP}>P</Text>
              <View style={styles.noParkingBar} />
            </View>
            <Text style={styles.signText}>{`${clock(start, 'en').replace(':', 'h')}-${clock(end, 'en').replace(':', 'h')}`}</Text>
            <Text style={styles.signText}>{valid ? rule.days.map((d) => dayShort(d, 'fr').toUpperCase()).join(' ') : '—'}</Text>
          </View>
          <View style={styles.flex}>
            <Text style={[styles.hintTitle, { color: c.fg }]}>{s.copyFromSign}</Text>
            <Text style={[styles.hintSub, { color: c.mut }]}>{s.copyFromSignSub(found.street, sideName(found.grid, lang))}</Text>
          </View>
        </Card>

        <View style={styles.section}>
          <Text style={[styles.caption, { color: c.mut }]}>{s.days.toUpperCase()}</Text>
          <View style={styles.chips}>
            {WEEK.map((d) => {
              const on = days.includes(d);
              return (
                <Pressable
                  key={d}
                  onPress={() => toggle(d)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={dayLong(d, lang)}
                  style={[styles.chip, { backgroundColor: on ? c.day[d] : c.fill }]}
                >
                  <Text style={[styles.chipText, { color: on ? c.dayText[d] : c.fg }]}>{dayKey(d, lang)}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Group title={s.hours}>
          <Row first>
            <Text style={[styles.label, { color: c.fg }]}>{s.startTime}</Text>
            <DateTimePicker mode="time" display="compact" locale={lang === 'fr' ? 'fr-CA' : 'en-GB'} minuteInterval={5} value={atMinutes(start)} onChange={(_, d) => d && setStart(minutesOf(d))} />
          </Row>
          <Row>
            <Text style={[styles.label, { color: c.fg }]}>{s.endTime}</Text>
            <DateTimePicker mode="time" display="compact" locale={lang === 'fr' ? 'fr-CA' : 'en-GB'} minuteInterval={5} value={atMinutes(end)} onChange={(_, d) => d && setEnd(minutesOf(d))} />
          </Row>
        </Group>

        <Group
          title={s.season}
          footer={!valid ? s.pickADay : preview.length === 2 ? s.remindersPreview(preview[0]!, preview[1]!) : undefined}
        >
          <Row first>
            <Text style={[styles.label, { color: c.fg }]}>{s.from}</Text>
            <DateTimePicker
              mode="date"
              locale={lang === 'fr' ? 'fr-CA' : 'en-GB'}
              display="compact"
              value={new Date(YEAR, from.month - 1, from.day)}
              onChange={(_, d) => d && setFrom({ month: d.getMonth() + 1, day: d.getDate() })}
            />
          </Row>
          <Row>
            <Text style={[styles.label, { color: c.fg }]}>{s.to}</Text>
            <DateTimePicker
              mode="date"
              locale={lang === 'fr' ? 'fr-CA' : 'en-GB'}
              display="compact"
              value={new Date(YEAR, to.month - 1, to.day)}
              onChange={(_, d) => d && setTo({ month: d.getMonth() + 1, day: d.getDate() })}
            />
          </Row>
        </Group>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  nav: { height: 56, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navTitle: { fontSize: 17, fontWeight: '600' },
  navAction: { fontSize: 17 },
  navSave: { fontWeight: '600' },
  content: { padding: 16, gap: 20 },
  hint: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14 },
  sign: { width: 84, borderRadius: 6, backgroundColor: '#fff', borderWidth: 1, borderColor: '#d9d9d9', alignItems: 'center', paddingVertical: 8, gap: 2 },
  noParking: { width: 30, height: 30, borderRadius: 15, borderWidth: 3, borderColor: '#d62d20', alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  noParkingP: { fontSize: 16, fontWeight: '800', color: '#111' },
  noParkingBar: { position: 'absolute', width: 30, height: 3, backgroundColor: '#d62d20', transform: [{ rotate: '45deg' }] },
  signText: { fontSize: 10, fontWeight: '700', color: '#111' },
  hintTitle: { fontSize: 17, fontWeight: '500' },
  hintSub: { fontSize: 14, lineHeight: 19, marginTop: 2 },
  section: { gap: 8 },
  caption: { fontSize: 12, fontWeight: '500', letterSpacing: 0.4, paddingHorizontal: 16 },
  chips: { flexDirection: 'row', gap: 6 },
  chip: { flex: 1, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  chipText: { fontSize: 15, fontWeight: '600' },
  label: { flex: 1, fontSize: 16 },
});
