import { mkdir, stat, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { SideIndex } from './geo/sideIndex';
import { aggregateSides } from './match/aggregateSides';
import { writeDb } from './export/writeDb';
import { matchPoles } from './match/matchPoles';
import { loadSides } from './sources/sides';
import { loadSigns } from './sources/signs';

const OUT_DIR = new URL('../out/', import.meta.url);

const [sides, panels] = await Promise.all([loadSides(), loadSigns()]);
const index = new SideIndex(sides);
const { matches, stats } = matchPoles(panels, index);
const schedules = aggregateSides(matches);

const sideById = new Map(sides.map((s) => [s.id, s]));
const output = schedules.map((sch) => {
  const side = sideById.get(sch.sideId)!;
  return { ...sch, street: side.street, side: side.side, segmentId: side.segmentId, oneWay: side.oneWay, line: side.line };
});

await mkdir(OUT_DIR, { recursive: true });
await writeFile(new URL('sides.json', OUT_DIR), JSON.stringify(output));

// The database the app bundles: every block side, with or without a schedule.
const dbUrl = new URL('sides.db', OUT_DIR);
const { rows } = writeDb(fileURLToPath(dbUrl), sides, schedules, new Date().toISOString());
const dbSize = (await stat(dbUrl)).size;

// --- report -------------------------------------------------------------
const pct = (n: number, d: number) => `${((n / d) * 100).toFixed(1)}%`;
const distances = matches.map((m) => m.distance).sort((a, b) => a - b);
const q = (p: number) => distances[Math.floor(distances.length * p)]!.toFixed(1);

console.log(`poles with cleaning signs: ${stats.poles}`);
console.log(`  matched to a side: ${stats.matched} (${pct(stats.matched, stats.poles)}), >20 m away: ${stats.tooFar}`);
console.log(`  pole→curb distance p50/p90/p99: ${q(0.5)} / ${q(0.9)} / ${q(0.99)} m`);
console.log(`  near a corner: ${stats.nearCorner} (${pct(stats.nearCorner, stats.matched)})`);

const disputed = schedules.filter((s) => s.disputed).length;
console.log(`block sides with a schedule: ${schedules.length} of ${sides.length} (${pct(schedules.length, sides.length)})`);
console.log(`  signs disagree: ${disputed} (${pct(disputed, schedules.length)})`);

// Sanity check: the two sides of a block are normally cleaned on different days/times.
const bySegment = new Map<number, typeof output>();
for (const o of output) bySegment.set(o.segmentId, [...(bySegment.get(o.segmentId) ?? []), o]);
const pairs = [...bySegment.values()].filter((p) => p.length === 2);
const mainRule = (s: (typeof output)[number]) => JSON.stringify(s.rules[0]?.rule);
const same = pairs.filter(([a, b]) => mainRule(a!) === mainRule(b!)).length;
console.log(`blocks with both sides scheduled: ${pairs.length}, identical on both sides: ${same} (${pct(same, pairs.length)})`);
console.log(`sides.db: ${rows} block sides, ${(dbSize / 1e6).toFixed(1)} MB`);
