import type { SideRecord } from '@swept/core';
import { GlassView } from 'expo-glass-effect';
import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassIconButton } from '../components/GlassIconButton';
import { oppositeOf } from '../data/db';
import { PickLegend, PickSelected } from '../features/map/PickPanel';
import { SidesMap, type SidesMapHandle } from '../features/map/SidesMap';
import { useLang } from '../i18n/useLang';
import { withManualSchedule } from '../parking/actions';
import { useSwept } from '../state/store';
import { useTheme } from '../theme/useTheme';

// Plateau-Mont-Royal: where the map opens if the phone has no position yet.
const FALLBACK = { lat: 45.5231, lng: -73.5817 };

interface Gps {
  lat: number;
  lng: number;
  accuracy?: number;
}

/** Screen 5 — full-screen map; tap the side of the street the car is on. */
export default function Pick() {
  const { c } = useTheme();
  const { s } = useLang();
  const insets = useSafeAreaInsets();
  const map = useRef<SidesMapHandle>(null);
  const spot = useSwept((st) => st.spot);
  // "I just parked here" hands over its fix when GPS couldn't tell the sides apart.
  const params = useLocalSearchParams<{ lat?: string; lng?: string; acc?: string }>();
  const handed: Gps | undefined = params.lat
    ? { lat: Number(params.lat), lng: Number(params.lng), accuracy: params.acc ? Number(params.acc) : undefined }
    : undefined;

  const [gps, setGps] = useState<Gps | undefined>(handed);
  const [selected, setSelected] = useState<SideRecord>();
  const [zoomedOut, setZoomedOut] = useState(false);
  const [query, setQuery] = useState('');
  const [notFound, setNotFound] = useState(false);
  const start = useRef(handed ?? (spot ? { lat: spot.lat, lng: spot.lng } : FALLBACK)).current;

  useEffect(() => {
    if (handed) return;
    let live = true;
    void (async () => {
      const { granted } = await Location.getForegroundPermissionsAsync();
      if (!granted) return;
      const fix = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }).catch(() => null);
      if (!live || !fix) return;
      const here = { lat: fix.coords.latitude, lng: fix.coords.longitude, accuracy: fix.coords.accuracy ?? undefined };
      setGps(here);
      // Don't yank the map away from the parked car when correcting the side.
      if (!spot) map.current?.flyTo(here.lat, here.lng);
    })();
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const search = async () => {
    if (!query.trim()) return;
    const [hit] = await Location.geocodeAsync(`${query}, Montréal, QC`).catch(() => []);
    setNotFound(!hit);
    if (hit) map.current?.flyTo(hit.latitude, hit.longitude);
  };

  const lowAccuracy = (gps?.accuracy ?? 0) > 25;
  const here = gps ?? start;

  return (
    <View style={[styles.screen, { backgroundColor: c.bg }]}>
      <SidesMap
        ref={map}
        center={start}
        gps={gps}
        selectedId={selected?.id}
        onSelect={(side) => setSelected(withManualSchedule(side))}
        onZoomedOut={setZoomedOut}
      />

      <View style={[styles.top, { top: insets.top + 4 }]}>
        <GlassIconButton icon="xmark" label={s.cancel} size={48} onPress={() => router.back()} />
        <GlassView style={styles.search}>
          <SymbolView name="magnifyingglass" size={18} tintColor={c.mut} />
          <TextInput
            value={query}
            onChangeText={(t) => (setQuery(t), setNotFound(false))}
            onSubmitEditing={search}
            placeholder={notFound ? s.notFound : s.searchAddress}
            placeholderTextColor={c.mut}
            returnKeyType="search"
            autoCorrect={false}
            style={[styles.input, { color: c.fg }]}
          />
        </GlassView>
      </View>

      <View style={[styles.bottom, { bottom: insets.bottom + 8 }]}>
        <View style={styles.above}>
          {lowAccuracy && !selected ? (
            <GlassView style={styles.pill}>
              <SymbolView name="scope" size={15} tintColor={c.soon} />
              <Text style={[styles.pillText, { color: c.fg }]}>{s.lowAccuracy(Math.round(gps!.accuracy!))}</Text>
            </GlassView>
          ) : (
            <View />
          )}
          {gps && <GlassIconButton icon="location.fill" label="Recentrer" size={48} onPress={() => map.current?.flyTo(gps.lat, gps.lng)} />}
        </View>

        <GlassView style={styles.sheet}>
          {selected ? (
            <PickSelected
              side={selected}
              opposite={(() => {
                const opp = oppositeOf(selected);
                return opp && withManualSchedule(opp);
              })()}
              onContinue={() =>
                router.push({
                  pathname: '/confirm',
                  params: { side: String(selected.id), lat: String(here.lat), lng: String(here.lng), source: 'manual' },
                })
              }
            />
          ) : zoomedOut ? (
            <Text style={[styles.hint, { color: c.fg }]}>{s.zoomIn}</Text>
          ) : lowAccuracy ? (
            <PickLegend title={s.whichSide} sub={s.whichSideSub} />
          ) : (
            <PickLegend title={s.tapYourSide} sub={s.tapYourSideSub()} />
          )}
        </GlassView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  top: { position: 'absolute', left: 12, right: 12, flexDirection: 'row', gap: 8 },
  search: { flex: 1, height: 48, borderRadius: 24, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16 },
  input: { flex: 1, fontSize: 17, height: 48 },
  bottom: { position: 'absolute', left: 8, right: 8, gap: 10 },
  above: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: 4 },
  pill: { height: 36, borderRadius: 18, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 14 },
  pillText: { fontSize: 14, fontWeight: '500' },
  sheet: { borderRadius: 40, padding: 22 },
  hint: { fontSize: 17, fontWeight: '500', textAlign: 'center' },
});
