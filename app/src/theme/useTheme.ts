import { useColorScheme } from 'react-native';
import { dark, light, type Palette } from './tokens';

export function useTheme(): { c: Palette; isDark: boolean } {
  const isDark = useColorScheme() === 'dark';
  return { c: isDark ? dark : light, isDark };
}
