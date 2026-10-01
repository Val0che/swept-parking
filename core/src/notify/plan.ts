import type { GridSide } from '../geo/side';
import type { ReminderSettings } from '../home/reminders';
import { cap, dateLong, dayShort, time, type Lang } from '../i18n/format';
import { ofStreet, onStreet, shortStreet, sideName } from '../i18n/street';
import { alarmRules, type ParkedSpot } from '../park/spot';
import { inSeason, nextOccurrence, upcomingWindows } from '../rules/schedule';

/** Categories are registered with their action buttons in the app (`notifications/categories.ts`). */
export type NotificationCategory =
  | 'parked'
  // "Which side?" — two variants so the buttons can name the sides (east/west or north/south).
  | 'parkedAmbiguousEW'
  | 'parkedAmbiguousNS'
  | 'parkedNoData'
  | 'evening'
  | 'lead'
  | 'moveNow';

export interface PlannedNotification {
  /** Stable, so re-planning replaces instead of duplicating. */
  id: string;
  /** Epoch ms; `null` = deliver now. */
  at: number | null;
  title: string;
  body: string;
  category: NotificationCategory;
  timeSensitive: boolean;
  sound: boolean;
  /** Passed back to the app when the user taps the notification or an action. */
  data: { sideId: number; sides?: Partial<Record<GridSide, number>> };
}

/** Every reminder id starts with this, so "cancel all reminders" is a prefix match. */
export const REMINDER_PREFIX = 'swept.reminder.';
export const PARKED_ID = 'swept.parked';
/** How many cleaning windows ahead to schedule (iOS keeps at most 64 pending notifications). */
export const WINDOWS_AHEAD = 8;

const T = {
  fr: {
    parkedTitle: (where: string, side: string) => `Garée ${where}, ${side} ?`,
    parkedBody: (when: string) => `Nettoyage ${when}. Confirmez ou changez de côté.`,
    parkedOffSeason: (d: string) => `Pas de nettoyage avant le ${d}.`,
    ambiguousTitle: (of: string) => `De quel côté ${of} ?`,
    ambiguousBody: 'Le GPS hésite entre les deux côtés. Choisissez le vôtre.',
    noDataTitle: (where: string, side: string) => `Garée ${where}, ${side}`,
    noDataBody: "Aucun panneau de nettoyage trouvé ici. L'ajouter ?",
    eveningTitle: (t: string, street: string, side: string) => `Demain ${t} · ${street}, ${side}`,
    eveningBody: (t: string) => `Déplacez votre voiture avant ${t} demain.`,
    leadTitle: (lead: string) => `Nettoyage dans ${lead}`,
    leadBody: (street: string, side: string, t: string) => `${street}, ${side}. Déplacez votre voiture avant ${t}.`,
    nowTitle: 'Le nettoyage a commencé',
    nowBody: (street: string, side: string) => `${street}, ${side}. Déplacez-la maintenant pour éviter une contravention.`,
    disputed: (early: string, most: string) => `Un panneau ici indique ${early} (les autres, ${most}) — rappel réglé sur ${early}.`,
    lead: (min: number) => (min % 60 === 0 ? `${min / 60} h` : `${min} min`),
  },
  en: {
    parkedTitle: (where: string, side: string) => `Parked ${where}, ${side}?`,
    parkedBody: (when: string) => `Cleaning ${when}. Confirm or switch sides.`,
    parkedOffSeason: (d: string) => `No cleaning before ${d}.`,
    ambiguousTitle: (of: string) => `Which side ${of}?`,
    ambiguousBody: "GPS can't tell the two sides apart. Pick yours.",
    noDataTitle: (where: string, side: string) => `Parked ${where}, ${side}`,
    noDataBody: 'No cleaning sign found here. Add it?',
    eveningTitle: (t: string, street: string, side: string) => `Tomorrow ${t} · ${street}, ${side}`,
    eveningBody: (t: string) => `Move your car before ${t} tomorrow.`,
    leadTitle: (lead: string) => `Cleaning in ${lead}`,
    leadBody: (street: string, side: string, t: string) => `${street}, ${side}. Move your car before ${t}.`,
    nowTitle: 'Cleaning has started',
    nowBody: (street: string, side: string) => `${street}, ${side}. Move it now to avoid a ticket.`,
    disputed: (early: string, most: string) => `One sign here says ${early} (the others, ${most}) — reminding you for ${early}.`,
    lead: (min: number) => (min % 60 === 0 ? `${min / 60} h` : `${min} min`),
  },
} satisfies Record<Lang, unknown>;

