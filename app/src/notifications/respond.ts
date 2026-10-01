import type { GridSide, PlannedNotification } from '@swept/core';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { oppositeOf, sideById } from '../data/db';
import { leave, switchSide } from '../parking/actions';
import { useSwept } from '../state/store';
import type { ActionId } from './categories';
import { schedule } from './schedule';

const SNOOZE_MS = 60 * 60_000;
const SIDES: GridSide[] = ['north', 'south', 'east', 'west'];

/** Act on a tap on a notification or on one of its buttons. */
export async function respond(response: Notifications.NotificationResponse): Promise<void> {
  const { content, identifier } = response.notification.request;
  const data = content.data as PlannedNotification['data'];
  const action = response.actionIdentifier as ActionId | typeof Notifications.DEFAULT_ACTION_IDENTIFIER;
  await Notifications.dismissNotificationAsync(identifier).catch(() => {});

  if (action === 'moved' || action === 'notParked') return leave();

  if (action === 'otherSide') {
    const side = sideById(data.sideId);
    const other = side && oppositeOf(side);
    return other ? switchSide(other.id) : router.push('/pick');
  }

  if ((SIDES as string[]).includes(action)) {
    const id = data.sides?.[action as GridSide];
    return id ? switchSide(id) : router.push('/pick');
  }

  if (action === 'addSchedule') return router.push({ pathname: '/schedule', params: { side: String(data.sideId) } });

  if (action === 'later') {
    return schedule({
      id: 'swept.reminder.snooze',
      at: Date.now() + SNOOZE_MS,
      title: content.title ?? '',
      body: content.body ?? '',
      category: 'lead',
      timeSensitive: false,
      sound: useSwept.getState().reminders.sound,
      data,
    });
  }

  // A plain tap: the "which side?" question opens the map, everything else Home.
  if (useSwept.getState().spot?.unconfirmed) router.push('/pick');
}
