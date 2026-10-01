import type { MonthDay, TimeWindow, Weekday } from './types';

const DAY_PATTERNS: [RegExp, Weekday][] = [
  [/^DIM(ANCHE)?$/, 0],
  [/^LUN(DI)?$/, 1],
  [/^MAR(DI)?$/, 2],
  [/^MER(CREDI)?$/, 3],
  [/^JEU(DI)?$/, 4],
  [/^VEN(DREDI)?$/, 5],
  [/^SAM(EDI)?$/, 6],
];

const MONTH_PATTERNS: [RegExp, number][] = [
  [/^JANV(IER)?$/, 1],
  [/^FEV(RIER)?$/, 2],
  [/^MARS$/, 3],
  [/^AVR(IL)?$/, 4],
  [/^MAI$/, 5],
  [/^JUIN$/, 6],
  [/^JUIL(LET)?$/, 7],
  [/^AOUT$/, 8],
  [/^SEPT(EMBRE)?$/, 9],
  [/^OCT(OBRE)?$/, 10],
  [/^NOV(EMBRE)?$/, 11],
  [/^DEC(EMBRE)?$/, 12],
];

const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export function dayOf(word: string): Weekday | undefined {
  return DAY_PATTERNS.find(([re]) => re.test(word))?.[1];
}

export function monthOf(word: string): number | undefined {
  return MONTH_PATTERNS.find(([re]) => re.test(word))?.[1];
}

const TIME_RE = /(\d{1,2})\s*H\s*(\d{2})?\s*(?:-|@|A|AU)\s*(\d{1,2})\s*(?:H\s*(\d{2})?)?/g;

/** "8h30-11h30", "9H @ 12H", "13H A 17H", "07h-09 ET 15h-18h". */
export function parseWindows(text: string): TimeWindow[] {
  return [...text.matchAll(TIME_RE)].map(([, h1, m1, h2, m2]) => ({
    start: (Number(h1) * 60 + Number(m1 ?? 0)) % 1440,
    end: (Number(h2) * 60 + Number(m2 ?? 0)) % 1440,
  }));
}

/**
 * Weekdays listed on the sign. "LUN A VEN" and "DU LUNDI AU VENDREDI" are ranges;
 * anything else ("LUN ET JEU", "MAR. JEU.", "LUNDI MERCREDI") is a list.
 */
export function parseDays(text: string): Weekday[] {
  const words = text.replace(/[.,]/g, ' ').split(/\s+/);
  const days = new Set<Weekday>();
  for (let i = 0; i < words.length; i++) {
    const day = dayOf(words[i]!);
    if (day === undefined) continue;
    const joiner = words[i + 1];
    const end = words[i + 2] === undefined ? undefined : dayOf(words[i + 2]!);
    if ((joiner === 'A' || joiner === 'AU') && end !== undefined) {
      for (let d = day; ; d = ((d + 1) % 7) as Weekday) {
        days.add(d);
        if (d === end) break;
      }
      i += 2;
    } else {
      days.add(day);
    }
  }
  return [...days].sort();
}

/** Every "<day> <month>" or bare "<month>" mention, in order. */
export function parseDates(text: string): { date: MonthDay; bare: boolean }[] {
  const words = text.replace(/[.,-]/g, ' ').split(/\s+/);
  const out: { date: MonthDay; bare: boolean }[] = [];
  for (let i = 0; i < words.length; i++) {
    const month = monthOf(words[i]!);
    if (month === undefined) continue;
    const prev = words[i - 1]?.match(/^(\d{1,2})(ER)?$/);
    const day = prev ? Number(prev[1]) : undefined;
    out.push({ date: { month, day: day ?? 1 }, bare: day === undefined });
  }
  return out;
}

export function lastDayOf(month: number): number {
  return DAYS_IN_MONTH[month - 1]!;
}
