import type { SideIndex } from '../geo/sideIndex';
import { parseRule } from '@swept/core';
import type { CleaningRule } from '@swept/core';
import type { SignPanel } from '../sources/signs';

/** Poles further than this from any side line are dropped (parks, parking lots, bad GPS). */
export const MAX_POLE_DISTANCE_M = 20;

export interface PoleMatch {
  poleId: string;
  sideId: number;
  distance: number;
  /** A pole this close to either end of its block may belong to the cross street. */
  nearCorner: boolean;
  rules: CleaningRule[];
}

export interface MatchStats {
  poles: number;
  matched: number;
  tooFar: number;
  nearCorner: number;
}

const CORNER_M = 6;

/**
 * Group cleaning panels by pole and attach each pole to its nearest street side.
 *
 * Panels with an arrow are ignored: street cleaning signs cover the whole block
 * side and carry no arrow; arrowed ones are other restrictions posted near a
 * corner (confirmed on the ground on avenue Coloniale).
 */
export function matchPoles(panels: SignPanel[], index: SideIndex): { matches: PoleMatch[]; stats: MatchStats } {
  const poles = new Map<string, { lng: number; lat: number; rules: CleaningRule[] }>();
  for (const panel of panels) {
    if (panel.arrow !== 0) continue;
    const result = parseRule(panel.text);
    if (!result.ok) continue;
    const pole = poles.get(panel.poleId) ?? { lng: panel.lng, lat: panel.lat, rules: [] };
    pole.rules.push(result.rule);
    poles.set(panel.poleId, pole);
  }

  const matches: PoleMatch[] = [];
  let tooFar = 0;
  for (const [poleId, pole] of poles) {
    const [best] = index.near(pole.lng, pole.lat, MAX_POLE_DISTANCE_M);
    if (!best) {
      tooFar++;
      continue;
    }
    const nearCorner = best.along < CORNER_M || best.length - best.along < CORNER_M;
    matches.push({ poleId, sideId: best.side.id, distance: best.distance, nearCorner, rules: pole.rules });
  }

  return {
    matches,
    stats: {
      poles: poles.size,
      matched: matches.length,
      tooFar,
      nearCorner: matches.filter((m) => m.nearCorner).length,
    },
  };
}
