export type LngLat = [lng: number, lat: number];

// Local equirectangular projection around Montreal: metre-accurate at street scale.
const LAT0 = 45.55;
const M_PER_DEG_LAT = 111_132;
const M_PER_DEG_LNG = 111_320 * Math.cos((LAT0 * Math.PI) / 180);

export type XY = [number, number];

export const toXY = ([lng, lat]: LngLat): XY => [lng * M_PER_DEG_LNG, lat * M_PER_DEG_LAT];

export interface Projection {
  distance: number; // metres from the point to the line
  along: number; // metres from the line's start to the closest point
  length: number; // line length in metres
  /** >0 when the point is left of the line's direction, <0 when right. */
  cross: number;
}

/** Closest point on a polyline (already in metres) to `p`. */
export function projectOnLine(p: XY, line: XY[]): Projection {
  let best: Projection = { distance: Infinity, along: 0, length: 0, cross: 0 };
  let walked = 0;
  for (let i = 0; i < line.length - 1; i++) {
    const [ax, ay] = line[i]!;
    const [bx, by] = line[i + 1]!;
    const dx = bx - ax;
    const dy = by - ay;
    const segLen = Math.hypot(dx, dy);
    const t = segLen === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - ax) * dx + (p[1] - ay) * dy) / segLen ** 2));
    const distance = Math.hypot(p[0] - (ax + t * dx), p[1] - (ay + t * dy));
    if (distance < best.distance) {
      best = { distance, along: walked + t * segLen, length: 0, cross: dx * (p[1] - ay) - dy * (p[0] - ax) };
    }
    walked += segLen;
  }
  best.length = walked;
  return best;
}

export const fromXY = ([x, y]: XY): LngLat => [x / M_PER_DEG_LNG, y / M_PER_DEG_LAT];
