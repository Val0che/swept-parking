import { inSeason, nextOccurrence, nextWindow, type Occurrence } from '../rules/schedule';
import type { SideRule } from '../geo/side';
import type { MonthDay } from '../rules/types';

/** The schedule of the side the car is parked on, as the app stores it. */
export interface SpotSchedule {
  /** Most-posted first. `rules[0]` is what the signs most likely say. */
  rules: SideRule[];
}

export type HomeState =
  | { kind: 'calm' | 'soon'; display: Occurrence; alarm: Occurrence }
  | { kind: 'moveNow'; display: Occurrence; alarm: Occurrence; progress: number }
  | { kind: 'safe'; display: Occurrence; alarm: Occurrence }
  | { kind: 'offSeason'; resumes: MonthDay }
  | { kind: 'noSchedule' };

const HOUR = 3_600_000;
/** How long after a window ends Home keeps saying "you're good". */
export const SAFE_AFTER_MS = 12 * HOUR;
export const SOON_WITHIN_MS = 24 * HOUR;

/**
 * Which Home card to show at `now`.
 *
 * Timing (state, reminders) follows the *earliest* window any sign gives, so a
 * disputed sign can never cost a ticket; `display` is what most signs say, for
 * the big text.
 */
export function homeState(schedule: SpotSchedule, now: Date): HomeState {
  const all = schedule.rules.map((r) => r.rule);
  const majority = schedule.rules[0] ? [schedule.rules[0].rule] : [];
  if (all.length === 0) return { kind: 'noSchedule' };

  if (!all.some((r) => inSeason(r, now))) {
    const next = nextOccurrence(all, now);
    return next ? { kind: 'offSeason', resumes: next.rule.season.from } : { kind: 'noSchedule' };
  }

  const alarm = nextOccurrence(all, now);
  const display = nextOccurrence(majority, now) ?? alarm;
  if (!alarm || !display) return { kind: 'noSchedule' };

  if (alarm.start <= now) {
    // A ticket is possible from the earliest running sign's start to the latest end.
    const { start, end } = nextWindow(all, now)!;
    const window = { start, end, rule: alarm.rule };
    const progress = (now.getTime() - start.getTime()) / (end.getTime() - start.getTime());
    return { kind: 'moveNow', display: window, alarm: window, progress };
  }

  const recent = nextOccurrence(all, new Date(now.getTime() - SAFE_AFTER_MS));
  if (recent && recent.end <= now) return { kind: 'safe', display, alarm };

  return { kind: alarm.start.getTime() - now.getTime() < SOON_WITHIN_MS ? 'soon' : 'calm', display, alarm };
}
