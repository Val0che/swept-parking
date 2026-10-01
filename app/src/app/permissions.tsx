import { router } from 'expo-router';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import type { ReactNode } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { PrimaryButton, SecondaryButton, TextButton } from '../components/Buttons';
import { Card } from '../components/Card';
import { OnboardingScreen } from '../features/onboarding/OnboardingScreen';
import { useLang } from '../i18n/useLang';
import { usePermissions } from '../permissions/usePermissions';
import { withAlpha } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

/** Screen 2 — notifications and "Always" location, each with its one-sentence reason. */
export default function Permissions() {
  const { c } = useTheme();
  const { s } = useLang();
  const { state, askNotifications, askLocation } = usePermissions();

  const notif = state?.notifications === 'granted';
  const always = state?.location === 'always';
  const denied = state?.notifications === 'denied' || state?.location === 'denied';

  return (
    <OnboardingScreen
      step={2}
      title={s.twoPermissions}
      sub={s.twoPermissionsSub}
      footer={
        <>
          {denied && (
            <View style={styles.denied}>
              <Text style={{ color: c.mut, fontSize: 15 }}>{s.deniedByMistake}</Text>
              <TextButton title={s.openSettings} onPress={() => void Linking.openSettings()} />
            </View>
          )}
          {/* "While Using" is enough to continue: parking by hand still works without "Always". */}
          <PrimaryButton title={s.continue} disabled={!notif || state?.location === 'undetermined'} onPress={() => router.push('/car')} />
        </>
      }
    >
      <PermissionCard icon="bell" name={s.notifications} why={s.notificationsWhy} ok={notif} okLabel={s.granted}>
        {!notif && <SecondaryButton title={s.allowNotifications} onPress={askNotifications} />}
      </PermissionCard>

      <PermissionCard
        icon="mappin.and.ellipse"
        name={s.locationAlways}
        why={s.locationWhy}
        ok={always}
        okLabel={s.grantedOne}
        partial={state?.location === 'whileUsing' ? s.whileUsingOnly : undefined}
      >
        {!always && (
          <>
            <View style={styles.note}>
              <SymbolView name="info.circle" size={16} tintColor={c.mut} />
              <Text style={[styles.noteText, { color: c.mut }]}>{s.locationTwice}</Text>
            </View>
            <SecondaryButton
              title={s.allowLocation}
              onPress={state?.location === 'whileUsing' || state?.location === 'denied' ? () => void Linking.openSettings() : askLocation}
            />
          </>
        )}
      </PermissionCard>
    </OnboardingScreen>
  );
}

interface CardProps {
  icon: SFSymbol;
  name: string;
  why: string;
  ok: boolean;
  okLabel: string;
  partial?: string;
  children?: ReactNode;
}

function PermissionCard({ icon, name, why, ok, okLabel, partial, children }: CardProps) {
  const { c } = useTheme();
  return (
    <Card radius={22} style={styles.card}>
      <View style={styles.head}>
        <View style={[styles.tile, { backgroundColor: withAlpha(c.acc, 0.14) }]}>
          <SymbolView name={icon} size={20} tintColor={c.accT} />
        </View>
        <View style={styles.flex}>
          <Text style={[styles.name, { color: c.fg }]}>{name}</Text>
          {ok && (
            <View style={styles.status}>
              <SymbolView name="checkmark.circle.fill" size={15} tintColor={c.safe} />
              <Text style={[styles.statusText, { color: c.safe }]}>{okLabel}</Text>
            </View>
          )}
          {!ok && partial && <Text style={[styles.statusText, { color: c.soon }]}>{partial}</Text>}
        </View>
      </View>
      <Text style={[styles.why, { color: c.mut }]}>{why}</Text>
      {children && <View style={styles.actions}>{children}</View>}
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { padding: 16, gap: 10 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  tile: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 18, fontWeight: '500' },
  status: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  statusText: { fontSize: 14, fontWeight: '500' },
  why: { fontSize: 15, lineHeight: 21 },
  actions: { gap: 10, flexDirection: 'column' },
  note: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  noteText: { flex: 1, fontSize: 14, lineHeight: 19 },
  denied: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
});
