import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme/useTheme';

interface Props {
  /** Colour of the curb the car is against (its cleaning day). */
  curb: string;
  /** Colour of the opposite curb, drawn faded. */
  opposite?: string;
  disputed: boolean;
}

const ROAD = 124;
const DASHES = Array.from({ length: 6 }, (_, i) => i);

/**
 * Top-down street from design screen 7: road band, dashed centre line, the car
 * against its lit curb. Always drawn with the car on the right curb, north up:
 * the side's name is in the text below, the drawing only shows "this curb".
 */
export function StreetIllustration({ curb, opposite, disputed }: Props) {
  const { c } = useTheme();
  return (
    <View style={[styles.box, { backgroundColor: c.fill }]}>
      <View style={[styles.road, { backgroundColor: c.fill }]} />
      <View style={[styles.farCurb, { backgroundColor: opposite ?? c.mut }]} />
      <View style={styles.centre}>
        {DASHES.map((i) => (
          <View key={i} style={[styles.dash, { backgroundColor: c.mut }]} />
        ))}
      </View>
      <View style={styles.car}>
        <SymbolView name="car.side.fill" size={30} tintColor={c.fg} />
      </View>
      <View style={[styles.curb, !disputed && { backgroundColor: curb, shadowColor: curb }]}>
        {disputed && DASHES.map((i) => <View key={i} style={[styles.curbDash, { backgroundColor: curb }]} />)}
      </View>
      <View style={styles.north}>
        <SymbolView name="arrow.up" size={10} weight="bold" tintColor={c.mut} />
        <Text style={[styles.northText, { color: c.mut }]}>N</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { height: 96, overflow: 'hidden', alignItems: 'center' },
  road: { position: 'absolute', top: 0, bottom: 0, width: ROAD },
  farCurb: { position: 'absolute', top: 0, bottom: 0, width: 3, left: '50%', marginLeft: -ROAD / 2, opacity: 0.4 },
  centre: { position: 'absolute', top: 10, bottom: 10, width: 2, justifyContent: 'space-between', opacity: 0.4 },
  dash: { height: 8, width: 2 },
  car: { position: 'absolute', top: 33, left: '50%', marginLeft: 18, transform: [{ rotate: '-90deg' }] },
  curb: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 6,
    left: '50%',
    marginLeft: ROAD / 2 - 6,
    justifyContent: 'space-between',
    shadowOpacity: 0.7,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 0 },
  },
  curbDash: { height: 9, width: 6 },
  north: { position: 'absolute', top: 8, left: 12, flexDirection: 'row', alignItems: 'center', gap: 2 },
  northText: { fontSize: 10, fontWeight: '700' },
});
