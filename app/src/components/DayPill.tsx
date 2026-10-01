import { dayKey, type Lang, type Weekday } from '@swept/core';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/useTheme';

interface Props {
  /** `undefined` = no data (grey "–"). */
  day?: Weekday;
  lang: Lang;
  /** Signs disagree: dashed outline instead of a filled pill. */
  disputed?: boolean;
  size?: 'small' | 'large';
}

/** The weekday colour + two-letter key that identifies a side's cleaning day everywhere. */
export function DayPill({ day, lang, disputed, size = 'small' }: Props) {
  const { c } = useTheme();
  const colour = day === undefined ? c.noData : c.day[day];
  const large = size === 'large';
  return (
    <View
      style={[
        large ? styles.large : styles.small,
        disputed
          ? { borderWidth: 1.5, borderStyle: 'dashed', borderColor: colour }
          : { backgroundColor: colour },
      ]}
    >
      <Text
        style={[
          large ? styles.largeText : styles.smallText,
          { color: disputed ? c.fg : day === undefined ? c.fg : c.dayText[day] },
        ]}
      >
        {day === undefined ? '–' : dayKey(day, lang)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  small: { minWidth: 26, height: 18, paddingHorizontal: 6, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  smallText: { fontSize: 11, fontWeight: '700' },
  large: { width: 40, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  largeText: { fontSize: 14, fontWeight: '700' },
});
