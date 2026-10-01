import Flatbush from 'flatbush';
import type { StreetSide } from '../sources/sides';
import { projectOnLine, toXY, type Projection, type XY } from '@swept/core';

export interface SideHit extends Projection {
  side: StreetSide;
}

/** Spatial index over street-side lines, queried by "nearest sides to a point". */
export class SideIndex {
  private readonly index: Flatbush;
  private readonly lines: XY[][];

  constructor(private readonly sides: StreetSide[]) {
    this.lines = sides.map((s) => s.line.map(toXY));
    this.index = new Flatbush(sides.length);
    for (const line of this.lines) {
      const xs = line.map((p) => p[0]);
      const ys = line.map((p) => p[1]);
      this.index.add(Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys));
    }
    this.index.finish();
  }

  /** Sides within `radius` metres of the point, closest first. */
  near(lng: number, lat: number, radius: number): SideHit[] {
    const p = toXY([lng, lat]);
    return this.index
      .search(p[0] - radius, p[1] - radius, p[0] + radius, p[1] + radius)
      .map((i) => ({ side: this.sides[i]!, ...projectOnLine(p, this.lines[i]!) }))
      .filter((hit) => hit.distance <= radius)
      .sort((a, b) => a.distance - b.distance);
  }
}
