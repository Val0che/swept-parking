import { SymbolView, type SFSymbol } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { DashedRule } from '../../components/DashedRule';
import { withAlpha, type Palette } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import type { HeroModel, StateKind } from './homeModel';

const ICON: Record<StateKind, SFSymbol> = {
  calm: 'calendar.badge.checkmark',
  soon: 'timer',
  moveNow: 'exclamationmark.triangle.fill',
  safe: 'checkmark.circle.fill',
  offSeason: 'snowflake',
};

export const stateColor = (kind: StateKind, c: Palette) =>
  ({ calm: c.acc, soon: c.soon, moveNow: c.now, safe: c.safe, offSeason: c.mut })[kind];

/** The one answer at the top of Home: when to move, in days then hours. */
export function HeroCard({ hero, onMoved }: { hero: HeroModel; onMoved?: () => void }) {
  const { c } = useTheme();
  const sc = stateColor(hero.kind, c);
  const now = hero.kind === 'moveNow';
  // The mocks use color-mix(); RN takes CSS gradients through experimental_backgroundImage.
  const background = now
    ? `linear-gradient(180deg, ${withAlpha(c.now, 0.17)}, ${withAlpha(c.now, 0.07)})`
    : `radial-gradient(130% 90% at 0% 0%, ${withAlpha(sc, 0.2)}, transparent 62%)`;

  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.line }]}>
      <View style={[StyleSheet.absoluteFill, { experimental_backgroundImage: background }]} pointerEvents="none" />
      <View style={[styles.mark, { backgroundColor: sc }]} />
      <View style={styles.chip}>
        <SymbolView name={ICON[hero.kind]} size={18} tintColor={sc} />
        <Text style={[styles.chipText, { color: sc }]}>{hero.chip}</Text>
      </View>
      <Text style={[styles.eyebrow, { color: c.mut }]}>{hero.eyebrow}</Text>
      <Text style={[styles.big, { color: c.fg }]} maxFontSizeMultiplier={1.6}>
        {hero.big}
      </Text>
      <Text style={[styles.sub, { color: c.fg }]}>{hero.sub}</Text>

      {hero.progress && (
        <>
          <View style={[styles.track, { backgroundColor: c.fill }]}>
            <View style={[styles.bar, { backgroundColor: c.now, width: `${Math.round(hero.progress.share * 100)}%` }]} />
          </View>
          <View style={styles.progressLabels}>
            <Text style={[styles.small, { color: c.mut }]}>{hero.progress.left}</Text>
            <Text style={[styles.small, { color: c.mut }]}>{hero.progress.right}</Text>
          </View>
        </>
      )}

      {hero.movedButton && (
        <Pressable
          onPress={onMoved}
          style={[styles.moved, { borderColor: c.now, backgroundColor: withAlpha(c.now, 0.1) }]}
          accessibilityRole="button"
        >
          <SymbolView name="car.fill" size={19} tintColor={c.now} />
          <Text style={[styles.movedText, { color: c.now }]}>{hero.movedButton}</Text>
        </Pressable>
      )}

      {hero.disputed && (
        <View style={styles.disputed}>
          <DashedRule color={c.line} />
          <View style={styles.disputedRow}>
            <SymbolView name="signpost.right" size={18} tintColor={c.soon} />
            <Text style={[styles.disputedText, { color: c.mut }]}>{hero.disputed}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 22,
    overflow: 'hidden',
  },
  mark: { position: 'absolute', left: 20, top: 0, width: 56, height: 3, borderBottomLeftRadius: 3, borderBottomRightRadius: 3 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  chipText: { fontSize: 15, fontWeight: '600' },
  eyebrow: { marginTop: 14, fontSize: 16 },
  big: { marginTop: 2, fontSize: 46, lineHeight: 48, fontWeight: '500', letterSpacing: -1.6 },
  sub: { marginTop: 8, fontSize: 17, lineHeight: 23 },
  track: { marginTop: 16, height: 6, borderRadius: 3, overflow: 'hidden' },
  bar: { height: '100%', borderRadius: 3 },
  progressLabels: { marginTop: 6, flexDirection: 'row', justifyContent: 'space-between' },
  small: { fontSize: 13, fontVariant: ['tabular-nums'] },
  moved: {
    marginTop: 16,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  movedText: { fontSize: 17, fontWeight: '600' },
  disputed: { marginTop: 14, gap: 12 },
  disputedRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  disputedText: { flex: 1, fontSize: 14, lineHeight: 19 },
});
