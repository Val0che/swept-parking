import { router, Stack } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { ActionSheetIOS, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card } from '../components/Card';
import { DayPill } from '../components/DayPill';
import { subScreenOptions } from '../components/navOptions';
import { scheduleShort } from '../features/schedule/text';
import { useLang } from '../i18n/useLang';
import { park } from '../parking/actions';
import { useSwept, type SavedSpot } from '../state/store';
import { withAlpha } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

/** Screen 10 — places the user parks often; "Garer ici" skips the map. */
export default function Spots() {
  const { c } = useTheme();
  const { lang, s } = useLang();
  const saved = useSwept((st) => st.saved);
  const spot = useSwept((st) => st.spot);
  const { saveSpot, renameSaved, deleteSaved } = useSwept.getState();

  const parkHere = async (place: SavedSpot) => {
    await park({ ...place.spot, parkedAt: new Date().toISOString(), source: 'manual', unconfirmed: undefined });
    router.dismissAll();
    router.replace('/');
  };

  const more = (place: SavedSpot) =>
    ActionSheetIOS.showActionSheetWithOptions(
      { title: place.name, options: [s.rename, s.delete, s.cancel], destructiveButtonIndex: 1, cancelButtonIndex: 2 },
      (i) => {
        if (i === 0) Alert.prompt(s.rename, undefined, (name) => name?.trim() && renameSaved(place.id, name.trim()), 'plain-text', place.name);
        if (i === 1) deleteSaved(place.id);
      },
    );

  const addCurrent = () =>
    spot && Alert.prompt(s.addCurrent, s.placeName, (name) => name?.trim() && saveSpot(name.trim(), spot), 'plain-text', spot.street);

  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={styles.content} contentInsetAdjustmentBehavior="automatic">
      <Stack.Screen
        options={{
          ...subScreenOptions(s.savedSpots, s.home, c),
          headerRight: spot
            ? () => (
                <Pressable onPress={addCurrent} hitSlop={10} accessibilityLabel={s.addCurrent}>
                  <SymbolView name="plus" size={20} tintColor={c.acc} />
                </Pressable>
              )
            : undefined,
        }}
      />

      {saved.length === 0 ? (
        <Text style={[styles.empty, { color: c.mut }]}>{s.savedEmpty}</Text>
      ) : (
        <Card radius={20} style={styles.list}>
          {saved.map((place, i) => {
            const main = place.spot.schedule.rules[0]?.rule;
            return (
              <Pressable
                key={place.id}
                onLongPress={() => more(place)}
                style={[styles.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.line }]}
              >
                <DayPill day={main?.days[0]} lang={lang} />
                <View style={styles.flex}>
                  <Text style={[styles.name, { color: c.fg }]} numberOfLines={1}>
                    {place.name}
                  </Text>
                  <Text style={[styles.sub, { color: c.mut }]} numberOfLines={1}>
                    {place.spot.manualSchedule ? `${s.manualBadge} · ` : ''}
                    {main ? scheduleShort(main, lang) : s.noData}
                  </Text>
                </View>
                <Pressable
                  onPress={() => void parkHere(place)}
                  style={[styles.park, { borderColor: c.acc, backgroundColor: withAlpha(c.acc, 0.14) }]}
                  accessibilityRole="button"
                >
                  <Text style={[styles.parkText, { color: c.accT }]}>{s.parkHere}</Text>
                </Pressable>
                <Pressable onPress={() => more(place)} hitSlop={10} accessibilityLabel={s.edit}>
                  <SymbolView name="ellipsis" size={18} tintColor={c.mut} />
                </Pressable>
              </Pressable>
            );
          })}
        </Card>
      )}
      <Text style={[styles.footer, { color: c.mut }]}>{s.savedFooter}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  flex: { flex: 1 },
  empty: { fontSize: 15, lineHeight: 21, paddingHorizontal: 4, paddingVertical: 12 },
  list: { paddingHorizontal: 16 },
  row: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  name: { fontSize: 16, fontWeight: '500' },
  sub: { fontSize: 14, marginTop: 1 },
  park: { height: 34, borderRadius: 17, borderWidth: 1.5, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  parkText: { fontSize: 14, fontWeight: '600' },
  footer: { fontSize: 13, lineHeight: 18, paddingHorizontal: 16 },
});
