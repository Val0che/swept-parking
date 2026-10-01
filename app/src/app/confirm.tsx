import { router, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useMemo } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { PrimaryButton, SecondaryButton, TextButton } from '../components/Buttons';
import { Card } from '../components/Card';
import { DashedRule } from '../components/DashedRule';
import { DayPill } from '../components/DayPill';
import { oppositeOf, sideById } from '../data/db';
import { buildConfirm } from '../features/confirm/confirmModel';
import { useLang } from '../i18n/useLang';
import { park, spotFor, withManualSchedule } from '../parking/actions';
import { useSwept } from '../state/store';
import { useTheme } from '../theme/useTheme';

/** Screen 6 — what applies to the chosen side, before saving it (a sheet over the map). */
export default function Confirm() {
  const { c } = useTheme();
  const { lang, s } = useLang();
  const params = useLocalSearchParams<{ side: string; lat?: string; lng?: string; source?: 'auto' | 'manual' }>();
  const reminders = useSwept((st) => st.reminders);
  // Re-read when the user edits this side's schedule in the sheet above.
  const manual = useSwept((st) => st.manualSchedules[Number(params.side)]);
  const saveSpot = useSwept((st) => st.saveSpot);

  const side = useMemo(() => {
    const found = sideById(Number(params.side));
    return found && withManualSchedule(found);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.side, manual]);
  if (!side) return null;

  const m = buildConfirm(side, new Date(), lang, s, reminders);
  const opposite = oppositeOf(side);
  const at = {
    lat: params.lat ? Number(params.lat) : side.line[0]![1],
    lng: params.lng ? Number(params.lng) : side.line[0]![0],
    source: params.source ?? ('manual' as const),
  };

  const save = async (withRules = true) => {
    const spot = spotFor(withRules ? side : { ...side, rules: [] }, at);
    await park(spot);
    router.dismissAll();
    router.replace('/');
  };
  const toSchedule = () => router.push({ pathname: '/schedule', params: { side: String(side.id) } });
  const toOtherSide = () => opposite && router.setParams({ side: String(opposite.id) });
  const addPlace = () =>
    Alert.prompt(s.saveAsPlace, s.placeName, (name) => name?.trim() && saveSpot(name.trim(), spotFor(side, at)), 'plain-text', side.street);

  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={styles.content}>
      <View style={styles.head}>
        <View style={styles.flex}>
          <Text style={[styles.title, { color: c.fg }]}>{m.title}</Text>
          <Text style={[styles.sub, { color: c.mut }]}>{m.sub}</Text>
        </View>
        <Pressable onPress={() => router.back()} hitSlop={10} style={[styles.close, { backgroundColor: c.fill }]} accessibilityLabel={s.cancel}>
          <SymbolView name="xmark" size={13} weight="bold" tintColor={c.mut} />
        </Pressable>
      </View>

      <Card radius={20} style={styles.card}>
        {m.schedule ? (
          <>
            <View style={styles.row}>
              <DayPill day={m.schedule.rule.days[0]} lang={lang} size="large" disputed={!!m.schedule.disputed} />
              <View style={styles.flex}>
                <Text style={[styles.line, { color: c.fg }]}>{m.schedule.line}</Text>
                <Text style={[styles.small, { color: c.mut }]}>
                  {side.manual ? `${s.manualBadge} · ` : ''}
                  {m.schedule.season}
                </Text>
              </View>
            </View>
            {m.schedule.disputed && (
              <>
                <DashedRule color={c.line} />
                <View style={styles.row}>
                  <SymbolView name="signpost.right" size={20} tintColor={c.soon} />
                  <View style={styles.flex}>
                    <Text style={[styles.body, { color: c.fg }]}>{m.schedule.disputed.says}</Text>
                    <Text style={[styles.small, { color: c.mut }]}>{m.schedule.disputed.help}</Text>
                  </View>
                </View>
              </>
            )}
            <View style={[styles.divider, { backgroundColor: c.line }]} />
            <View style={styles.row}>
              <SymbolView name="calendar.badge.checkmark" size={18} tintColor={c.acc} />
              <Text style={[styles.body, styles.flex, { color: c.fg }]}>{m.schedule.nextPass}</Text>
            </View>
          </>
        ) : (
          <View style={styles.row}>
            <DayPill lang={lang} size="large" />
            <View style={styles.flex}>
              <Text style={[styles.line, { color: c.fg }]}>{s.noSignTitle}</Text>
              <Text style={[styles.small, { color: c.mut }]}>{s.noSignHelp}</Text>
            </View>
          </View>
        )}
      </Card>

      <Text style={[styles.caption, { color: c.mut }]}>{s.plannedReminders.toUpperCase()}</Text>
      <Card radius={20} style={styles.list}>
        {m.reminders.length === 0 ? (
          <View style={styles.reminder}>
            <SymbolView name="bell.slash" size={19} tintColor={c.mut} />
            <Text style={[styles.body, { color: c.mut }]}>{s.noRemindersYet}</Text>
          </View>
        ) : (
          m.reminders.map((r, i) => (
            <View key={r.icon} style={[styles.reminder, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.line }]}>
              <SymbolView name={r.icon === 'evening' ? 'moon' : 'alarm'} size={19} tintColor={c.acc} />
              <Text style={[styles.body, styles.flex, { color: c.fg }]}>{r.label}</Text>
              <Text style={[styles.body, styles.tabular, { color: c.fg }]}>{r.value}</Text>
            </View>
          ))
        )}
      </Card>

      <View style={styles.actions}>
        {m.schedule ? (
          <PrimaryButton title={s.save} onPress={() => void save()} />
        ) : (
          <PrimaryButton title={s.addSchedule} icon="plus" onPress={toSchedule} />
        )}
        <View style={styles.secondary}>
          <SecondaryButton grow title={s.otherSide} icon="arrow.left.arrow.right" onPress={toOtherSide} disabled={!opposite} />
          {m.schedule ? (
            <SecondaryButton grow title={s.editSchedule} icon="pencil" onPress={toSchedule} />
          ) : (
            <SecondaryButton grow title={s.noSignHere} onPress={() => void save(false)} />
          )}
        </View>
        {m.schedule && <TextButton title={s.saveAsPlace} onPress={addPlace} />}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingTop: 26, gap: 12 },
  flex: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  title: { fontSize: 28, fontWeight: '500', letterSpacing: -0.5 },
  sub: { fontSize: 15, marginTop: 2 },
  close: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  card: { padding: 16, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  line: { fontSize: 17, fontWeight: '500' },
  body: { fontSize: 15, lineHeight: 20 },
  small: { fontSize: 14, lineHeight: 19, marginTop: 1 },
  tabular: { fontVariant: ['tabular-nums'] },
  divider: { height: StyleSheet.hairlineWidth },
  caption: { fontSize: 12, fontWeight: '500', letterSpacing: 0.4, paddingHorizontal: 16, marginTop: 6 },
  list: { paddingHorizontal: 16 },
  reminder: { minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: 12 },
  actions: { gap: 10, marginTop: 8 },
  secondary: { flexDirection: 'row', gap: 10 },
});
