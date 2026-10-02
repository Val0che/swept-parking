import { fromXY, projectOnLine, toXY, type LngLat, type XY } from '../geo/project';
import type { SideRecord } from '../geo/side';

/** One GPS fix recorded while driving (from CLLocation). */
export interface TrackPoint {
  lat: number;
  lng: number;
  /** Epoch ms. */
  t: number;
  /** m/s; negative when the receiver doesn't know. */
  speed: number;
  /** Degrees clockwise from true north; negative when unknown. */
  course: number;
  accuracy: number;
}

export interface TrackVerdict {
  side: SideRecord;
  opposite?: SideRecord;
  /** Where the car stopped (not where the phone was when Bluetooth dropped). */
  at: LngLat;
  /** `heading`: two-way street, parked on the right. `swerve`: pulled over to that curb. */
  method: 'heading' | 'swerve' | 'only-side';
}

const DRIVING_MPS = 4; // clearly a car, not a parking manoeuvre or a pedestrian
const ROLLING_MPS = 2.5;
const STOPPED_MPS = 0.6;
const STOPPED_FOR_MS = 3000;
const APPROACH_M = 70;
/** A lane is ≥ 3 m from the parking lane's centre; half of that is a safe threshold. */
const MIN_SWERVE_M = 1.5;
const MAX_OFF_AXIS_DEG = 25;
const MAX_FROM_STREET_M = 15;
const MAX_SIDE_DISTANCE_M = 30;

const xyOf = (p: TrackPoint): XY => toXY([p.lng, p.lat]);
const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]!;
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

/** Index range [from, to) of the first ≥3 s standstill after the car last drove at speed. */
function standstill(track: TrackPoint[]): [number, number] | undefined {
  let lastFast = track.length - 1;
  while (lastFast >= 0 && track[lastFast]!.speed < DRIVING_MPS) lastFast--;
  if (lastFast < 0) return undefined;
  for (let i = lastFast + 1; i < track.length; i++) {
    if (track[i]!.speed < 0 || track[i]!.speed >= STOPPED_MPS) continue;
    let j = i;
    while (j + 1 < track.length && track[j + 1]!.speed >= 0 && track[j + 1]!.speed < STOPPED_MPS) j++;
    if (track[j]!.t - track[i]!.t >= STOPPED_FOR_MS) return [i, j + 1];
    i = j;
  }
  return undefined;
}

/**
 * Which side of the street the car was parked on, from the GPS track of the drive.
 *
 * A single fix can't separate two curbs 8 m apart, but a track can:
 *  - on a two-way street the car is on the right of its direction of travel;
 *  - on a one-way street, the stop is compared with the line driven down the
 *    block. GPS error is nearly constant over a few seconds, so pulling over 3 m
 *    to one curb shows even when every fix is 8 m off.
 * Returns `undefined` when the track doesn't settle it; the caller then asks.
 */
export function sideFromTrack(track: TrackPoint[], sides: SideRecord[]): TrackVerdict | undefined {
  const stop = standstill(track);
  if (!stop) return undefined;
  const parked = track.slice(stop[0], stop[1]).map(xyOf);
  const at: XY = [mean(parked.map((p) => p[0])), mean(parked.map((p) => p[1]))];

  // The block the car stopped on: the nearest side and its opposite.
  const ranked = sides
    .map((side) => ({ side, ...projectOnLine(at, side.line.map(toXY)) }))
    .sort((a, b) => a.distance - b.distance);
  const near = ranked[0];
  if (!near || near.distance > MAX_SIDE_DISTANCE_M) return undefined;
  const other = ranked.find((r) => r.side.seg === near.side.seg && r.side.id !== near.side.id);
  const here = fromXY(at);
  if (!other) return { side: near.side, at: here, method: 'only-side' };

  // The street's axis, from the map rather than from noisy fixes.
  const line = near.side.line.map(toXY);
  const [a, b] = [line[0]!, line.at(-1)!];
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  let axis: XY = [(b[0] - a[0]) / len, (b[1] - a[1]) / len];
  const axisBearing = (deg: number) => {
    const d = Math.abs((((deg - (Math.atan2(axis[0], axis[1]) * 180) / Math.PI) % 180) + 180) % 180);
    return Math.min(d, 180 - d);
  };
  /** Signed distance left (+) or right (−) of the axis through `a`. */
  const lateral = (p: XY) => axis[0] * (p[1] - a[1]) - axis[1] * (p[0] - a[0]);

  // The last stretch driven along this street before stopping.
  const centre = (lateral(projectPoint(near.side, at)) + lateral(projectPoint(other.side, at))) / 2;
  const approach: TrackPoint[] = [];
  let walked = 0;
  for (let i = stop[0] - 1; i >= 0 && walked < APPROACH_M; i--) {
    const p = track[i]!;
    if (i + 1 < stop[0]) {
      const q = xyOf(track[i + 1]!);
      walked += Math.hypot(xyOf(p)[0] - q[0], xyOf(p)[1] - q[1]);
    }
    if (p.speed >= ROLLING_MPS && p.course >= 0 && axisBearing(p.course) <= MAX_OFF_AXIS_DEG && Math.abs(lateral(xyOf(p)) - centre) <= MAX_FROM_STREET_M) {
      approach.push(p);
    }
  }
  if (approach.length < 4) return undefined;

  // Point the axis the way the car was travelling.
  const along = mean(approach.map((p) => Math.sin((p.course * Math.PI) / 180) * axis[0] + Math.cos((p.course * Math.PI) / 180) * axis[1]));
  if (along < 0) axis = [-axis[0], -axis[1]];

  const nearLat = lateral(projectPoint(near.side, at));
  const otherLat = lateral(projectPoint(other.side, at));
  const [left, right] = nearLat > otherLat ? [near.side, other.side] : [other.side, near.side];
  const pick = (side: SideRecord, method: TrackVerdict['method']): TrackVerdict => ({
    side,
    opposite: side === left ? right : left,
    at: here,
    method,
  });

  // Two-way street: Quebec parks on the right of the direction of travel.
  if (near.side.oneWay === 0) return pick(right, 'heading');

  // One-way street: which curb did the car pull over to, relative to its own driving line?
  const swerve = median(parked.map(lateral)) - median(approach.map((p) => lateral(xyOf(p))));
  if (Math.abs(swerve) < MIN_SWERVE_M) return undefined;
  return pick(swerve > 0 ? left : right, 'swerve');
}

/** The point of a side's line closest to `p`. */
function projectPoint(side: SideRecord, p: XY): XY {
  const line = side.line.map(toXY);
  let best: XY = line[0]!;
  let bestD = Infinity;
  for (let i = 0; i < line.length - 1; i++) {
    const [a, b] = [line[i]!, line[i + 1]!];
    const d2 = (b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2;
    const t = d2 === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * (b[0] - a[0]) + (p[1] - a[1]) * (b[1] - a[1])) / d2));
    const q: XY = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    const d = Math.hypot(p[0] - q[0], p[1] - q[1]);
    if (d < bestD) [bestD, best] = [d, q];
  }
  return best;
}
