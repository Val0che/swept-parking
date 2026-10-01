import { describe, expect, it } from 'vitest';
import { parseRule } from '@swept/core';
import type { CleaningRule } from '@swept/core';
import { aggregateSides } from './aggregateSides';
import type { PoleMatch } from './matchPoles';

const rule = (text: string): CleaningRule => {
  const r = parseRule(text);
  if (!r.ok) throw new Error(text);
  return r.rule;
};
const FRI_1530 = rule('\\P 15h30-16h30 VENDREDI 1 AVRIL AU 1 DEC');
const FRI_1500 = rule('\\P 15h-16h VENDREDI 1 AVRIL AU 1 DEC');
const WED_1300 = rule('\\P 13h-14h MERCREDI 1 AVRIL AU 1 DEC');

const pole = (id: string, rules: CleaningRule[], nearCorner = false): PoleMatch => ({
  poleId: id,
  sideId: 1,
  distance: 1,
  nearCorner,
  rules,
});

describe('aggregateSides', () => {
  it('avenue Coloniale 3817–3935 east: majority first, dispute flagged', () => {
    // Pole 284204 posts "15h-16h" twice; four other poles say 15h30-16h30.
    const [side] = aggregateSides([
      pole('15975', [FRI_1530]),
      pole('15956', [FRI_1530]),
      pole('237629', [FRI_1530]),
      pole('237628', [FRI_1530]),
      pole('284204', [FRI_1500, FRI_1500]),
    ]);
    expect(side!.rules).toEqual([
      { rule: FRI_1530, poles: 4 },
      { rule: FRI_1500, poles: 1 },
    ]);
    expect(side!.disputed).toBe(true);
  });

  it('ignores corner poles when a mid-block pole exists', () => {
    const [side] = aggregateSides([pole('a', [FRI_1530]), pole('corner', [WED_1300], true)]);
    expect(side!.rules.map((r) => r.rule)).toEqual([FRI_1530]);
    expect(side!.disputed).toBe(false);
  });

  it('falls back to corner poles when that is all there is', () => {
    const [side] = aggregateSides([pole('corner', [WED_1300], true)]);
    expect(side!.rules.map((r) => r.rule)).toEqual([WED_1300]);
  });
});
