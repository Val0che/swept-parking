import { SymbolView, type SFSymbol } from 'expo-symbols';
import { Pressable, StyleSheet, Text } from 'react-native';
import { Card } from '../../components/Card';
import { useTheme } from '../../theme/useTheme';

export interface BannerModel {
  key: string;
  icon: SFSymbol;
  tone: 'warning' | 'accent';
  text: string;
  cta: string;
  onPress: () => void;
  onDismiss?: () => void;
}

/** One-line prompt above the hero: a missing permission, an unconfirmed side, or the automation invite. */
export function Banner({ banner }: { banner: BannerModel }) {
  const { c } = useTheme();
  return (
    <Card radius={16} style={styles.card}>
      <SymbolView name={banner.icon} size={20} tintColor={banner.tone === 'warning' ? c.soon : c.acc} />
      <Text style={[styles.text, { color: c.fg }]}>{banner.text}</Text>
      <Pressable onPress={banner.onPress} hitSlop={8} accessibilityRole="button">
        <Text style={[styles.cta, { color: c.acc }]}>{banner.cta}</Text>
      </Pressable>
      {banner.onDismiss && (
        <Pressable onPress={banner.onDismiss} hitSlop={10} accessibilityRole="button" accessibilityLabel="Fermer">
          <SymbolView name="xmark" size={13} tintColor={c.mut} />
        </Pressable>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, paddingHorizontal: 14 },
  text: { flex: 1, fontSize: 14, lineHeight: 18 },
  cta: { fontSize: 14, fontWeight: '600' },
});
