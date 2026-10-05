import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseRule, type CleaningRule } from '@swept/core';
import { describe, expect, it } from 'vitest';
import type { SideSchedule } from '../match/aggregateSides';
import type { StreetSide } from '../sources/sides';
import { diff } from './diff';
import { stableRuleId, writeDb } from './writeDb';

const rule = (text: string): CleaningRule => {
  const r = parseRule(text);
  if (!r.ok) throw new Error(text);
  return r.rule;
};
const FRI = rule('\\P 15h30-16h30 VENDREDI 1 AVRIL AU 1 DEC');
const WED = rule('\\P 13h-14h MERCREDI 1 AVRIL AU 1 DEC');

const side = (id: number, segmentId: number, lat: number): StreetSide => ({
  id,
  segmentId,
  street: 'avenue Coloniale',
  side: id % 2 ? 'right' : 'left',
  oneWay: -1,
  addresses: [3800, 3935],
  line: [
    [-73.577, lat],
    [-73.575, lat - 0.0008],
  ],
});
const schedule = (sideId: number, r: CleaningRule): SideSchedule => ({ sideId, rules: [{ rule: r, poles: 4 }], disputed: false });

const dir = mkdtempSync(join(tmpdir(), 'swept-diff-'));
const build = (name: string, sides: StreetSide[], schedules: SideSchedule[]) => {
  const path = join(dir, name);
  writeDb(path, sides, schedules, '2026-10-02T00:00:00Z');
  return path;
};

describe('diff', () => {
  const east = side(1, 10, 45.5172);
  const west = side(2, 10, 45.5171);
  const other = side(3, 20, 45.52);
  const before = build('before.db', [east, west, other], [schedule(1, FRI), schedule(2, WED)]);

  it('is empty between two builds of the same data', () => {
    const again = build('again.db', [east, west, other], [schedule(1, FRI), schedule(2, WED)]);
    expect(diff(before, again)).toEqual({ rules: [], upsert: [], remove: [] });
  });

  it('reports a changed schedule with the rule it now references', () => {
    const after = build('changed.db', [east, west, other], [schedule(1, WED), schedule(2, WED)]);
    const d = diff(before, after);
    expect(d.upsert.map((r) => r.id)).toEqual([1]);
    expect(d.upsert[0]).toMatchObject({ rules: `${stableRuleId(JSON.stringify(WED))}:4`, day: 3 });
    expect(d.rules).toEqual([{ id: stableRuleId(JSON.stringify(WED)), json: JSON.stringify(WED) }]);
    expect(d.remove).toEqual([]);
  });

  it('reports new, removed and de-scheduled sides', () => {
    const added = side(5, 30, 45.53);
    const after = build('reshaped.db', [east, west, added], [schedule(2, WED), schedule(5, FRI)]);
    const d = diff(before, after);
    expect(d.upsert.map((r) => r.id).sort()).toEqual([1, 5]);
    expect(d.upsert.find((r) => r.id === 1)?.rules).toBeNull();
    expect(d.remove).toEqual([3]);
  });
});
