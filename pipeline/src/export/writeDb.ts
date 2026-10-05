import { createHash } from 'node:crypto';
import { rmSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { gridSideOf, type GridSide, type LngLat } from '@swept/core';
import type { SideSchedule } from '../match/aggregateSides';
import type { StreetSide } from '../sources/sides';
import { simplify } from './simplify';

const TOLERANCE_M = 0.75;
const round = (n: number) => Math.round(n * 1e6) / 1e6;

/** Schema read by the app (`app/src/data/db.ts`) and by the native "I parked" intent. */
const SCHEMA = `
  CREATE TABLE side (
    id INTEGER PRIMARY KEY,
    seg INTEGER NOT NULL,
    street TEXT NOT NULL,
    grid TEXT NOT NULL,
    a1 INTEGER NOT NULL,
    a2 INTEGER NOT NULL,
    oneway INTEGER NOT NULL,
    minlat REAL NOT NULL, maxlat REAL NOT NULL, minlng REAL NOT NULL, maxlng REAL NOT NULL,
    line TEXT NOT NULL,   -- JSON [[lng,lat],…]
    rules TEXT,           -- "ruleId:poles,…" most-posted first; NULL = no cleaning sign
    day INTEGER,          -- first weekday of the main rule (0 = Sunday), for map colours
    disputed INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX side_seg ON side (seg);
  -- Each distinct sign rule once; a few hundred cover the whole city. Ids are content hashes.
  CREATE TABLE rule (id INTEGER PRIMARY KEY, json TEXT NOT NULL UNIQUE);
  CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
`;

/**
 * Without the other side to compare with (dead ends, medians): Géobase draws each
 * curb line with the roadway on its right (checked on avenue Coloniale, where the
 * two sides run in opposite directions), so fake an opposite curb on that hand.
 */
function fallbackGrid(side: StreetSide): GridSide {
  const [a, b] = [side.line[0]!, side.line.at(-1)!];
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const n = Math.hypot(dx, dy) || 1;
  const shifted: LngLat[] = side.line.map(([x, y]) => [x + (dy / n) * 1e-4, y - (dx / n) * 1e-4]);
  return gridSideOf(side.line, shifted);
}

/**
 * A rule's id is derived from its content, so every build gives the same rule the
 * same id. Deltas between releases (`release.ts`) rely on that: a row's "rules"
 * column must mean the same thing in the old database and the new one.
 */
export const stableRuleId = (json: string): number => parseInt(createHash('sha1').update(json).digest('hex').slice(0, 7), 16);

export function writeDb(path: string, sides: StreetSide[], schedules: SideSchedule[], builtAt: string): { rows: number } {
  rmSync(path, { force: true });
  const db = new DatabaseSync(path);
  db.exec(SCHEMA);

  const scheduleOf = new Map(schedules.map((s) => [s.sideId, s]));
  const bySegment = new Map<number, StreetSide[]>();
  for (const s of sides) bySegment.set(s.segmentId, [...(bySegment.get(s.segmentId) ?? []), s]);

  const insert = db.prepare(
    'INSERT OR IGNORE INTO side (id, seg, street, grid, a1, a2, oneway, minlat, maxlat, minlng, maxlng, line, rules, day, disputed) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
  );
  const insertRule = db.prepare('INSERT INTO rule (id, json) VALUES (?, ?)');
  const ruleJsonById = new Map<number, string>();
  const ruleId = (json: string) => {
    const id = stableRuleId(json);
    const known = ruleJsonById.get(id);
    if (known === undefined) {
      ruleJsonById.set(id, json);
      insertRule.run(id, json);
    } else if (known !== json) {
      throw new Error(`rule id collision on ${id}: widen stableRuleId`);
    }
    return id;
  };
  db.exec('BEGIN');
  let rows = 0;
  for (const side of sides) {
    const line = simplify(side.line, TOLERANCE_M).map(([x, y]): LngLat => [round(x), round(y)]);
    const lats = line.map((p) => p[1]);
    const lngs = line.map((p) => p[0]);
    const opposite = bySegment.get(side.segmentId)?.find((s) => s.id !== side.id);
    const sch = scheduleOf.get(side.id);
    const { changes } = insert.run(
      side.id,
      side.segmentId,
      side.street,
      opposite ? gridSideOf(side.line, opposite.line) : fallbackGrid(side),
      side.addresses[0],
      side.addresses[1],
      side.oneWay,
      Math.min(...lats),
      Math.max(...lats),
      Math.min(...lngs),
      Math.max(...lngs),
      JSON.stringify(line),
      sch ? sch.rules.map((r) => `${ruleId(JSON.stringify(r.rule))}:${r.poles}`).join(',') : null,
      sch?.rules[0]?.rule.days[0] ?? null,
      sch?.disputed ? 1 : 0,
    );
    rows += Number(changes);
  }
  db.prepare('INSERT INTO meta VALUES (?, ?)').run('builtAt', builtAt);
  // 0 = a local build that was never released; `release.ts` stamps the real version.
  db.prepare('INSERT INTO meta VALUES (?, ?)').run('version', '0');
  db.exec('COMMIT');
  db.exec('VACUUM');
  db.close();
  return { rows };
}
