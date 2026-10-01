import { SymbolView, type SFSymbol } from 'expo-symbols';
import { Pressable, StyleSheet, Text } from 'react-native';
import { withAlpha } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

interface Props {
  title: string;
  onPress?: () => void;
  icon?: SFSymbol;
  disabled?: boolean;
  /** Share a row equally with sibling buttons. */
  grow?: boolean;
}

/** 52 pt capsule, accent outline on a 14% tint. One per screen. */
export function PrimaryButton({ title, onPress, icon, disabled }: Props) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.primary,
        { borderColor: c.acc, backgroundColor: withAlpha(c.acc, 0.14), opacity: disabled ? 0.4 : pressed ? 0.7 : 1 },
      ]}
    >
      {icon && <SymbolView name={icon} size={18} tintColor={c.accT} />}
      <Text style={[styles.primaryText, { color: c.accT }]}>{title}</Text>
    </Pressable>
  );
}

/** 46 pt capsule on the fill colour. */
export function SecondaryButton({ title, onPress, icon, disabled, grow }: Props) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [styles.secondary, grow && styles.grow, { backgroundColor: c.fill, opacity: disabled ? 0.4 : pressed ? 0.6 : 1 }]}
    >
      {icon && <SymbolView name={icon} size={16} tintColor={c.fg} />}
      <Text style={[styles.secondaryText, { color: c.fg }]}>{title}</Text>
    </Pressable>
  );
}

export function TextButton({ title, onPress, disabled }: Props) {
  const { c } = useTheme();
  return (
    <Pressable onPress={onPress} disabled={disabled} hitSlop={8} accessibilityRole="button" style={styles.text}>
      <Text style={[styles.textLabel, { color: c.acc, opacity: disabled ? 0.4 : 1 }]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  primary: {
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
  },
  primaryText: { fontSize: 17, fontWeight: '600' },
  grow: { flex: 1 },
  secondary: {
    height: 46,
    borderRadius: 23,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 14,
  },
  secondaryText: { fontSize: 15, fontWeight: '500' },
  text: { height: 44, alignItems: 'center', justifyContent: 'center' },
  textLabel: { fontSize: 16 },
});
