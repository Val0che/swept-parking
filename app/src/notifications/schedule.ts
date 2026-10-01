import type { PlannedNotification } from '@swept/core';
import * as Notifications from 'expo-notifications';

const PREFIX = 'swept.';

/** Cancel the Swept notifications that haven't fired yet. */
async function cancelPending(): Promise<void> {
  const pending = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    pending.filter((n) => n.identifier.startsWith(PREFIX)).map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
}

/** The car left: cancel what is pending and clear what is already on the lock screen. */
export async function cancelAll(): Promise<void> {
  await cancelPending();
  const shown = await Notifications.getPresentedNotificationsAsync();
  await Promise.all(
    shown.filter((n) => n.request.identifier.startsWith(PREFIX)).map((n) => Notifications.dismissNotificationAsync(n.request.identifier)),
  );
}

export async function schedule(n: PlannedNotification): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    identifier: n.id,
    content: {
      title: n.title,
      body: n.body,
      data: n.data,
      sound: n.sound,
      categoryIdentifier: n.category,
      interruptionLevel: n.timeSensitive ? 'timeSensitive' : 'active',
    },
    trigger: n.at === null ? null : { type: Notifications.SchedulableTriggerInputTypes.DATE, date: n.at },
  });
}

/**
 * Replace the pending Swept notifications with this plan (same ids as the native
 * intents use). Reminders already on the lock screen stay there.
 */
export async function applyPlan(plan: PlannedNotification[]): Promise<void> {
  await cancelPending();
  for (const n of plan) await schedule(n);
}
