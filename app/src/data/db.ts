import { sideFromRow, type SideRecord, type SideRow } from '@swept/core';
import Storage from 'expo-sqlite/kv-store';
import * as SQLite from 'expo-sqlite';
import meta from '../../assets/data/sides.meta.json';

// The city's block sides, built by pipeline/ and bundled as assets/data/sides.db.
// Read-only: user data lives in the zustand store, never here.

const NAME = 'sides.db';
const VERSION_KEY = 'swept.sidesDb.builtAt';

let db: SQLite.SQLiteDatabase | undefined;
let rules: Record<number, string> | undefined;

/** Copy the bundled database into place (again whenever a new one ships). Call once at start-up. */
export async function prepareDb(): Promise<void> {
  if (db) return;
  const stale = Storage.getItemSync(VERSION_KEY) !== meta.builtAt;
  await SQLite.importDatabaseFromAssetAsync(NAME, {
    assetId: require('../../assets/data/sides.db'),
    forceOverwrite: stale,
  });
  db = SQLite.openDatabaseSync(NAME, { useNewConnection: true });
  rules = Object.fromEntries(db.getAllSync<{ id: number; json: string }>('SELECT id, json FROM rule').map((r) => [r.id, r.json]));
  Storage.setItemSync(VERSION_KEY, meta.builtAt);
}

/** Absolute path of the database file, for the native intents. */
export function dbPath(): string {
  return `${String(SQLite.defaultDatabaseDirectory).replace(/^file:\/\//, '').replace(/\/$/, '')}/${NAME}`;
}

export const dataBuiltAt = new Date(meta.builtAt);

const COLUMNS = 'id, seg, street, grid, a1, a2, oneway, line, rules';

function read(sql: string, params: (number | string)[]): SideRecord[] {
  if (!db || !rules) throw new Error('prepareDb() has not finished');
  return db.getAllSync<SideRow>(sql, params).map((row) => sideFromRow(row, rules!));
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
