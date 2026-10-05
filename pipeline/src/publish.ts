import { copyFileSync, existsSync, writeFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';

/**
 * Put a database into the app's assets as its bundled baseline.
 *
 *   pnpm publish:app           the latest release from the repo's `data` branch
 *   pnpm publish:app --local   the local build (version 0: the app replaces it on first sync)
 *
 * Bundle a release whenever possible: the app can then catch up with small deltas
 * instead of downloading the whole database again.
 */
const RELEASE = 'https://raw.githubusercontent.com/Val0che/swept-parking/data/sides.db';
const local = fileURLToPath(new URL('../out/sides.db', import.meta.url));
const dir = new URL('../../app/assets/data/', import.meta.url);
const target = fileURLToPath(new URL('sides.db', dir));

if (process.argv.includes('--local')) {
  if (!existsSync(local)) throw new Error('run `pnpm build` first');
  copyFileSync(local, target);
} else {
  const res = await fetch(RELEASE);
  if (!res.ok) throw new Error(`no release on the data branch yet (HTTP ${res.status}); use --local`);
  writeFileSync(target, Buffer.from(await res.arrayBuffer()));
}

const db = new DatabaseSync(target, { readOnly: true });
const meta = Object.fromEntries((db.prepare('SELECT key, value FROM meta').all() as { key: string; value: string }[]).map((r) => [r.key, r.value]));
const { n: sides } = db.prepare('SELECT count(*) AS n FROM side').get() as { n: number };
db.close();

// The app re-imports its bundled database when this version is newer than the one on the phone.
writeFileSync(new URL('sides.meta.json', dir), `${JSON.stringify({ version: Number(meta.version), builtAt: meta.builtAt, sides }, null, 2)}\n`);
console.log(`published sides.db version ${meta.version} (${sides} sides, built ${meta.builtAt}) to app/assets/data/`);
