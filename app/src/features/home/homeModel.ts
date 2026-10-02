import {
  alarmRules,
  homeState,
  plannedReminders,
  type ReminderSettings,
  calendarDays,
  cap,
  dateLong,
  dateOf,
  dayKey,
  dayLong,
  dayShort,
  time,
  when,
  type Lang,
} from '@swept/core';
import { scheduleShort, seasonShort } from '../schedule/text';
import type { Strings } from '../../i18n/strings';
import type { ParkedSpot } from '../../state/store';

export type StateKind = 'calm' | 'soon' | 'moveNow' | 'safe' | 'offSeason';

export interface HeroModel {
  kind: StateKind;
  chip: string;
  eyebrow: string;
  big: string;
  sub: string;
  progress?: { share: number; left: string; right: string };
  /** Only without the Bluetooth automation. */
  movedButton?: string;
  disputed?: string;
}

export interface HomeModel {
  since: string;
  hero: HeroModel | null;
  spot: { street: string; side: string; day?: number; dayKey?: string; schedule: string; disputed: boolean };
  reminders: { icon: 'evening' | 'lead'; label: string; value: string; sent: boolean }[] | null;
  showFooter: boolean;
}

export function buildHome(
  spot: ParkedSpot,
  now: Date,
  lang: Lang,
  s: Strings,
  settings: ReminderSettings,
  automationActive: boolean,
): HomeModel {
  const parkedAt = new Date(spot.parkedAt);
  // While the side is unconfirmed, timing covers both sides of the street.
  const state = homeState({ rules: alarmRules(spot) }, now);
  const main = spot.schedule.rules[0]?.rule;
  const minority = spot.schedule.rules[1]?.rule;
  const disputedOcc = !spot.unconfirmed && state.kind !== 'offSeason' && state.kind !== 'noSchedule' && state.alarm.start.getTime() !== state.display.start.getTime() ? state.alarm : undefined;

  let hero: HeroModel | null = null;
  let reminders: HomeModel['reminders'] = null;

  if (state.kind === 'offSeason') {
    hero = {
      kind: 'offSeason',
      chip: s.chip.offSeason,
      eyebrow: s.eyebrow.offSeason,
      big: s.until(dateLong(state.resumes.month, state.resumes.day, lang)),
      sub: s.offSeasonSub,
    };
  } else if (state.kind !== 'noSchedule') {
    const { display, alarm } = state;
    const start = display.start;
    const day = dayLong(start.getDay(), lang);
    if (state.kind === 'moveNow') {
      const left = Math.max(0, Math.ceil((alarm.end.getTime() - now.getTime()) / 60_000));
      hero = {
        kind: 'moveNow',
        chip: s.chip.moveNow,
        eyebrow: s.eyebrow.moveNow,
        big: s.moveYourCar,
        sub: s.ticketUntil(time(alarm.end, lang)),
        progress: { share: state.progress, left: time(alarm.start, lang), right: s.endsLeft(time(alarm.end, lang), left) },
        movedButton: automationActive ? undefined : s.movedMyCar,
      };
    } else if (state.kind === 'safe') {
      hero = {
        kind: 'safe',
        chip: s.chip.safe,
        eyebrow: s.eyebrow.safe,
        big: s.until(dateOf(start, lang)),
        sub: `${cap(s.nextWeekday(day))} · ${time(start, lang)}`,
      };
    } else if (state.kind === 'soon') {
      const mins = Math.round((alarm.start.getTime() - now.getTime()) / 60_000);
      const today = calendarDays(now, start) === 0;
      hero = {
        kind: 'soon',
        chip: s.chip.soon,
        eyebrow: today ? s.eyebrow.soonToday : s.eyebrow.soonTomorrow,
        big: s.inHours(Math.floor(mins / 60), mins % 60),
        sub: `${cap(day)} · ${time(start, lang)} – ${time(display.end, lang)}`,
      };
    } else {
      hero = {
        kind: 'calm',
        chip: s.chip.calm,
        eyebrow: s.eyebrow.calm,
        big: s.inDays(calendarDays(now, start)),
        sub: `${cap(day)} ${dateOf(start, lang)} · ${time(start, lang)}`,
      };
    }
    if (disputedOcc && state.kind !== 'moveNow') {
      hero.disputed = s.disputed(`${dayShort(disputedOcc.start.getDay(), lang)} ${time(disputedOcc.start, lang)}`);
    }
    if (state.kind !== 'moveNow') {
      // A reminder dated before the car was parked here was never sent: leave it out.
      const planned = plannedReminders(alarm, settings, now).filter((r) => r.at > parkedAt);
      const withDate = planned.some((r) => calendarDays(now, r.at) >= 7);
      reminders = planned.map((r) => {
        const label =
          r.kind === 'evening'
            ? s.evening
            : disputedOcc
              ? s.leadOf(s.lead(settings.leadMinutes), time(alarm.start, lang))
              : s.lead(settings.leadMinutes);
        const at = when(r.at, now, lang, withDate);
        return { icon: r.kind, label, value: r.sent ? s.sent(at) : at, sent: r.sent };
      });
    }
  }

  const day = main?.days[0];
  return {
    since: s.parkedSince(`${dayShort(parkedAt.getDay(), lang)} ${time(parkedAt, lang)}`),
    hero,
    spot: {
      street: spot.street,
      side: `${s.side[spot.side]} · ${Math.min(...spot.addresses)}–${Math.max(...spot.addresses)}`,
      day,
      dayKey: day === undefined ? undefined : dayKey(day, lang),
      schedule: main ? `${scheduleShort(main, lang)} · ${seasonShort(main, lang)}` : '',
      disputed: !!minority,
    },
    reminders,
    showFooter: !hero?.disputed,
  };
}
