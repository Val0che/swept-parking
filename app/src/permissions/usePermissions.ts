import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

export interface PermissionState {
  location: 'always' | 'whileUsing' | 'denied' | 'undetermined';
  notifications: 'granted' | 'denied' | 'undetermined';
}

async function read(): Promise<PermissionState> {
  const [fg, bg, notif] = await Promise.all([
    Location.getForegroundPermissionsAsync(),
    Location.getBackgroundPermissionsAsync(),
    Notifications.getPermissionsAsync(),
  ]);
  return {
    location: bg.granted ? 'always' : fg.granted ? 'whileUsing' : fg.canAskAgain ? 'undetermined' : 'denied',
    notifications: notif.granted ? 'granted' : notif.canAskAgain ? 'undetermined' : 'denied',
  };
}

/** Notification and location permissions, re-read whenever the app comes back from Settings. */
export function usePermissions() {
  const [state, setState] = useState<PermissionState>();
  const refresh = useCallback(() => read().then(setState), []);

  useEffect(() => {
    void refresh();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && void refresh());
    return () => sub.remove();
  }, [refresh]);

  const askNotifications = useCallback(async () => {
    await Notifications.requestPermissionsAsync();
    await refresh();
  }, [refresh]);

  // iOS only offers "Always" after "While Using" was granted, in a second prompt.
  const askLocation = useCallback(async () => {
    const fg = await Location.requestForegroundPermissionsAsync();
    if (fg.granted) await Location.requestBackgroundPermissionsAsync();
    await refresh();
  }, [refresh]);

  return { state, refresh, askNotifications, askLocation };
}
