/** 0 = Sunday … 6 = Saturday, matching `Date.prototype.getDay()`. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** Minutes since midnight. `end < start` means the window runs past midnight. */
export interface TimeWindow {
  start: number;
  end: number;
}

export interface MonthDay {
  month: number; // 1-12
  day: number; // 1-31
}

/** Inclusive on both ends, e.g. 1 April → 1 December. */
export interface Season {
  from: MonthDay;
  to: MonthDay;
}

/** A recurring, seasonal "move your car" restriction, typically street cleaning. */
export interface CleaningRule {
  /** Days on which a window *starts*. */
  days: Weekday[];
  windows: TimeWindow[];
  season: Season;
  /** `\P` = no parking, `\A` = no stopping. Both mean the car must be gone. */
  kind: 'no-parking' | 'no-stopping';
}

export type SkipReason =
  | 'cancelled'
  | 'permission'
  | 'inverted'
  | 'no-time'
  | 'no-day'
  | 'no-season'
  | 'not-cleaning-season';

export type ParseResult = { ok: true; rule: CleaningRule } | { ok: false; reason: SkipReason };
