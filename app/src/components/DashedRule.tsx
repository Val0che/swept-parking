import { StyleSheet, View } from 'react-native';

const DASHES = Array.from({ length: 60 }, (_, i) => i);

/** A 1 pt dashed horizontal line; RN can't dash a single border side. */
export function DashedRule({ color }: { color: string }) {
  return (
    <View style={styles.row}>
      {DASHES.map((i) => (
        <View key={i} style={[styles.dash, { backgroundColor: color }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 3, height: 1, overflow: 'hidden' },
  dash: { width: 4, height: 1 },
});
