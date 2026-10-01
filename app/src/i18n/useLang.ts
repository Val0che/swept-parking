import type { Lang } from '@swept/core';
import { getLocales } from 'expo-localization';
import { useGlobalSearchParams } from 'expo-router';
import { useSwept } from '../state/store';
import { STRINGS, type Strings } from './strings';

const deviceLang = (): Lang => (getLocales()[0]?.languageCode === 'en' ? 'en' : 'fr');

/** The language chosen in Settings, else French unless the device is in English. */
export const currentLang = (): Lang => useSwept.getState().lang ?? deviceLang();

/** `?lang=en` on a dev deep link overrides the language for previews. */
export function useLang(): { lang: Lang; s: Strings } {
  const chosen = useSwept((st) => st.lang);
  const { lang: param } = useGlobalSearchParams<{ lang?: string }>();
  const lang: Lang = __DEV__ && (param === 'en' || param === 'fr') ? param : (chosen ?? deviceLang());
  return { lang, s: STRINGS[lang] };
}
