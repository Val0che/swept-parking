import { GlassView } from 'expo-glass-effect';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../theme/useTheme';

interface Props {
  icon: SFSymbol;
  label: string;
  size?: number;
  onPress?: () => void;
}

/** Round Liquid Glass button for the navigation layer (header, map controls). */
export function GlassIconButton({ icon, label, size = 38, onPress }: Props) {
  const { c } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={6}>
      <GlassView isInteractive style={[styles.glass, { width: size, height: size, borderRadius: size / 2 }]}>
        <SymbolView name={icon} size={size * 0.5} tintColor={c.fg} />
      </GlassView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  glass: { alignItems: 'center', justifyContent: 'center' },
});
