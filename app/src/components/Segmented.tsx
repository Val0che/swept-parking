import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/useTheme';

interface Props<T> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
}

/** Segmented control in the app's own palette. */
export function Segmented<T extends string | number>({ options, value, onChange, disabled }: Props<T>) {
  const { c } = useTheme();
  return (
    <View style={[styles.track, { backgroundColor: c.fill, opacity: disabled ? 0.4 : 1 }]} accessibilityRole="radiogroup">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            onPress={() => onChange(o.value)}
            disabled={disabled}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            style={[styles.segment, on && { backgroundColor: c.card, borderColor: c.line }]}
          >
            <Text style={[styles.label, { color: c.fg, fontWeight: on ? '600' : '400' }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', borderRadius: 10, padding: 2 },
  segment: { flex: 1, height: 32, borderRadius: 8, borderWidth: 1, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  label: { fontSize: 14 },
});
