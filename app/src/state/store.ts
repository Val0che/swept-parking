import { DEFAULT_REMINDERS, type Lang, type ParkedSpot, type ReminderSettings, type SideRule } from '@swept/core';
import Storage from 'expo-sqlite/kv-store';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type { ParkedSpot };

/** A place the user parks often: one tap re-parks there without the map. */
export interface SavedSpot {
  id: string;
  name: string;
  spot: ParkedSpot;
}

interface SweptState {
  onboarded: boolean;
  spot: ParkedSpot | null;
  /** The spot before the car last left, offered again on the empty Home. */
  lastSpot: ParkedSpot | null;
  reminders: ReminderSettings;
  /** How parking is detected: by the car's Bluetooth automation, or by hand. `null` = not chosen yet. */
  carMode: 'bluetooth' | 'manual' | null;
  /** Last time a Shortcuts automation fired (epoch ms): proof it is set up. */
  lastAutoAt: number | null;
  automationBannerDismissed: boolean;
  /** `null` follows the device language. */
  lang: Lang | null;
  saved: SavedSpot[];
  /** Schedules the user typed in, by block side id. They replace the city's data for that side. */
  manualSchedules: Record<number, SideRule[]>;

  finishOnboarding: () => void;
  park: (spot: ParkedSpot) => void;
  clearSpot: () => void;
  setReminders: (r: ReminderSettings) => void;
  setCarMode: (mode: 'bluetooth' | 'manual') => void;
  setLastAutoAt: (ms: number) => void;
  dismissAutomationBanner: () => void;
  setLang: (lang: Lang) => void;
  saveSpot: (name: string, spot: ParkedSpot) => void;
  renameSaved: (id: string, name: string) => void;
  deleteSaved: (id: string) => void;
  setManualSchedule: (sideId: number, rules: SideRule[]) => void;
}

// Synchronous SQLite-backed storage: the store is hydrated before the first render.
const storage = createJSONStorage(() => ({
  getItem: (k: string) => Storage.getItemSync(k),
  setItem: (k: string, v: string) => Storage.setItemSync(k, v),
  removeItem: (k: string) => Storage.removeItemSync(k),
}));

export const useSwept = create<SweptState>()(
  persist(
    (set) => ({
      onboarded: false,
      spot: null,
      lastSpot: null,
      reminders: DEFAULT_REMINDERS,
      carMode: null,
      lastAutoAt: null,
      automationBannerDismissed: false,
      lang: null,
      saved: [],
      manualSchedules: {},

      finishOnboarding: () => set({ onboarded: true }),
      park: (spot) => set({ spot }),
      clearSpot: () => set((st) => ({ spot: null, lastSpot: st.spot ?? st.lastSpot })),
      setReminders: (reminders) => set({ reminders }),
      setCarMode: (carMode) => set({ carMode }),
      setLastAutoAt: (lastAutoAt) => set({ lastAutoAt }),
      dismissAutomationBanner: () => set({ automationBannerDismissed: true }),
      setLang: (lang) => set({ lang }),
      saveSpot: (name, spot) =>
        set((st) => ({ saved: [...st.saved, { id: `${spot.sideId}-${Date.now()}`, name, spot }] })),
      renameSaved: (id, name) => set((st) => ({ saved: st.saved.map((x) => (x.id === id ? { ...x, name } : x)) })),
      deleteSaved: (id) => set((st) => ({ saved: st.saved.filter((x) => x.id !== id) })),
      setManualSchedule: (sideId, rules) => set((st) => ({ manualSchedules: { ...st.manualSchedules, [sideId]: rules } })),
    }),
    { name: 'swept', storage, version: 3, migrate: () => ({}) as SweptState },
  ),
);
