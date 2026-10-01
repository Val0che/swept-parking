import { copyFileSync, writeFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';

/** Copy the built database into the app's assets. Run after `pnpm build`. */
const from = fileURLToPath(new URL('../out/sides.db', import.meta.url));
const dir = new URL('../../app/assets/data/', import.meta.url);

const db = new DatabaseSync(from, { readOnly: true });
const builtAt = (db.prepare("SELECT value FROM meta WHERE key = 'builtAt'").get() as { value: string }).value;
const { n: sides } = db.prepare('SELECT count(*) AS n FROM side').get() as { n: number };
db.close();

copyFileSync(from, fileURLToPath(new URL('sides.db', dir)));
// The app re-imports the database whenever `builtAt` changes.
writeFileSync(new URL('sides.meta.json', dir), `${JSON.stringify({ builtAt, sides }, null, 2)}\n`);
console.log(`published sides.db (${sides} sides, built ${builtAt}) to app/assets/data/`);
