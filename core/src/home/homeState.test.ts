import { describe, expect, it } from 'vitest';
import { parseRule } from '../rules/parseRule';
import type { CleaningRule } from '../rules/types';
import { homeState, type SpotSchedule } from './homeState';
import { DEFAULT_REMINDERS, plannedReminders } from './reminders';

const rule = (text: string): CleaningRule => {
  const r = parseRule(text);
  if (!r.ok) throw new Error(text);
  return r.rule;
};
const at = (iso: string) => new Date(iso); // TZ=America/Montreal (vitest.config)
const hm = (d: Date) => `${d.toDateString()} ${d.toTimeString().slice(0, 5)}`;

// avenue Coloniale 3817–3935, east side: 4 poles say Fri 15:30, one says 15:00.
const FRI_1530 = rule('\\P 15h30-16h30 VENDREDI 1 AVRIL AU 1 DEC');
const FRI_1500 = rule('\\P 15h-16h VENDREDI 1 AVRIL AU 1 DEC');
const clean: SpotSchedule = { rules: [{ rule: FRI_1530, poles: 4 }] };
const disputed: SpotSchedule = { rules: [{ rule: FRI_1530, poles: 4 }, { rule: FRI_1500, poles: 1 }] };

describe('homeState', () => {
  it('is calm more than 24 h before', () => {
    const s = homeState(clean, at('2026-09-30T14:10')); // Wed
    expect(s.kind).toBe('calm');
    if (s.kind === 'calm') expect(hm(s.display.start)).toBe('Fri Oct 02 2026 15:30');
  });

  it('is soon within 24 h', () => {
    expect(homeState(clean, at('2026-10-02T10:48')).kind).toBe('soon');
  });

  it('is moveNow during the window, with progress', () => {
    const s = homeState(clean, at('2026-10-02T15:42'));
    expect(s.kind).toBe('moveNow');
    if (s.kind === 'moveNow') expect(s.progress).toBeCloseTo(0.2);
  });

  it('is safe right after the window, pointing to next week', () => {
    const s = homeState(clean, at('2026-10-02T16:31'));
    expect(s.kind).toBe('safe');
    if (s.kind === 'safe') expect(hm(s.display.start)).toBe('Fri Oct 09 2026 15:30');
  });

  it('goes back to calm half a day after the window', () => {
    expect(homeState(clean, at('2026-10-03T06:00')).kind).toBe('calm');
  });

  it('is off-season in winter and says when it resumes', () => {
    expect(homeState(clean, at('2026-12-15T11:20'))).toEqual({ kind: 'offSeason', resumes: { month: 4, day: 1 } });
  });

  it('times a disputed side by the earliest sign but displays the majority', () => {
    const s = homeState(disputed, at('2026-09-30T14:10'));
    expect(s.kind).toBe('calm');
    if (s.kind !== 'calm') return;
    expect(hm(s.display.start)).toBe('Fri Oct 02 2026 15:30');
    expect(hm(s.alarm.start)).toBe('Fri Oct 02 2026 15:00');
  });

  it('says move now from the earliest sign on a disputed side', () => {
    expect(homeState(disputed, at('2026-10-02T15:10')).kind).toBe('moveNow');
  });

  it('keeps a disputed move-now window open until the latest sign ends', () => {
    // 15:00–16:00 (1 sign) and 15:30–16:30 (4 signs): a ticket is possible 15:00–16:30.
    const s = homeState(disputed, at('2026-10-02T15:42'));
    expect(s.kind).toBe('moveNow');
    if (s.kind !== 'moveNow') return;
    expect(hm(s.alarm.start)).toBe('Fri Oct 02 2026 15:00');
    expect(hm(s.alarm.end)).toBe('Fri Oct 02 2026 16:30');
    expect(s.progress).toBeCloseTo(42 / 90);
  });

  it('is still move-now after the early sign ends but the majority window runs', () => {
    const s = homeState(disputed, at('2026-10-02T16:10'));
    expect(s.kind).toBe('moveNow');
    if (s.kind === 'moveNow') expect(hm(s.alarm.end)).toBe('Fri Oct 02 2026 16:30');
  });

  it('has nothing to say without rules', () => {
    expect(homeState({ rules: [] }, at('2026-09-30T14:10'))).toEqual({ kind: 'noSchedule' });
  });
});

describe('plannedReminders', () => {
  const s = homeState(clean, at('2026-10-02T10:48'));
  it('plans the evening before and 1 h before, marking sent ones', () => {
    if (s.kind !== 'soon') throw new Error(s.kind);
    const r = plannedReminders(s.alarm, DEFAULT_REMINDERS, at('2026-10-02T10:48'));
    expect(r.map((x) => [x.kind, hm(x.at), x.sent])).toEqual([
      ['evening', 'Thu Oct 01 2026 20:00', true],
      ['lead', 'Fri Oct 02 2026 14:30', false],
    ]);
  });
});
