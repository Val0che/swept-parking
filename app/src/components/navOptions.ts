import type { Palette } from '../theme/tokens';

/** Native stack header for the settings-style screens: large title, "Accueil" back button. */
export const subScreenOptions = (title: string, back: string, c: Palette) => ({
  headerShown: true,
  title,
  headerBackTitle: back,
  headerLargeTitle: true,
  headerTransparent: true,
  headerTintColor: c.acc,
  headerLargeTitleStyle: { color: c.fg },
  headerTitleStyle: { color: c.fg },
});
