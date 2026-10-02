import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PrimaryButton } from '../../components/Buttons';
import { Card } from '../../components/Card';
import { GlassIconButton } from '../../components/GlassIconButton';
import { useLang } from '../../i18n/useLang';
import { leave } from '../../parking/actions';
import { useSwept, type ParkedSpot } from '../../state/store';
import { useTheme } from '../../theme/useTheme';
import { Banner } from './Banner';
import { HeroCard } from './HeroCard';
import { buildHome } from './homeModel';
import { RemindersCard } from './RemindersCard';
import { SpotCard } from './SpotCard';
import { useBanner } from './useBanner';
import { useNow } from './useNow';

/** Screen 7 — Home when a car is parked. */
export function HomeParked({ spot }: { spot: ParkedSpot }) {
  const { c } = useTheme();
  const { lang, s } = useLang();
  const now = useNow();
  const insets = useSafeAreaInsets();
  const banner = useBanner();
  const reminders = useSwept((st) => st.reminders);
  // Proof the Bluetooth automation works: it has fired at least once.
  const automationActive = useSwept((st) => st.carMode === 'bluetooth' && st.lastAutoAt !== null);

  const m = useMemo(
    () => buildHome(spot, now, lang, s, reminders, automationActive),
    [spot, now, lang, s, reminders, automationActive],
  );

  return (
    <ScrollView
      style={{ backgroundColor: c.bg }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 4, paddingBottom: insets.bottom + 24 }]}
    >
      <View style={styles.header}>
        <Text style={[styles.since, { color: c.mut }]}>{m.since}</Text>
        <View style={styles.headerButtons}>
          <GlassIconButton icon="bookmark" label={s.savedSpots} onPress={() => router.push('/spots')} />
          <GlassIconButton icon="gearshape" label={s.settings} onPress={() => router.push('/settings')} />
        </View>
      </View>

      {banner && <Banner banner={banner} />}

      {m.hero ? (
        <HeroCard hero={m.hero} onMoved={() => void leave()} />
      ) : (
        <Card style={styles.noSchedule}>
          <Text style={[styles.noScheduleTitle, { color: c.fg }]}>{s.noScheduleTitle}</Text>
          <Text style={[styles.noScheduleSub, { color: c.mut }]}>{s.noScheduleSub}</Text>
          <PrimaryButton
            title={s.addSchedule}
            icon="plus"
            onPress={() => router.push({ pathname: '/schedule', params: { side: String(spot.sideId) } })}
          />
        </Card>
      )}

      <SpotCard spot={m.spot} side={spot.side} oppositeDay={spot.oppositeDay} wrongSide={s.wrongSide} onWrongSide={() => router.push('/pick')} />
      {m.reminders && m.reminders.length > 0 && (
        <RemindersCard rows={m.reminders} title={s.reminders} edit={s.edit} onEdit={() => router.push('/reminders')} />
      )}

      {m.showFooter && !banner && (
        <View style={styles.footer}>
          <SymbolView name="info.circle" size={14} tintColor={c.mut} />
          <Text style={[styles.footerText, { color: c.mut }]}>{s.footer}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, gap: 12 },
  header: { height: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 4 },
  since: { fontSize: 14 },
  headerButtons: { flexDirection: 'row', gap: 8 },
  noSchedule: { padding: 20, gap: 10 },
  noScheduleTitle: { fontSize: 22, fontWeight: '500', letterSpacing: -0.3 },
  noScheduleSub: { fontSize: 15, lineHeight: 21, marginBottom: 6 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 6 },
  footerText: { fontSize: 12 },
});
