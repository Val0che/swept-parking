import { describe, expect, it } from 'vitest';
import type { LngLat } from './project';
import { gridSideOf, locate, type SideRecord } from './side';

// avenue Coloniale 3817–3935, end points of the two curb lines in the city's
// Géobase double (sides 12500501 and 12500502). They are digitised in opposite directions.
const EAST: LngLat[] = [
  [-73.577051, 45.517252],
  [-73.57515, 45.516383],
];
const WEST: LngLat[] = [
  [-73.575182, 45.516303],
  [-73.577107, 45.517191],
];

const side = (id: number, line: LngLat[], grid: SideRecord['grid']): SideRecord => ({
  id,
  seg: 1,
  street: 'avenue Coloniale',
  grid,
  addresses: [3800, 3935],
  oneWay: 1,
  line,
  rules: [],
});
const east = side(1, EAST, 'east');
const west = side(2, WEST, 'west');

describe('gridSideOf', () => {
  it('names sides the Montreal way', () => {
    expect(gridSideOf(EAST, WEST)).toBe('east');
    expect(gridSideOf(WEST, EAST)).toBe('west');
  });

  it('does not depend on the direction the lines were digitised', () => {
    expect(gridSideOf([...EAST].reverse(), WEST)).toBe('east');
  });
});

describe('locate', () => {
  // A sign pole on the east sidewalk (pole 15975 in the city data).
  const onEastSidewalk: LngLat = [-73.576765, 45.517151];

  it('picks the nearest side without asking', () => {
    const hit = locate([west, east], onEastSidewalk, 5);
    expect(hit?.side.id).toBe(1);
    expect(hit?.opposite?.id).toBe(2);
    expect(hit?.ambiguous).toBe(false);
  });

  it('still guesses with an ordinary city fix', () => {
    expect(locate([west, east], onEastSidewalk, 20)?.ambiguous).toBe(false);
  });

  it('asks only when the fix is too loose to mean anything', () => {
    expect(locate([west, east], onEastSidewalk, 60)?.ambiguous).toBe(true);
  });

  it('has nothing to ask when the block has only one side', () => {
    expect(locate([east], onEastSidewalk, 60)?.ambiguous).toBe(false);
  });

  it('returns nothing far from any street', () => {
    expect(locate([west, east], [-73.58, 45.52], 5)).toBeUndefined();
  });
});
