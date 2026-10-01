import type { CleaningRule, MonthDay } from './types';

export interface Occurrence {
  start: Date;
  end: Date;
  rule: CleaningRule;
}

const MAX_DAYS_AHEAD = 400;

const md = (d: Date): number => (d.getMonth() + 1) * 100 + d.getDate();
const mdOf = ({ month, day }: MonthDay): number => month * 100 + day;

export function inSeason(rule: CleaningRule, day: Date): boolean {
  const today = md(day);
  const from = mdOf(rule.season.from);
  const to = mdOf(rule.season.to);
  return from <= to ? today >= from && today <= to : today >= from || today <= to;
}

/**
 * The next time the car must be gone, in the device's local time zone (which is
 * Montreal's for anyone using the app). A window already in progress at `now`
 * counts as next, so the app can say "move it now".
 */
export function nextOccurrence(rules: CleaningRule[], now: Date): Occurrence | undefined {
  // Start yesterday so an overnight window that began last night is found.
  const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  let best: Occurrence | undefined;

  for (let i = 0; i <= MAX_DAYS_AHEAD && !best; i++, day.setDate(day.getDate() + 1)) {
    for (const rule of rules) {
      if (!rule.days.includes(day.getDay() as CleaningRule['days'][number]) || !inSeason(rule, day)) continue;
      for (const w of rule.windows) {
        const start = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, w.start);
        const endDay = w.end <= w.start ? day.getDate() + 1 : day.getDate();
        const end = new Date(day.getFullYear(), day.getMonth(), endDay, 0, w.end);
        if (end <= now) continue;
        if (!best || start < best.start) best = { start, end, rule };
      }
    }
  }
  return best;
}

/** A stretch of time the car must be gone, possibly several signs' windows merged. */
export interface Window {
  start: Date;
  end: Date;
}

/**
 * The next window at or after `from`, with every overlapping window from other
 * rules merged in. On a side where one sign says 15:00–16:00 and the others
 * 15:30–16:30, a ticket is possible 15:00–16:30: that is one window, not two.
 */
export function nextWindow(rules: CleaningRule[], from: Date): Window | undefined {
  const first = nextOccurrence(rules, from);
  if (!first) return undefined;
  let { start, end } = first;
  for (let changed = true; changed; ) {
    changed = false;
    for (const rule of rules) {
      const o = nextOccurrence([rule], from);
      if (o && o.start <= end && (o.end > end || o.start < start)) {
        start = o.start < start ? o.start : start;
        end = o.end > end ? o.end : end;
        changed = true;
      }
    }
  }
  return { start, end };
}

/** The next `count` merged windows, in order. */
export function upcomingWindows(rules: CleaningRule[], from: Date, count: number): Window[] {
  const out: Window[] = [];
  let cursor = from;
  while (out.length < count) {
    const w = nextWindow(rules, cursor);
    if (!w) break;
    out.push(w);
    cursor = w.end;
  }
  return out;
}
