import type { CleaningRule, SideRule } from '@swept/core';
import type { PoleMatch } from './matchPoles';

export interface SideSchedule {
  sideId: number;
  /** Most-posted first: `rules[0]` is what the signs most likely say. */
  rules: SideRule[];
  /** Poles on this side disagree; reminders should use the earliest window. */
  disputed: boolean;
}

const ruleKey = (r: CleaningRule) => JSON.stringify([r.days, r.windows, r.season]);

/**
 * Merge every pole's rules into one schedule per block side.
 *
 * Corner poles only count when the side has no mid-block pole, because a sign
 * at the corner is as likely to govern the cross street.
 */
export function aggregateSides(matches: PoleMatch[]): SideSchedule[] {
  const bySide = new Map<number, PoleMatch[]>();
  for (const m of matches) bySide.set(m.sideId, [...(bySide.get(m.sideId) ?? []), m]);

  const schedules: SideSchedule[] = [];
  for (const [sideId, all] of bySide) {
    const midBlock = all.filter((m) => !m.nearCorner);
    const poles = midBlock.length > 0 ? midBlock : all;

    const rules = new Map<string, SideRule>();
    for (const pole of poles) {
      // A pole with the same sign twice still counts once.
      for (const key of new Set(pole.rules.map(ruleKey))) {
        const rule = pole.rules.find((r) => ruleKey(r) === key)!;
        const existing = rules.get(key);
        if (existing) existing.poles++;
        else rules.set(key, { rule, poles: 1 });
      }
    }

    const sorted = [...rules.values()].sort((a, b) => b.poles - a.poles);
    schedules.push({ sideId, rules: sorted, disputed: sorted.length > 1 });
  }
  return schedules;
}
