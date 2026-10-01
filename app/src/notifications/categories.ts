import type { GridSide, Lang, NotificationCategory } from '@swept/core';
import * as Notifications from 'expo-notifications';

export type ActionId = 'yes' | 'otherSide' | GridSide | 'notParked' | 'addSchedule' | 'noReminder' | 'moved' | 'later';

const LABELS: Record<Lang, Record<ActionId, string>> = {
  fr: {
    yes: "Oui, c'est ça",
    otherSide: 'Autre côté',
    east: 'Côté est',
    west: 'Côté ouest',
    north: 'Côté nord',
    south: 'Côté sud',
    notParked: 'Pas garé',
    addSchedule: "Ajouter l'horaire",
    noReminder: 'Ça va, pas de rappel',
    moved: 'Voiture déplacée',
    later: 'Me le rappeler plus tard',
  },
  en: {
    yes: "Yes, that's it",
    otherSide: 'Other side',
    east: 'East side',
    west: 'West side',
    north: 'North side',
    south: 'South side',
    notParked: 'Not parked',
    addSchedule: 'Add schedule',
    noReminder: 'Fine, no reminder',
    moved: 'Moved it',
    later: 'Remind me later',
  },
};

// Actions that change something open the app so its JS can run; "yes" and
// "no reminder" only dismiss, because the reminders are already scheduled.
const BACKGROUND: ActionId[] = ['yes', 'noReminder'];

const ACTIONS: Record<NotificationCategory, ActionId[]> = {
  parked: ['yes', 'otherSide', 'notParked'],
  parkedAmbiguousEW: ['east', 'west', 'notParked'],
  parkedAmbiguousNS: ['north', 'south', 'notParked'],
  parkedNoData: ['addSchedule', 'noReminder'],
  evening: ['moved', 'later'],
  lead: ['moved'],
  moveNow: ['moved'],
};

/** Register every notification type with its buttons. Call at start-up and when the language changes. */
export async function registerCategories(lang: Lang): Promise<void> {
  await Promise.all(
    (Object.keys(ACTIONS) as NotificationCategory[]).map((category) =>
      Notifications.setNotificationCategoryAsync(
        category,
        ACTIONS[category].map((id) => ({
          identifier: id,
          buttonTitle: LABELS[lang][id],
          options: { opensAppToForeground: !BACKGROUND.includes(id) },
        })),
      ),
    ),
  );
}
