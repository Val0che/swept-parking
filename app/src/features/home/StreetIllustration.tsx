import type { GridSide } from '@swept/core';
import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme/useTheme';

interface Props {
  /** Which side of the street the car is on, in Montreal's grid directions. */
  side: GridSide;
  /** Colour of the curb the car is against (its cleaning day). */
  curb: string;
  /** Colour of the opposite curb, drawn faded. */
  opposite?: string;
  disputed: boolean;
}

const HEIGHT = 96;
/** Road width across the drawing: narrower when the road runs left–right, to fit the height. */
const ROAD = { vertical: 124, horizontal: 62 };
const DASHES = Array.from({ length: 12 }, (_, i) => i);

/**
 * Top-down street from design screen 7, north up: the road band, a dashed centre
 * line, and the car against its lit curb. East/west sides draw a road running
 * up–down with the car on the right or left; north/south sides draw it running
 * left–right with the car at the top or bottom.
 */
export function StreetIllustration({ side, curb, opposite, disputed }: Props) {
  const { c } = useTheme();
  const vertical = side === 'east' || side === 'west';
  // +1 = right or bottom edge of the road, −1 = left or top.
  const dir = side === 'east' || side === 'south' ? 1 : -1;
  const half = (vertical ? ROAD.vertical : ROAD.horizontal) / 2;

  // Everything is placed from the centre of the box along one axis.
  const across = (offset: number, thickness: number) =>
    vertical
      ? { top: 0, bottom: 0, width: thickness, left: '50%' as const, marginLeft: offset - thickness / 2 }
      : { left: 0, right: 0, height: thickness, top: HEIGHT / 2 + offset - thickness / 2 };

  return (
    <View style={[styles.box, { backgroundColor: c.fill }]}>
      <View style={[styles.abs, across(0, half * 2), { backgroundColor: c.fill }]} />
      <View style={[styles.abs, across(-dir * (half - 1.5), 3), { backgroundColor: opposite ?? c.mut, opacity: 0.4 }]} />

      <View style={[styles.abs, styles.dashes, across(0, 2), vertical ? styles.column : styles.row, vertical ? styles.padV : styles.padH]}>
        {DASHES.slice(0, vertical ? 6 : 12).map((i) => (
          <View key={i} style={[vertical ? styles.dashV : styles.dashH, { backgroundColor: c.mut }]} />
        ))}
      </View>

      <View
        style={[
          styles.abs,
          styles.car,
          vertical ? { left: '50%', marginLeft: dir * (half - 30) - 15, top: HEIGHT / 2 - 15 } : { left: '50%', marginLeft: -15, top: HEIGHT / 2 + dir * (half - 17) - 15 },
          // car.side points right; a car parked on the right-hand curb faces "up" the drawing.
          vertical && { transform: [{ rotate: dir === 1 ? '-90deg' : '90deg' }] },
          !vertical && dir === -1 && { transform: [{ scaleX: -1 }] },
        ]}
      >
        <SymbolView name="car.side.fill" size={30} tintColor={c.fg} />
      </View>

      <View
        style={[
          styles.abs,
          across(dir * (half - 3), 6),
          vertical ? styles.column : styles.row,
          styles.curb,
          !disputed && { backgroundColor: curb, shadowColor: curb },
        ]}
      >
        {disputed &&
          DASHES.slice(0, vertical ? 6 : 12).map((i) => <View key={i} style={[vertical ? styles.curbDashV : styles.curbDashH, { backgroundColor: curb }]} />)}
      </View>

      <View style={styles.north}>
        <SymbolView name="arrow.up" size={10} weight="bold" tintColor={c.mut} />
        <Text style={[styles.northText, { color: c.mut }]}>N</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { height: HEIGHT, overflow: 'hidden' },
  abs: { position: 'absolute' },
  column: { flexDirection: 'column', justifyContent: 'space-between' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  dashes: { opacity: 0.4 },
  padV: { paddingVertical: 10 },
  padH: { paddingHorizontal: 10 },
  dashV: { height: 8, width: 2 },
  dashH: { width: 12, height: 2 },
  car: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  curb: { shadowOpacity: 0.7, shadowRadius: 7, shadowOffset: { width: 0, height: 0 } },
  curbDashV: { height: 9, width: 6 },
  curbDashH: { width: 14, height: 6 },
  north: { position: 'absolute', top: 8, left: 12, flexDirection: 'row', alignItems: 'center', gap: 2 },
  northText: { fontSize: 10, fontWeight: '700' },
});
