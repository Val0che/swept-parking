export interface ReminderSettings {
  eveningEnabled: boolean;
  /** Minutes after midnight, the day before the window. Default 20:00. */
  eveningAt: number;
  leadEnabled: boolean;
  leadMinutes: number;
  sound: boolean;
}

export const DEFAULT_REMINDERS: ReminderSettings = {
  eveningEnabled: true,
  eveningAt: 20 * 60,
  leadEnabled: true,
  leadMinutes: 60,
  sound: true,
};

export interface PlannedReminder {
  kind: 'evening' | 'lead';
  at: Date;
  /** Already fired at `now`. */
  sent: boolean;
}

/** The reminders for one window, earliest first. */
export function plannedReminders(window: { start: Date }, settings: ReminderSettings, now: Date): PlannedReminder[] {
  const out: PlannedReminder[] = [];
  if (settings.eveningEnabled) {
    const s = window.start;
    const at = new Date(s.getFullYear(), s.getMonth(), s.getDate() - 1, 0, settings.eveningAt);
    out.push({ kind: 'evening', at, sent: at <= now });
  }
  if (settings.leadEnabled) {
    const at = new Date(window.start.getTime() - settings.leadMinutes * 60_000);
    out.push({ kind: 'lead', at, sent: at <= now });
  }
  return out.sort((a, b) => a.at.getTime() - b.at.getTime());
}
