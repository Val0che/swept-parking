import type { CleaningRule } from '../rules/types';
import { projectOnLine, toXY, type LngLat, type XY } from './project';

export type GridSide = 'north' | 'south' | 'east' | 'west';

/** One distinct rule on a block side and how many sign poles post it. */
export interface SideRule {
  rule: CleaningRule;
  poles: number;
}

/** One side of one block, as stored in the app's bundled database. */
export interface SideRecord {
  id: number;
  /** Shared by both sides of the block. */
  seg: number;
  street: string;
  grid: GridSide;
  addresses: [number, number];
  oneWay: -1 | 0 | 1;
  line: LngLat[];
  /** Most-posted first; empty when the city has no cleaning sign here. */
  rules: SideRule[];
}

// Montreal's street grid is rotated ~35° from true north; locals say "north"
// for what the grid calls north (up the island), not true north.
const GRID_ROTATION_DEG = 35;
const LABELS = ['east', 'north', 'west', 'south'] as const;

/** The point halfway along a polyline, by length. */
function halfway(line: XY[]): XY {
  const lengths = line.slice(1).map((p, i) => Math.hypot(p[0] - line[i]![0], p[1] - line[i]![1]));
  let left = lengths.reduce((a, b) => a + b, 0) / 2;
  for (let i = 0; i < lengths.length; i++) {
    const len = lengths[i]!;
    if (left <= len || i === lengths.length - 1) {
      const t = len === 0 ? 0 : left / len;
      const [a, b] = [line[i]!, line[i + 1]!];
      return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    }
    left -= len;
  }
  return line[0]!;
}

/** "east", "north"… side of the street in Montreal's grid directions, given the other side's line. */
export function gridSideOf(line: LngLat[], opposite: LngLat[]): GridSide {
  const mid = halfway(line.map(toXY));
  // Compare against the nearest point of the other side, not its own midpoint:
  // the two lines are digitised independently and their midpoints can be far apart.
  const other = opposite.map(toXY);
  let near = other[0]!;
  let best = Infinity;
  for (let i = 0; i < other.length - 1; i++) {
    const [a, b] = [other[i]!, other[i + 1]!];
    const d2 = (b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2;
    const t = d2 === 0 ? 0 : Math.max(0, Math.min(1, ((mid[0] - a[0]) * (b[0] - a[0]) + (mid[1] - a[1]) * (b[1] - a[1])) / d2));
    const p: XY = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    const d = Math.hypot(mid[0] - p[0], mid[1] - p[1]);
    if (d < best) [best, near] = [d, p];
  }
  const deg = (Math.atan2(mid[1] - near[1], mid[0] - near[0]) * 180) / Math.PI - GRID_ROTATION_DEG;
  return LABELS[Math.round((((deg % 360) + 360) % 360) / 90) % 4]!;
}

export interface Located {
  side: SideRecord;
  /** Metres from the fix to the side's curb line. */
  distance: number;
  opposite?: SideRecord;
  /** The fix can't tell this side from the opposite one: ask, never guess. */
  ambiguous: boolean;
}

/** Sides further than this from the fix are not "where the car is". */
export const MAX_SIDE_DISTANCE_M = 45;

/**
 * The block side a GPS fix is on. `accuracy` is the fix's radius in metres;
 * the two curbs of a street are only ~8 m apart, so a loose fix is ambiguous.
 */
export function locate(candidates: SideRecord[], at: LngLat, accuracy: number): Located | undefined {
  const p = toXY(at);
  const ranked = candidates
    .map((side) => ({ side, distance: projectOnLine(p, side.line.map(toXY)).distance }))
    .sort((a, b) => a.distance - b.distance);
  const best = ranked[0];
  if (!best || best.distance > MAX_SIDE_DISTANCE_M) return undefined;

  const opp = ranked.find((r) => r.side.seg === best.side.seg && r.side.id !== best.side.id);
  const margin = opp ? opp.distance - best.distance : Infinity;
  return {
    side: best.side,
    distance: best.distance,
    opposite: opp?.side,
    ambiguous: accuracy > 25 || margin < accuracy * 0.75,
  };
}
