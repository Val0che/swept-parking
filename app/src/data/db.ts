import { sideFromRow, type Delta, type SideRecord, type SideRow } from '@swept/core';
import { File } from 'expo-file-system';
import * as SQLite from 'expo-sqlite';
import bundled from '../../assets/data/sides.meta.json';

// The city's block sides. A baseline ships in the app (assets/data/sides.db, built
// by pipeline/); `sync.ts` then keeps the copy on the phone up to date from the
// repo's `data` branch. User data lives in the zustand store, never here.

const NAME = 'sides.db';

let db: SQLite.SQLiteDatabase | undefined;
let rules: Record<number, string> = {};

/** Absolute path of the database file, for the native intents. */
export function dbPath(): string {
  return `${String(SQLite.defaultDatabaseDirectory).replace(/^file:\/\//, '').replace(/\/$/, '')}/${NAME}`;
}

function open(): void {
  db = SQLite.openDatabaseSync(NAME, { useNewConnection: true });
  rules = Object.fromEntries(db.getAllSync<{ id: number; json: string }>('SELECT id, json FROM rule').map((r) => [r.id, r.json]));
}

function close(): void {
  db?.closeSync();
  db = undefined;
}

/** Version and date of the data on the phone. 0 = an unreleased local build, -1 = not open yet. */
export function dataInfo(): { version: number; builtAt: Date } {
  const meta = Object.fromEntries(
    (db?.getAllSync<{ key: string; value: string }>('SELECT key, value FROM meta') ?? []).map((r) => [r.key, r.value]),
  );
  return { version: Number(meta.version ?? -1), builtAt: new Date(meta.builtAt ?? 0) };
}

/**
 * Open the database, first copying the bundled baseline into place when the phone
 * has none, or an older one than this build ships (after an app update). A copy
 * that sync has already moved past the bundled version is left alone.
 */
export async function prepareDb(): Promise<void> {
  if (db) return;
  let stale = !new File(`file://${dbPath()}`).exists;
  if (!stale) {
    try {
      open();
      const local = dataInfo();
      stale = bundled.version > local.version || (bundled.version === local.version && new Date(bundled.builtAt) > local.builtAt);
    } catch {
      stale = true; // unreadable or from before the schema had a version
    }
    close();
  }
  await SQLite.importDatabaseFromAssetAsync(NAME, { assetId: require('../../assets/data/sides.db'), forceOverwrite: stale });
  open();
}

/** Apply one release delta in a single transaction. Safe to apply twice. */
export function applyDelta(delta: Delta): void {
  const conn = db;
  if (!conn) throw new Error('prepareDb() has not finished');
  conn.withTransactionSync(() => {
    for (const r of delta.rules) conn.runSync('INSERT OR REPLACE INTO rule (id, json) VALUES (?, ?)', r.id, r.json);
    for (const s of delta.upsert) {
      conn.runSync(
        'INSERT OR REPLACE INTO side (id, seg, street, grid, a1, a2, oneway, minlat, maxlat, minlng, maxlng, line, rules, day, disputed) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        s.id, s.seg, s.street, s.grid, s.a1, s.a2, s.oneway, s.minlat, s.maxlat, s.minlng, s.maxlng, s.line, s.rules, s.day, s.disputed,
      );
    }
    for (const id of delta.remove) conn.runSync('DELETE FROM side WHERE id = ?', id);
    conn.runSync("INSERT OR REPLACE INTO meta (key, value) VALUES ('version', ?)", String(delta.to));
    conn.runSync("INSERT OR REPLACE INTO meta (key, value) VALUES ('builtAt', ?)", delta.builtAt);
  });
  for (const r of delta.rules) rules[r.id] = r.json;
}

/** Swap in a freshly downloaded full database. */
export function replaceWith(downloaded: File): void {
  close();
  const target = new File(`file://${dbPath()}`);
  if (target.exists) target.delete();
  downloaded.move(target);
  open();
}

const COLUMNS = 'id, seg, street, grid, a1, a2, oneway, line, rules';

function read(sql: string, params: (number | string)[]): SideRecord[] {
  if (!db) throw new Error('prepareDb() has not finished');
  return db.getAllSync<SideRow>(sql, params).map((row) => sideFromRow(row, rules));
}

export interface Bounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

/** Block sides touching a lat/lng box. A full scan of 91k rows takes a few ms. */
export function sidesIn(b: Bounds, limit = 600): SideRecord[] {
  return read(
    `SELECT ${COLUMNS} FROM side WHERE maxlat >= ? AND minlat <= ? AND maxlng >= ? AND minlng <= ? LIMIT ?`,
    [b.minLat, b.maxLat, b.minLng, b.maxLng, limit],
  );
}

/** Sides within ~130 m of a point: the candidates for "which side is the car on". */
export const sidesNear = (lat: number, lng: number): SideRecord[] =>
  sidesIn({ minLat: lat - 0.0012, maxLat: lat + 0.0012, minLng: lng - 0.0017, maxLng: lng + 0.0017 });

export const sideById = (id: number): SideRecord | undefined => read(`SELECT ${COLUMNS} FROM side WHERE id = ?`, [id])[0];

/** The other side of the same block, if the city drew one. */
export const oppositeOf = (side: Pick<SideRecord, 'id' | 'seg'>): SideRecord | undefined =>
  read(`SELECT ${COLUMNS} FROM side WHERE seg = ? AND id != ?`, [side.seg, side.id])[0];
