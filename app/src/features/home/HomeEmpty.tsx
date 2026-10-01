import { locate, sideName } from '@swept/core';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PrimaryButton, SecondaryButton } from '../../components/Buttons';
import { Card } from '../../components/Card';
import { GlassIconButton } from '../../components/GlassIconButton';
import { sidesNear } from '../../data/db';
import { useLang } from '../../i18n/useLang';
import { useSwept } from '../../state/store';
import { useTheme } from '../../theme/useTheme';
import { SidesMap } from '../map/SidesMap';
import { Banner } from './Banner';
import { useBanner } from './useBanner';

interface Fix {
  lat: number;
  lng: number;
  accuracy: number;
}

async function currentFix(): Promise<Fix | null> {
  const { granted } = await Location.getForegroundPermissionsAsync();
  if (!granted) return null;
  const fix = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest }).catch(() => null);
  return fix && { lat: fix.coords.latitude, lng: fix.coords.longitude, accuracy: fix.coords.accuracy ?? 50 };
}

/** Screen 4 — Home when no car is recorded: a map of the nearby sides and two ways to park. */
export function HomeEmpty() {
  const { c } = useTheme();
  const { lang, s } = useLang();
  const insets = useSafeAreaInsets();
  const banner = useBanner();
  const lastSpot = useSwept((st) => st.lastSpot);
  const [fix, setFix] = useState<Fix | null>();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>();

  useEffect(() => {
    void currentFix().then(setFix);
  }, []);

  const parkHere = async () => {
    setBusy(true);
    setMessage(undefined);
    const here = (await currentFix()) ?? fix;
    setBusy(false);
    if (!here) return router.push('/pick');
    const hit = locate(sidesNear(here.lat, here.lng), [here.lng, here.lat], here.accuracy);
    if (!hit) return setMessage(s.noStreetHere);
    const at = { lat: String(here.lat), lng: String(here.lng) };
    // Never guess between the two sides: let the user tap theirs on the map.
    if (hit.ambiguous) return router.push({ pathname: '/pick', params: { ...at, acc: String(Math.round(here.accuracy)) } });
    router.push({ pathname: '/confirm', params: { ...at, side: String(hit.side.id), source: 'manual' } });
  };

  return (
    <ScrollView
      style={{ backgroundColor: c.bg }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 4, paddingBottom: insets.bottom + 24 }]}
    >
      <View style={styles.header}>
        <Text style={[styles.brand, { color: c.mut }]}>Swept</Text>
        <View style={styles.headerButtons}>
          <GlassIconButton icon="bookmark" label={s.savedSpots} onPress={() => router.push('/spots')} />
          <GlassIconButton icon="gearshape" label={s.settings} onPress={() => router.push('/settings')} />
        </View>
      </View>

      {banner && <Banner banner={banner} />}

      <Card style={styles.card}>
        <Pressable onPress={() => router.push('/pick')} style={styles.map} accessibilityLabel={s.pickOnMap}>
          {fix !== undefined && (
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
              <SidesMap
                center={fix ?? lastSpot ?? { lat: 45.5231, lng: -73.5817 }}
                gps={fix ?? undefined}
                altitude={380}
                interactive={false}
              />
            </View>
          )}
        </Pressable>
        <View style={styles.body}>
          <Text style={[styles.title, { color: c.fg }]}>{s.notParkedTitle}</Text>
          <Text style={[styles.sub, { color: c.mut }]}>{message ?? s.notParkedSub}</Text>
          <View style={styles.actions}>
            <PrimaryButton title={busy ? s.locating : s.parkedHere} icon="parkingsign" disabled={busy} onPress={() => void parkHere()} />
            <SecondaryButton title={s.pickOnMap} icon="map" onPress={() => router.push('/pick')} />
          </View>
        </View>
      </Card>

      {lastSpot && (
        <Pressable onPress={() => router.push({ pathname: '/confirm', params: { side: String(lastSpot.sideId), lat: String(lastSpot.lat), lng: String(lastSpot.lng) } })}>
          <Card radius={20} style={styles.last}>
            <SymbolView name="clock.arrow.circlepath" size={20} tintColor={c.acc} />
            <View style={styles.flex}>
              <Text style={[styles.lastCaption, { color: c.mut }]}>{s.lastSpot}</Text>
              <Text style={[styles.lastText, { color: c.fg }]}>
                {lastSpot.street}, {sideName(lastSpot.side, lang)}
              </Text>
            </View>
            <SymbolView name="chevron.right" size={13} tintColor={c.mut} />
          </Card>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, gap: 12 },
  flex: { flex: 1 },
  header: { height: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 4 },
  brand: { fontSize: 14 },
  headerButtons: { flexDirection: 'row', gap: 8 },
  card: {},
  map: { height: 250 },
  body: { padding: 20, gap: 6 },
  title: { fontSize: 28, fontWeight: '500', letterSpacing: -0.5 },
  sub: { fontSize: 16, lineHeight: 22 },
  actions: { gap: 10, marginTop: 12 },
  last: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  lastCaption: { fontSize: 13 },
  lastText: { fontSize: 16, fontWeight: '500' },
});
