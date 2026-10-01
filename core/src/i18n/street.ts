import type { GridSide } from '../geo/side';
import type { Lang } from './format';

// Generic street words in the city's data (Géobase TYPE_F), by French gender.
const FEMININE = ['rue', 'ruelle', 'place', 'côte', 'montée', 'terrasse', 'promenade', 'route', 'voie', 'cour'];
const MASCULINE = ['boulevard', 'chemin', 'croissant', 'rang', 'square', 'carré', 'passage', 'cours', 'parc', 'pont', 'quai', 'carrefour', 'circle', 'rond-point'];

const firstWord = (street: string) => street.split(' ')[0]!.toLowerCase();

/** "avenue Coloniale" → "Coloniale": the name without its generic word. */
export function shortStreet(street: string): string {
  const rest = street.split(' ').slice(1).join(' ');
  return rest || street;
}

/** French article + street: `sur` → "sur l'avenue Coloniale", `de` → "de la rue Fabre" / "du boulevard…". */
function withArticle(street: string, prep: 'sur' | 'de'): string {
  const word = firstWord(street);
  if (/^[aeiouhâéèêîôû]/.test(word)) return `${prep} l'${street}`;
  if (FEMININE.includes(word)) return `${prep} la ${street}`;
  if (MASCULINE.includes(word)) return prep === 'de' ? `du ${street}` : `sur le ${street}`;
  return `${prep} ${street}`;
}

export const onStreet = (street: string, lang: Lang) => (lang === 'fr' ? withArticle(street, 'sur') : `on ${street}`);
export const ofStreet = (street: string, lang: Lang) => (lang === 'fr' ? withArticle(street, 'de') : `of ${street}`);

const SIDE = {
  fr: { north: 'côté nord', south: 'côté sud', east: 'côté est', west: 'côté ouest' },
  en: { north: 'north side', south: 'south side', east: 'east side', west: 'west side' },
} satisfies Record<Lang, Record<GridSide, string>>;

/** "côté est" / "east side" (lower case; capitalise at the start of a sentence). */
export const sideName = (side: GridSide, lang: Lang) => SIDE[lang][side];
