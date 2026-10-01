import { projectOnLine, toXY, type LngLat, type SideRecord, type Weekday } from '@swept/core';
import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import MapView, { Circle, Marker, Polyline, type Region } from 'react-native-maps';
import { DayPill } from '../../components/DayPill';
import { sidesIn } from '../../data/db';
import { useLang } from '../../i18n/useLang';
import { withManualSchedule } from '../../parking/actions';
import { withAlpha } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';

/** Montreal's grid north (up the island) is ~35° west of true north; the map is turned so it points up. */
export const GRID_HEADING = 325;
/** Beyond this span there are too many sides to draw; the screen shows a "zoom in" hint. */
const MAX_SPAN = 0.012;

export interface SidesMapHandle {
  flyTo: (lat: number, lng: number) => void;
}

interface Props {
  center: { lat: number; lng: number };
  /** Camera altitude in metres. */
  altitude?: number;
  selectedId?: number;
  /** Fade every side but the selected one (Confirm). */
  dimOthers?: boolean;
  gps?: { lat: number; lng: number; accuracy?: number };
  interactive?: boolean;
  onSelect?: (side: SideRecord) => void;
  onZoomedOut?: (out: boolean) => void;
}

const coords = (line: LngLat[]) => line.map(([longitude, latitude]) => ({ latitude, longitude }));

/** Apple map with every block side drawn on its curb, coloured by cleaning day. */
export const SidesMap = forwardRef<SidesMapHandle, Props>(function SidesMap(
  { center, altitude = 500, selectedId, dimOthers, gps, interactive = true, onSelect, onZoomedOut },
  ref,
) {
  const { c, isDark } = useTheme();
  const map = useRef<MapView>(null);
  const [sides, setSides] = useState<SideRecord[]>([]);
  const span = useRef(0.004);
  const [close, setClose] = useState(true);
  const { lang } = useLang();

  useImperativeHandle(ref, () => ({
    flyTo: (lat, lng) =>
      map.current?.animateCamera({ center: { latitude: lat, longitude: lng }, heading: GRID_HEADING, altitude: 500 }, { duration: 500 }),
  }));

  const load = useCallback(
    (r: Region) => {
      span.current = r.latitudeDelta;
      setClose(r.latitudeDelta < 0.0045);
      const out = r.latitudeDelta > MAX_SPAN;
      onZoomedOut?.(out);
      if (out) return setSides([]);
      setSides(
        sidesIn({
          minLat: r.latitude - r.latitudeDelta / 2,
          maxLat: r.latitude + r.latitudeDelta / 2,
          minLng: r.longitude - r.longitudeDelta / 2,
          maxLng: r.longitude + r.longitudeDelta / 2,
        }).map(withManualSchedule),
      );
    },
    [onZoomedOut],
  );

  // A tap selects the nearest curb line within a few points, whatever the zoom.
  const pick = useCallback(
    (lat: number, lng: number) => {
      if (!onSelect) return;
      const p = toXY([lng, lat]);
      const reach = Math.max(8, span.current * 111_000 * 0.04);
      let best: { side: SideRecord; d: number } | undefined;
      for (const side of sides) {
        const d = projectOnLine(p, side.line.map(toXY)).distance;
        if (d <= reach && (!best || d < best.d)) best = { side, d };
      }
      if (best) onSelect(best.side);
    },
    [sides, onSelect],
  );

  const lines = useMemo(
    () =>
      sides.map((side) => {
        const day = side.rules[0]?.rule.days[0] as Weekday | undefined;
        const colour = day === undefined ? c.noData : c.day[day];
        const selected = side.id === selectedId;
        const width = selected ? 8 : 4.5;
        const faded = dimOthers && !selected;
        const path = coords(side.line);
        return [
          selected && <Polyline key={`${side.id}-glow`} coordinates={path} strokeColor={withAlpha(colour, 0.25)} strokeWidth={22} lineCap="round" />,
          <Polyline
            key={side.id}
            coordinates={path}
            strokeColor={faded ? withAlpha(colour, 0.3) : colour}
            strokeWidth={width}
            lineCap="round"
            lineDashPattern={side.rules.length > 1 ? [width * 1.7, width * 1.4] : undefined}
            zIndex={selected ? 2 : 1}
          />,
        ];
      }),
    [sides, selectedId, dimOthers, c],
  );

  // The day's two letters on each line, so colour is never the only cue. Only when
  // zoomed in, and capped: custom marker views are costly.
  const labels = useMemo(
    () =>
      close
        ? sides
            .filter((side) => side.rules.length > 0)
            .slice(0, 70)
            .map((side) => {
              const [a, b] = [side.line[0]!, side.line.at(-1)!];
              return (
                <Marker
                  key={`${side.id}-day`}
                  coordinate={{ latitude: a[1] + (b[1] - a[1]) * 0.35, longitude: a[0] + (b[0] - a[0]) * 0.35 }}
                  anchor={{ x: 0.5, y: 0.5 }}
                  tracksViewChanges={false}
                  opacity={dimOthers && side.id !== selectedId ? 0.35 : 1}
                  onPress={() => onSelect?.(side)}
                >
                  <DayPill day={side.rules[0]!.rule.days[0]} lang={lang} />
                </Marker>
              );
            })
        : null,
    [close, sides, lang, dimOthers, selectedId, onSelect],
  );

  return (
    <MapView
      ref={map}
      style={StyleSheet.absoluteFill}
      initialCamera={{ center: { latitude: center.lat, longitude: center.lng }, heading: GRID_HEADING, pitch: 0, altitude }}
      mapType="mutedStandard"
      userInterfaceStyle={isDark ? 'dark' : 'light'}
      showsPointsOfInterests={false}
      showsCompass={false}
      showsBuildings={false}
      pitchEnabled={false}
      rotateEnabled={false}
      scrollEnabled={interactive}
      zoomEnabled={interactive}
      onMapReady={() => map.current?.getMapBoundaries().then(({ northEast, southWest }) =>
        load({
          latitude: (northEast.latitude + southWest.latitude) / 2,
          longitude: (northEast.longitude + southWest.longitude) / 2,
          latitudeDelta: northEast.latitude - southWest.latitude,
          longitudeDelta: northEast.longitude - southWest.longitude,
        }),
      )}
      onRegionChangeComplete={load}
      onPress={(e) => pick(e.nativeEvent.coordinate.latitude, e.nativeEvent.coordinate.longitude)}
    >
      {lines}
      {labels}
      {gps?.accuracy !== undefined && gps.accuracy > 15 && (
        <Circle
          center={{ latitude: gps.lat, longitude: gps.lng }}
          radius={gps.accuracy}
          fillColor={withAlpha(c.acc, 0.14)}
          strokeColor={withAlpha(c.acc, 0.5)}
          strokeWidth={1.5}
        />
      )}
      {gps && (
        // The brand accent, not the system blue, which collides with the Tuesday/Friday blues.
        <Circle center={{ latitude: gps.lat, longitude: gps.lng }} radius={3.2} fillColor={c.acc} strokeColor="#f3f5fe" strokeWidth={3} zIndex={5} />
      )}
      {selectedId !== undefined && dimOthers && (() => {
        const side = sides.find((s) => s.id === selectedId);
        if (!side) return null;
        const [lng, lat] = side.line[Math.floor(side.line.length / 2)]!;
        return <Marker coordinate={{ latitude: lat, longitude: lng }} pinColor={c.acc} tracksViewChanges={false} />;
      })()}
    </MapView>
  );
});
