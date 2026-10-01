import { readFile } from 'node:fs/promises';
import { SideIndex } from './geo/sideIndex';
import { gridSideOf, nextOccurrence } from '@swept/core';
import type { SideSchedule } from './match/aggregateSides';
import { loadSides } from './sources/sides';

/**
 * Dev tool: what are the cleaning rules around a point?
 *   pnpm lookup 45.5335,-73.5810
 *   pnpm lookup "4300 rue Fabre"   (geocoded with Nominatim)
 */
const arg = process.argv.slice(2).join(' ');
if (!arg) throw new Error('usage: pnpm lookup <lat,lng | address>');

const [lat, lng] = /^-?[\d.]+\s*,\s*-?[\d.]+$/.test(arg) ? arg.split(',').map(Number) : await geocode(arg);
const sides = await loadSides();
const schedules = new Map(
  (JSON.parse(await readFile(new URL('../out/sides.json', import.meta.url), 'utf8')) as SideSchedule[]).map((s) => [s.sideId, s]),
);
const bySegment = new Map<number, typeof sides>();
for (const s of sides) bySegment.set(s.segmentId, [...(bySegment.get(s.segmentId) ?? []), s]);

const fmtTime = (m: number) => `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}`;
const DAYS = ['dim', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam'];

console.log(`📍 ${lat}, ${lng}\n`);
for (const hit of new SideIndex(sides).near(lng!, lat!, 40).slice(0, 6)) {
  const { side } = hit;
  const opposite = bySegment.get(side.segmentId)?.find((s) => s.id !== side.id);
  const label = opposite ? `${gridSideOf(side.line, opposite.line)} side` : side.side;
  const addr = `${Math.min(...side.addresses)}–${Math.max(...side.addresses)}`;
  console.log(`${side.street} (${addr}), ${label}${side.oneWay ? ', one-way' : ''} — ${hit.distance.toFixed(0)} m`);

  const sch = schedules.get(side.id);
  if (!sch) {
    console.log('   no cleaning sign found\n');
    continue;
  }
  sch.rules.forEach(({ rule: r, poles }, i) => {
    const windows = r.windows.map((w) => `${fmtTime(w.start)}–${fmtTime(w.end)}`).join(', ');
    const prefix = i === 0 ? '  ' : '  ⚠️ other sign:';
    console.log(`  ${prefix} ${r.days.map((d) => DAYS[d]).join('/')} ${windows}  (${r.season.from.day}/${r.season.from.month} → ${r.season.to.day}/${r.season.to.month}, ${poles} pole${poles > 1 ? 's' : ''})`);
  });
  // Earliest window across all rules, so a disputed sign can't cost a ticket.
  const next = nextOccurrence(sch.rules.map((r) => r.rule), new Date());
  if (next) console.log(`   ⏰ remind before: ${next.start.toLocaleString('fr-CA', { dateStyle: 'full', timeStyle: 'short' })}`);
  console.log();
}

async function geocode(q: string): Promise<[number, number]> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(`${q}, Montréal`)}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'mtl-parking-dev/0.1' } });
  const [hit] = (await res.json()) as { lat: string; lon: string }[];
  if (!hit) throw new Error(`address not found: ${q}`);
  return [Number(hit.lat), Number(hit.lon)];
}
