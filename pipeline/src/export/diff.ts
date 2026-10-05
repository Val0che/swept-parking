import { DatabaseSync } from 'node:sqlite';
import type { Delta, SideRowFull } from '@swept/core';

const COLUMNS = 'id, seg, street, grid, a1, a2, oneway, minlat, maxlat, minlng, maxlng, line, rules, day, disputed';
// The bounding box, `day` and `disputed` are derived from `line` and `rules`.
const DIFFERS = ['seg', 'street', 'grid', 'a1', 'a2', 'oneway', 'line']
  .map((c) => `o.${c} != n.${c}`)
  .concat("IFNULL(o.rules, '') != IFNULL(n.rules, '')")
  .join(' OR ');

/** What must change in the database at `oldPath` to make it equal to the one at `newPath`. */
export function diff(oldPath: string, newPath: string): Pick<Delta, 'rules' | 'upsert' | 'remove'> {
  const db = new DatabaseSync(newPath, { readOnly: true });
  db.exec(`ATTACH DATABASE '${oldPath.replaceAll("'", "''")}' AS old`);

  const upsert = db
    .prepare(`SELECT ${COLUMNS.split(', ').map((c) => `n.${c}`).join(', ')} FROM main.side n LEFT JOIN old.side o ON o.id = n.id WHERE o.id IS NULL OR ${DIFFERS}`)
    .all() as unknown as SideRowFull[];
  const remove = (db.prepare('SELECT o.id FROM old.side o LEFT JOIN main.side n ON n.id = o.id WHERE n.id IS NULL').all() as { id: number }[]).map((r) => r.id);

  const ids = new Set<number>();
  for (const row of upsert) for (const pair of (row.rules ?? '').split(',').filter(Boolean)) ids.add(Number(pair.split(':')[0]));
  const rules = ids.size
    ? (db.prepare(`SELECT id, json FROM main.rule WHERE id IN (${[...ids].join(',')})`).all() as { id: number; json: string }[])
    : [];

  db.close();
  return { rules, upsert, remove };
}
