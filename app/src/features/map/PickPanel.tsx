import { dayLong, sideName, type SideRecord, type Weekday } from '@swept/core';
import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';
import { PrimaryButton } from '../../components/Buttons';
import { DayPill } from '../../components/DayPill';
import { useLang } from '../../i18n/useLang';
import { useTheme } from '../../theme/useTheme';
import { scheduleLong, seasonShort } from '../schedule/text';

const WEEK: Weekday[] = [1, 2, 3, 4, 5, 6, 0];

/** Default sheet content: what to do, and what the colours mean. */
export function PickLegend({ title, sub }: { title: string; sub: string }) {
  const { c } = useTheme();
  const { lang, s } = useLang();
  return (
    <View style={styles.gap}>
      <Text style={[styles.title, { color: c.fg }]}>{title}</Text>
      <Text style={[styles.sub, { color: c.mut }]}>{sub}</Text>
      <View style={styles.legend}>
        {WEEK.map((d) => (
          <View key={d} style={styles.legendItem}>
            <DayPill day={d} lang={lang} />
            <Text style={[styles.legendText, { color: c.mut }]}>{dayLong(d, lang)}</Text>
          </View>
        ))}
        <View style={styles.legendItem}>
          <DayPill lang={lang} />
          <Text style={[styles.legendText, { color: c.mut }]}>{s.noData}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dashed, { borderColor: c.mut }]}>
            <Text style={[styles.dashedText, { color: c.fg }]}>?</Text>
          </View>
          <Text style={[styles.legendText, { color: c.mut }]}>{s.disputedLegend}</Text>
        </View>
      </View>
    </View>
  );
}

/** Sheet content once a side is tapped: its schedule, the opposite side's, and Continue. */
export function PickSelected({ side, opposite, onContinue }: { side: SideRecord; opposite?: SideRecord; onContinue: () => void }) {
  const { c } = useTheme();
  const { lang, s } = useLang();
  const main = side.rules[0]?.rule;
  const other = opposite?.rules[0]?.rule;
  return (
    <View style={styles.gap}>
      <View style={styles.head}>
        <DayPill day={main?.days[0]} lang={lang} disputed={side.rules.length > 1} />
        <Text style={[styles.street, { color: c.fg }]}>
          {side.street}, {sideName(side.grid, lang)}
        </Text>
      </View>
      <Text style={[styles.sub, { color: c.mut }]}>
        {Math.min(...side.addresses)}–{Math.max(...side.addresses)}
      </Text>
      <View style={styles.row}>
        <SymbolView name="calendar" size={18} tintColor={c.mut} />
        {main ? (
          <View>
            <Text style={[styles.body, { color: c.fg }]}>{scheduleLong(main, lang).replace(' · ', ' ')}</Text>
            <Text style={[styles.small, { color: c.mut }]}>{seasonShort(main, lang)}</Text>
          </View>
        ) : (
          <Text style={[styles.body, { color: c.fg }]}>{s.noSignTitle}</Text>
        )}
      </View>
      {opposite && (
        <View style={styles.row}>
          <DayPill day={other?.days[0]} lang={lang} />
          <Text style={[styles.small, { color: c.mut, flex: 1 }]}>
            {other
              ? s.opposite(sideName(opposite.grid, lang), scheduleLong(other, lang).replace(' · ', ' ').toLowerCase())
              : s.oppositeNoData(sideName(opposite.grid, lang))}
          </Text>
        </View>
      )}
      <PrimaryButton title={s.continue} onPress={onContinue} />
    </View>
  );
}

const styles = StyleSheet.create({
  gap: { gap: 8 },
  title: { fontSize: 22, fontWeight: '500', letterSpacing: -0.3 },
  sub: { fontSize: 15, lineHeight: 20 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 10, marginTop: 6 },
  legendItem: { width: '33.3%', flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendText: { fontSize: 13 },
  dashed: { minWidth: 26, height: 18, borderRadius: 9, borderWidth: 1.5, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  dashedText: { fontSize: 11, fontWeight: '700' },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  street: { flex: 1, fontSize: 20, fontWeight: '500', letterSpacing: -0.2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 2 },
  body: { fontSize: 16 },
  small: { fontSize: 14, lineHeight: 19 },
});