/**
 * Reminders for the next cleaning windows of a parked spot: the evening before,
 * a lead time before, and a time-sensitive "move now" at the start. Times that
 * have already passed are left out.
 */
export function planReminders(spot: ParkedSpot, settings: ReminderSettings, now: Date, lang: Lang): PlannedNotification[] {
  const t = T[lang];
  const rules = alarmRules(spot).map((r) => r.rule);
  const main = spot.schedule.rules[0]?.rule;
  const street = shortStreet(spot.street);
  const side = sideName(spot.side, lang);
  const data = { sideId: spot.sideId };
  const out: PlannedNotification[] = [];

  upcomingWindows(rules, now, WINDOWS_AHEAD).forEach((w, i) => {
    const start = time(w.start, lang);
    // What most signs say for this same window, when a lone sign starts earlier.
    const usual = main && !spot.unconfirmed ? nextOccurrence([main], new Date(w.start.getTime() - 1)) : undefined;
    const note = usual && usual.start > w.start && usual.start < w.end ? `\n${t.disputed(start, time(usual.start, lang))}` : '';
    const add = (kind: string, at: Date, n: Omit<PlannedNotification, 'id' | 'at' | 'data' | 'sound'>) => {
      if (at > now) out.push({ id: `${REMINDER_PREFIX}${kind}.${i}`, at: at.getTime(), data, sound: settings.sound, ...n });
    };

    if (settings.eveningEnabled) {
      const at = new Date(w.start.getFullYear(), w.start.getMonth(), w.start.getDate() - 1, 0, settings.eveningAt);
      add('evening', at, {
        title: t.eveningTitle(start, street, side),
        body: t.eveningBody(start) + note,
        category: 'evening',
        timeSensitive: false,
      });
    }
    if (settings.leadEnabled) {
      add('lead', new Date(w.start.getTime() - settings.leadMinutes * 60_000), {
        title: t.leadTitle(t.lead(settings.leadMinutes)),
        body: t.leadBody(cap(spot.street), side, start) + note,
        category: 'lead',
        timeSensitive: false,
      });
    }
    add('now', w.start, { title: t.nowTitle, body: t.nowBody(street, side), category: 'moveNow', timeSensitive: true });
  });

  return out.sort((a, b) => a.at! - b.at!);
}

/** The notification sent right after parking is detected. */
export function parkedNotification(spot: ParkedSpot, now: Date, lang: Lang): PlannedNotification {
  const t = T[lang];
  const base = { id: PARKED_ID, at: null, timeSensitive: false, sound: true };
  const side = sideName(spot.side, lang);

  if (spot.unconfirmed) {
    return {
      ...base,
      title: t.ambiguousTitle(ofStreet(spot.street, lang)),
      body: t.ambiguousBody,
      category: spot.side === 'east' || spot.side === 'west' ? 'parkedAmbiguousEW' : 'parkedAmbiguousNS',
      data: { sideId: spot.sideId, sides: { [spot.side]: spot.sideId, [spot.unconfirmed.otherSide]: spot.unconfirmed.otherSideId } },
    };
  }

  const data = { sideId: spot.sideId };
  const main = spot.schedule.rules[0]?.rule;
  if (!main) {
    return { ...base, title: t.noDataTitle(onStreet(spot.street, lang), side), body: t.noDataBody, category: 'parkedNoData', data };
  }

  const next = nextOccurrence([main], now);
  const body =
    next && inSeason(main, now)
      ? t.parkedBody(`${dayShort(next.start.getDay(), lang)} ${time(next.start, lang)}`)
      : t.parkedOffSeason(dateLong(main.season.from.month, main.season.from.day, lang));
  return { ...base, title: t.parkedTitle(onStreet(spot.street, lang), side), body, category: 'parked', data };
}
