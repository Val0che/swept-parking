import { when } from '@swept/core';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { AppState, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { PrimaryButton, SecondaryButton, TextButton } from '../components/Buttons';
import { Card } from '../components/Card';
import { OnboardingScreen } from '../features/onboarding/OnboardingScreen';
import { useLang } from '../i18n/useLang';
import { pushConfig, syncNative } from '../parking/actions';
import { useSwept } from '../state/store';
import { withAlpha } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

type Mode = 'bluetooth' | 'manual';

/**
 * Screen 3 — how parking is detected. Also reached later from Home's banner and
 * from Settings, to set up or re-test the Bluetooth automation.
 */
export default function Car() {
  const { c } = useTheme();
  const { lang, s } = useLang();
  const onboarded = useSwept((st) => st.onboarded);
  const lastAutoAt = useSwept((st) => st.lastAutoAt);
  const [mode, setMode] = useState<Mode>(useSwept.getState().carMode ?? 'bluetooth');
  // Only a detection that happens while this screen is up counts as "the test passed".
  const [openedAt] = useState(() => Date.now());
  const tested = lastAutoAt !== null && lastAutoAt >= openedAt;

  // The automation runs in the Shortcuts app; pick up its result when the user returns.
  useEffect(() => {
    pushConfig();
    const sub = AppState.addEventListener('change', (st) => st === 'active' && void syncNative());
    const poll = setInterval(() => void syncNative(), 3000);
    return () => (sub.remove(), clearInterval(poll));
  }, []);

  const finish = (chosen: Mode) => {
    const st = useSwept.getState();
    st.setCarMode(chosen);
    if (onboarded) return router.back();
    st.finishOnboarding();
    router.dismissAll();
    router.replace('/');
  };

  return (
    <OnboardingScreen
      step={onboarded ? undefined : 3}
      title={s.carTitle}
      sub={s.carSub}
      footer={
        <>
          <PrimaryButton title={mode === 'manual' || tested ? s.done : s.continue} onPress={() => finish(mode)} />
          {!onboarded && mode === 'bluetooth' && !tested && <TextButton title={s.skipForNow} onPress={() => finish('manual')} />}
          {onboarded && <TextButton title={s.cancel} onPress={() => router.back()} />}
        </>
      }
    >
      <Choice selected={mode === 'bluetooth'} onPress={() => setMode('bluetooth')} title={s.carBluetooth} badge={s.recommended}>
        {mode === 'bluetooth' && (
          <View style={styles.steps}>
            {s.carSteps.map((step, i) => (
              <View key={step} style={styles.step}>
                <View style={[styles.num, { backgroundColor: c.fill }]}>
                  <Text style={[styles.numText, { color: c.fg }]}>{i + 1}</Text>
                </View>
                <Text style={[styles.stepText, { color: c.fg }]}>{step}</Text>
              </View>
            ))}
            <SecondaryButton title={s.openShortcuts} icon="arrow.up.right.square" onPress={() => void Linking.openURL('shortcuts://')} />
            {lastAutoAt !== null && (
              <View style={styles.tested}>
                <SymbolView name="checkmark.circle.fill" size={17} tintColor={c.safe} />
                <Text style={[styles.testedText, { color: c.safe }]}>{s.automationActive(when(new Date(lastAutoAt), new Date(), lang))}</Text>
              </View>
            )}
          </View>
        )}
      </Choice>

      <Choice selected={mode === 'manual'} onPress={() => setMode('manual')} title={s.carManual}>
        <Text style={[styles.manualSub, { color: c.mut }]}>{s.carManualSub}</Text>
      </Choice>
    </OnboardingScreen>
  );
}

interface ChoiceProps {
  selected: boolean;
  onPress: () => void;
  title: string;
  badge?: string;
  children?: React.ReactNode;
}

function Choice({ selected, onPress, title, badge, children }: ChoiceProps) {
  const { c } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="radio" accessibilityState={{ selected }}>
      <Card radius={22} style={[styles.choice, selected && { borderColor: c.acc, borderWidth: 1.5 }]}>
        <View style={styles.choiceHead}>
          <View style={[styles.radio, { borderColor: selected ? c.acc : c.mut }]}>
            {selected && <View style={[styles.radioDot, { backgroundColor: c.acc }]} />}
          </View>
          <Text style={[styles.choiceTitle, { color: c.fg }]}>{title}</Text>
          {badge && (
            <View style={[styles.badge, { backgroundColor: withAlpha(c.acc, 0.14) }]}>
              <Text style={[styles.badgeText, { color: c.accT }]}>{badge}</Text>
            </View>
          )}
        </View>
        {children}
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  choice: { padding: 16, gap: 12 },
  choiceHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  choiceTitle: { flex: 1, fontSize: 18, fontWeight: '500' },
  badge: { height: 24, borderRadius: 12, paddingHorizontal: 10, justifyContent: 'center' },
  badgeText: { fontSize: 12, fontWeight: '600' },
  steps: { gap: 12 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  num: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  numText: { fontSize: 13, fontWeight: '600' },
  stepText: { flex: 1, fontSize: 15, lineHeight: 20 },
  tested: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  testedText: { flex: 1, fontSize: 14, fontWeight: '500' },
  manualSub: { fontSize: 15, lineHeight: 20, marginLeft: 34 },
});
