import type { GridSide, SideRecord, SideRule } from '../geo/side';
import type { Weekday } from '../rules/types';

/** Where the car is, as the app and the native intents store it (JSON-serialisable). */
export interface ParkedSpot {
  sideId: number;
  seg: number;
  street: string;
  side: GridSide;
  addresses: [number, number];
  lat: number;
  lng: number;
  /** ISO string. */
  parkedAt: string;
  source: 'auto' | 'manual';
  schedule: { rules: SideRule[] };
  /** The schedule was typed in by the user, not read from city data. */
  manualSchedule?: boolean;
  /** Cleaning day of the other side of the block, for the street drawing. */
  oppositeDay?: Weekday;
  /**
   * GPS couldn't tell the two sides apart and the user hasn't picked yet. Until
   * they do, reminders cover both sides' schedules (`alarmRules`).
   */
  unconfirmed?: { otherSideId: number; otherSide: GridSide; alarmRules: SideRule[] };
}

export function spotFromSide(
  side: SideRecord,
  opposite: SideRecord | undefined,
  at: { lat: number; lng: number; when: Date; source: ParkedSpot['source'] },
): ParkedSpot {
  return {
    sideId: side.id,
    seg: side.seg,
    street: side.street,
    side: side.grid,
    addresses: side.addresses,
    lat: at.lat,
    lng: at.lng,
    parkedAt: at.when.toISOString(),
    source: at.source,
    schedule: { rules: side.rules },
    oppositeDay: opposite?.rules[0]?.rule.days[0],
  };
}

/** The rules reminders must respect: the spot's own, plus the other side's while unconfirmed. */
export const alarmRules = (spot: ParkedSpot): SideRule[] =>
  spot.unconfirmed ? [...spot.schedule.rules, ...spot.unconfirmed.alarmRules] : spot.schedule.rules;
