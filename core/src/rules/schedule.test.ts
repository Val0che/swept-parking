import { describe, expect, it } from 'vitest';
import { parseRule } from './parseRule';
import { nextOccurrence, nextWindow, upcomingWindows } from './schedule';
import type { CleaningRule } from './types';

const rule = (text: string): CleaningRule => {
  const r = parseRule(text);
  if (!r.ok) throw new Error(`unparsed: ${text}`);
  return r.rule;
};
const at = (iso: string) => new Date(iso); // local time; vitest runs with TZ=America/Montreal
const fmt = (d?: Date) => d && `${d.toDateString()} ${d.toTimeString().slice(0, 5)}`;

describe('nextOccurrence', () => {
  const wed = rule('\\P 8h30-11h30 MERCREDI 1 AVRIL AU 1 DEC');

  it('finds this week’s window', () => {
    // Wed 2026-09-30 is today; 07:00 is before the window.
    const next = nextOccurrence([wed], at('2026-09-30T07:00'));
    expect(fmt(next?.start)).toBe('Wed Sep 30 2026 08:30');
    expect(fmt(next?.end)).toBe('Wed Sep 30 2026 11:30');
  });

  it('returns a window already in progress', () => {
    expect(fmt(nextOccurrence([wed], at('2026-09-30T09:00'))?.start)).toBe('Wed Sep 30 2026 08:30');
  });

  it('moves to next week once the window is over', () => {
    expect(fmt(nextOccurrence([wed], at('2026-09-30T11:30'))?.start)).toBe('Wed Oct 07 2026 08:30');
  });

  it('skips the off-season to next April', () => {
    // Last in-season Wednesday is Nov 25; Dec 2 is out; next is Apr 7, 2027.
    expect(fmt(nextOccurrence([wed], at('2026-11-25T12:00'))?.start)).toBe('Wed Apr 07 2027 08:30');
  });

  it('includes the last day of the season', () => {
    const tue = rule('\\P 10h-11h MARDI 1 AVRIL AU 1 DEC');
    // Dec 1, 2026 is a Tuesday.
    expect(fmt(nextOccurrence([tue], at('2026-11-30T12:00'))?.start)).toBe('Tue Dec 01 2026 10:00');
  });

  it('picks the earliest across multiple rules and days', () => {
    const monThu = rule('\\P 13h-14h LUN. JEU. 1 MARS AU 1 DEC.');
    const next = nextOccurrence([wed, monThu], at('2026-09-30T12:00'));
    expect(fmt(next?.start)).toBe('Thu Oct 01 2026 13:00');
  });

  it('handles an overnight window that started the previous evening', () => {
    const night = rule('\\P 23h30-00h30 LUN A MAR, JEU A VEN 1 MARS AU 1 DEC.');
    // Mon Sep 28 23:30 → Tue 00:30; at Tue 00:10 we are inside it.
    const next = nextOccurrence([night], at('2026-09-29T00:10'));
    expect(fmt(next?.start)).toBe('Mon Sep 28 2026 23:30');
    expect(fmt(next?.end)).toBe('Tue Sep 29 2026 00:30');
  });

  it('treats a window ending at 24h as ending at midnight', () => {
    const late = rule('\\P 19h-24h MARDI 1 AVRIL AU 1 DEC');
    const next = nextOccurrence([late], at('2026-09-29T20:00'));
    expect(fmt(next?.end)).toBe('Wed Sep 30 2026 00:00');
  });
});

describe('nextWindow / upcomingWindows', () => {
  const most = rule('\\P 15h30-16h30 VENDREDI 1 AVRIL AU 1 DEC');
  const one = rule('\\P 15h-16h VENDREDI 1 AVRIL AU 1 DEC');

  it('merges overlapping windows from disagreeing signs', () => {
    const w = nextWindow([most, one], at('2026-09-30T12:00'));
    expect([fmt(w?.start), fmt(w?.end)]).toEqual(['Fri Oct 02 2026 15:00', 'Fri Oct 02 2026 16:30']);
  });

  it('keeps the later sign once the earlier one has ended', () => {
    const w = nextWindow([most, one], at('2026-10-02T16:10'));
    expect([fmt(w?.start), fmt(w?.end)]).toEqual(['Fri Oct 02 2026 15:30', 'Fri Oct 02 2026 16:30']);
  });

  it('lists one window per week, not one per sign', () => {
    const ws = upcomingWindows([most, one], at('2026-09-30T12:00'), 3);
    expect(ws.map((w) => fmt(w.start))).toEqual([
      'Fri Oct 02 2026 15:00',
      'Fri Oct 09 2026 15:00',
      'Fri Oct 16 2026 15:00',
    ]);
  });

  it('jumps the winter to the next season', () => {
    const ws = upcomingWindows([most], at('2026-11-21T12:00'), 3);
    expect(ws.map((w) => fmt(w.start))).toEqual(['Fri Nov 27 2026 15:30', 'Fri Apr 02 2027 15:30', 'Fri Apr 09 2027 15:30']);
  });
});
