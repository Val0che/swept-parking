import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLang } from '../../i18n/useLang';
import { useTheme } from '../../theme/useTheme';

interface Props {
  /** "2 sur 3"; omitted on the welcome screen. */
  step?: number;
  title?: string;
  sub?: string;
  children: ReactNode;
  /** Pinned to the bottom: the screen's one primary action and its escape hatch. */
  footer: ReactNode;
}

/** Shared frame of the three onboarding screens. */
export function OnboardingScreen({ step, title, sub, children, footer }: Props) {
  const { c } = useTheme();
  const { s } = useLang();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.screen, { backgroundColor: c.bg, paddingTop: insets.top, paddingBottom: insets.bottom + 12 }]}>
      {step !== undefined && (
        <View style={styles.nav}>
          {router.canGoBack() ? (
            <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="Retour">
              <SymbolView name="chevron.left" size={20} tintColor={c.acc} />
            </Pressable>
          ) : (
            <View />
          )}
          <Text style={[styles.step, { color: c.mut }]}>{s.stepOf(step, 3)}</Text>
        </View>
      )}
      <ScrollView contentContainerStyle={styles.content}>
        {title && <Text style={[styles.title, { color: c.fg }]}>{title}</Text>}
        {sub && <Text style={[styles.sub, { color: c.mut }]}>{sub}</Text>}
        {children}
      </ScrollView>
      <View style={styles.footer}>{footer}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  nav: { height: 44, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  step: { fontSize: 14 },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20, gap: 14 },
  title: { fontSize: 32, lineHeight: 36, fontWeight: '500', letterSpacing: -0.7 },
  sub: { fontSize: 17, lineHeight: 24, marginBottom: 6 },
  footer: { paddingHorizontal: 20, gap: 4 },
});
