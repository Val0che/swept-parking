import { requireNativeModule } from 'expo';

/** One run of a park / leave flow, logged by native/ParkingModule.swift. */
export interface ParkEvent {
  at: number;
  source: 'shortcut' | 'app';
  kind: 'park' | 'leave';
  lat?: number;
  lng?: number;
  accuracy?: number;
  seconds?: number;
  street?: string;
  side?: string;
  note?: string;
  error?: string;
}

interface ParkingModule {
  /** JSON `{ dbPath, lang, settings }` the Shortcuts intents read while the app is closed. */
  setConfig(json: string): void;
  /** What the intents did since the last call; reading clears `spot` and `leftAt`. */
  takeNativeState(): { spot?: string; leftAt?: number; lastAutoAt?: number };
  events(): ParkEvent[];
  clearEvents(): void;
  simulatePark(): Promise<void>;
  simulateLeave(): Promise<void>;
}

export const ParkingNative = requireNativeModule<ParkingModule>('ParkingModule');
