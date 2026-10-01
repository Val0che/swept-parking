import { clock, dateOf, when, type Lang } from '@swept/core';
import Constants from 'expo-constants';
import { router, Stack } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Group, Row } from '../components/Card';
import { subScreenOptions } from '../components/navOptions';
import { Segmented } from '../components/Segmented';
import { dataBuiltAt } from '../data/db';
import { useLang } from '../i18n/useLang';
import { registerCategories } from '../notifications/categories';
import { pushConfig, replan } from '../parking/actions';
import { useSwept } from '../state/store';
import { useTheme } from '../theme/useTheme';

const DATA_URL = 'https://donnees.montreal.ca/dataset/stationnement-sur-rue-signalisation-courant';

/** Screen 11 — car automation status, language, links to reminders and places, data source. */
export default function Settings() {
  const { c } = useTheme();
  const { lang, s } = useLang();
  const carMode = useSwept((st) => st.carMode);
  const lastAutoAt = useSwept((st) => st.lastAutoAt);
  const reminders = useSwept((st) => st.reminders);
  const savedCount = useSwept((st) => st.saved.length);

  const setLang = async (next: Lang) => {
    useSwept.getState().setLang(next);
    // Notification text and buttons are baked in when scheduled: redo them in the new language.
    pushConfig();
    await registerCategories(next);
    await replan();
  };

  const active = carMode === 'bluetooth' && lastAutoAt !== null;
  const carStatus = active ? s.automationActive(when(new Date(lastAutoAt), new Date(), lang)) : carMode === 'manual' ? s.manualMode : s.automationOff;
  const reminderParts = [reminders.eveningEnabled && clock(reminders.eveningAt, lang), reminders.leadEnabled && s.lead(reminders.leadMinutes)].filter(Boolean);

  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={styles.content} contentInsetAdjustmentBehavior="automatic">
      <Stack.Screen options={subScreenOptions(s.settings, s.home, c)} />

      <Group title={s.car}>
        <Row first minHeight={60}>
          <SymbolView name={active ? 'checkmark.circle.fill' : 'car'} size={22} tintColor={active ? c.safe : c.mut} />
          <Text style={[styles.label, { color: c.fg }]}>{carStatus}</Text>
        </Row>
        <Row>
          <Pressable onPress={() => router.push('/car')} style={styles.flex} accessibilityRole="button">
            <Text style={[styles.link, { color: c.acc }]}>{active ? s.testAgain : s.setUpAutomation}</Text>
          </Pressable>
        </Row>
      </Group>

      <Group title={s.general}>
        <Row first>
          <Text style={[styles.label, { color: c.fg }]}>{s.language}</Text>
          <View style={styles.lang}>
            <Segmented
              value={lang}
              onChange={(next) => void setLang(next)}
              options={[
                { value: 'fr', label: 'Français' },
                { value: 'en', label: 'English' },
              ]}
            />
          </View>
        </Row>
        <NavRow label={s.reminders} value={reminderParts.length ? reminderParts.join(' · ') : s.off} onPress={() => router.push('/reminders')} />
        <NavRow label={s.savedSpotsRow} value={String(savedCount)} onPress={() => router.push('/spots')} />
      </Group>

      <Group title={s.about} footer={s.disclaimer}>
        <Row first minHeight={60}>
          <Pressable onPress={() => void Linking.openURL(DATA_URL)} style={styles.navRow} accessibilityRole="link">
            <View style={styles.flex}>
              <Text style={[styles.label, { color: c.fg }]}>{s.dataSource}</Text>
              <Text style={[styles.sub, { color: c.mut }]}>{s.dataSourceSub(dateOf(dataBuiltAt, lang))}</Text>
            </View>
            <SymbolView name="arrow.up.right.square" size={18} tintColor={c.mut} />
          </Pressable>
        </Row>
        <NavRow label={s.diagnostics} onPress={() => router.push('/debug')} />
      </Group>

      <Text style={[styles.version, { color: c.mut }]}>{s.version(Constants.expoConfig?.version ?? '')}</Text>
    </ScrollView>
  );
}

function NavRow({ label, value, onPress }: { label: string; value?: string; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Row>
      <Pressable onPress={onPress} style={styles.navRow} accessibilityRole="button">
        <Text style={[styles.label, { color: c.fg }]}>{label}</Text>
        {value && <Text style={[styles.value, { color: c.mut }]}>{value}</Text>}
        <SymbolView name="chevron.right" size={13} tintColor={c.mut} />
      </Pressable>
    </Row>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 22 },
  flex: { flex: 1 },
  label: { flex: 1, fontSize: 16 },
  sub: { fontSize: 14, marginTop: 1 },
  link: { fontSize: 16 },
  value: { fontSize: 15 },
  lang: { width: 190 },
  navRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  version: { fontSize: 13, textAlign: 'center' },
});
