import type { Weekday } from '@swept/core';

// Tokens from design/README.md (Nocturne design system). Keep in sync with the handoff.

export interface Palette {
  bg: string;
  card: string;
  fg: string;
  mut: string;
  line: string;
  acc: string;
  /** Accent text on an accent tint. */
  accT: string;
  fill: string;
  soon: string;
  now: string;
  safe: string;
  noData: string;
  /** Weekday colours, indexed by `Weekday` (0 = Sunday). */
  day: Record<Weekday, string>;
  /** Text on a weekday colour. */
  dayText: Record<Weekday, string>;
}

// The handoff lists days Monday-first; `Weekday` is Sunday-first like Date#getDay.
const mondayFirst = (lu: string, ma: string, me: string, je: string, ve: string, sa: string, di: string) =>
  ({ 0: di, 1: lu, 2: ma, 3: me, 4: je, 5: ve, 6: sa }) as Record<Weekday, string>;

const INK = '#161826';

export const light: Palette = {
  bg: '#eceefa',
  card: '#f3f5fe',
  fg: '#161826',
  mut: '#595d6c',
  line: 'rgba(22,24,38,0.10)',
  acc: '#796cbf',
  accT: '#5d5294',
  fill: 'rgba(22,24,38,0.06)',
  soon: '#a8650a',
  now: '#c3352f',
  safe: '#2e8457',
  noData: '#a3a7b8',
  day: mondayFirst('#D68F00', '#3A9BD9', '#009E73', '#D4C21E', '#0072B2', '#D55E00', '#CC79A7'),
  dayText: mondayFirst(INK, INK, INK, INK, '#f3f5fe', INK, INK),
};

export const dark: Palette = {
  bg: '#161826',
  card: '#232532',
  fg: '#e9e9ed',
  mut: '#9397ab',
  line: 'rgba(233,233,237,0.13)',
  acc: '#9184d9',
  accT: '#d2cefd',
  fill: 'rgba(233,233,237,0.07)',
  soon: '#e8a84a',
  now: '#ff6b5e',
  safe: '#5cc98e',
  noData: '#5f6373',
  day: mondayFirst('#E69F00', '#56B4E9', '#1DB88E', '#F0E442', '#4A9BE0', '#EE7733', '#DD8DBA'),
  dayText: mondayFirst(INK, INK, INK, INK, INK, INK, INK),
};

export const radius = { card: 24, banner: 16, pill: 9 } as const;

/** `#rrggbb` + alpha → `rgba()`, for the tints the mocks build with color-mix(). */
export function withAlpha(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}
