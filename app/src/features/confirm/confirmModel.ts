import {
  calendarDays,
  dateLong,
  dateOf,
  dayShort,
  inSeason,
  nextOccurrence,
  nextWindow,
  plannedReminders,
  sideName,
  time,
  type CleaningRule,
  type Lang,
  type ReminderSettings,
  type SideRecord,
} from '@swept/core';
import type { Strings } from '../../i18n/strings';
import { scheduleLong, scheduleShort, seasonLong, seasonShort } from '../schedule/text';

export interface ConfirmModel {
  title: string;
  sub: string;
  /** `undefined` = the city has no cleaning sign for this side. */
  schedule?: {
    rule: CleaningRule;
    line: string;
    season: string;
    nextPass: string;
    disputed?: { says: string; help: string };
  };
  reminders: { icon: 'evening' | 'lead'; label: string; value: string }[];
}

/** What applies to a block side, before the user saves it as their spot. */
export function buildConfirm(side: SideRecord, now: Date, lang: Lang, s: Strings, settings: ReminderSettings): ConfirmModel {
  const base = {
    title: side.street,
    sub: `${Math.min(...side.addresses)}–${Math.max(...side.addresses)} · ${sideName(side.grid, lang)}`,
  };
  const main = side.rules[0];
  if (!main) return { ...base, reminders: [] };

  const all = side.rules.map((r) => r.rule);
  const minority = side.rules[1];
  const display = nextOccurrence([main.rule], now);
  const window = nextWindow(all, now);
  const [from, to] = seasonLong(main.rule, lang);
  const poles = side.rules.reduce((n, r) => n + r.poles, 0);

  const days = display ? calendarDays(now, display.start) : 0;
  const nextPass =
    display && inSeason(main.rule, now)
      ? s.nextPass(
          `${dayShort(display.start.getDay(), lang)} ${dateOf(display.start, lang)}`,
          days === 0 ? time(display.start, lang) : s.inDays(days).toLowerCase(),
        )
      : s.nextPassOff(dateLong(main.rule.season.from.month, main.rule.season.from.day, lang));

  const early = window && display && window.start < display.start ? window.start : undefined;
  const reminders = window
    ? plannedReminders(window, settings, now)
        .filter((r) => !r.sent)
        .map((r) => ({
          icon: r.kind,
          label: r.kind === 'evening' ? s.evening : early ? s.leadOf(s.lead(settings.leadMinutes), time(early, lang)) : s.lead(settings.leadMinutes),
          value: `${dayShort(r.at.getDay(), lang)} ${dateOf(r.at, lang)} · ${time(r.at, lang)}`,
        }))
    : [];

  return {
    ...base,
    schedule: {
      rule: main.rule,
      line: scheduleLong(main.rule, lang),
      season: minority ? `${s.signsOf(main.poles, poles)} · ${seasonShort(main.rule, lang)}` : s.seasonFromTo(from, to),
      nextPass,
      disputed: minority && {
        says: s.oneSignSays(scheduleShort(minority.rule, lang).toLowerCase()),
        help: s.disputedHelp(time(early ?? window?.start ?? now, lang)),
      },
    },
    reminders,
  };
}
