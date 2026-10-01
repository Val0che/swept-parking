import type { Weekday } from '@swept/core';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import type { HomeModel } from './homeModel';
import { StreetIllustration } from './StreetIllustration';

interface Props {
  spot: HomeModel['spot'];
  oppositeDay?: Weekday;
  wrongSide: string;
  onWrongSide?: () => void;
}

export function SpotCard({ spot, oppositeDay, wrongSide, onWrongSide }: Props) {
  const { c } = useTheme();
  const day = spot.day as Weekday | undefined;
  const dayColour = day === undefined ? c.noData : c.day[day];
  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.line }]}>
      <StreetIllustration
        curb={dayColour}
        opposite={oppositeDay === undefined ? undefined : c.day[oppositeDay]}
        disputed={spot.disputed}
      />
      <View style={styles.body}>
        <Text style={[styles.street, { color: c.fg }]}>{spot.street}</Text>
        <Text style={[styles.side, { color: c.mut }]}>{spot.side}</Text>
        {spot.dayKey && (
          <View style={styles.schedRow}>
            <View style={[styles.pill, { backgroundColor: dayColour }]}>
              <Text style={[styles.pillText, { color: day === undefined ? c.fg : c.dayText[day] }]}>{spot.dayKey}</Text>
            </View>
            <Text style={[styles.sched, { color: c.fg }]}>{spot.schedule}</Text>
          </View>
        )}
      </View>
      <Pressable onPress={onWrongSide} style={[styles.wrong, { borderTopColor: c.line }]} accessibilityRole="button">
        <View style={styles.wrongLeft}>
          <SymbolView name="arrow.left.arrow.right" size={17} tintColor={c.acc} />
          <Text style={[styles.wrongText, { color: c.acc }]}>{wrongSide}</Text>
        </View>
        <SymbolView name="chevron.right" size={14} tintColor={c.mut} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 24, borderWidth: 1, overflow: 'hidden' },
  body: { paddingTop: 14, paddingHorizontal: 16, paddingBottom: 4, gap: 2 },
  street: { fontSize: 20, fontWeight: '500', letterSpacing: -0.2 },
  side: { fontSize: 14 },
  schedRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  pill: { minWidth: 26, height: 18, paddingHorizontal: 6, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  pillText: { fontSize: 11, fontWeight: '700' },
  sched: { fontSize: 15, flexShrink: 1 },
  wrong: {
    marginTop: 10,
    marginHorizontal: 16,
    borderTopWidth: 1,
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  wrongLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  wrongText: { fontSize: 15, fontWeight: '500' },
});
