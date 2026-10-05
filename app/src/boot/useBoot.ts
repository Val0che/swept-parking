import * as Notifications from 'expo-notifications';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { prepareDb } from '../data/db';
import { currentLang } from '../i18n/useLang';
import { registerCategories } from '../notifications/categories';
import { respond } from '../notifications/respond';
import { syncData } from '../data/sync';
import { pushConfig, refreshSpotFromData, replan, syncNative } from '../parking/actions';

/** Bring the app in line with whatever the Shortcuts intents did, then top up the reminders. */
async function refresh(): Promise<void> {
  await syncNative();
  // Scheduling only covers a few weeks ahead; every visit extends it.
  await replan();
  // Fresh street data, at most once a day and never blocking the screens.
  void syncData().then((result) => {
    if (result === 'updated') void refreshSpotFromData();
  });
}

/**
 * Start-up: unpack the street database, register the notification buttons, share
 * the config with the native intents, and keep in sync on every return to the app.
 * Returns `true` once screens can read the database.
 */
export function useBoot(): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let responses: Notifications.EventSubscription | undefined;
    void (async () => {
      await prepareDb();
      pushConfig();
      await registerCategories(currentLang());
      await refresh();
      setReady(true);

      // The tap that launched the app, then every later one.
      const first = Notifications.getLastNotificationResponse();
      if (first) {
        Notifications.clearLastNotificationResponse();
        void respond(first);
      }
      responses = Notifications.addNotificationResponseReceivedListener((r) => void respond(r));
    })();

    const app = AppState.addEventListener('change', (state) => state === 'active' && void refresh());
    return () => {
      responses?.remove();
      app.remove();
    };
  }, []);

  return ready;
}
