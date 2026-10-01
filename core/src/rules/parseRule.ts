import { normalize } from './normalize';
import { lastDayOf, parseDates, parseDays, parseWindows } from './tokens';
import type { ParseResult, Season, Weekday } from './types';

/**
 * Turn a sign's `DESCRIPTION_RPA` into a street-cleaning rule, or say why it isn't one.
 *
 * A cleaning rule is a no-parking/no-stopping window on given weekdays during a
 * season that starts in March–May and ends in October–December. School-zone
 * signs ("SEPT A JUIN"), winter signs and time-limited parking are rejected.
 */
export function parseRule(raw: string): ParseResult {
  const text = normalize(raw);

  if (/\bANNULE\b/.test(text)) return { ok: false, reason: 'cancelled' };
  // "P 15 MIN …" grants parking; it doesn't forbid it.
  if (/^P\b/.test(text)) return { ok: false, reason: 'permission' };
  // "\P EXCEPTE 8h-12h MERCREDI" forbids parking *outside* the window.
  if (/\bEXCEPTE\s+(\d|LUN|MAR|MER|JEU|VEN|SAM|DIM)/.test(text)) {
    return { ok: false, reason: 'inverted' };
  }

  const windows = parseWindows(text);
  if (windows.length === 0) return { ok: false, reason: 'no-time' };

  let days = parseDays(text);
  if (days.length === 0) return { ok: false, reason: 'no-day' };

  const season = parseSeason(text);
  if (!season) return { ok: false, reason: 'no-season' };
  if (!isCleaningSeason(season)) return { ok: false, reason: 'not-cleaning-season' };

  // "23h30-00h30 LUN A MAR" is one overnight window starting Monday, not two days.
  if (windows.every((w) => w.end < w.start)) days = collapseOvernightPairs(text, days);

  return {
    ok: true,
    rule: {
      days,
      windows,
      season,
      kind: text.startsWith('\\A') ? 'no-stopping' : 'no-parking',
    },
  };
}

function parseSeason(text: string): Season | undefined {
  const dates = parseDates(text);
  if (dates.length < 2) return undefined;
  const [from, to] = dates.slice(-2) as [(typeof dates)[0], (typeof dates)[0]];
  return {
    from: from.date,
    // A bare end month ("SEPT A JUIN") runs to the end of that month.
    to: to.bare ? { month: to.date.month, day: lastDayOf(to.date.month) } : to.date,
  };
}

function isCleaningSeason({ from, to }: Season): boolean {
  return from.month >= 3 && from.month <= 5 && to.month >= 10 && to.month <= 12;
}

function collapseOvernightPairs(text: string, days: Weekday[]): Weekday[] {
  const pairs = [...text.matchAll(/\b([A-Z]{3})[A-Z]*\.? A ([A-Z]{3})[A-Z]*\b/g)];
  if (pairs.length === 0) return days;
  const starts = new Set<Weekday>();
  for (const [, a, b] of pairs) {
    const from = parseDays(a!)[0];
    const to = parseDays(b!)[0];
    // Only consecutive pairs describe one night; "LUN A VEN" is still five nights.
    if (from === undefined || to === undefined || to !== (from + 1) % 7) return days;
    starts.add(from);
  }
  return [...starts].sort();
}
