import { mkdir, writeFile } from 'node:fs/promises';
import { CACHE_DIR, SOURCES, cachePath } from './sources/urls';

// The city's portal answers "RBAC: access denied" to requests without a browser-like UA.
const HEADERS = { 'User-Agent': 'Mozilla/5.0 (mtl-parking data pipeline)' };

await mkdir(CACHE_DIR, { recursive: true });
for (const name of Object.keys(SOURCES) as (keyof typeof SOURCES)[]) {
  const res = await fetch(SOURCES[name], { headers: HEADERS, redirect: 'follow' });
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
  const body = Buffer.from(await res.arrayBuffer());
  await writeFile(cachePath(name), body);
  console.log(`${name}: ${(body.length / 1e6).toFixed(1)} MB`);
}
