import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../theme/useTheme';

/** Opaque content card: radius 20–24, 1 pt hairline. */
export function Card({ children, style, radius = 24 }: { children: ReactNode; style?: StyleProp<ViewStyle>; radius?: number }) {
  const { c } = useTheme();
  return <View style={[styles.card, { backgroundColor: c.card, borderColor: c.line, borderRadius: radius }, style]}>{children}</View>;
}

/** iOS-style grouped list section: caption, card of rows, optional footer. */
export function Group({ title, footer, children }: { title?: string; footer?: string; children: ReactNode }) {
  const { c } = useTheme();
  return (
    <View style={styles.group}>
      {title && <Text style={[styles.caption, { color: c.mut }]}>{title.toUpperCase()}</Text>}
      <Card radius={20} style={styles.groupCard}>
        {children}
      </Card>
      {footer && <Text style={[styles.footer, { color: c.mut }]}>{footer}</Text>}
    </View>
  );
}

/** One row of a `Group`; draws its own top hairline except for the first. */
export function Row({ children, first, minHeight = 48 }: { children: ReactNode; first?: boolean; minHeight?: number }) {
  const { c } = useTheme();
  return (
    <View style={[styles.row, { minHeight }, !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.line }]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, overflow: 'hidden' },
  group: { gap: 6 },
  groupCard: { paddingHorizontal: 16 },
  caption: { fontSize: 12, fontWeight: '500', letterSpacing: 0.4, paddingHorizontal: 16 },
  footer: { fontSize: 13, lineHeight: 18, paddingHorizontal: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
});
