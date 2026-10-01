import { locate, type SideRecord, type SideRule } from '../geo/side';
import type { ReminderSettings } from '../home/reminders';
import type { Lang } from '../i18n/format';
import { parkedNotification, planReminders, type PlannedNotification } from '../notify/plan';
import type { CleaningRule } from '../rules/types';
import { spotFromSide, type ParkedSpot } from './spot';

/** A `side` row as read from sides.db (see pipeline/src/export/writeDb.ts). */
export interface SideRow {
  id: number;
  seg: number;
  street: string;
  grid: string;
  a1: number;
  a2: number;
  oneway: number;
  line: string;
  rules: string | null;
}

/** Decode a database row; `ruleJson` maps rule ids to the `rule` table's JSON. */
export function sideFromRow(row: SideRow, ruleJson: Record<number, string>): SideRecord {
  const rules: SideRule[] = (row.rules ?? '')
    .split(',')
    .filter(Boolean)
    .map((pair) => {
      const [id, poles] = pair.split(':').map(Number);
      return { rule: JSON.parse(ruleJson[id!]!) as CleaningRule, poles: poles! };
    });
  return {
    id: row.id,
    seg: row.seg,
    street: row.street,
    grid: row.grid as SideRecord['grid'],
    addresses: [row.a1, row.a2],
    oneWay: Math.sign(row.oneway) as SideRecord['oneWay'],
    line: JSON.parse(row.line),
    rules,
  };
}

/** Rule ids referenced by a set of rows, to fetch from the `rule` table. */
export function ruleIdsOf(rows: Pick<SideRow, 'rules'>[]): number[] {
  const ids = new Set<number>();
  for (const r of rows) for (const pair of (r.rules ?? '').split(',').filter(Boolean)) ids.add(Number(pair.split(':')[0]));
  return [...ids];
}

export interface ParkedInput {
  lat: number;
  lng: number;
  /** Radius of the GPS fix, metres. */
  accuracy: number;
  /** Epoch ms. */
  now: number;
  lang: Lang;
  settings: ReminderSettings;
  source: ParkedSpot['source'];
  /** Sides near the fix, straight from the database. */
  rows: SideRow[];
  ruleJson: Record<number, string>;
}

export interface ParkedResult {
  /** `null` when the fix isn't on a street (garage, driveway, lot). */
  spot: ParkedSpot | null;
  /** The "parked?" notification followed by the reminders to schedule. */
  notifications: PlannedNotification[];
}

/**
 * Everything that happens when parking is detected, as one pure function, so the
 * native Shortcuts intent (running this bundle in JavaScriptCore while the app is
 * closed) and the app behave identically.
 */
export function onParked(input: ParkedInput): ParkedResult {
  const now = new Date(input.now);
  const sides = input.rows.map((r) => sideFromRow(r, input.ruleJson));
  const hit = locate(sides, [input.lng, input.lat], input.accuracy);
  if (!hit) return { spot: null, notifications: [] };

  const spot = spotFromSide(hit.side, hit.opposite, { lat: input.lat, lng: input.lng, when: now, source: input.source });
  if (hit.ambiguous && hit.opposite) {
    spot.unconfirmed = { otherSideId: hit.opposite.id, otherSide: hit.opposite.grid, alarmRules: hit.opposite.rules };
  }
  return {
    spot,
    notifications: [parkedNotification(spot, now, input.lang), ...planReminders(spot, input.settings, now, input.lang)],
  };
}
