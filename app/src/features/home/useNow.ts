import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

/**
 * The current time, ticking every 30 s. In development `?now=2026-10-02T15:42`
 * freezes it, so every Home state can be previewed with a deep link.
 */
export function useNow(): Date {
  const { now: frozen } = useLocalSearchParams<{ now?: string }>();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (frozen) return;
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, [frozen]);
  return __DEV__ && frozen ? new Date(frozen) : now;
}
