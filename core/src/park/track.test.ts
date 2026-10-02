import { describe, expect, it } from 'vitest';
import { fromXY, toXY, type LngLat, type XY } from '../geo/project';
import type { SideRecord } from '../geo/side';
import { sideFromTrack, type TrackPoint } from './track';

// avenue Coloniale 3817–3935 (sides 12500501 east, 12500502 west), one-way, curbs 8 m apart.
const EAST: LngLat[] = [
  [-73.577051, 45.517252],
  [-73.57515, 45.516383],
];
const WEST: LngLat[] = [
  [-73.575182, 45.516303],
  [-73.577107, 45.517191],
];
const side = (id: number, line: LngLat[], grid: SideRecord['grid'], oneWay: SideRecord['oneWay']): SideRecord => ({
  id,
  seg: 1250050,
  street: 'avenue Coloniale',
  grid,
  addresses: [3800, 3935],
  oneWay,
  line,
  rules: [],
});
const oneWay = [side(1, EAST, 'east', -1), side(2, WEST, 'west', -1)];
const twoWay = [side(1, EAST, 'east', 0), side(2, WEST, 'west', 0)];

// The middle of the road, driven "up the island" (north-west): east is on the right.
const mid = (p: LngLat, q: LngLat): XY => [(toXY(p)[0] + toXY(q)[0]) / 2, (toXY(p)[1] + toXY(q)[1]) / 2];
const SOUTH_END = mid(EAST[1]!, WEST[0]!);
const NORTH_END = mid(EAST[0]!, WEST[1]!);

interface Drive {
  /** Metres the car pulls over: negative = to its right, positive = to its left. */
  swerve: number;
  /** Constant GPS error applied to every fix, metres to the car's left. */
  bias?: number;
  southbound?: boolean;
  /** Skip the standstill (the intent fired while still rolling). */
  noStop?: boolean;
}

function drive({ swerve, bias = 0, southbound = false, noStop = false }: Drive): TrackPoint[] {
  const [from, to] = southbound ? [NORTH_END, SOUTH_END] : [SOUTH_END, NORTH_END];
  const len = Math.hypot(to[0] - from[0], to[1] - from[1]);
  const u: XY = [(to[0] - from[0]) / len, (to[1] - from[1]) / len];
  const left: XY = [-u[1], u[0]];
  const course = ((Math.atan2(u[0], u[1]) * 180) / Math.PI + 360) % 360;
  let t = 0;
  const fix = (along: number, across: number, speed: number, heading = course): TrackPoint => {
    const [lng, lat] = fromXY([from[0] + u[0] * along + left[0] * (across + bias), from[1] + u[1] * along + left[1] * (across + bias)]);
    return { lat, lng, t: (t += 1000), speed, course: heading, accuracy: 5 };
  };
  const track: TrackPoint[] = [];
  for (let m = 10; m <= 90; m += 8) track.push(fix(m, 0, 8)); // down the block at 8 m/s
  track.push(fix(95, swerve * 0.4, 2), fix(98, swerve * 0.8, 1.5)); // pulling over
  if (noStop) return track;
  for (let i = 0; i < 6; i++) track.push(fix(100, swerve, 0)); // parked, engine off
  // The driver walks off across the street before Bluetooth drops.
  for (let i = 1; i <= 8; i++) track.push(fix(100 + i, swerve + i * 1.5, 1.3, (course + 270) % 360));
  return track;
}

describe('sideFromTrack — one-way street', () => {
  it('finds the east curb when the car pulls over to its right', () => {
    const v = sideFromTrack(drive({ swerve: -3 }), oneWay);
    expect(v).toMatchObject({ side: { grid: 'east' }, opposite: { grid: 'west' }, method: 'swerve' });
  });

  it('finds the west curb when it pulls over to its left', () => {
    expect(sideFromTrack(drive({ swerve: 3 }), oneWay)?.side.grid).toBe('west');
  });

  it('is not fooled by a GPS error larger than the street', () => {
    // Every fix is 7 m off towards the west curb: the nearest curb is the wrong one,
    // but the car still moved to its right relative to its own driving line.
    expect(sideFromTrack(drive({ swerve: -3, bias: 7 }), oneWay)?.side.grid).toBe('east');
    expect(sideFromTrack(drive({ swerve: 3, bias: -7 }), oneWay)?.side.grid).toBe('west');
  });

  it('uses where the car stopped, not where the driver walked to', () => {
    const v = sideFromTrack(drive({ swerve: -3 }), oneWay)!;
    const stop = toXY(v.at);
    const last = drive({ swerve: -3 }).at(-1)!;
    const end = toXY([last.lng, last.lat]);
    expect(Math.hypot(stop[0] - end[0], stop[1] - end[1])).toBeGreaterThan(10);
  });

  it('does not decide when the car barely left its driving line', () => {
    expect(sideFromTrack(drive({ swerve: -0.5 }), oneWay)).toBeUndefined();
  });
});

describe('sideFromTrack — two-way street', () => {
  it('puts the car on the right of its direction of travel', () => {
    expect(sideFromTrack(drive({ swerve: 0 }), twoWay)).toMatchObject({ side: { grid: 'east' }, method: 'heading' });
    expect(sideFromTrack(drive({ swerve: 0, southbound: true }), twoWay)?.side.grid).toBe('west');
  });

  it('holds with a large GPS error', () => {
    expect(sideFromTrack(drive({ swerve: -3, bias: 9 }), twoWay)?.side.grid).toBe('east');
  });
});

describe('sideFromTrack — no verdict', () => {
  it('needs a standstill', () => {
    expect(sideFromTrack(drive({ swerve: -3, noStop: true }), oneWay)).toBeUndefined();
  });

  it('needs to have seen the car drive', () => {
    const walking = drive({ swerve: -3 }).map((p) => ({ ...p, speed: Math.min(p.speed, 1.3) }));
    expect(sideFromTrack(walking, oneWay)).toBeUndefined();
  });

  it('ignores a drive that came in from a cross street', () => {
    const sideways = drive({ swerve: -3 }).map((p) => (p.speed >= 2.5 ? { ...p, course: (p.course + 90) % 360 } : p));
    expect(sideFromTrack(sideways, oneWay)).toBeUndefined();
  });

  it('returns nothing for an empty track or far from any street', () => {
    expect(sideFromTrack([], oneWay)).toBeUndefined();
    const elsewhere = drive({ swerve: -3 }).map((p) => ({ ...p, lat: p.lat + 0.01 }));
    expect(sideFromTrack(elsewhere, oneWay)).toBeUndefined();
  });
});
