import { router } from 'expo-router';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';
import { PrimaryButton } from '../components/Buttons';
import { OnboardingScreen } from '../features/onboarding/OnboardingScreen';
import { useLang } from '../i18n/useLang';
import { withAlpha } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

const ICONS: SFSymbol[] = ['car', 'arrow.left.arrow.right', 'bell'];

/** Screen 1 — the promise in five seconds. */
export default function Welcome() {
  const { c } = useTheme();
  const { s } = useLang();
  return (
    <OnboardingScreen footer={<PrimaryButton title={s.start} onPress={() => router.push('/permissions')} />}>
      {/* Stand-in for the street-sweeper illustration still to be commissioned (design/README.md, Assets). */}
      <View style={[styles.art, { backgroundColor: c.fill }]}>
        <View style={[styles.road, { backgroundColor: c.fill }]} />
        <View style={[styles.curb, { backgroundColor: c.acc, shadowColor: c.acc }]} />
        <SymbolView name="car.side.fill" size={44} tintColor={c.fg} style={styles.car} />
      </View>

      <Text style={[styles.name, { color: c.fg }]}>Swept</Text>
      <Text style={[styles.promise, { color: c.fg }]}>{s.promise}</Text>

      <View style={styles.steps}>
        {s.steps.map((step, i) => (
          <View key={step} style={styles.step}>
            <View style={[styles.tile, { backgroundColor: withAlpha(c.acc, 0.14) }]}>
              <SymbolView name={ICONS[i]!} size={19} tintColor={c.accT} />
            </View>
            <Text style={[styles.stepText, { color: c.fg }]}>{step}</Text>
          </View>
        ))}
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  art: { height: 240, borderRadius: 28, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  road: { position: 'absolute', top: 0, bottom: 0, width: 190 },
  curb: { position: 'absolute', top: 0, bottom: 0, width: 8, left: '50%', marginLeft: 87, shadowOpacity: 0.8, shadowRadius: 12, shadowOffset: { width: 0, height: 0 } },
  car: { marginLeft: 96, transform: [{ rotate: '-90deg' }] },
  name: { fontSize: 40, fontWeight: '500', letterSpacing: -1, marginTop: 14 },
  promise: { fontSize: 21, lineHeight: 28 },
  steps: { gap: 12, marginTop: 10 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  tile: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  stepText: { fontSize: 17 },
});
