import {
  planReminders,
  spotFromSide,
  type ParkedSpot,
  type PlannedNotification,
  type SideRecord,
} from '@swept/core';
import { oppositeOf, sideById } from '../data/db';
import { currentLang } from '../i18n/useLang';
import { ParkingNative } from '../native/parkingNative';
import { applyPlan, cancelAll } from '../notifications/schedule';
import { useSwept } from '../state/store';

// Every way the parked spot changes goes through here, so the store, the
// scheduled reminders and the native intents' config never drift apart.

const state = () => useSwept.getState();

/** A side with the user's typed-in schedule applied, if they entered one. */
export function withManualSchedule(side: SideRecord): SideRecord & { manual: boolean } {
  const manual = state().manualSchedules[side.id];
  return manual ? { ...side, rules: manual, manual: true } : { ...side, manual: false };
}

/** Build the spot for a side the user picked or confirmed. */
export function spotFor(side: SideRecord, at: { lat: number; lng: number; source: ParkedSpot['source']; when?: Date }): ParkedSpot {
  const mine = withManualSchedule(side);
  const spot = spotFromSide(mine, oppositeOf(side), { ...at, when: at.when ?? new Date() });
  if (mine.manual) spot.manualSchedule = true;
  return spot;
}

/** (Re)schedule the reminders for the current spot. Safe to call often. */
export async function replan(extra: PlannedNotification[] = []): Promise<void> {
  const { spot, reminders } = state();
  if (!spot) return cancelAll();
  await applyPlan([...extra, ...planReminders(spot, reminders, new Date(), currentLang())]);
}

export async function park(spot: ParkedSpot): Promise<void> {
  state().park(spot);
  await replan();
}

export async function leave(): Promise<void> {
  state().clearSpot();
  await cancelAll();
}

/** Switch the parked spot to another block side, keeping where and when the car was parked. */
export async function switchSide(sideId: number): Promise<void> {
  const side = sideById(sideId);
  const { spot } = state();
  if (!side) return;
  await park(
    spotFor(side, {
      lat: spot?.lat ?? side.line[0]![1],
      lng: spot?.lng ?? side.line[0]![0],
      source: spot?.source ?? 'manual',
      when: spot ? new Date(spot.parkedAt) : undefined,
    }),
  );
}

/** Tell the Shortcuts intents what they need to work with the app closed. */
export function pushConfig(): void {
  ParkingNative.setConfig(JSON.stringify({ lang: currentLang(), settings: state().reminders }));
}

/**
 * Apply what the Shortcuts intents did while the app was closed. The intent has
 * already scheduled the reminders; re-plan only when the user's own schedule for
 * that side differs from the city's.
 */
export async function syncNative(): Promise<void> {
  const native = ParkingNative.takeNativeState();
  if (native.lastAutoAt) state().setLastAutoAt(native.lastAutoAt);

  if (native.spot) {
    const spot = JSON.parse(native.spot) as ParkedSpot;
    const manual = state().manualSchedules[spot.sideId];
    if (manual) {
      state().park({ ...spot, schedule: { rules: manual }, manualSchedule: true });
      await replan();
    } else {
      state().park(spot);
    }
  } else if (native.leftAt) {
    const { spot } = state();
    if (spot && new Date(spot.parkedAt).getTime() < native.leftAt) state().clearSpot();
  }
}

/**
 * After the street data was updated: if the city changed the schedule of the side
 * the car is on, adopt it and re-plan the reminders. A schedule the user typed in
 * themselves always wins.
 */
export async function refreshSpotFromData(): Promise<void> {
  const { spot } = state();
  if (!spot || spot.manualSchedule) return;
  const side = sideById(spot.sideId);
  if (!side || JSON.stringify(side.rules) === JSON.stringify(spot.schedule.rules)) return;
  state().park({ ...spot, schedule: { rules: side.rules }, oppositeDay: oppositeOf(side)?.rules[0]?.rule.days[0] });
  await replan();
}
