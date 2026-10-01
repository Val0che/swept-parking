import { cap, clock, dateLong, dateShort, dayLong, dayShort, type CleaningRule, type Lang } from '@swept/core';

const windows = (rule: CleaningRule, lang: Lang) =>
  rule.windows.map((w) => `${clock(w.start, lang)} – ${clock(w.end, lang)}`).join(', ');

/** "Ven. 15 h 30 – 16 h 30" */
export const scheduleShort = (rule: CleaningRule, lang: Lang) =>
  `${rule.days.map((d) => cap(dayShort(d, lang))).join(', ')} ${windows(rule, lang)}`;

/** "Vendredi · 15 h 30 – 16 h 30" */
export const scheduleLong = (rule: CleaningRule, lang: Lang) =>
  `${cap(rule.days.map((d) => dayLong(d, lang)).join(', '))} · ${windows(rule, lang)}`;

/** "1 avr. – 1 déc." */
export const seasonShort = ({ season: { from, to } }: CleaningRule, lang: Lang) =>
  `${dateShort(from.month, from.day, lang)} – ${dateShort(to.month, to.day, lang)}`;

/** ["1er avril", "1er décembre"] */
export const seasonLong = ({ season: { from, to } }: CleaningRule, lang: Lang): [string, string] => [
  dateLong(from.month, from.day, lang),
  dateLong(to.month, to.day, lang),
];
