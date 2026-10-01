import { toXY, type LngLat, type XY } from '@swept/core';

function distanceToSegment(p: XY, a: XY, b: XY): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const d2 = dx * dx + dy * dy;
  const t = d2 === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / d2));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

/**
 * Douglas–Peucker: drop points that sit within `tolerance` metres of the line.
 * The city's side lines carry many near-collinear points (curb arcs at corners)
 * the app doesn't need; this cuts the bundled database by more than half.
 */
export function simplify(line: LngLat[], tolerance: number): LngLat[] {
  if (line.length <= 2) return line;
  const xy = line.map(toXY);
  const keep = new Array<boolean>(line.length).fill(false);
  keep[0] = keep[line.length - 1] = true;
  const stack: [number, number][] = [[0, line.length - 1]];
  while (stack.length) {
    const [from, to] = stack.pop()!;
    let worst = 0;
    let at = -1;
    for (let i = from + 1; i < to; i++) {
      const d = distanceToSegment(xy[i]!, xy[from]!, xy[to]!);
      if (d > worst) [worst, at] = [d, i];
    }
    if (at !== -1 && worst > tolerance) {
      keep[at] = true;
      stack.push([from, at], [at, to]);
    }
  }
  return line.filter((_, i) => keep[i]);
}
