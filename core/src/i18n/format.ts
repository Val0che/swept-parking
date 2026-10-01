export type Lang = 'fr' | 'en';

// Hand-rolled instead of Intl so the output matches the design copy exactly
// ("ven. 15 h 30", "1er avril") whatever the device's ICU data says.

const DAY_SHORT = {
  fr: ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'],
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
};
const DAY_LONG = {
  fr: ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'],
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
};
/** Two-letter day key on the day pills. */
const DAY_KEY = {
  fr: ['Di', 'Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa'],
  en: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
};
const MONTH_SHORT = {
  fr: ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};
const MONTH_LONG = {
  fr: ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};

export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Minutes after midnight → "15 h 30" / "15:30". */
export function clock(minutes: number, lang: Lang): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = String(minutes % 60).padStart(2, '0');
  return lang === 'fr' ? `${h} h ${m}` : `${h}:${m}`;
}

export const time = (d: Date, lang: Lang) => clock(d.getHours() * 60 + d.getMinutes(), lang);
export const dayShort = (day: number, lang: Lang) => DAY_SHORT[lang][day]!;
export const dayLong = (day: number, lang: Lang) => DAY_LONG[lang][day]!;
export const dayKey = (day: number, lang: Lang) => DAY_KEY[lang][day]!;

/** "2 oct." / "Oct 2". */
export function dateShort(month: number, day: number, lang: Lang): string {
  const m = MONTH_SHORT[lang][month - 1]!;
  return lang === 'fr' ? `${day} ${m}` : `${m} ${day}`;
}

/** "1er avril" / "April 1". */
export function dateLong(month: number, day: number, lang: Lang): string {
  const m = MONTH_LONG[lang][month - 1]!;
  return lang === 'fr' ? `${day === 1 ? '1er' : day} ${m}` : `${m} ${day}`;
}

export const dateOf = (d: Date, lang: Lang) => dateShort(d.getMonth() + 1, d.getDate(), lang);

/** Whole calendar days from `a` to `b` (local time). */
export function calendarDays(a: Date, b: Date): number {
  const day = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((day(b) - day(a)) / 86_400_000);
}

/**
 * "jeu. 20 h 00", or "20 h 00" today, or "jeu. 8 oct. 20 h 00" more than a
 * week away (or whenever `withDate`, so rows of one list read alike).
 */
export function when(d: Date, now: Date, lang: Lang, withDate = false): string {
  const days = calendarDays(now, d);
  if (days === 0 && !withDate) return time(d, lang);
  const sep = lang === 'fr' ? ' ' : ', ';
  if (Math.abs(days) < 7 && !withDate) return `${dayShort(d.getDay(), lang)} ${time(d, lang)}`;
  return `${dayShort(d.getDay(), lang)} ${dateOf(d, lang)}${sep}${time(d, lang)}`;
}
