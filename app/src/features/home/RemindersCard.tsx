import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import type { HomeModel } from './homeModel';

interface Props {
  rows: NonNullable<HomeModel['reminders']>;
  title: string;
  edit: string;
  onEdit?: () => void;
}

export function RemindersCard({ rows, title, edit, onEdit }: Props) {
  const { c } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.line }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: c.fg }]}>{title}</Text>
        <Pressable onPress={onEdit} hitSlop={8} accessibilityRole="button">
          <Text style={[styles.edit, { color: c.acc }]}>{edit}</Text>
        </Pressable>
      </View>
      {rows.map((r) => {
        const colour = r.sent ? c.mut : c.fg;
        const icon = r.sent ? 'checkmark.circle.fill' : r.icon === 'evening' ? 'moon' : 'alarm';
        return (
          <View key={r.icon} style={[styles.row, { borderTopColor: c.line }]}>
            <SymbolView name={icon} size={19} tintColor={r.sent ? c.mut : c.acc} />
            <Text style={[styles.label, { color: colour }]}>{r.label}</Text>
            <Text style={[styles.value, { color: colour }]}>{r.value}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 24, borderWidth: 1, paddingVertical: 2, paddingHorizontal: 16 },
  header: { height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 15, fontWeight: '600' },
  edit: { fontSize: 15 },
  row: { height: 44, flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: 1 },
  label: { flex: 1, fontSize: 15 },
  value: { fontSize: 15, fontVariant: ['tabular-nums'] },
});
